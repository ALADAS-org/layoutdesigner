// =====================================================================================
// status_bar.js — status bar (renderer, ESM) — N0.3
// =====================================================================================
// Witness: the message of a failed Action / Command (accepted N0.2 proposal).
// =====================================================================================

/** @param {HTMLElement} root */
export function createStatusBar(root) {
  const message = /** @type {HTMLElement} */ (root.querySelector('.StatusBarMessage'));

  /** @param {string} text @param {'info' | 'warn' | 'error'} [kind] */
  function show(text, kind = 'info') {
    message.textContent = text;
    message.classList.toggle('is-error', kind === 'error');
    message.classList.toggle('is-warn', kind === 'warn'); // N0.6 bis: a blocked plugin
  }

  return {
    show,
    showError: (/** @type {string} */ text) => show(text, 'error'),
    showWarning: (/** @type {string} */ text) => show(text, 'warn'),
    clear: () => show('')
  };
}
