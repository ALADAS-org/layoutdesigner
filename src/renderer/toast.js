// =====================================================================================
// toast.js — notifications (renderer, ESM) — N0.3
// =====================================================================================
// Thin wrapper around iziToast (loaded as a classic script by index.html, global
// `iziToast`), so the rest of the code does not depend on the library directly.
// =====================================================================================

// Escapes text placed in iziToast's HTML button markup.
/** @param {unknown} text */
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

// Pure: splits `text` into two lines of lengths as close as possible, at the space
// nearest to the middle (PO decision). `measure` gives a string's length (characters
// by default; the toaster passes the rendered width). No space → one line.
/**
 * @param {string} text
 * @param {(s: string) => number} [measure]
 * @returns {string[]}
 */
export function splitBalanced(text, measure = (s) => s.length) {
  // Ordinary spaces only: a no-break space (French « illisible ; ») keeps its words together.
  const words = String(text).trim().split(/[ \t\r\n]+/);
  if (words.length < 2) return [words.join(' ')];
  /** @type {{ gap: number, lines: string[] } | null} */
  let best = null;
  for (let i = 1; i < words.length; i += 1) {
    const first = words.slice(0, i).join(' ');
    const second = words.slice(i).join(' ');
    const gap = Math.abs(measure(first) - measure(second));
    if (best === null || gap < best.gap) best = { gap, lines: [first, second] };
  }
  return /** @type {{ lines: string[] }} */ (best).lines;
}

// Width of `text` in pixels for a CSS font, using an off-screen canvas.
/** @param {Document} doc @param {string} font @returns {(s: string) => number} */
function textWidth(doc, font) {
  const ctx = doc.createElement('canvas').getContext('2d');
  if (ctx === null) return (s) => s.length;
  ctx.font = font;
  return (s) => ctx.measureText(s).width;
}

/** @typedef {{ label: string, value: string, primary?: boolean }} ToastButton */

/** The PO's icons, relative to src/index.html: a warning, or an error (N0.5 step 6). */
const ICONS = Object.freeze({
  warning: '../assets/icons/warning_icn.png',
  error: '../assets/icons/error_icn.png'
});

/** @param {Window} [win] */
export function createToaster(win = window) {
  /**
   * Modal warning, centred in the window: title and message on two lines, the buttons on
   * their own line below (PO decision). Resolves with the value of the button pressed,
   * or null when dismissed with Esc. The first button has the focus.
   * @param {string} title @param {string} message @param {ToastButton[]} buttons
   * @param {{ icon?: keyof typeof ICONS }} [options] the icon: warning (default) or error
   * @returns {Promise<string | null>}
   */
  const modalChoice = (title, message, buttons, { icon = 'warning' } = {}) =>
    new Promise((resolve) => {
      const doc = win.document;
      /** @type {string | null} */
      let chosen = null;
      let done = false;
      /** @param {KeyboardEvent} event */
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
      // An error: iziToast's error style, a pale red background (PO, 2026-11-04).
      win.iziToast[icon === 'error' ? 'error' : 'warning']({
        class: 'LdToast LdModalToast',
        title,
        message: lines.map(escapeHtml).join('<br>'),
        layout: 2,
        iconUrl: ICONS[icon],
        position: 'center',
        overlay: true,
        overlayClose: false,
        close: false,
        drag: false,
        timeout: false,
        progressBar: false,
        zindex: 2000,
        buttons: buttons.map((b, i) => [
          `<button class="LdToastButton${b.primary === false ? ' LdSecondary' : ''}" data-value="${escapeHtml(b.value)}">${escapeHtml(b.label)}</button>`,
          (/** @type {any} */ instance, /** @type {HTMLElement} */ toast) => {
            chosen = b.value;
            instance.hide({}, toast, b.value);
          },
          i === 0 // focus the first button
        ]),
        onClosed: () => {
          if (done) return;
          done = true;
          doc.removeEventListener('keydown', onKey, true);
          resolve(chosen);
        }
      });
    });

  return {
    modalChoice,
    /** @param {string} title @param {string} message @param {string} [okLabel] @returns {Promise<void>} */
    modalWarning: async (title, message, okLabel = 'OK') => {
      await modalChoice(title, message, [{ label: okLabel, value: 'ok' }]);
    }
  };
}
