import { MAX_COMMENT, MAX_NAME } from '../history/store.js';
import { hasGoal } from '../visuals/catalog.js';
import { el, iconButton } from './dom.js';
import { formatIndicators } from './indicators.js';
import { createDrawer } from './overlay.js';

const SVG_ATTRIBUTES = 'viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const PENCIL_ICON = `<svg ${SVG_ATTRIBUTES}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
const TRASH_ICON = `<svg ${SVG_ATTRIBUTES}><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>`;

const EMPTY_TITLE = 'Aún no hay pruebas';
const EMPTY_HINT = 'Cada experimento que termine (finalizado o con colisión) se guarda aquí automáticamente.';

const entryParameters = ({ params: { x0, v0, a, duration, gap, model }, visuals }) =>
  `x₀ ${x0} m · v₀ ${v0} m/s${model === 'MRUV' ? ` · a ${a} m/s²` : ''} · ${duration} s · ${hasGoal(visuals) ? 'meta' : 'obstáculo'} ${gap} m`;

export function createHistoryPanel({ store, drawer, backdrop, list, count, openBtn, closeBtn, badge }) {
  createDrawer({ id: 'history', drawer, backdrop, openButton: openBtn, closeButton: closeBtn });

  function startRename(entry, titleRow) {
    const input = el('input', 'name-input');
    input.type = 'text';
    input.value = entry.name;
    input.maxLength = MAX_NAME;
    input.setAttribute('aria-label', 'Nombre de la prueba');
    titleRow.replaceChildren(input);
    input.focus();
    input.select();

    let finished = false;
    const finish = (save) => {
      if (finished) return;
      finished = true;
      if (save && input.value.trim()) store.update(entry.id, { name: input.value });
      else render(store.list());
    };
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') finish(true);
      if (event.key === 'Escape') {
        event.stopPropagation();
        finish(false);
      }
    });
    input.addEventListener('blur', () => finish(true));
  }

  function entryHeader(entry) {
    const title = el('div', 'entry-title');
    const rename = iconButton('icon-btn', PENCIL_ICON, `Renombrar ${entry.name}`, 'Renombrar prueba');
    rename.addEventListener('click', () => startRename(entry, title));
    title.append(el('strong', '', entry.name), rename);

    const remove = iconButton('icon-btn danger', TRASH_ICON, `Eliminar ${entry.name}`, 'Eliminar');
    remove.addEventListener('click', () => {
      if (window.confirm(`¿Eliminar "${entry.name}"?`)) store.remove(entry.id);
    });

    const header = el('div', 'entry-head');
    header.append(title, remove);
    return header;
  }

  function entryMeta(entry, indicators) {
    const meta = el('div', 'entry-meta');
    meta.append(el('time', '', entry.savedAt), el('span', 'tag', entry.params.model), el('span', `tag st-${entry.result.status}`, indicators.status));
    return meta;
  }

  function entryGrid(entry, indicators) {
    const rows = [
      ['Tiempo', indicators.time],
      ['Posición', indicators.position],
      ['Recorrido', indicators.traveled],
      ['Velocidad', `${indicators.speed} · ${indicators.speedKmh}`],
      ['Aceleración', indicators.acceleration],
      [hasGoal(entry.visuals) ? 'A la meta' : 'Al obstáculo', indicators.remaining],
      ['Vel. máxima', indicators.vMax],
    ];
    const grid = el('dl', 'entry-grid');
    rows.forEach(([label, value]) => grid.append(el('dt', '', label), el('dd', '', value)));
    return grid;
  }

  function commentBox(entry) {
    const textarea = el('textarea');
    textarea.maxLength = MAX_COMMENT;
    textarea.rows = 2;
    textarea.placeholder = `Comentario (máx. ${MAX_COMMENT} caracteres)`;
    textarea.value = entry.comment;
    textarea.setAttribute('aria-label', `Comentario de ${entry.name}`);

    const counter = el('span', 'counter');
    const updateCounter = () => (counter.textContent = `${textarea.value.length}/${MAX_COMMENT}`);
    updateCounter();
    textarea.addEventListener('input', updateCounter);
    textarea.addEventListener('change', () => store.update(entry.id, { comment: textarea.value }));

    const box = el('div', 'comment');
    box.append(textarea, counter);
    return box;
  }

  function card(entry) {
    const indicators = formatIndicators({ ...entry.result, params: entry.params }, { goal: hasGoal(entry.visuals) });
    const item = el('li', `entry ${entry.result.status}`);
    item.append(entryHeader(entry), entryMeta(entry, indicators), entryGrid(entry, indicators), el('p', 'entry-params', entryParameters(entry)), commentBox(entry));
    return item;
  }

  function renderEmpty() {
    const empty = el('li', 'empty');
    empty.append(el('strong', '', EMPTY_TITLE), el('span', '', EMPTY_HINT));
    list.replaceChildren(empty);
  }

  function render(entries) {
    count.textContent = `${entries.length} ${entries.length === 1 ? 'prueba' : 'pruebas'}`;
    badge.textContent = entries.length;
    badge.hidden = entries.length === 0;
    if (!entries.length) {
      renderEmpty();
      return;
    }
    const scrollTop = list.scrollTop;
    list.replaceChildren(...entries.map(card));
    list.scrollTop = scrollTop;
  }

  store.subscribe(render);
  render(store.list());
}
