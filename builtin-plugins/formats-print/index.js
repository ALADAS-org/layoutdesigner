// =====================================================================================
// ====================  builtin-plugins/formats-print/index.js  =======================
// =====================================================================================
// Plugin `formats-print` (cf. ARCHITECTURE §13) : expose le catalogue de FormatSpec (mm)
// et des presets de document (§4.2). Reprend `formats.js` (source de vérité unique).
"use strict";

import { makePostmark, makeStampCutout, makeTornStrip } from "../../assets/lyparts.js";

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
      api.guilloche({ name: "guilloché", style: "rosette", color: "#2b6b5e", color2: "#1d5e54", lineWidth: 0.06,
        rosette: { radiusMm: 9, placement: "center", layers: [ { k: 15.4, dFrac: 0.38, turns: 36, rScale: 1 }, { k: 9.2, dFrac: 0.6, turns: 28, rScale: 0.45 } ] } }),
      api.text({ name: "faciale", text: "1.20", sizeMm: 7, color: "#8a1f1f", anchor: "SE", weight: "bold" }),
      api.text({ name: "pays", text: "TSCG·POSTE", sizeMm: 2.6, color: "#333", anchor: "N" }),
      api.perforation({ name: "dentelure" }),
    ],
  });

  // Preset « billet fantaisie » : fond + guilloché combo (fond pleine surface + rosace)
  // + faciale + nom. La couche guilloché est la plus basse (juste au-dessus du fond).
  reg.registerPreset("banknote", {
    label: "Billet fantaisie",
    formatId: "banknote_fantasy",
    build: (api) => [
      api.fill({ name: "fond", color: "#eef3ee" }),
      api.guilloche({ name: "guilloché", style: "combo", color: "#2b6b5e", color2: "#7a1f2b", lineWidth: 0.08,
        field: { sub: "net", spacingMm: 1.8, ampMm: 2.2, cycles: 11, crossed: true }, combo: { fieldOpacity: 0.4 },
        rosette: { radiusMm: 22, placement: "center", layers: [ { k: 15.4, dFrac: 0.38, turns: 40, rScale: 1 }, { k: 23.3, dFrac: 0.4, turns: 40, rScale: 0.55 }, { k: 9.2, dFrac: 0.6, turns: 30, rScale: 0.28 } ] } }),
      api.text({ name: "faciale", text: "20", sizeMm: 13, color: "#1d3e6e", anchor: "NE", weight: "bold" }),
      api.text({ name: "banque", text: "BANQUE TSCG", sizeMm: 3, color: "#333", anchor: "SW" }),
    ],
  });

  // Preset « ATC » : les 4 couches nommées par défaut, de bas en haut :
  //   background (fond) -> guilloche -> pattern -> ATC (composants .lypart posés).
  reg.registerPreset("atc", {
    label: "ATC (carte d'artiste)",
    formatId: "atc",
    build: (api) => [
      api.fill({ name: "background", color: "#f0ead8", color2: "#e3d7bd" }),
      api.guilloche({ name: "guilloche", style: "combo", color: "#2b6b5e", color2: "#8a5a2b", lineWidth: 0.07,
        gradient: { from: "#2b6b5e", to: "#8a5a2b" },
        field: { sub: "net", spacingMm: 2.2, ampMm: 2.6, cycles: 7, crossed: true }, combo: { fieldOpacity: 0.35 },
        rosette: { radiusMm: 11, placement: "center", layers: [ { k: 15.4, dFrac: 0.38, turns: 30, rScale: 1 }, { k: 9.2, dFrac: 0.6, turns: 24, rScale: 0.45 } ] } }),
      api.pattern({ name: "pattern", color: "#6b3f2b", opacity: 0.22 }),
      api.component({ name: "ATC", items: [
        { svg: makeTornStrip({ color: "#cdb894" }).svg, x: 6, y: 60, w: 46, h: 9, rotation: -3, opacity: 0.95 },
        { svg: makeStampCutout({ value: "1.20" }).svg, x: 33, y: 9, w: 23, h: 29, rotation: 5 },
        { svg: makePostmark({ date: "27 X 26" }).svg, x: 26, y: 26, w: 30, h: 16, rotation: -14, opacity: 0.9 },
      ] }),
    ],
  });

  reg.registerLocale("fr", { "preset.stamp": "Timbre commémoratif", "preset.banknote": "Billet fantaisie", "preset.atc": "ATC (carte d'artiste)" });
  reg.registerLocale("en", { "preset.stamp": "Commemorative stamp", "preset.banknote": "Fantasy banknote", "preset.atc": "ATC (artist card)" });
}
