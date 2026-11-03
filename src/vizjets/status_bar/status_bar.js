// =====================================================================================
// status_bar.js — status bar (renderer, ESM) — N0.3
// =====================================================================================
// Witness: the message of a failed Action / Command (accepted N0.2 proposal).
// =====================================================================================

/** @param {HTMLElement} root */
export function createStatusBar(root) {
  const message = /** @type {HTMLElement} */ (root.querySelector('.StatusBarMessage'));

  /** @param {string} text @param {'info' | 'error'} [kind] */
  function show(text, kind = 'info') {
    message.textContent = text;
    message.classList.toggle('is-error', kind === 'error');
  }

  return {
    show,
    showError: (/** @type {string} */ text) => show(text, 'error'),
    clear: () => show('')
  };
}
