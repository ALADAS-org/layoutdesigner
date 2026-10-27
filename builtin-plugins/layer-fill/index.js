// =====================================================================================
// =====================  builtin-plugins/layer-fill/index.js  =========================
// =====================================================================================
// LayerType `fill` : remplit la région d'une couleur unie ou d'un dégradé vertical.
// Exemple minimal du contrat LayerType (§3) : createDefault + render(gfx,layer,doc,env).
"use strict";

export function register(reg) {
  reg.registerLayerType({
    type: "fill",
    label: "Aplat",
    createDefault: () => ({ color: "#ffffff", color2: null }),
    render: (gfx, layer, doc, env) => {
      const { region } = env;
      const p = layer.props;
      if (p.color2) {
        // dégradé vertical : approximé par bandes (le backend SVG fera un vrai gradient)
        const n = 48;
        for (let i = 0; i < n; i++) {
          const t = i / (n - 1);
          gfx.setFill(mix(p.color, p.color2, t)).noStroke();
          gfx.rect(0, (region.h * i) / n, region.w, region.h / n + 0.3);
        }
      } else {
        gfx.setFill(p.color).noStroke().rect(0, 0, region.w, region.h);
      }
    },
  });
}

function mix(a, b, t) {
  const pa = hex(a), pb = hex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}
function hex(c) {
  const m = c.replace("#", "");
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}
