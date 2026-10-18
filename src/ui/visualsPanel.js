import { GOALS, OBSTACLES, SCENERIES, VEHICLES, VIEWS } from '../visuals/catalog.js';
import { el } from './dom.js';
import { createDrawer } from './overlay.js';

const THUMBNAIL_DELAY_MS = 80;

function swatch({ swatch: background, emoji }) {
  const preview = el('span', 'opt-thumb swatch');
  preview.style.background = background;
  preview.append(el('span', 'emoji', emoji));
  return preview;
}

function thumbnailSlot(images) {
  return ({ id }) => {
    const image = el('img');
    image.alt = '';
    image.draggable = false;
    images[id] = image;
    const preview = el('span', 'opt-thumb');
    preview.append(image);
    return preview;
  };
}

export function createVisualsPanel({ store, drawer, backdrop, body, openBtn, closeBtn, getThumbs, onChange }) {
  const buttons = {};
  const thumbnailImages = { vehicle: {}, obstacle: {} };
  let thumbnailsLoaded = false;

  function select(group, id) {
    Object.entries(buttons[group]).forEach(([optionId, button]) => {
      const selected = optionId === id;
      button.classList.toggle('sel', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function createSection({ title, hint, group, options, preview }) {
    const section = el('section', 'opt-section');
    const heading = el('h3', '', title);
    heading.append(el('span', '', hint));
    const grid = el('div', 'opt-grid');
    buttons[group] = {};

    options.forEach((option) => {
      const button = el('button', 'opt');
      button.type = 'button';
      button.dataset.id = option.id;
      button.append(preview(option), el('span', 'opt-name', option.name));
      if (option.desc) button.append(el('span', 'opt-desc', option.desc));
      button.addEventListener('click', () => {
        select(group, option.id);
        onChange(group, option.id);
      });
      buttons[group][option.id] = button;
      grid.append(button);
    });

    section.append(heading, grid);
    return section;
  }

  function colorPicker() {
    const input = el('input');
    input.type = 'color';
    input.id = 'color';
    const row = el('label', 'color-row');
    row.append(el('span', '', 'Color del vehículo'), input);
    return { row, input };
  }

  function showThumbnails() {
    if (thumbnailsLoaded) return;
    thumbnailsLoaded = true;
    const thumbnails = getThumbs();
    Object.entries(thumbnails.vehicles).forEach(([id, url]) => (thumbnailImages.vehicle[id].src = url));
    Object.entries(thumbnails.obstacles).forEach(([id, url]) => (thumbnailImages.obstacle[id].src = url));
  }

  const vehicleSection = createSection({ title: 'Vehículo', hint: 'modelo y color', group: 'vehicle', options: VEHICLES, preview: thumbnailSlot(thumbnailImages.vehicle) });
  const color = colorPicker();
  vehicleSection.append(color.row);

  body.replaceChildren(
    createSection({ title: 'Vista', hint: 'ángulo de cámara', group: 'view', options: VIEWS, preview: swatch }),
    createSection({ title: 'Paisaje', hint: 'fondo de la pista', group: 'scenery', options: SCENERIES, preview: swatch }),
    vehicleSection,
    createSection({ title: 'Obstáculo', hint: 'lo que hay al final', group: 'obstacle', options: OBSTACLES, preview: thumbnailSlot(thumbnailImages.obstacle) }),
    createSection({ title: 'Meta', hint: 'reemplaza al obstáculo', group: 'goal', options: GOALS, preview: swatch }),
  );

  createDrawer({
    id: 'visuals',
    drawer,
    backdrop,
    openButton: openBtn,
    closeButton: closeBtn,
    onOpen: () => setTimeout(showThumbnails, THUMBNAIL_DELAY_MS),
  });

  const saved = store.get();
  ['view', 'scenery', 'vehicle', 'obstacle', 'goal'].forEach((group) => select(group, saved[group]));
  color.input.value = saved.color;

  return {
    setColor(hex) {
      color.input.value = hex;
    },
  };
}
