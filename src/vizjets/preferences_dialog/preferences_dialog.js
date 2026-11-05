// =====================================================================================
// preferences_dialog.js — Edit › Preferences… (renderer, ESM) — N0.5 step 6
// =====================================================================================
// Contract: docs/contracts/PREFERENCES.md §1–§3. A modal jQuery UI dialog after
// Inkscape: categories on the left (Interface, System), changes applied at once, one
// Close button. The dialog only shows and reports; saving, resetting and the warnings
// are done by its owner (main.js) through the callbacks.
// N0.6 (PLUGIN_API.md §15): a Plugins category, shown when there are plugins — one row
// per plugin: check box (enabled), display name, id · kind, tags, state at this start
// (the reason of a failure in a tooltip). A change applies at the next start.
// =====================================================================================

/** @typedef {'interface' | 'plugins' | 'system'} PreferencesCategory */
/**
 * @typedef {{ id: string, displayName: string, kind: string, keywords: string[],
 *             state: 'loaded' | 'disabled' | 'failed', reason?: string,
 *             enabled: boolean }} PluginRow — state: at this start; enabled: saved for the next
 */
/** @typedef {import('../../types/contracts').LanguageInfo} LanguageInfo */

/**
 * @param {HTMLElement} host
 * @param {{ t: import('../../renderer/i18n.js').Translate,
 *           onLanguage: (language: string | null) => Promise<void>,
 *           onTheme: (theme: string) => Promise<void>,
 *           onReset: () => Promise<{ language: string | null, theme: string } | null>,
 *           onPluginEnabled?: (id: string, enabled: boolean) => Promise<void>,
 *           $?: any }} options — onReset resolves with the new state, or null when
 *           the user cancelled its confirmation
 */
export function createPreferencesDialog(host, { t, onLanguage, onTheme, onReset, onPluginEnabled = async () => {}, $ = /** @type {Window} */ (host.ownerDocument.defaultView).jQuery }) {
  const doc = host.ownerDocument;
  const categories = /** @type {HTMLElement[]} */ ([...host.querySelectorAll('.PreferencesCategory')]);
  const pages = /** @type {HTMLElement[]} */ ([...host.querySelectorAll('.PreferencesPage')]);
  const select = /** @type {HTMLSelectElement} */ (host.querySelector('.PreferencesLanguage'));
  const themeSelect = /** @type {HTMLSelectElement} */ (host.querySelector('.PreferencesTheme'));
  const fileLabel = /** @type {HTMLElement} */ (host.querySelector('.PreferencesFile'));
  const resetButton = /** @type {HTMLButtonElement} */ (host.querySelector('.PreferencesReset'));
  const pluginsCategory = /** @type {HTMLElement} */ (host.querySelector('.PreferencesCategory[data-category="plugins"]'));
  const pluginsList = /** @type {HTMLElement} */ (host.querySelector('.PreferencesPlugins'));
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

  /** @param {string} className @param {string} [text] */
  const el = (className, text = '') => {
    const e = doc.createElement('div');
    e.className = className;
    e.textContent = text;
    return e;
  };

  /** @param {PluginRow} plugin @param {boolean} enabled the check box */
  function stateText(plugin, enabled) {
    const atStart = plugin.state !== 'disabled';
    if (enabled !== atStart) return enabled ? t('Plugin/EnabledNext', 'enabled (at the next start)') : t('Plugin/DisabledNext', 'disabled (at the next start)');
    return { loaded: t('Plugin/Loaded', 'loaded'), disabled: t('Plugin/Disabled', 'disabled'), failed: t('Plugin/Failed', 'failed') }[plugin.state];
  }

  /** @param {PluginRow[]} plugins */
  function renderPlugins(plugins) {
    pluginsCategory.hidden = plugins.length === 0;
    pluginsList.replaceChildren(
      ...plugins.map((p) => {
        const row = el('PreferencesPlugin');
        row.dataset.plugin = p.id;
        const box = doc.createElement('input');
        box.type = 'checkbox';
        box.className = 'PreferencesPluginEnabled';
        box.checked = p.enabled;
        box.setAttribute('aria-label', p.displayName);
        const text = el('PreferencesPluginText');
        const tags = el('PreferencesPluginTags', `${t('Preferences/PluginTags', 'Tags')}: `);
        tags.append(...p.keywords.map((k) => el('PreferencesPluginTag', k)));
        text.append(el('PreferencesPluginName', p.displayName), el('PreferencesPluginId', `${p.id} · ${p.kind}`));
        if (p.keywords.length > 0) text.append(tags);
        const state = el(`PreferencesPluginState is-${p.state}`, stateText(p, box.checked));
        if (p.reason !== undefined) state.title = p.reason;
        box.addEventListener('change', async () => {
          state.textContent = stateText(p, box.checked);
          p.enabled = box.checked;
          await onPluginEnabled(p.id, box.checked);
        });
        row.append(box, text, state);
        return row;
      })
    );
  }

  return {
    /**
     * @param {{ languages: LanguageInfo[], language: string | null, theme: string, file: string,
     *           plugins?: PluginRow[] }} state
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
      renderPlugins(state.plugins ?? []);
      showCategory(category);
      dialog.dialog('open');
      if (focusLanguage) select.focus();
    },
    close: () => dialog.dialog('close'),
    isOpen: () => dialog.dialog('isOpen')
  };
}
