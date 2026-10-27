// =====================================================================================
// ==================  builtin-plugins/layer-perforation/index.js  =====================
// =====================================================================================
// LayerType `perforation` : effet de bord « dentelure de timbre » (cf. ARCHITECTURE §4,
// effets de bord/encre). Perce des demi-cercles de la couleur du papier tout autour du
// trim, à pas régulier. En v0 c'est une couche dédiée ; v1 en fera un modificateur
// réutilisable [À TRANCHER §16]. Dessin via la façade gfx.
"use strict";

export function register(reg) {
  reg.registerLayerType({
    type: "perforation",
    label: "Dentelure",
    createDefault: () => ({ pitchMm: 2.2, radiusMm: 1.0, paper: "#ffffff" }),
    render: (gfx, layer, doc, env) => {
      const { region } = env;
      const p = layer.props;
      const pitch = p.pitchMm || 2.2;
      const r = p.radiusMm || 1.0;
      gfx.setFill(p.paper || "#ffffff").noStroke();

      const nx = Math.max(2, Math.round(region.w / pitch));
      const ny = Math.max(2, Math.round(region.h / pitch));
      const dx = region.w / nx;
      const dy = region.h / ny;
      for (let i = 0; i <= nx; i++) {
        gfx.ellipse(i * dx, 0, r * 2, r * 2);        // bord haut
        gfx.ellipse(i * dx, region.h, r * 2, r * 2); // bord bas
      }
      for (let j = 0; j <= ny; j++) {
        gfx.ellipse(0, j * dy, r * 2, r * 2);        // bord gauche
        gfx.ellipse(region.w, j * dy, r * 2, r * 2); // bord droit
      }
    },
  });
}
