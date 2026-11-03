// =====================================================================================
// shortcuts.js — keyboard shortcuts → Actions (renderer, ESM)
// =====================================================================================
// Contract: docs/contracts/ACTION_COMMAND.md §6.
// Shortcuts use Electron accelerator syntax: modifiers joined by '+', key last,
// e.g. 'Ctrl+Shift+P'. Supported modifiers: Ctrl / Control, Shift, Alt.
// =====================================================================================

/** @type {Record<string, Modifier | undefined>} */
const MODIFIER_ALIASES = { ctrl: 'Ctrl', control: 'Ctrl', shift: 'Shift', alt: 'Alt' };
/** @type {Modifier[]} */
const MODIFIER_ORDER = ['Ctrl', 'Alt', 'Shift'];

/** @typedef {{ ctrl: boolean, alt: boolean, shift: boolean, key: string }} ParsedShortcut */
/** @typedef {'Ctrl' | 'Alt' | 'Shift'} Modifier */
/** @typedef {Pick<KeyboardEvent, 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey' | 'key'>} KeyLike */

/**
 * Returns { ctrl, alt, shift, key } — key upper-cased. Throws on malformed input.
 * @param {string} shortcut
 * @returns {ParsedShortcut}
 */
export function parseShortcut(shortcut) {
  if (typeof shortcut !== 'string' || shortcut.trim() === '') {
    throw new TypeError(`Invalid shortcut: '${shortcut}'`);
  }
  const parts = shortcut.split('+').map((p) => p.trim());
  const key = /** @type {string} */ (parts.pop());
  if (key === '' || MODIFIER_ALIASES[key.toLowerCase()]) {
    throw new TypeError(`Invalid shortcut: '${shortcut}' (missing key)`);
  }
  /** @type {Set<Modifier>} */
  const mods = new Set();
  for (const part of parts) {
    const mod = MODIFIER_ALIASES[part.toLowerCase()];
    if (!mod) throw new TypeError(`Invalid shortcut: '${shortcut}' (unknown modifier '${part}')`);
    mods.add(mod);
  }
  return { ctrl: mods.has('Ctrl'), alt: mods.has('Alt'), shift: mods.has('Shift'), key: key.toUpperCase() };
}

/**
 * Canonical form, used to detect two Actions declaring the same shortcut.
 * @param {string} shortcut
 */
export function normalizeShortcut(shortcut) {
  const s = parseShortcut(shortcut);
  const mods = MODIFIER_ORDER.filter((m) => s[/** @type {'ctrl' | 'alt' | 'shift'} */ (m.toLowerCase())]);
  return [...mods, s.key].join('+');
}

/**
 * True when a KeyboardEvent-like object matches the shortcut.
 * @param {string} shortcut
 * @param {Partial<KeyLike>} event
 */
export function matchesShortcut(shortcut, event) {
  const s = parseShortcut(shortcut);
  return (
    s.ctrl === Boolean(event.ctrlKey) &&
    s.alt === Boolean(event.altKey) &&
    s.shift === Boolean(event.shiftKey) &&
    !event.metaKey &&
    typeof event.key === 'string' &&
    event.key.toUpperCase() === s.key
  );
}

/**
 * Listens to keydown on `target` and runs the Action whose shortcut matches.
 * @param {import('./action_registry.js').ActionRegistry} registry
 * @param {Pick<EventTarget, 'addEventListener'>} target
 */
export function installShortcuts(registry, target) {
  target.addEventListener('keydown', (e) => {
    const event = /** @type {KeyboardEvent} */ (e);
    const action = registry.list().find((a) => a.shortcut !== undefined && matchesShortcut(a.shortcut, event));
    if (!action) return;
    event.preventDefault();
    registry.trigger(action.id);
  });
}
