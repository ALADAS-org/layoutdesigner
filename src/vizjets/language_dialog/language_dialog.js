// =====================================================================================
// language_dialog.js — "Choose Language" dialog (renderer, ESM) — N0.3
// =====================================================================================
// A modal jQuery UI dialog (Cryptocalc model) with the available languages.
// choose(languages, current) resolves to the chosen code, or null when cancelled.
// =====================================================================================

// options: { t (translator), $ (jQuery) }
/**
 * @param {HTMLElement} host
 * @param {{ t: import('../../renderer/i18n.js').Translate, $?: any }} options
 */
export function createLanguageDialog(host, { t, $ = /** @type {Window} */ (host.ownerDocument.defaultView).jQuery }) {
  const doc = host.ownerDocument;
  const select = /** @type {HTMLSelectElement} */ (host.querySelector('.LanguageDialogSelect'));
  const dialog = $(host);
  /** @type {((value: string | null) => void) | null} */
  let settle = null;

  // Resolves the pending choose() once, whatever closed the dialog (OK, Cancel, Esc, ✕).
  /** @param {string | null} value */
  function finish(value) {
    const resolve = settle;
    settle = null;
    if (dialog.dialog('isOpen')) dialog.dialog('close');
    if (resolve) resolve(value);
  }

  dialog.dialog({
    autoOpen: false,
    modal: true,
    resizable: false,
    width: 360,
    title: t('Language/Title', 'Choose Language'),
    classes: { 'ui-dialog': 'LdDialog' },
    buttons: [
      { text: t('Dialog/OK', 'OK'), click: () => finish(select.value) },
      { text: t('Dialog/Cancel', 'Cancel'), class: 'LdSecondary', click: () => finish(null) }
    ],
    close: () => finish(null)
  });
  host.hidden = false; // jQuery UI now controls its visibility

  return {
    /**
     * @param {import('../../types/contracts').LanguageInfo[]} languages
     * @param {string} current
     * @returns {Promise<string | null>}
     */
    choose(languages, current) {
      select.replaceChildren(
        ...languages.map(({ code, name }) => {
          const option = doc.createElement('option');
          option.value = code;
          option.textContent = name;
          option.selected = code === current;
          return option;
        })
      );
      return new Promise((resolve) => {
        settle = resolve;
        dialog.dialog('open');
        select.focus();
      });
    }
  };
}
