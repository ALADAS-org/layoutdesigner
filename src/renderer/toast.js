// =====================================================================================
// toast.js — small notifications (renderer, ESM) — N0.3
// =====================================================================================
// Thin wrapper around iziToast (loaded as a classic script by index.html, global
// `iziToast`), so the rest of the code does not depend on the library directly.
// =====================================================================================

export function createToaster(win = window) {
  return {
    warning: (title, message) =>
      win.iziToast.warning({ title, message, position: 'bottomRight', timeout: 8000, class: 'LdToast' })
  };
}
