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
// N0.6 bis (PLUGIN_DEPENDENCIES.md §6): state `blocked`; bulk actions after Gmail — the
// row's check box selects it, above the list a select-all box, the action (Disable /
// Enable) and Apply on its right; a confirmation when Apply would leave a plugin blocked,
// offering the other plugins concerned (transitively) with a check box, checked.
// =====================================================================================

/** @typedef {'interface' | 'plugins' | 'system'} PreferencesCategory */
/**
 * @typedef {{ id: string, displayName: string, kind: string, keywords: string[],
 *             state: 'loaded' | 'disabled' | 'failed' | 'blocked', reason?: string,
 *             dependencies?: string[], enabled: boolean }} PluginRow — state: at this start;
 *             enabled: saved for the next; dependencies: the ids it declares
 */
/** @typedef {import('../../types/contracts').LanguageInfo} LanguageInfo */

/**
 * Pure: the plugins that depend on `ids`, directly or not, in list order, `ids` excluded.
 * @param {string[]} ids @param {PluginRow[]} rows
 */
export function dependentsOf(ids, rows) {
  const found = new Set(ids);
  let grew = true;
  while (grew) {
    grew = false;
    for (const r of rows) {
      if (!found.has(r.id) && (r.dependencies ?? []).some((d) => found.has(d))) {
        found.add(r.id);
        grew = true;
      }
    }
  }
  return rows.filter((r) => found.has(r.id) && !ids.includes(r.id));
}

/**
 * Pure: the plugins `ids` need, directly or not, in list order, `ids` excluded.
 * @param {string[]} ids @param {PluginRow[]} rows
 */
export function prerequisitesOf(ids, rows) {
  const found = new Set(ids);
  let grew = true;
  while (grew) {
    grew = false;
    for (const r of rows) {
      if (found.has(r.id)) {
        for (const d of r.dependencies ?? []) {
          if (!found.has(d) && rows.some((x) => x.id === d)) {
            found.add(d);
            grew = true;
          }
        }
      }
    }
  }
  return rows.filter((r) => found.has(r.id) && !ids.includes(r.id));
}

/**
 * @param {HTMLElement} host
 * @param {{ t: import('../../renderer/i18n.js').Translate,
 *           onLanguage: (language: string | null) => Promise<void>,
 *           onTheme: (theme: string) => Promise<void>,
 *           onReset: () => Promise<{ language: string | null, theme: string } | null>,
 *           onPluginsEnabled?: (ids: string[], enabled: boolean) => Promise<void>,
 *           $?: any }} options — onReset resolves with the new state, or null when
 *           the user cancelled its confirmation
 */
export function createPreferencesDialog(host, { t, onLanguage, onTheme, onReset, onPluginsEnabled = async () => {}, $ = /** @type {Window} */ (host.ownerDocument.defaultView).jQuery }) {
  const doc = host.ownerDocument;
  const categories = /** @type {HTMLElement[]} */ ([...host.querySelectorAll('.PreferencesCategory')]);
  const pages = /** @type {HTMLElement[]} */ ([...host.querySelectorAll('.PreferencesPage')]);
  const select = /** @type {HTMLSelectElement} */ (host.querySelector('.PreferencesLanguage'));
  const themeSelect = /** @type {HTMLSelectElement} */ (host.querySelector('.PreferencesTheme'));
  const fileLabel = /** @type {HTMLElement} */ (host.querySelector('.PreferencesFile'));
  const resetButton = /** @type {HTMLButtonElement} */ (host.querySelector('.PreferencesReset'));
  const pluginsCategory = /** @type {HTMLElement} */ (host.querySelector('.PreferencesCategory[data-category="plugins"]'));
  const pluginsList = /** @type {HTMLElement} */ (host.querySelector('.PreferencesPlugins'));
  const selectAll = /** @type {HTMLInputElement} */ (host.querySelector('.PreferencesPluginsSelectAll'));
  const actionSelect = /** @type {HTMLSelectElement} */ (host.querySelector('.PreferencesPluginsAction'));
  const applyButton = /** @type {HTMLButtonElement} */ (host.querySelector('.PreferencesPluginsApply'));
  const countLabel = /** @type {HTMLElement} */ (host.querySelector('.PreferencesPluginsCount'));
  const confirmHost = /** @type {HTMLElement} */ (host.querySelector('.PreferencesPluginsConfirm'));
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

  /** @param {PluginRow} plugin */
  function stateText(plugin) {
    const atStart = plugin.state !== 'disabled';
    if (plugin.enabled !== atStart) return plugin.enabled ? t('Plugin/EnabledNext', 'enabled (at the next start)') : t('Plugin/DisabledNext', 'disabled (at the next start)');
    return { loaded: t('Plugin/Loaded', 'loaded'), disabled: t('Plugin/Disabled', 'disabled'), failed: t('Plugin/Failed', 'failed'), blocked: t('Plugin/Blocked', 'blocked') }[plugin.state];
  }

  /** @type {PluginRow[]} */
  let rows = [];
  /** @type {Set<string>} */
  let selection = new Set();

  function updateBulk() {
    const n = selection.size;
    selectAll.checked = n > 0 && n === rows.length;
    selectAll.indeterminate = n > 0 && n < rows.length;
    applyButton.disabled = n === 0;
    countLabel.textContent = n > 0 ? t('Preferences/PluginsSelected', '{n} selected').replace('{n}', String(n)) : '';
  }

  function renderPlugins() {
    pluginsCategory.hidden = rows.length === 0;
    pluginsList.replaceChildren(
      ...rows.map((p) => {
        const row = el(`PreferencesPlugin${selection.has(p.id) ? ' is-selected' : ''}`);
        row.dataset.plugin = p.id;
        const box = doc.createElement('input');
        box.type = 'checkbox';
        box.className = 'PreferencesPluginSelect';
        box.checked = selection.has(p.id);
        box.setAttribute('aria-label', p.displayName);
        const text = el('PreferencesPluginText');
        const tags = el('PreferencesPluginTags', `${t('Preferences/PluginTags', 'Tags')}: `);
        tags.append(...p.keywords.map((k) => el('PreferencesPluginTag', k)));
        text.append(el('PreferencesPluginName', p.displayName), el('PreferencesPluginId', `${p.id} · ${p.kind}`));
        if (p.keywords.length > 0) text.append(tags);
        const changed = p.enabled !== (p.state !== 'disabled');
        const state = el(`PreferencesPluginState${changed ? '' : ` is-${p.state}`}`, stateText(p));
        if (p.reason !== undefined) state.title = p.reason;
        box.addEventListener('change', () => {
          if (box.checked) selection.add(p.id);
          else selection.delete(p.id);
          row.classList.toggle('is-selected', box.checked);
          updateBulk();
        });
        row.append(box, text, state);
        return row;
      })
    );
    updateBulk();
  }

  selectAll.addEventListener('change', () => {
    selection = selectAll.checked ? new Set(rows.map((r) => r.id)) : new Set();
    renderPlugins();
  });

  /**
   * Asks whether to include the other plugins concerned. Resolves with true (include
   * them), false (only the selection) or null (cancelled).
   * @param {string} title @param {string} message @param {PluginRow[]} others @param {string} alsoLabel
   * @returns {Promise<boolean | null>}
   */
  function confirmOthers(title, message, others, alsoLabel) {
    return new Promise((resolve) => {
      /** @type {boolean | null} */
      let answer = null;
      const box = /** @type {HTMLInputElement} */ (confirmHost.querySelector('.PreferencesPluginsConfirmAlso input'));
      /** @type {HTMLElement} */ (confirmHost.querySelector('.PreferencesPluginsConfirmMessage')).textContent = message;
      /** @type {HTMLElement} */ (confirmHost.querySelector('.PreferencesPluginsConfirmList')).replaceChildren(
        ...others.map((o) => {
          const li = doc.createElement('li');
          li.textContent = o.displayName;
          return li;
        })
      );
      /** @type {HTMLElement} */ (confirmHost.querySelector('.PreferencesPluginsConfirmAlso span')).textContent = alsoLabel;
      box.checked = true;
      confirmHost.hidden = false;
      $(confirmHost).dialog({
        modal: true,
        resizable: false,
        width: 460,
        title,
        classes: { 'ui-dialog': 'LdDialog LdPluginsConfirm' },
        buttons: [
          { text: t('Preferences/PluginsApply', 'Apply'), click: () => { answer = box.checked; $(confirmHost).dialog('close'); } },
          { text: t('Dialog/Cancel', 'Cancel'), click: () => $(confirmHost).dialog('close') }
        ],
        close: () => {
          $(confirmHost).dialog('destroy');
          confirmHost.hidden = true;
          resolve(answer);
        }
      });
    });
  }

  /** @param {PluginRow[]} list */
  const namesOf = (list) => list.map((r) => `« ${r.displayName} »`).join(', ');

  applyButton.addEventListener('click', async () => {
    const enable = actionSelect.value === 'enable';
    const ids = rows.filter((r) => selection.has(r.id)).map((r) => r.id);
    const chosen = rows.filter((r) => selection.has(r.id));
    // Only what Apply would leave blocked is offered (§6).
    const others = enable
      ? prerequisitesOf(ids, rows).filter((r) => !r.enabled)
      : dependentsOf(ids, rows).filter((r) => r.enabled);
    let targets = chosen;
    if (others.length > 0) {
      const include = enable
        ? await confirmOthers(t('Plugin/ConfirmEnableTitle', 'Enable plugins'),
          t('Plugin/ConfirmEnableMessage', 'These disabled plugins are needed by {names}:').replace('{names}', namesOf(chosen)),
          others, t('Plugin/ConfirmEnableAlso', 'Enable them too'))
        : await confirmOthers(t('Plugin/ConfirmDisableTitle', 'Disable plugins'),
          t('Plugin/ConfirmDisableMessage', 'Disabling {names} will keep these plugins from loading:').replace('{names}', namesOf(chosen)),
          others, t('Plugin/ConfirmDisableAlso', 'Disable them too'));
      if (include === null) return;
      if (include) targets = [...chosen, ...others];
    }
    const changing = targets.filter((r) => r.enabled !== enable);
    for (const r of changing) r.enabled = enable;
    selection = new Set();
    renderPlugins();
    if (changing.length > 0) await onPluginsEnabled(changing.map((r) => r.id), enable);
  });

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
      rows = state.plugins ?? [];
      selection = new Set();
      renderPlugins();
      showCategory(category);
      dialog.dialog('open');
      if (focusLanguage) select.focus();
    },
    close: () => dialog.dialog('close'),
    isOpen: () => dialog.dialog('isOpen')
  };
}
