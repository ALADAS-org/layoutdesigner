// =====================================================================================
// splitter.js — drag-to-resize along one axis (renderer, ESM) — N0.5
// =====================================================================================
// After TscgOntologyExplorer src/renderer/Splitter.js (mouse down / move / up, a
// `dragging` class), with pointer events and pointer capture so that a drag going
// outside the window keeps working. The caller owns the size and its limits.
// Contract: docs/contracts/OUTPUT_PANEL.md §2.
// =====================================================================================

// options:
//   axis      'y' (row-resize) or 'x' (col-resize)
//   start()   → the size at the start of the drag (px)
//   resize(size)  called while dragging with start size − pointer delta (px)
//   end()     called once the drag ends (optional)
export function installSplitter(handle, { axis = 'y', start, resize, end = () => {} }) {
  let origin = null;
  let size0 = 0;
  const position = (event) => (axis === 'y' ? event.clientY : event.clientX);

  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    origin = position(event);
    size0 = start();
    handle.setPointerCapture(event.pointerId);
    handle.classList.add('is-dragging');
  });
  handle.addEventListener('pointermove', (event) => {
    if (origin === null) return;
    // Dragging up (or left) makes the panel below (or to the right) bigger.
    resize(size0 - (position(event) - origin));
  });
  const stop = () => {
    if (origin === null) return;
    origin = null;
    handle.classList.remove('is-dragging');
    end();
  };
  handle.addEventListener('pointerup', stop);
  handle.addEventListener('pointercancel', stop);
}
