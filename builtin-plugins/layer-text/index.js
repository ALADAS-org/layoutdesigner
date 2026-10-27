// =====================================================================================
// =====================  builtin-plugins/layer-text/index.js  =========================
// =====================================================================================
// LayerType `text` : une ligne (ou plusieurs) de texte ancrée dans la région (§10.2).
// Sert aux facialES, pays, titres. Dessin via gfx.char (ancrage absorbé par la façade).
"use strict";

const PAD = 2; // marge mm depuis le bord ancré

export function register(reg) {
  reg.registerLayerType({
    type: "text",
    label: "Texte",
    createDefault: () => ({ text: "Texte", sizeMm: 5, color: "#111", anchor: "center", weight: "normal", font: "serif" }),
    render: (gfx, layer, doc, env) => {
      const { region } = env;
      const p = layer.props;
      const box = { x: PAD, y: PAD, w: region.w - 2 * PAD, h: region.h - 2 * PAD };
      const pt = gfx.anchor(p.anchor || "center", box);
      const align = p.anchor && /E$/.test(p.anchor) ? "right" : p.anchor && /W$/.test(p.anchor) ? "left" : "center";
      gfx.setFill(p.color).noStroke();
      gfx.char(String(p.text), pt.x, pt.y, p.sizeMm, { align, baseline: "middle", font: p.font || "serif", weight: p.weight || "normal" });
    },
  });
}
