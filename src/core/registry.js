// =====================================================================================
// ===================================  registry.js  ===================================
// =====================================================================================
// Registre des contributions de plugins (cf. ARCHITECTURE §3). En v0 le plugin-host se
// réduit à : chaque builtin-plugin exporte register(reg) et pousse ses LayerType /
// Primitive / formats / locales ici. Pas encore de sandbox ni d'apiVersion négociée —
// c'est le point [À TRANCHER] du §16, hors périmètre du premier prototype.
//
// LayerType { type, label, schema?, createDefault(env), render(gfx, layer, doc, env) }
// Primitive { type, anchorModel, render(gfx, part, env) }        (utilisé par layer-pattern)
"use strict";

export class Registry {
  constructor() {
    this.layerTypes = new Map();
    this.primitives = new Map();
    this.formats = []; // FormatSpec[]
    this.locales = {}; // { fr:{...}, en:{...} }
    this.presets = new Map(); // id -> preset de document (§4.2)
  }

  registerLayerType(def) {
    if (!def || !def.type) throw new Error("registerLayerType: 'type' required");
    this.layerTypes.set(def.type, def);
    return this;
  }
  layerType(type) {
    return this.layerTypes.get(type) || null;
  }

  registerPrimitive(def) {
    if (!def || !def.type) throw new Error("registerPrimitive: 'type' required");
    this.primitives.set(def.type, def);
    return this;
  }
  primitive(type) {
    return this.primitives.get(type) || null;
  }

  registerFormats(list) {
    this.formats.push(...list);
    return this;
  }
  format(id) {
    return this.formats.find((f) => f.id === id) || null;
  }

  registerLocale(lang, dict) {
    this.locales[lang] = { ...(this.locales[lang] || {}), ...dict };
    return this;
  }

  registerPreset(id, preset) {
    this.presets.set(id, preset);
    return this;
  }
  preset(id) {
    return this.presets.get(id) || null;
  }

  /** Charge une liste de modules-plugins (chacun exporte `register(reg)`). */
  install(plugins) {
    for (const p of plugins) {
      if (typeof p.register === "function") p.register(this);
      else if (typeof p === "function") p(this);
    }
    return this;
  }
}
