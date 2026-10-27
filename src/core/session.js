// =====================================================================================
// ===================================  session.js  ====================================
// =====================================================================================
// Une Session = un document ouvert + sa pile undo + un bus d'événements (cf. §5, §7).
// L'UI ne mute JAMAIS le document directement : elle appelle session.dispatch(cmd).
// Après toute mutation/undo/redo, la session émet "change" -> l'UI se redessine.
// Plusieurs sessions = plusieurs onglets (§7).
"use strict";

import { UndoStack } from "./undo.js";

export class Session {
  constructor(doc) {
    this.doc = doc;
    this.undo = new UndoStack();
    this.selection = null; // id de couche sélectionnée
    this._listeners = new Set();
  }

  on(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }
  emit(evt = "change") {
    for (const fn of this._listeners) fn(evt, this);
  }

  dispatch(cmd) {
    const out = this.undo.dispatch(cmd);
    this.emit("change");
    return out;
  }
  doUndo() {
    this.undo.undo();
    this.emit("change");
  }
  doRedo() {
    this.undo.redo();
    this.emit("change");
  }

  select(layerId) {
    this.selection = layerId;
    this.emit("selection");
  }

  get title() {
    return (this.doc.meta.title || "Untitled") + (this.undo.isDirty ? " *" : "");
  }
}
