// =====================================================================================
// ====================================  undo.js  ======================================
// =====================================================================================
// Pile Undo/Redo par session (cf. ARCHITECTURE §5). Une Command porte un label, une
// action do() et son inverse undo(). Coalescing optionnel par coalesceKey (ex. un drag
// qui émet 30 micro-déplacements = une seule entrée annulable).
//
// Command { label, do(), undo(), coalesceKey? , merge?(next) }
"use strict";

export class Command {
  constructor({ label, do: doFn, undo: undoFn, coalesceKey = null, merge = null }) {
    if (typeof doFn !== "function" || typeof undoFn !== "function") {
      throw new Error("Command: 'do' and 'undo' must be functions");
    }
    this.label = label || "command";
    this.do = doFn;
    this.undo = undoFn;
    this.coalesceKey = coalesceKey;
    this.merge = merge; // (nextCommand) => void  : absorbe la commande suivante coalescable
  }
}

export class UndoStack {
  constructor() {
    this._done = []; // commandes appliquées (la dernière est au sommet)
    this._undone = []; // commandes annulées, rejouables
    this._savedMark = null; // commande au sommet au dernier save -> dirty flag
  }

  get canUndo() {
    return this._done.length > 0;
  }
  get canRedo() {
    return this._undone.length > 0;
  }
  get isDirty() {
    return (this._done[this._done.length - 1] || null) !== this._savedMark;
  }

  /** Applique une commande et l'empile. Vide la pile redo. Gère le coalescing. */
  dispatch(cmd) {
    const top = this._done[this._done.length - 1];
    if (
      cmd.coalesceKey &&
      top &&
      top.coalesceKey === cmd.coalesceKey &&
      typeof top.merge === "function"
    ) {
      cmd.do();
      top.merge(cmd); // le sommet absorbe la nouvelle (met à jour son undo/état)
      this._undone.length = 0;
      return top;
    }
    cmd.do();
    this._done.push(cmd);
    this._undone.length = 0;
    return cmd;
  }

  undo() {
    const cmd = this._done.pop();
    if (!cmd) return null;
    cmd.undo();
    this._undone.push(cmd);
    return cmd;
  }

  redo() {
    const cmd = this._undone.pop();
    if (!cmd) return null;
    cmd.do();
    this._done.push(cmd);
    return cmd;
  }

  /** Marque l'état courant comme « sauvé » (pour le flag dirty). */
  markSaved() {
    this._savedMark = this._done[this._done.length - 1] || null;
  }

  labels() {
    return { undo: this._done.map((c) => c.label), redo: this._undone.map((c) => c.label) };
  }
}
