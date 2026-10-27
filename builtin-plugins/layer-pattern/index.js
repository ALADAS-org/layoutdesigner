// =====================================================================================
// ====================  builtin-plugins/layer-pattern/index.js  =======================
// =====================================================================================
// LayerType `pattern` : couche .lygrid VIVANTE (cf. ARCHITECTURE §10). Pave la région
// d'une grille (carrée/hexa via GridLayout) ; chaque valeur de cellule -> une Shape du
// mini-langage (§10.3) composée de primitives. Gère les SYMBOLES/MACROS (ex-Variables)
// et la SYMÉTRIE quadrant kaléidoscope (§10.5). Tout passe par la façade gfx.
"use strict";

import { GridLayout } from "../../src/core/geometry/grid_layout.js";

export function register(reg) {
  reg.registerLayerType({
    type: "pattern",
    label: "Pattern (.lygrid)",
    createDefault: () => ({ grid: null, cellSizeMm: 6, forceSymmetry: null, drawColor: "#6b3f2b" }),
    render: (gfx, layer, doc, env) => {
      const { region } = env;
      const grid = layer.props.grid || (doc.assets[layer.props.gridRef] && doc.assets[layer.props.gridRef].data);
      if (!grid) return;
      renderPattern(gfx, grid, region, layer.props);
    },
  });
}

/** Rend un .lygrid dans une box {w,h} (origine 0,0 locale, mm). */
export function renderPattern(gfx, lygrid, region, opts = {}) {
  const cs = opts.cellSizeMm || 6;
  const layout = new GridLayout(lygrid.grid ? lygrid.grid.type : "square", cs);
  const { columns, rows } = layout.dimensions(region.w, region.h);
  const maxV = lygrid.maxCellValue != null ? lygrid.maxCellValue : 1;
  const nShapes = maxV + 1;

  gfx.save();
  gfx.clipRect(0, 0, region.w, region.h); // ne pas déborder de la couche
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const value = chooseValue(lygrid, col, row, nShapes);
      const shape = lygrid.shapes[value] != null ? lygrid.shapes[value] : lygrid.shapes[String(value)];
      if (!shape) continue;
      const c = layout.cellCenter(col, row);
      const cell = { x: c.x - cs / 2, y: c.y - cs / 2, w: cs, h: cs };
      drawShape(gfx, shape, cell, lygrid.symbols || {}, opts);
    }
  }
  gfx.restore();
}

// -- choix de la valeur de cellule (démo : balayage déterministe) ----------------------
function chooseValue(lygrid, col, row, nShapes) {
  if (lygrid.meta && Array.isArray(lygrid.meta.sequence)) {
    const seq = lygrid.meta.sequence;
    return seq[(row * 97 + col) % seq.length];
  }
  return (col + row) % nShapes;
}

// -- dessin d'une Shape, avec symétrie quadrant (§10.5) --------------------------------
function drawShape(gfx, shape, cell, symbols, opts) {
  const sym = opts.forceSymmetry != null ? opts.forceSymmetry : shape.symmetry || "none";
  const parts = resolveParts(shape.parts || [], symbols);

  if (sym === "quadrant") {
    // l'auteur dessine le quadrant NW ; on réfléchit en 4 autour du centre de cellule.
    const cx = cell.x + cell.w / 2;
    const cy = cell.y + cell.h / 2;
    const mirrors = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
    for (const [mx, my] of mirrors) {
      gfx.save();
      gfx.translate(cx, cy).scale(mx, my).translate(-cx, -cy);
      // ne dessiner que le quadrant NW de la cellule, répété par miroir
      const quad = { x: cell.x, y: cell.y, w: cell.w / 2, h: cell.h / 2 };
      for (const p of parts) drawPrimitive(gfx, p, quad, opts);
      gfx.restore();
    }
    return;
  }
  for (const p of parts) drawPrimitive(gfx, p, cell, opts);
}

// -- résolution des symboles/macros (§10.3) -------------------------------------------
function resolveParts(parts, symbols) {
  const out = [];
  for (const part of parts) {
    if (typeof part === "string") {
      out.push(...expandSymbol(part, symbols));
    } else {
      out.push(part);
    }
  }
  return out;
}

/** "$Name('0.2','#abc')" -> primitives concrètes (substitution positionnelle $param). */
function expandSymbol(call, symbols) {
  const m = /^\$([A-Za-z_]\w*)\s*(?:\(([^)]*)\))?$/.exec(call.trim());
  if (!m) return [];
  const name = m[1];
  const args = m[2] ? splitArgs(m[2]) : [];
  const def = symbols[name];
  if (!def) return [];
  const tmpl = def.parts ? def.parts : [def.part || def];
  const params = def.params || [];
  const map = {};
  params.forEach((p, i) => (map[p] = args[i]));
  return JSON.parse(JSON.stringify(tmpl)).map((prim) => substitute(prim, map));
}

function splitArgs(s) {
  return s.split(",").map((a) => a.trim().replace(/^['"]|['"]$/g, ""));
}
function substitute(node, map) {
  if (typeof node === "string") {
    const k = /^\$([A-Za-z_]\w*)$/.exec(node);
    return k && k[1] in map ? map[k[1]] : node;
  }
  if (Array.isArray(node)) return node.map((n) => substitute(n, map));
  if (node && typeof node === "object") {
    const o = {};
    for (const key of Object.keys(node)) o[key] = substitute(node[key], map);
    return o;
  }
  return node;
}

// -- dessin d'une primitive dans une box (anchors §10.2 ou [x,y] en fraction) ----------
function num(v) {
  return typeof v === "string" ? parseFloat(v) : v;
}
function resolvePos(pos, box, gfx) {
  if (typeof pos === "string") return gfx.anchor(pos, box); // ancrage compass
  const px = num(pos[0]), py = num(pos[1]);
  return { x: box.x + px * box.w, y: box.y + py * box.h };
}
function drawPrimitive(gfx, prim, box, opts) {
  const p = prim;
  const fill = p.fillColor || null;
  const stroke = p.drawColor || opts.drawColor || null;
  const lw = p.lineWidth != null ? num(p.lineWidth) : 0.15;
  if (fill) gfx.setFill(fill); else gfx.noFill();
  if (stroke) gfx.setStroke(stroke, lw); else gfx.noStroke();

  switch (p.type) {
    case "rectangle": {
      const c = resolvePos(p.position || "center", box, gfx);
      const w = num(p.size[0]) * box.w, h = num(p.size[1]) * box.h;
      gfx.rect(c.x - w / 2, c.y - h / 2, w, h);
      break;
    }
    case "ellipse": {
      const c = resolvePos(p.position || "center", box, gfx);
      gfx.ellipse(c.x, c.y, num(p.size[0]) * box.w, num(p.size[1]) * box.h);
      break;
    }
    case "line": {
      const a = resolvePos(p.start, box, gfx);
      const b = resolvePos(p.end, box, gfx);
      gfx.line(a.x, a.y, b.x, b.y);
      break;
    }
    case "arc": {
      const c = resolvePos(p.position || "center", box, gfx);
      gfx.arcEllipse(c.x, c.y, num(p.size[0]) * box.w, num(p.size[1]) * box.h,
        (num(p.startAngle) * Math.PI) / 180, (num(p.endAngle) * Math.PI) / 180, p.fillStyle || "OPEN");
      break;
    }
    case "polygram": {
      const c = resolvePos(p.position || "center", box, gfx);
      gfx.polygon(polygramPts(c, (num(p.size ? p.size[0] : 0.4)) * box.w / 2, num(p.vertexCount) || 5, !!p.isStar));
      break;
    }
    case "char": {
      const c = resolvePos(p.position || "center", box, gfx);
      gfx.char(String(p.text), c.x, c.y, num(p.size || 0.6) * box.h, { font: p.font || "serif", weight: p.weight || "normal" });
      break;
    }
    default:
      break;
  }
}
function polygramPts(c, r, n, star) {
  const pts = [];
  const step = star ? 2 : 1;
  const count = star ? n : n;
  for (let i = 0; i < count; i++) {
    const a = (-Math.PI / 2) + (i * step * 2 * Math.PI) / n;
    pts.push({ x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) });
  }
  return pts;
}
