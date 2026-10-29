// =====================================================================================
// about_dialog.js — Help › About dialog (renderer, ESM) — N0.3
// =====================================================================================
// A modal jQuery UI dialog, after Cryptocalc's vizjet dialogs. jQuery and jQuery UI are
// loaded as classic scripts by index.html (global `jQuery`).
// =====================================================================================

// options: { t (translator), version, $ (jQuery) }
export function createAboutDialog(host, { t, version, $ = host.ownerDocument.defaultView.jQuery }) {
  host.querySelector('.AboutVersion').textContent = version;
  const dialog = $(host);
  dialog.dialog({
    autoOpen: false,
    modal: true,
    resizable: false,
    width: 380,
    title: t('About/Title', 'About Layout Designer'),
    classes: { 'ui-dialog': 'LdDialog' },
    buttons: [{ text: t('Dialog/OK', 'OK'), click: () => dialog.dialog('close') }]
  });
  host.hidden = false; // jQuery UI now controls its visibility

  return {
    open: () => dialog.dialog('open'),
    close: () => dialog.dialog('close'),
    isOpen: () => dialog.dialog('isOpen')
  };
}
