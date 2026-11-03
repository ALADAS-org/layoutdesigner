// =====================================================================================
// vizjet_loader.js — inserts the vizjets' HTML into index.html (renderer, ESM)
// =====================================================================================
// A vizjet is one GUI component in its own folder, src/vizjets/<name>/ (.html + .css +
// .js), as in Cryptocalc. index.html holds a host element per vizjet:
//   <div id="status_bar" data-vizjet="vizjets/status_bar/status_bar.html"></div>
// The HTML is local, static and script-free; each vizjet's .js wires it afterwards.
// =====================================================================================

/** @param {Document} doc @param {(url: string) => Promise<string>} [fetchText] */
export async function loadVizjets(doc, fetchText = defaultFetchText) {
  const hosts = /** @type {HTMLElement[]} */ ([...doc.querySelectorAll('[data-vizjet]')]);
  await Promise.all(
    hosts.map(async (host) => {
      host.innerHTML = await fetchText(/** @type {string} */ (host.dataset.vizjet));
    })
  );
}

/** @param {string} url */
async function defaultFetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Cannot load vizjet '${url}' (HTTP ${response.status})`);
  return response.text();
}
