// =====================================================================================
// ===================  builtin-plugins/layer-guilloche/index.js  ======================
// =====================================================================================
// LayerType `guilloche` (cf. ARCHITECTURE §10.4) : trace une famille de courbes de
// sécurité, `count` copies légèrement tournées pour l'effet « rosace ». Dessine via la
// façade gfx (polyline) — aucun accès P5/canvas brut.
"use strict";

import { guillocheCurve, toBox } from "../../src/core/geometry/guilloche.js";

export function register(reg) {
  reg.registerLayerType({
    type: "guilloche",
    label: "Guilloché",
    createDefault: () => ({
      family: "hypotrochoid",
      params: { R: 1, r: 0.32, d: 0.62, turns: 1 },
      color: "#2b6b5e",
      lineWidth: 0.12,
      count: 3,
      inset: 3,
    }),
    render: (gfx, layer, doc, env) => {
      const { region } = env;
      const p = layer.props;
      const base = guillocheCurve(p.family, p.params || {});
      gfx.noFill().setStroke(p.color, p.lineWidth);
      const count = Math.max(1, p.count || 1);
      const cx = region.w / 2;
      const cy = region.h / 2;
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * (Math.PI / count); // léger décalage angulaire
        gfx.save();
        gfx.translate(cx, cy).rotate(ang).translate(-cx, -cy);
        gfx.polyline(toBox(base, { x: 0, y: 0, w: region.w, h: region.h }, { inset: p.inset || 0 }));
        gfx.restore();
      }
    },
  });
}
