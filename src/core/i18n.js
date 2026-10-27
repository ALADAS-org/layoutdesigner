// =====================================================================================
// =====================================  i18n.js  =====================================
// =====================================================================================
// i18n minimal (cf. ARCHITECTURE §6). Dictionnaires fr/en ; t(key) avec repli sur la clé.
// Les plugins peuvent enrichir via registry.registerLocale (fusionnés ici au démarrage).
"use strict";

export const BASE_LOCALES = {
  fr: {
    "app.title": "Layout Designer — prototype",
    "menu.format": "Format",
    "menu.language": "Langue",
    "panel.layers": "Couches",
    "action.undo": "Annuler",
    "action.redo": "Rétablir",
    "action.up": "Monter",
    "action.down": "Descendre",
    "action.hide": "Masquer",
    "action.show": "Afficher",
    "prop.opacity": "Opacité",
    "prop.symmetry": "Symétrie kaléidoscope (quadrant)",
    "guides.show": "Repères d'atelier",
    "status.dirty": "modifié",
    "status.clean": "sauvé",
  },
  en: {
    "app.title": "Layout Designer — prototype",
    "menu.format": "Format",
    "menu.language": "Language",
    "panel.layers": "Layers",
    "action.undo": "Undo",
    "action.redo": "Redo",
    "action.up": "Up",
    "action.down": "Down",
    "action.hide": "Hide",
    "action.show": "Show",
    "prop.opacity": "Opacity",
    "prop.symmetry": "Kaleidoscope symmetry (quadrant)",
    "guides.show": "Print guides",
    "status.dirty": "modified",
    "status.clean": "saved",
  },
};

export class I18n {
  constructor(locales, lang = "fr") {
    this.locales = locales;
    this.lang = lang;
  }
  setLang(lang) {
    this.lang = lang;
  }
  t(key) {
    const d = this.locales[this.lang] || {};
    return d[key] != null ? d[key] : key;
  }
}
