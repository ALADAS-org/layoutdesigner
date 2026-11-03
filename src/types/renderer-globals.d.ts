// Globals of the renderer window (checked by `npm run typecheck`).
// jQuery, jQuery UI and iziToast are loaded by <script> tags in index.html; they are
// typed `any` — no @types package was added (dependency budget).
import type { LdBridge } from './contracts';

declare global {
  interface Window {
    ld: LdBridge;
    iziToast: any;
    jQuery: any;
  }
  const $: any;
  const jQuery: any;
  const iziToast: any;
}

export {};
