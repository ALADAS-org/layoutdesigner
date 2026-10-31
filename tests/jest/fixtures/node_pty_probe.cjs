// =====================================================================================
// node_pty_probe.cjs — does node-pty load and run a shell in Electron's Node? (N0.5)
// =====================================================================================
// Run by tests/jest/unit/server/node_pty_electron.test.js with the Electron binary in
// Node mode (ELECTRON_RUN_AS_NODE=1), i.e. with the same Node ABI as the main process:
// node-pty is rebuilt for Electron (postinstall: electron-rebuild), so plain Node
// cannot load it. Contract: docs/contracts/OUTPUT_PANEL.md §6, §10.
// Prints a JSON report on stdout; exit code 0 when the shell echoed the marker.
// =====================================================================================
'use strict';

const path = require('path');

const MARKER = 'ld-pty-ok';
const ROOT = path.join(__dirname, '..', '..', '..');
const isWindows = process.platform === 'win32';
// Default shell of the contract: PowerShell on Windows, $SHELL elsewhere.
const shell = isWindows ? 'powershell.exe' : (process.env.SHELL || '/bin/sh');

function report(ok, details) {
  process.stdout.write(JSON.stringify({ ok, shell, ...details }) + '\n');
  process.exit(ok ? 0 : 1);
}

let pty;
try {
  pty = require('node-pty');
} catch (err) {
  report(false, { stage: 'load', error: err.message });
}

let output = '';
const term = pty.spawn(shell, [], { name: 'xterm-color', cols: 80, rows: 24, cwd: ROOT, env: process.env });
const timer = setTimeout(() => { term.kill(); report(false, { stage: 'timeout', output }); }, 15000);

term.onData((data) => {
  output += data;
  if (output.includes(MARKER)) {
    clearTimeout(timer);
    term.kill();
    report(true, { stage: 'echo' });
  }
});
// The command builds the marker from two halves, so that the echoed command line
// never contains it — only the shell's output does.
term.write((isWindows ? "echo ('ld-pty' + '-ok')" : 'echo "ld-pty""-ok"') + '\r');
