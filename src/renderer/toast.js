// =====================================================================================
// toast.js — notifications (renderer, ESM) — N0.3
// =====================================================================================
// Thin wrapper around iziToast (loaded as a classic script by index.html, global
// `iziToast`), so the rest of the code does not depend on the library directly.
// =====================================================================================

// Escapes text placed in iziToast's HTML button markup.
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function createToaster(win = window) {
  return {
    // Modal warning, centred in the window: title and message on two lines, an OK
    // button on its own line below (PO decision). Resolves once dismissed (OK or Esc).
    modalWarning: (title, message, okLabel = 'OK') =>
      new Promise((resolve) => {
        const doc = win.document;
        let done = false;
        const onKey = (event) => {
          if (event.key !== 'Escape') return;
          event.preventDefault();
          event.stopPropagation();
          const toast = doc.querySelector('.iziToast.LdModalToast');
          if (toast) win.iziToast.hide({}, toast, 'escape');
        };
        doc.addEventListener('keydown', onKey, true);
        win.iziToast.warning({
          class: 'LdToast LdModalToast',
          title,
          message,
          layout: 2,
          position: 'center',
          overlay: true,
          overlayClose: false,
          close: false,
          drag: false,
          timeout: false,
          progressBar: false,
          zindex: 2000,
          buttons: [
            [
              `<button class="LdToastOk">${escapeHtml(okLabel)}</button>`,
              (instance, toast) => instance.hide({}, toast, 'ok'),
              true // focus the button
            ]
          ],
          onClosed: () => {
            if (done) return;
            done = true;
            doc.removeEventListener('keydown', onKey, true);
            resolve();
          }
        });
      })
  };
}
