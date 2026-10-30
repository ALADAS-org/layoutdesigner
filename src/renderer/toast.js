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

// Pure: splits `text` into two lines of lengths as close as possible, at the space
// nearest to the middle (PO decision). `measure` gives a string's length (characters
// by default; the toaster passes the rendered width). No space → one line.
export function splitBalanced(text, measure = (s) => s.length) {
  const words = String(text).trim().split(/\s+/);
  if (words.length < 2) return [words.join(' ')];
  let best = null;
  for (let i = 1; i < words.length; i += 1) {
    const first = words.slice(0, i).join(' ');
    const second = words.slice(i).join(' ');
    const gap = Math.abs(measure(first) - measure(second));
    if (best === null || gap < best.gap) best = { gap, lines: [first, second] };
  }
  return best.lines;
}

// Width of `text` in pixels for a CSS font, using an off-screen canvas.
function textWidth(doc, font) {
  const ctx = doc.createElement('canvas').getContext('2d');
  ctx.font = font;
  return (s) => ctx.measureText(s).width;
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
        // Message on exactly two balanced lines, measured in the toast's own font.
        const lines = splitBalanced(message, textWidth(doc, '14px system-ui, sans-serif'));
        win.iziToast.warning({
          class: 'LdToast LdModalToast',
          title,
          message: lines.map(escapeHtml).join('<br>'),
          layout: 2,
          iconUrl: '../assets/icons/warning_icn.png', // relative to src/index.html
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
