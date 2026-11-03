// End-to-end test — N0.5 step 3: bottom panel shell (splitter, fold button, tabs) and
// the workspace layout with the reserved Calques column (docs/contracts/OUTPUT_PANEL.md).
'use strict';

const { test, expect } = require('@playwright/test');
const { launch } = require('./launch.js');

test.describe('bottom panel', () => {
  let app;
  let win;

  test.beforeAll(async () => {
    ({ app, win } = await launch());
  });

  test.afterAll(async () => {
    if (app) await app.close();
  });

  const panel = () => win.locator('.BottomPanel');
  const body = () => win.locator('.BottomPanelBody');
  const tab = (name) => win.locator(`.BottomPanelTab[data-tab="${name}"]`);
  const fold = () => win.locator('.BottomPanelFold');
  const box = (selector) => win.locator(selector).boundingBox();

  test('first launch: unfolded, Output active, body 18.75 % of the window high', async () => {
    await expect(win.locator('.BottomPanelTab')).toHaveText(['Output', 'Debug Console', 'Terminal']);
    await expect(tab('output')).toHaveAttribute('aria-selected', 'true');
    await expect(win.locator('#panel_output')).toBeVisible();
    await expect(fold()).toHaveAttribute('aria-expanded', 'true');
    const height = await win.evaluate(() => window.innerHeight);
    const { height: bodyHeight } = await box('.BottomPanelBody');
    expect(Math.abs(bodyHeight - height * 0.1875)).toBeLessThanOrEqual(1);
  });

  test('layout: document area above the panel, the panel spans the document area', async () => {
    const doc = await box('#document_area');
    const splitter = await box('.BottomPanelSplitter');
    const tabRow = await box('.BottomPanelTabRow');
    const status = await box('#status_bar');
    expect(splitter.height).toBe(4);
    expect(Math.round(doc.y + doc.height)).toBe(Math.round(splitter.y));
    expect(splitter.x).toBe(doc.x);
    expect(splitter.width).toBe(doc.width);
    expect(tabRow.y).toBeGreaterThan(splitter.y);
    const { y: bodyY, height: bodyH } = await box('.BottomPanelBody');
    expect(Math.round(bodyY + bodyH)).toBe(Math.round(status.y));
  });

  test('the Calques column is reserved on the right, empty and not shown', async () => {
    const order = await win.evaluate(() =>
      [...document.getElementById('workspace').children].map((el) => el.id || el.className));
    expect(order).toEqual(['WorkspaceMain', 'calques_column']);
    await expect(win.locator('#calques_column')).toBeHidden();
    await expect(win.locator('#workspace')).not.toHaveClass(/is-ide/);
  });

  test('the fold button folds and unfolds; the tab row stays visible', async () => {
    await fold().click();
    await expect(panel()).toHaveClass(/is-folded/);
    await expect(fold()).toHaveAttribute('aria-expanded', 'false');
    await expect(body()).toBeHidden();
    await expect(win.locator('.BottomPanelTabRow')).toBeVisible();
    await expect(win.locator('.BottomPanelSplitter')).toBeHidden();
    await fold().click();
    await expect(body()).toBeVisible();
  });

  test('a click on a tab of a folded panel unfolds it on that tab', async () => {
    await fold().click();
    await tab('terminal').click();
    await expect(body()).toBeVisible();
    await expect(tab('terminal')).toHaveAttribute('aria-selected', 'true');
    await expect(win.locator('#panel_terminal')).toBeVisible();
    await expect(win.locator('#panel_output')).toBeHidden();
    await tab('output').click();
  });

  test('dragging the splitter resizes the panel, within the limits', async () => {
    const s = await box('.BottomPanelSplitter');
    const x = s.x + s.width / 2;
    const y = s.y + 2;
    const before = (await box('.BottomPanelBody')).height;
    await win.mouse.move(x, y);
    await win.mouse.down();
    await win.mouse.move(x, y - 100, { steps: 5 });
    await win.mouse.up();
    expect(Math.round((await box('.BottomPanelBody')).height)).toBe(Math.round(before + 100));
    // Far down: the body keeps its minimum (about three lines).
    const s2 = await box('.BottomPanelSplitter');
    await win.mouse.move(x, s2.y + 2);
    await win.mouse.down();
    await win.mouse.move(x, s2.y + 2000, { steps: 5 });
    await win.mouse.up();
    expect((await box('.BottomPanelBody')).height).toBe(60);
    // Far up: the document area keeps 100 px.
    const s3 = await box('.BottomPanelSplitter');
    await win.mouse.move(x, s3.y + 2);
    await win.mouse.down();
    await win.mouse.move(x, 0, { steps: 5 });
    await win.mouse.up();
    expect(Math.round((await box('#document_area')).height)).toBe(100);
  });
});

test.describe('bottom panel Actions', () => {
  let app;
  let win;

  test.beforeAll(async () => {
    ({ app, win } = await launch());
  });

  test.afterAll(async () => {
    if (app) await app.close();
  });

  const tab = (name) => win.locator(`.BottomPanelTab[data-tab="${name}"]`);
  const item = (actionId) => win.locator(`.MenubarItem[data-action="${actionId}"]`);

  test('the View menu lists them with their shortcuts', async () => {
    await expect(item('view.togglePanel').locator('.MenubarItemShortcut')).toHaveText('Ctrl+J');
    await expect(item('view.showOutput').locator('.MenubarItemShortcut')).toHaveText('Ctrl+Shift+U');
    await expect(item('view.showDebugConsole').locator('.MenubarItemShortcut')).toHaveText('Ctrl+Shift+Y');
    await expect(item('view.showTerminal').locator('.MenubarItemShortcut')).toHaveText('Ctrl+Shift+T');
    await expect(item('view.togglePanel').locator('.MenubarItemLabel')).toHaveText('Show / Hide Panel');
  });

  test('Ctrl+J folds and unfolds the panel', async () => {
    await win.mouse.click(600, 300);
    await win.keyboard.press('Control+J');
    await expect(win.locator('.BottomPanel')).toHaveClass(/is-folded/);
    await win.keyboard.press('Control+J');
    await expect(win.locator('.BottomPanel')).not.toHaveClass(/is-folded/);
  });

  test('the show Actions unfold the panel on their tab', async () => {
    await win.keyboard.press('Control+J'); // fold
    await win.keyboard.press('Control+Shift+T');
    await expect(win.locator('.BottomPanel')).not.toHaveClass(/is-folded/);
    await expect(tab('terminal')).toHaveAttribute('aria-selected', 'true');
    await win.keyboard.press('Control+Shift+Y');
    await expect(tab('debugConsole')).toHaveAttribute('aria-selected', 'true');
    await win.keyboard.press('Control+Shift+U');
    await expect(tab('output')).toHaveAttribute('aria-selected', 'true');
  });

  test('the palette lists them under View', async () => {
    await win.keyboard.press('Control+Shift+P');
    await win.locator('.CommandPaletteInput').fill('panel');
    await expect(win.locator('.CommandPaletteItem')).toHaveText(['View: Show / Hide Panel']);
    await win.keyboard.press('Escape');
  });
});

test('French labels of the panel and its Actions', async () => {
  const { app, win } = await launch({ lang: 'fr' });
  try {
    await expect(win.locator('.BottomPanelTab')).toHaveText(['Sortie', 'Console de débogage', 'Terminal']);
    await expect(win.locator('.MenubarItem[data-action="view.togglePanel"] .MenubarItemLabel'))
      .toHaveText('Afficher / masquer le panneau');
  } finally {
    await app.close();
  }
});
