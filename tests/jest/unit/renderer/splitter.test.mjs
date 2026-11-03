// Unit tests — splitter drag logic (docs/contracts/OUTPUT_PANEL.md §2). The pointer
// leaves the 4 px handle at once, so moves are followed on the window, and a failing
// setPointerCapture (seen on Windows) must not stop the drag.
import { installSplitter } from '../../../../src/renderer/splitter.js';

function fakeTarget() {
  const listeners = {};
  return {
    listeners,
    addEventListener: (type, fn) => { (listeners[type] ||= new Set()).add(fn); },
    removeEventListener: (type, fn) => { listeners[type]?.delete(fn); },
    emit: (type, event) => { for (const fn of [...(listeners[type] || [])]) fn(event); }
  };
}

function setup({ captureThrows = false } = {}) {
  const win = fakeTarget();
  const handle = Object.assign(fakeTarget(), {
    ownerDocument: { defaultView: win },
    classList: { add() {}, remove() {} },
    setPointerCapture: () => { if (captureThrows) throw new Error('InvalidStateError'); }
  });
  const sizes = [];
  let ended = 0;
  installSplitter(handle, { axis: 'y', start: () => 150, resize: (s) => sizes.push(s), end: () => { ended += 1; } });
  const press = (clientY) => handle.emit('pointerdown', { button: 0, clientY, pointerId: 1, preventDefault() {} });
  return { win, press, sizes, ended: () => ended };
}

describe('installSplitter', () => {
  test('a drag up by 100 px asks for 100 px more, moves being followed on the window', () => {
    const { win, press, sizes, ended } = setup();
    press(500);
    win.emit('pointermove', { clientY: 450 });
    win.emit('pointermove', { clientY: 400 });
    win.emit('pointerup', {});
    expect(sizes).toEqual([200, 250]);
    expect(ended()).toBe(1);
  });

  test('still works when pointer capture is refused', () => {
    const { win, press, sizes } = setup({ captureThrows: true });
    press(500);
    win.emit('pointermove', { clientY: 400 });
    expect(sizes).toEqual([250]);
  });

  test('moves after the release are ignored', () => {
    const { win, press, sizes } = setup();
    press(500);
    win.emit('pointerup', {});
    win.emit('pointermove', { clientY: 100 });
    expect(sizes).toEqual([]);
  });
});
