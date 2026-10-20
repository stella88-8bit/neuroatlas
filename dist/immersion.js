export function createImmersion(doc = document) {
  let active = false, ownedFullscreen = false, previousFocus;
  function exit(restoreFocus = true) {
    if (!active) return;
    active = false;
    doc.body.classList.remove('immersive');
    const button = doc.querySelector('#exitImmersion');
    if (button) button.hidden = true;
    if (ownedFullscreen && doc.fullscreenElement === doc.documentElement) {
      doc.exitFullscreen?.().catch(() => {});
    }
    ownedFullscreen = false;
    if (restoreFocus && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }
  function enter() {
    if (active || !doc.querySelector('.map-page')) return;
    previousFocus = doc.activeElement;
    active = true;
    doc.querySelector('dialog[open]')?.close();
    doc.body.classList.add('immersive');
    const button = doc.querySelector('#exitImmersion');
    button.hidden = false;
    button.focus({ preventScroll: true });
    // The edge-to-edge CSS mode also works where native fullscreen is unavailable.
    if (!doc.fullscreenElement && doc.documentElement.requestFullscreen) {
      doc.documentElement.requestFullscreen().then(() => {
        ownedFullscreen = true;
        if (!active) {
          ownedFullscreen = false;
          if (doc.fullscreenElement === doc.documentElement) doc.exitFullscreen?.().catch(() => {});
        }
      }).catch(() => {});
    }
  }
  doc.addEventListener('keydown', e => {
    if (active && e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      exit();
    }
  });
  doc.addEventListener('fullscreenchange', () => {
    if (active && ownedFullscreen && !doc.fullscreenElement) exit();
  });
  return { enter, exit };
}
