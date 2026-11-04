// Globals of the renderer window (checked by `npm run typecheck`).
// jQuery, jQuery UI and iziToast are loaded by <script> tags in index.html; they are
// typed `any` — no @types package was added (dependency budget). xterm.js and its fit
// add-on are loaded the same way, and ship their own types (N0.5 step 7).
import type { LdBridge } from './contracts';

declare global {
  interface Window {
    ld: LdBridge;
    iziToast: any;
    jQuery: any;
    Terminal: typeof import('@xterm/xterm').Terminal;
    FitAddon: typeof import('@xterm/addon-fit');
  }
  const $: any;
  const jQuery: any;
  const iziToast: any;
}

export {};
