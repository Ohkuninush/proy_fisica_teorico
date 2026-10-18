export const $ = (id) => document.getElementById(id);

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function iconButton(className, svg, label, title) {
  const button = el('button', className);
  button.type = 'button';
  button.innerHTML = svg;
  button.title = title;
  button.setAttribute('aria-label', label);
  return button;
}
