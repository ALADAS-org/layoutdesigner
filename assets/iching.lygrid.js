// =====================================================================================
// ==========================  assets/iching.lygrid.js  ===============================
// =====================================================================================
// Exemple de référence du mini-langage .lygrid (cf. ARCHITECTURE §10.3) : les 8
// trigrammes du Yi King. Montre les SYMBOLES-MACROS (`Bar`, `BrokenBar` paramétrés par
// position y et couleur) et la COMPOSITION d'une Shape par références `$Symbol(args)`.
// Généré par makeIChing(color) pour éviter d'écrire 8 formes à la main.
"use strict";

import { createGridPattern } from "../src/core/document.js";

export function makeIChing(color = "#6b3f2b") {
  const symbols = {
    // barre pleine (yang) : un rectangle large
    Bar: {
      params: ["y", "c"],
      parts: [{ type: "rectangle", position: [0.5, "$y"], size: [0.64, 0.08], fillColor: "$c" }],
    },
    // barre brisée (yin) : deux rectangles courts avec un vide central
    BrokenBar: {
      params: ["y", "c"],
      parts: [
        { type: "rectangle", position: [0.33, "$y"], size: [0.24, 0.08], fillColor: "$c" },
        { type: "rectangle", position: [0.67, "$y"], size: [0.24, 0.08], fillColor: "$c" },
      ],
    },
  };

  // valeur v (0..7) : bit 0 = ligne basse, bit 2 = ligne haute. 1 = yang, 0 = yin.
  const yByLine = [0.74, 0.5, 0.26]; // bas, milieu, haut
  const shapes = {};
  for (let v = 0; v < 8; v++) {
    const parts = [];
    for (let line = 0; line < 3; line++) {
      const yang = (v >> line) & 1;
      const sym = yang ? "Bar" : "BrokenBar";
      parts.push(`$${sym}('${yByLine[line]}','${color}')`);
    }
    shapes[v] = { parts };
  }

  return createGridPattern({
    meta: {
      title: "Yi King — 8 trigrammes",
      // frise agréable : alterne les trigrammes « pleins » et « ouverts »
      sequence: [7, 0, 5, 2, 6, 1, 3, 4],
    },
    grid: { type: "square" },
    family: "default",
    maxCellValue: 7,
    symbols,
    shapes,
  });
}
