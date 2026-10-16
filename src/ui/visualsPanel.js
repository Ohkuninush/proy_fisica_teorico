// Left drawer "Visuales": scenery, vehicle (+ colour) and obstacle pickers. DOM only.
import { VIEWS, SCENERIES, VEHICLES, OBSTACLES } from '../visuals/catalog.js';

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

export function createVisualsPanel({ store, drawer, backdrop, body, openBtn, closeBtn, getThumbs, onChange }) {
  const groups = {}; // key -> { id -> button }
  const thumbImgs = { vehicle: {}, obstacle: {} };
  let thumbsDone = false;
  let lastFocus = null;

  function select(key, id) {
    Object.entries(groups[key]).forEach(([oid, btn]) => {
      const on = oid === id;
      btn.classList.toggle('sel', on);
      btn.setAttribute('aria-pressed', String(on));
    });
  }

  function section(title, hint, key, options, build) {
    const sec = el('section', 'opt-section');
    const h = el('h3', '', title);
    h.append(el('span', '', hint));
    const grid = el('div', 'opt-grid');
    groups[key] = {};
    options.forEach((o) => {
      const btn = el('button', 'opt');
      btn.type = 'button';
      btn.dataset.id = o.id;
      btn.append(build(o), el('span', 'opt-name', o.name));
      if (o.desc) btn.append(el('span', 'opt-desc', o.desc));
      btn.addEventListener('click', () => {
        select(key, o.id);
        onChange(key, o.id);
      });
      groups[key][o.id] = btn;
      grid.append(btn);
    });
    sec.append(h, grid);
    return sec;
  }

  const thumb = (map) => (o) => {
    const wrap = el('span', 'opt-thumb');
    const img = el('img');
    img.alt = '';
    img.draggable = false;
    map[o.id] = img;
    wrap.append(img);
    return wrap;
  };

  const viewSection = section('Vista', 'ángulo de cámara', 'view', VIEWS, (o) => {
    const sw = el('span', 'opt-thumb swatch');
    sw.style.background = o.swatch;
    sw.append(el('span', 'emoji', o.emoji));
    return sw;
  });
  const scenerySection = section('Paisaje', 'fondo de la pista', 'scenery', SCENERIES, (o) => {
    const sw = el('span', 'opt-thumb swatch');
    sw.style.background = o.swatch;
    sw.append(el('span', 'emoji', o.emoji));
    return sw;
  });
  const vehicleSection = section('Vehículo', 'modelo y color', 'vehicle', VEHICLES, thumb(thumbImgs.vehicle));
  const colorRow = el('label', 'color-row');
  colorRow.append(el('span', '', 'Color del vehículo'));
  const color = el('input');
  color.type = 'color';
  color.id = 'color';
  colorRow.append(color);
  vehicleSection.append(colorRow);
  const obstacleSection = section('Obstáculo', 'lo que hay al final', 'obstacle', OBSTACLES, thumb(thumbImgs.obstacle));
  body.replaceChildren(viewSection, scenerySection, vehicleSection, obstacleSection);

  function loadThumbs() {
    if (thumbsDone) return;
    thumbsDone = true;
    try {
      const t = getThumbs();
      Object.entries(t.vehicles).forEach(([id, url]) => (thumbImgs.vehicle[id].src = url));
      Object.entries(t.obstacles).forEach(([id, url]) => (thumbImgs.obstacle[id].src = url));
    } catch {
      /* previews are optional: cards still work with their names */
    }
  }

  function open() {
    lastFocus = document.activeElement;
    document.dispatchEvent(new CustomEvent('physicslab:drawer', { detail: 'visuals' }));
    drawer.classList.add('open');
    backdrop.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    closeBtn.focus();
    setTimeout(loadThumbs, 80); // after the slide-in starts, so the click feels instant
  }
  function close() {
    if (!drawer.classList.contains('open')) return;
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    lastFocus?.focus?.();
  }

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', (e) => e.key === 'Escape' && close());
  document.addEventListener('physicslab:drawer', (e) => e.detail !== 'visuals' && close());

  const v = store.get();
  select('view', v.view);
  select('scenery', v.scenery);
  select('vehicle', v.vehicle);
  select('obstacle', v.obstacle);
  color.value = v.color;

  return {
    colorInput: color,
    setColor(hex) {
      color.value = hex;
    },
  };
}
