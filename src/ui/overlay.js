const OVERLAY_OPENED = 'physicslab:overlay-opened';

export const announceOverlay = (id) => document.dispatchEvent(new CustomEvent(OVERLAY_OPENED, { detail: id }));

export const onOtherOverlayOpened = (id, handler) =>
  document.addEventListener(OVERLAY_OPENED, (event) => event.detail !== id && handler());

export const onEscape = (handler) =>
  document.addEventListener('keydown', (event) => event.key === 'Escape' && handler());

export function createDrawer({ id, drawer, backdrop, openButton, closeButton, onOpen }) {
  let previousFocus = null;
  const isOpen = () => drawer.classList.contains('open');

  function open() {
    previousFocus = document.activeElement;
    announceOverlay(id);
    drawer.classList.add('open');
    backdrop.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    closeButton.focus();
    onOpen?.();
  }

  function close() {
    if (!isOpen()) return;
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    previousFocus?.focus?.();
  }

  openButton.addEventListener('click', open);
  closeButton.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  onEscape(close);
  onOtherOverlayOpened(id, close);

  return { open, close };
}
