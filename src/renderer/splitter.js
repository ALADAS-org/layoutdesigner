// =====================================================================================
// splitter.js — drag-to-resize along one axis (renderer, ESM) — N0.5
// =====================================================================================
// After TscgOntologyExplorer src/renderer/Splitter.js: once the button is pressed on
// the handle, moves and release are followed on the whole window (the pointer leaves
// the 4 px handle at once), and a `dragging` class marks the handle. Pointer capture is
// only a bonus (a drag that leaves the window keeps working where it is supported).
// The caller owns the size and its limits.
// Contract: docs/contracts/OUTPUT_PANEL.md §2.
// =====================================================================================

// options:
//   axis      'y' (row-resize) or 'x' (col-resize)
//   start()   → the size at the start of the drag (px)
//   resize(size)  called while dragging with start size − pointer delta (px)
//   end()     called once the drag ends (optional)
export function installSplitter(handle, { axis = 'y', start, resize, end = () => {} }) {
  const win = handle.ownerDocument.defaultView;
  const position = (event) => (axis === 'y' ? event.clientY : event.clientX);
  let origin = null;
  let size0 = 0;

  // Dragging up (or left) makes the panel below (or to the right) bigger.
  const onMove = (event) => {
    if (origin !== null) resize(size0 - (position(event) - origin));
  };
  const onUp = () => {
    if (origin === null) return;
    origin = null;
    win.removeEventListener('pointermove', onMove);
    win.removeEventListener('pointerup', onUp);
    win.removeEventListener('pointercancel', onUp);
    handle.classList.remove('is-dragging');
    end();
  };

  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    origin = position(event);
    size0 = start();
    handle.classList.add('is-dragging');
    win.addEventListener('pointermove', onMove);
    win.addEventListener('pointerup', onUp);
    win.addEventListener('pointercancel', onUp);
    try {
      handle.setPointerCapture(event.pointerId);
    } catch {
      // Not available for this pointer: the window listeners are enough.
    }
  });
}
