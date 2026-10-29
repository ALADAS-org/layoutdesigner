// =====================================================================================
// status_bar.js — status bar (renderer, ESM) — N0.3
// =====================================================================================
// Witness: the message of a failed Action / Command (accepted N0.2 proposal).
// =====================================================================================

export function createStatusBar(root) {
  const message = root.querySelector('.StatusBarMessage');

  function show(text, kind = 'info') {
    message.textContent = text;
    message.classList.toggle('is-error', kind === 'error');
  }

  return {
    show,
    showError: (text) => show(text, 'error'),
    clear: () => show('')
  };
}
