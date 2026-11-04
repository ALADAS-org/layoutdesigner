// =====================================================================================
// preferences_dialog.js — Edit › Preferences… (renderer, ESM) — N0.5 step 6
// =====================================================================================
// Contract: docs/contracts/PREFERENCES.md §1–§3. A modal jQuery UI dialog after
// Inkscape: categories on the left (Interface, System), changes applied at once, one
// Close button. The dialog only shows and reports; saving, resetting and the warnings
// are done by its owner (main.js) through the callbacks.
// =====================================================================================

/** @typedef {'interface' | 'system'} PreferencesCategory */
/** @typedef {import('../../types/contracts').LanguageInfo} LanguageInfo */

/**
 * @param {HTMLElement} host
 * @param {{ t: import('../../renderer/i18n.js').Translate,
 *           onLanguage: (language: string | null) => Promise<void>,
 *           onTheme: (theme: string) => Promise<void>,
 *           onReset: () => Promise<{ language: string | null, theme: string } | null>,
 *           $?: any }} options — onReset resolves with the new state, or null when
 *           the user cancelled its confirmation
 */
export function createPreferencesDialog(host, { t, onLanguage, onTheme, onReset, $ = /** @type {Window} */ (host.ownerDocument.defaultView).jQuery }) {
  const doc = host.ownerDocument;
  const categories = /** @type {HTMLElement[]} */ ([...host.querySelectorAll('.PreferencesCategory')]);
  const pages = /** @type {HTMLElement[]} */ ([...host.querySelectorAll('.PreferencesPage')]);
  const select = /** @type {HTMLSelectElement} */ (host.querySelector('.PreferencesLanguage'));
  const themeSelect = /** @type {HTMLSelectElement} */ (host.querySelector('.PreferencesTheme'));
  const fileLabel = /** @type {HTMLElement} */ (host.querySelector('.PreferencesFile'));
  const resetButton = /** @type {HTMLButtonElement} */ (host.querySelector('.PreferencesReset'));
  const dialog = $(host);

  /** @param {string} category */
  function showCategory(category) {
    for (const c of categories) c.setAttribute('aria-selected', String(c.dataset.category === category));
    for (const p of pages) p.hidden = p.dataset.category !== category;
  }

  dialog.dialog({
    autoOpen: false,
    modal: true,
    resizable: false,
    width: 620,
    title: t('Preferences/Title', 'Preferences'),
    classes: { 'ui-dialog': 'LdDialog LdPreferencesDialog' },
    buttons: [{ text: t('Dialog/Close', 'Close'), click: () => dialog.dialog('close') }],
    // A warning toast shown over the dialog keeps the keyboard focus.
    open: () => {
      const instance = dialog.dialog('instance');
      const allow = instance._allowInteraction.bind(instance);
      instance._allowInteraction = (/** @type {Event} */ event) =>
        allow(event) || Boolean(/** @type {Element} */ (event.target).closest?.('.iziToast'));
    }
  });
  host.hidden = false; // jQuery UI now controls its visibility

  for (const c of categories) c.addEventListener('click', () => showCategory(String(c.dataset.category)));
  select.addEventListener('change', () => {
    onLanguage(select.value === '' ? null : select.value);
  });
  themeSelect.addEventListener('change', () => {
    onTheme(themeSelect.value);
  });
  resetButton.addEventListener('click', async () => {
    const state = await onReset();
    if (state !== null) {
      select.value = state.language ?? '';
      themeSelect.value = state.theme;
    }
  });

  return {
    /**
     * @param {{ languages: LanguageInfo[], language: string | null, theme: string, file: string }} state
     * @param {{ category?: PreferencesCategory, focusLanguage?: boolean }} [options]
     */
    open(state, { category = 'interface', focusLanguage = false } = {}) {
      const system = doc.createElement('option');
      system.value = '';
      system.textContent = t('Preferences/SystemLanguage', 'System language');
      select.replaceChildren(
        system,
        ...state.languages.map(({ code, name }) => {
          const option = doc.createElement('option');
          option.value = code;
          option.textContent = name;
          return option;
        })
      );
      select.value = state.language ?? '';
      themeSelect.value = state.theme;
      fileLabel.textContent = state.file;
      fileLabel.title = state.file;
      showCategory(category);
      dialog.dialog('open');
      if (focusLanguage) select.focus();
    },
    close: () => dialog.dialog('close'),
    isOpen: () => dialog.dialog('isOpen')
  };
}
