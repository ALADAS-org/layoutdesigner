// End-to-end test — N0.5 step 7: the Terminal tab (docs/contracts/OUTPUT_PANEL.md §6):
// a real shell (PowerShell on Windows, $SHELL elsewhere) started in the application
// folder, shown with xterm.js, following the panel's size and the theme; `exit` gives a
// new shell, screen cleared.
'use strict';

const { test, expect } = require('@playwright/test');
const { launch, ROOT } = require('./launch.js');

test.describe('Terminal', () => {
  let app;
  let win;
  const cspViolations = [];

  test.beforeAll(async () => {
    ({ app, win } = await launch());
    win.on('console', (m) => { if (/Content Security Policy/.test(m.text())) cspViolations.push(m.text()); });
  });

  test.afterAll(async () => {
    if (app) await app.close();
  });

  const rows = () => win.locator('#panel_terminal .xterm-rows');
  const output = () => win.locator('#panel_output .OutputLine');
  /** The terminal's lines, trimmed. */
  const lines = async () => (await rows().innerText()).split('\n').map((l) => l.trim());

  test('Ctrl+Shift+T shows the Terminal and starts the shell in the application folder', async () => {
    await win.keyboard.press('Control+Shift+T');
    await expect(win.locator('#panel_terminal .xterm')).toBeVisible();
    await expect(output().filter({ hasText: 'Terminal:' }).filter({ hasText: `started in ${ROOT}` })).toHaveCount(1);
    await expect(win.locator('#panel_terminal .xterm-helper-textarea')).toBeFocused();
  });

  test('typing runs a command; its output comes back', async () => {
    await expect.poll(async () => (await rows().innerText()).trim().length, { timeout: 15000 }).toBeGreaterThan(0); // prompt
    await win.keyboard.type('echo ld-term-ok');
    await win.keyboard.press('Enter');
    // The output line is « ld-term-ok » alone; the command line also has the prompt.
    await expect.poll(async () => (await lines()).includes('ld-term-ok'), { timeout: 15000 }).toBe(true);
  });

  test('only the active tab is shown', async () => {
    await expect(win.locator('#panel_debugConsole')).toBeHidden();
    await expect(win.locator('#panel_output')).toBeHidden();
  });

  test('the terminal follows the panel height', async () => {
    const before = await win.locator('#panel_terminal .xterm-rows > div').count();
    await win.evaluate(() => {
      const handle = document.querySelector('.BottomPanelSplitter');
      const r = handle.getBoundingClientRect();
      const init = (clientY) => ({ bubbles: true, button: 0, pointerId: 1, clientX: r.left + 10, clientY });
      handle.dispatchEvent(new PointerEvent('pointerdown', init(r.top + 2)));
      window.dispatchEvent(new PointerEvent('pointermove', init(r.top - 150)));
      window.dispatchEvent(new PointerEvent('pointerup', init(r.top - 150)));
    });
    await expect.poll(() => win.locator('#panel_terminal .xterm-rows > div').count()).toBeGreaterThan(before);
  });

  test('the terminal follows the theme', async () => {
    const bg = () => win.locator('#panel_terminal .xterm-scrollable-element').evaluate((el) => getComputedStyle(el).backgroundColor);
    const before = await bg();
    await win.evaluate(() => {
      const r = document.documentElement;
      r.dataset.theme = r.dataset.theme === 'dark' ? 'light' : 'dark';
    });
    await expect.poll(bg).not.toBe(before);
  });

  test('exit gives a new shell, screen cleared, a line in Output', async () => {
    await win.locator('#panel_terminal .xterm-screen').click();
    await win.keyboard.type('exit');
    await win.keyboard.press('Enter');
    await expect(output().filter({ hasText: 'Terminal: shell ended' })).toHaveCount(1, { timeout: 15000 });
    await expect(output().filter({ hasText: `started in ${ROOT}` })).toHaveCount(2);
    await expect.poll(async () => (await lines()).includes('ld-term-ok'), { timeout: 15000 }).toBe(false);
    // The new shell works.
    await expect.poll(async () => (await rows().innerText()).trim().length, { timeout: 15000 }).toBeGreaterThan(0);
    await win.keyboard.type('echo ld-term-again');
    await win.keyboard.press('Enter');
    await expect.poll(async () => (await lines()).includes('ld-term-again'), { timeout: 15000 }).toBe(true);
  });

  test('xterm.js loads nothing the CSP blocks', async () => {
    expect(cspViolations).toEqual([]);
  });
});
