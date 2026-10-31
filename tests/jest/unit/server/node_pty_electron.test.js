// Unit test — node-pty loads in Electron's Node and runs the platform shell (N0.5).
// node-pty is rebuilt for Electron by the postinstall script (electron-rebuild), so the
// probe runs with the Electron binary in Node mode, not with plain Node.
// Contract: docs/contracts/OUTPUT_PANEL.md §6, §10.
'use strict';

const path = require('path');
const { spawnSync } = require('child_process');
const electronPath = require('electron'); // in plain Node: the path of the Electron binary

const PROBE = path.join(__dirname, '..', '..', 'fixtures', 'node_pty_probe.cjs');

test('node-pty loads in Electron and the default shell echoes', () => {
  const run = spawnSync(electronPath, [PROBE], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    encoding: 'utf8',
    timeout: 30000
  });
  const line = (run.stdout || '').trim().split('\n').pop() || '{}';
  let result;
  try { result = JSON.parse(line); } catch { result = { ok: false, raw: run.stdout, stderr: run.stderr }; }
  // On failure the report says where it stopped: load (ABI / rebuild), timeout or echo.
  expect(result).toMatchObject({ ok: true });
}, 40000);
