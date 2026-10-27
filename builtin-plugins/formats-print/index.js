// =====================================================================================
// ====================  builtin-plugins/formats-print/index.js  =======================
// =====================================================================================
// Plugin `formats-print` (cf. ARCHITECTURE §13) : expose le catalogue de FormatSpec (mm)
// et des presets de document (§4.2). Reprend `formats.js` (source de vérité unique).
"use strict";

export const FORMATS = [
  { id: "postcard_a6", label: "Carte postale A6", category: "postcard", w: 148, h: 105, bleed: 3, safe: 4, corner: 0, orient: "landscape" },
  { id: "postcard_us", label: "Carte postale US 4×6", category: "postcard", w: 152.4, h: 101.6, bleed: 3, safe: 4, corner: 0, orient: "landscape" },
  { id: "banknote_fantasy", label: "Billet fantaisie", category: "banknote", w: 140, h: 66, bleed: 3, safe: 5, corner: 0, orient: "landscape" },
  { id: "stamp_commemo", label: "Timbre (commémoratif)", category: "stamp", w: 40, h: 30, bleed: 2, safe: 2, corner: 0, orient: "landscape" },
  { id: "stamp_definit", label: "Timbre (courant)", category: "stamp", w: 25, h: 22, bleed: 2, safe: 2, corner: 0, orient: "portrait" },
  { id: "card_id1", label: "Carte bancaire (ID-1)", category: "card", w: 85.6, h: 53.98, bleed: 3, safe: 4, corner: 3.18, orient: "landscape" },
  { id: "atc", label: "ATC (Artist Trading Card)", category: "atc", w: 63.5, h: 88.9, bleed: 3, safe: 4, corner: 0, orient: "portrait" },
  { id: "playing_poker", label: "Carte à jouer (poker)", category: "playing", w: 63.5, h: 88.9, bleed: 3, safe: 4, corner: 3.0, orient: "portrait" },
  { id: "playing_bridge", label: "Carte à jouer (bridge)", category: "playing", w: 57.15, h: 88.9, bleed: 3, safe: 4, corner: 3.0, orient: "portrait" },
  { id: "tarot", label: "Tarot", category: "playing", w: 70, h: 120, bleed: 3, safe: 5, corner: 4.0, orient: "portrait" },
];

export function getFormat(id) {
  return FORMATS.find((f) => f.id === id) || null;
}

export function register(reg) {
  reg.registerFormats(FORMATS);

  // Preset « timbre commémoratif » : fond + guilloché + cadre(pattern) + faciale + pays
  // + perforation. Les régions valent 0×0 = plein trim (résolues au rendu) sauf indiqué.
  reg.registerPreset("stamp", {
    label: "Timbre commémoratif",
    formatId: "stamp_commemo",
    build: (api) => [
      api.fill({ name: "fond", color: "#f3ead4", color2: "#e4d3a8" }),
      api.pattern({ name: "frise (I Ching)", color: "#6b3f2b", opacity: 0.5 }),
      api.guilloche({ name: "guilloché", family: "hypotrochoid", color: "#2b6b5e", lineWidth: 0.1, count: 3 }),
      api.text({ name: "faciale", text: "1.20", sizeMm: 7, color: "#8a1f1f", anchor: "SE", weight: "bold" }),
      api.text({ name: "pays", text: "TSCG·POSTE", sizeMm: 2.6, color: "#333", anchor: "N" }),
      api.perforation({ name: "dentelure" }),
    ],
  });

  reg.registerLocale("fr", { "preset.stamp": "Timbre commémoratif" });
  reg.registerLocale("en", { "preset.stamp": "Commemorative stamp" });
}
