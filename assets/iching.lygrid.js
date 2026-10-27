// =====================================================================================
// ==========================  assets/iching.lygrid.js  ===============================
// =====================================================================================
// Exemple de référence du mini-langage .lygrid/.pattern (cf. ARCHITECTURE §10.3) : les 8
// trigrammes du Yi King. Même format que le DSL Silverquote (ComboShape + parts,
// Variables-macros, positions centre-relatives en unités-pattern). Généré par
// makeIChing(color) pour éviter d'écrire 8 formes à la main.
"use strict";

export function makeIChing(color = "#6b3f2b") {
  // CellSize = unité interne (px) ; positions/offsets relatifs au CENTRE de la cellule.
  const yByLine = [6, 0, -6]; // bas, milieu, haut (offset vertical depuis le centre)

  const Variables = {
    // barre pleine (yang) : un rectangle large centré horizontalement
    "Bar(y,c)": [
      { type: "rectangle", position: ["0", "$y"], size: ["16", "2.6"], fillColor: "$c", drawColor: "none" },
    ],
    // barre brisée (yin) : deux rectangles courts avec un vide central
    "BrokenBar(y,c)": [
      { type: "rectangle", position: ["-5", "$y"], size: ["6", "2.6"], fillColor: "$c", drawColor: "none" },
      { type: "rectangle", position: ["5", "$y"], size: ["6", "2.6"], fillColor: "$c", drawColor: "none" },
    ],
  };

  const Shapes = {};
  for (let v = 0; v < 8; v++) {
    const parts = [];
    for (let line = 0; line < 3; line++) {
      const yang = (v >> line) & 1;
      parts.push(`$${yang ? "Bar" : "BrokenBar"}('${yByLine[line]}','${color}')`);
    }
    Shapes[String(v)] = { type: "ComboShape", parts };
  }

  return {
    Name: "IChing",
    Description: "Yi King — 8 trigrammes",
    CellSize: "25",
    MaxCellValue: "7",
    CellValueMode: "Sequence",
    NumberFormat: "absolute",
    Variables,
    Shapes,
  };
}
