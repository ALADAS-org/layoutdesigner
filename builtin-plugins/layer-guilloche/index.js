// =====================================================================================
// ===================  builtin-plugins/layer-guilloche/index.js  ======================
// =====================================================================================
// LayerType `guilloche` (cf. ARCHITECTURE §10.4) : textures de sécurité « currency »,
// dessinées via la façade gfx (§12). La GRAMMAIRE (props.style) choisit ce qui remplit
// la couche — pensée pour la couche « Guilloche » la plus basse en Z :
//
//   style:"field"    texture PLEINE SURFACE sans trous (fond de billet) :
//                    familles de lignes ondulées interlacées (sub:"waves"|"net").
//   style:"rosette"  motif type TAMPON/MÉDAILLON : spirographe précessant (ratio non
//                    entier -> tissage dense), 1..n couches concentriques.
//   style:"combo"    rosette centrée POSÉE SUR un fond "field" (effet billet complet),
//                    avec gradient d'opacité du fond optionnel.
//
// Tout est en mm dans la région ; aucune primitive ne touche le canvas brut.
"use strict";

const TAU = Math.PI * 2;

export function register(reg) {
  reg.registerLayerType({
    type: "guilloche",
    label: "Guilloché",
    createDefault: () => ({
      style: "field",
      color: "#1d5e54",
      color2: "#7a1f2b",
      lineWidth: 0.1,            // mm
      field: { sub: "net", spacingMm: 2.0, ampMm: 2.4, cycles: 9, crossed: true },
      rosette: {
        radiusMm: 24,
        placement: "center",     // "center" | [xMm,yMm]
        layers: [
          { k: 15.4, dFrac: 0.38, turns: 40, rScale: 1.0 },
          { k: 23.3, dFrac: 0.40, turns: 40, rScale: 0.60 },
          { k: 9.2, dFrac: 0.60, turns: 30, rScale: 0.30 },
        ],
      },
      combo: { fieldOpacity: 0.5 },
    }),
    render: (gfx, layer, doc, env) => {
      const { region } = env;
      renderGuilloche(gfx, layer.props, region);
    },
  });
}

export function renderGuilloche(gfx, p, region) {
  gfx.save();
  gfx.clipRect(0, 0, region.w, region.h);
  const style = p.style || "field";
  if (style === "field") {
    drawField(gfx, p, region, 1);
  } else if (style === "rosette") {
    drawRosette(gfx, p, region);
  } else if (style === "combo") {
    drawField(gfx, p, region, p.combo ? (p.combo.fieldOpacity != null ? p.combo.fieldOpacity : 0.5) : 0.5);
    drawRosette(gfx, p, region);
  }
  gfx.restore();
}

// ---- fond pleine surface (sans trous) : lignes ondulées interlacées -----------------
function drawField(gfx, p, region, alpha) {
  const f = p.field || {};
  const spacing = f.spacingMm || 2.0;
  const amp = f.ampMm != null ? f.ampMm : 2.4;   // amp > spacing -> entrelacement
  const cyc = f.cycles || 9;
  const lw = p.lineWidth || 0.1;
  const W = region.w, H = region.h;

  gfx.save();
  gfx.setAlpha(alpha);
  // famille horizontale (débord d'une ligne de chaque côté -> aucun trou aux bords)
  gfx.noFill().setStroke(p.color || "#1d5e54", lw);
  for (let i = -1; i <= H / spacing + 1; i++) {
    const base = i * spacing, ph = i * 0.6;
    const pts = [];
    for (let x = -2; x <= W + 2; x += 1.1) pts.push({ x, y: base + amp * Math.sin((cyc * TAU * x) / W + ph) });
    gfx.polyline(pts);
  }
  // famille verticale croisée -> filet / moiré
  if (f.crossed) {
    gfx.setAlpha(alpha * 0.8);
    gfx.setStroke(p.color2 || "#1d3e6e", lw);
    for (let i = -1; i <= W / spacing + 1; i++) {
      const base = i * spacing, ph = i * 0.6;
      const pts = [];
      for (let y = -2; y <= H + 2; y += 1.1) pts.push({ x: base + amp * Math.sin((cyc * TAU * y) / H + ph), y });
      gfx.polyline(pts);
    }
  }
  gfx.restore();
}

// ---- rosette / médaillon : spirographe précessant -----------------------------------
function spiro(cx, cy, R, k, d, turns, step) {
  const r = R / (k + 1);          // (R-r)/r = k "pétales"
  const pts = [];
  const st = step || 0.004;
  for (let t = 0; t <= turns * TAU; t += st) {
    pts.push({ x: cx + (R - r) * Math.cos(t) + d * Math.cos(k * t), y: cy + (R - r) * Math.sin(t) - d * Math.sin(k * t) });
  }
  return pts;
}
function drawRosette(gfx, p, region) {
  const ro = p.rosette || {};
  const R0 = ro.radiusMm || 24;
  const place = ro.placement === "center" || !ro.placement ? [region.w / 2, region.h / 2] : ro.placement;
  const [cx, cy] = place;
  const lw = p.lineWidth || 0.1;
  const layers = ro.layers || [{ k: 15.4, dFrac: 0.38, turns: 40, rScale: 1 }];
  gfx.noFill();
  layers.forEach((L, i) => {
    const R = R0 * (L.rScale != null ? L.rScale : 1);
    const d = (L.dFrac != null ? L.dFrac : 0.4) * R;
    gfx.setStroke(i % 2 ? (p.color2 || "#7a1f2b") : (p.color || "#1d5e54"), lw);
    gfx.polyline(spiro(cx, cy, R, L.k != null ? L.k : 15.4, d, L.turns || 40));
  });
}
