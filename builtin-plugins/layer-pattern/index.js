// =====================================================================================
// ====================  builtin-plugins/layer-pattern/index.js  =======================
// =====================================================================================
// LayerType `pattern` : couche .lygrid/.pattern VIVANTE (cf. ARCHITECTURE §10), moteur
// FIDÈLE au DSL Silverquote, dessiné ENTIÈREMENT via la façade gfx (§12).
//
// Règles de rendu vérifiées case-pour-case (cf. schemas/pattern.spec.md) :
//   1. position:[x,y] est RELATIVE AU CENTRE de la cellule (px absolus, ou %×CellSize).
//      Les ancrages (center,N,NE,…) sont centre-relatifs aussi.
//   2. CONTOUR NOIR par défaut sur les formes remplies ; drawColor:"none" le supprime.
//   3. digit_mark est un OVERLAY de vue optionnel (showDigits), pas un part toujours dessiné.
//
// Repère : chaque cellule est dessinée en unités-pattern (CellSize), la façade gfx porte
// la mise à l'échelle vers les mm (s = cellSizeMm / CellSize) ; les primitives reçoivent
// gfx, jamais le canvas brut.
"use strict";

import { GridLayout } from "../../src/core/geometry/grid_layout.js";

const TAU = Math.PI * 2;
const d2r = (d) => (d * Math.PI) / 180;
const num = (v, dflt = 0) => (v == null ? dflt : (typeof v === "number" ? v : (isNaN(parseFloat(v)) ? dflt : parseFloat(v))));
const valueToKey = (n) => (n < 10 ? String(n) : String.fromCharCode(65 + (n - 10)));

export function register(reg) {
  reg.registerLayerType({
    type: "pattern",
    label: "Pattern (.lygrid)",
    createDefault: () => ({ grid: null, cellSizeMm: 6, showDigits: false, seed: 1, valueGrid: null }),
    render: (gfx, layer, doc, env) => {
      const { region } = env;
      const grid = layer.props.grid || (doc.assets[layer.props.gridRef] && doc.assets[layer.props.gridRef].data);
      if (!grid) return;
      renderPattern(gfx, grid, region, layer.props);
    },
  });
}

/**
 * Rend un .lygrid/.pattern dans une région {w,h} (mm, origine locale 0,0).
 * opts: { cellSizeMm, showDigits, seed, valueGrid }
 */
export function renderPattern(gfx, pat, region, opts = {}) {
  const CellSize = num(pat.CellSize, 25);            // unité interne du pattern
  const cellMm = opts.cellSizeMm || 6;               // taille de cellule à l'écran (mm)
  const s = cellMm / CellSize;                        // pattern-units -> mm
  const gridType = (pat.Grid && pat.Grid.type) || "square";
  const layout = new GridLayout(gridType, cellMm);
  const { columns, rows } = layout.dimensions(region.w, region.h);
  const max = pat.MaxCellValue === "*" ? 0 : (parseInt(pat.MaxCellValue, 10) || 0);
  const seq = pat.CellValueMode === "Sequence";
  const nf = pat.NumberFormat || "absolute";
  const symbols = compileSymbols(pat.Variables || {});
  const rng = makeRng(opts.seed || 1);
  const vg = opts.valueGrid || null;

  gfx.save();
  gfx.clipRect(0, 0, region.w, region.h);

  // fond du pattern (BackgroundColor) : Silverquote peint le fond, mais en tant que
  // COUCHE on ne le fait que si demandé (sinon une frise masquerait les couches dessous).
  if (opts.paintBackground && pat.BackgroundColor) {
    gfx.setFill(pat.BackgroundColor).noStroke().rect(0, 0, region.w, region.h);
  }

  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const val = vg && vg[r] && vg[r][c] != null
        ? +vg[r][c]
        : (seq ? (idx % (max + 1)) : Math.floor(rng() * (max + 1)));
      idx++;
      const shape = pat.Shapes[valueToKey(val)];
      if (!shape) continue;
      const ctr = layout.cellCenter(c, r); // mm
      const cellOpts = { ...opts, _digit: val };
      // Symétrie kaléidoscope §10.5 (feature LD, hors DSL Silverquote) : 4 miroirs.
      const sym = opts.forceSymmetry != null ? opts.forceSymmetry : (shape.symmetry || "none");
      gfx.save();
      gfx.translate(ctr.x, ctr.y);
      gfx.scale(s, s);
      if (sym === "quadrant") {
        for (const [mx, my] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
          gfx.save(); gfx.scale(mx, my); drawShape(gfx, shape, CellSize, symbols, nf, cellOpts); gfx.restore();
        }
      } else {
        drawShape(gfx, shape, CellSize, symbols, nf, cellOpts);
      }
      gfx.restore();
    }
  }
  gfx.restore();
}

// ---- symboles / macros (Variables) --------------------------------------------------
function compileSymbols(V) {
  const out = {};
  for (const key of Object.keys(V)) {
    const m = key.match(/^([A-Za-z_]\w*)\s*(?:\(([^)]*)\))?$/);
    if (!m) continue;
    out[m[1]] = { params: m[2] != null ? splitArgs(m[2]) : [], value: V[key] };
  }
  return out;
}
function splitArgs(s) {
  return s == null || s.trim() === "" ? [] : s.split(",").map((x) => x.replace(/'/g, "").trim());
}
function subst(node, map) {
  if (typeof node === "string") { let o = node; for (const k in map) o = o.split("$" + k).join(map[k]); return o; }
  if (Array.isArray(node)) return node.map((n) => subst(n, map));
  if (node && typeof node === "object") { const o = {}; for (const k in node) o[k] = subst(node[k], map); return o; }
  return node;
}
function expandParts(parts, symbols) {
  const out = [];
  for (const p of parts) {
    if (typeof p === "string") {
      const m = p.match(/^\$([A-Za-z_]\w*)(?:\(([^)]*)\))?$/);
      if (!m) { continue; }
      const v = symbols[m[1]];
      if (!v) continue;
      const args = splitArgs(m[2]);
      const map = {};
      v.params.forEach((pn, i) => (map[pn] = args[i]));
      const val = subst(JSON.parse(JSON.stringify(v.value)), map);
      if (Array.isArray(val)) val.forEach((x) => out.push(x));
      else out.push(val);
    } else out.push(p);
  }
  return out;
}

// ---- dessin d'une Shape -------------------------------------------------------------
function drawShape(gfx, shape, CellSize, symbols, nf, opts) {
  const parts = shape.parts ? expandParts(shape.parts, symbols) : [];
  for (const part of parts) drawPart(gfx, part, CellSize, nf, opts);
}

// ancrage centre-relatif, en unités-pattern (origine gfx = centre de cellule)
function anchorOffset(name, h) {
  switch (name) {
    case "center": return [0, 0];
    case "N": return [0, -h];
    case "S": return [0, h];
    case "E": return [h, 0];
    case "W": return [-h, 0];
    case "NE": return [h, -h];
    case "NW": return [-h, -h];
    case "SE": return [h, h];
    case "SW": return [-h, h];
    default: return [0, 0];
  }
}
function resolvePos(pos, CellSize, nf) {
  const h = CellSize / 2;
  const unit = (v) => (nf === "percent" ? num(v) * CellSize : num(v));
  if (Array.isArray(pos) && pos.length === 2) return { x: unit(pos[0]), y: unit(pos[1]) };
  if (typeof pos === "string") { const o = anchorOffset(pos, h); return { x: o[0], y: o[1] }; }
  return { x: 0, y: 0 };
}
function unitSize(v, CellSize, nf) { return nf === "percent" ? num(v) * CellSize : num(v); }

// Règle 2 : contour noir par défaut ; "none" supprime. Applique fill+stroke sur gfx.
function paint(gfx, part, defaultStroke = "#000") {
  const fill = part.fillColor;
  const draw = part.drawColor !== undefined ? part.drawColor : defaultStroke;
  if (fill && fill !== "none") gfx.setFill(fill); else gfx.noFill();
  if (draw && draw !== "none") gfx.setStroke(draw, Math.max(num(part.drawThickness, 0.5), 0.15)); else gfx.noStroke();
}

function drawPart(gfx, part, CellSize, nf, opts) {
  if (!part || !part.type) return;
  const p = resolvePos(part.position, CellSize, nf);
  const size = unitSize(part.size, CellSize, nf);
  switch (part.type) {
    case "circle": { paint(gfx, part); gfx.ellipse(p.x, p.y, size, size); break; }
    case "ellipse": {
      let w = size, h = size;
      if (Array.isArray(part.size)) { w = unitSize(part.size[0], CellSize, nf); h = unitSize(part.size[1], CellSize, nf); }
      paint(gfx, part); gfx.ellipse(p.x, p.y, w, h); break;
    }
    case "square": case "rectangle": {
      let w = size, h = size;
      if (Array.isArray(part.size)) { w = unitSize(part.size[0], CellSize, nf); h = unitSize(part.size[1], CellSize, nf); }
      paint(gfx, part); gfx.rect(p.x - w / 2, p.y - h / 2, w, h); break;
    }
    case "losange": case "diamond": {
      const r = size / 2;
      gfx.save(); gfx.translate(p.x, p.y).rotate(Math.PI / 4);
      paint(gfx, part); gfx.rect(-r, -r, 2 * r, 2 * r); gfx.restore(); break;
    }
    case "arc": {
      const r = size, a0 = d2r(num(part.startAngle, 0)), a1 = d2r(num(part.endAngle, 90)), rot = d2r(num(part.rotation, 0));
      gfx.save(); gfx.translate(p.x, p.y).rotate(rot);
      paint(gfx, part); gfx.arcEllipse(0, 0, r, r, a0, a1, (part.fillStyle === "PIE") ? "PIE" : "OPEN"); gfx.restore(); break;
    }
    case "polygram": {
      const n = Math.max(3, Math.min(16, num(part.vertex_count, 5))), rr = size / 2, star = String(part.is_star) === "true";
      const pts = []; const step = star ? (Math.floor(n / 2) || 2) : 1;
      for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + ((i * step) % n) * TAU / n; pts.push({ x: p.x + rr * Math.cos(a), y: p.y + rr * Math.sin(a) }); }
      paint(gfx, part); gfx.polygon(pts); break;
    }
    case "line": case "cardinal_line": case "diagonal": {
      const h = CellSize / 2;
      const a = resolvePos(part.start, CellSize, nf), b = resolvePos(part.end, CellSize, nf);
      const col = part.drawColor && part.drawColor !== "none" ? part.drawColor : "#000";
      gfx.setStroke(col, Math.max(num(part.drawThickness, 0.5), 0.15)).noFill();
      gfx.line(a.x, a.y, b.x, b.y); break;
    }
    case "digit_mark": {
      if (opts.showDigits === false) break;
      const col = part.drawColor && part.drawColor !== "none" ? part.drawColor : "#888";
      gfx.setFill(col).noStroke();
      gfx.char(String(opts._digit != null ? opts._digit : ""), p.x, p.y, CellSize * 0.4, { align: "center", baseline: "middle", font: "monospace" });
      break;
    }
    case "guilloche": { drawGuilloche(gfx, part, p, CellSize * 0.46); break; }
    default: break;
  }
}

function drawGuilloche(gfx, part, c, Ru) {
  const col = part.drawColor && part.drawColor !== "none" ? part.drawColor : "#1a3a6a";
  gfx.setStroke(col, Math.max(num(part.drawThickness, 0.12), 0.08)).noFill();
  const pts = []; const st = 0.06; const cv = part.curve || "rose";
  if (cv === "hypotrochoid") { const R = num(part.R, 0.9) * Ru, r = num(part.r, 0.34) * Ru, d = num(part.d, 0.55) * Ru, k = (R - r) / r; for (let t = 0; t <= 6 * TAU; t += st) pts.push({ x: c.x + (R - r) * Math.cos(t) + d * Math.cos(k * t), y: c.y + (R - r) * Math.sin(t) - d * Math.sin(k * t) }); }
  else if (cv === "rose") { const a = num(part.a, 0.9) * Ru, k = num(part.petals, 5); for (let t = 0; t <= TAU; t += st) { const rr = a * Math.cos(k * t); pts.push({ x: c.x + rr * Math.cos(t), y: c.y + rr * Math.sin(t) }); } }
  else if (cv === "spiral") { const tn = num(part.turns, 3), sp = num(part.spacing, 0.12) * Ru; for (let t = 0; t <= tn * TAU; t += st) { const rr = sp * t; pts.push({ x: c.x + rr * Math.cos(t), y: c.y + rr * Math.sin(t) }); } }
  gfx.polyline(pts);
}

// RNG déterministe (LCG) pour un rendu stable en mode Random.
function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}
