// Left drawer with the saved experiments. DOM only; data lives in history/store.js.
import { formatIndicators } from './indicators.js';
import { MAX_COMMENT, MAX_NAME } from '../history/store.js';

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

const PENCIL =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
const TRASH =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>';

export function createHistoryPanel({ store, drawer, backdrop, list, count, openBtn, closeBtn, badge }) {
  let lastFocus = null;

  function open() {
    lastFocus = document.activeElement;
    drawer.classList.add('open');
    backdrop.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    closeBtn.focus();
  }
  function close() {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    lastFocus?.focus?.();
  }

  function startRename(entry, titleRow) {
    const input = el('input', 'name-input');
    input.type = 'text';
    input.value = entry.name;
    input.maxLength = MAX_NAME;
    input.setAttribute('aria-label', 'Nombre de la prueba');
    titleRow.replaceChildren(input);
    input.focus();
    input.select();
    let done = false;
    const finish = (save) => {
      if (done) return;
      done = true;
      if (save && input.value.trim()) store.update(entry.id, { name: input.value });
      else render(store.list()); // restore (also covers cancel / empty)
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finish(true);
      if (e.key === 'Escape') {
        e.stopPropagation();
        finish(false);
      }
    });
    input.addEventListener('blur', () => finish(true));
  }

  function card(entry) {
    const ind = formatIndicators({ ...entry.result, params: entry.params });
    const li = el('li', `entry ${entry.result.status}`);

    const head = el('div', 'entry-head');
    const titleRow = el('div', 'entry-title');
    const draw = () => {
      const name = el('strong', '', entry.name);
      const pencil = el('button', 'icon-btn');
      pencil.type = 'button';
      pencil.innerHTML = PENCIL;
      pencil.title = 'Renombrar prueba';
      pencil.setAttribute('aria-label', `Renombrar ${entry.name}`);
      pencil.addEventListener('click', () => startRename(entry, titleRow));
      titleRow.replaceChildren(name, pencil);
    };
    draw();
    const del = el('button', 'icon-btn danger');
    del.type = 'button';
    del.innerHTML = TRASH;
    del.title = 'Eliminar';
    del.setAttribute('aria-label', `Eliminar ${entry.name}`);
    del.addEventListener('click', () => {
      if (window.confirm(`¿Eliminar "${entry.name}"?`)) store.remove(entry.id);
    });
    head.append(titleRow, del);

    const meta = el('div', 'entry-meta');
    meta.append(el('time', '', entry.savedAt), el('span', 'tag', entry.params.model), el('span', `tag st-${entry.result.status}`, ind.status));

    const grid = el('dl', 'entry-grid');
    const rows = [
      ['Tiempo', ind.time],
      ['Posición', ind.position],
      ['Recorrido', ind.traveled],
      ['Velocidad', `${ind.speed} · ${ind.speedKmh}`],
      ['Aceleración', ind.acceleration],
      ['Al obstáculo', ind.remaining],
      ['Vel. máxima', ind.vMax],
    ];
    rows.forEach(([k, v]) => grid.append(el('dt', '', k), el('dd', '', v)));

    const p = entry.params;
    const params = el(
      'p',
      'entry-params',
      `x₀ ${p.x0} m · v₀ ${p.v0} m/s${p.model === 'MRUV' ? ` · a ${p.a} m/s²` : ''} · ${p.duration} s · obstáculo ${p.gap} m`,
    );

    const box = el('div', 'comment');
    const ta = el('textarea');
    ta.maxLength = MAX_COMMENT;
    ta.rows = 2;
    ta.placeholder = 'Comentario (máx. 200 caracteres)';
    ta.value = entry.comment;
    ta.setAttribute('aria-label', `Comentario de ${entry.name}`);
    const counter = el('span', 'counter', `${ta.value.length}/${MAX_COMMENT}`);
    ta.addEventListener('input', () => (counter.textContent = `${ta.value.length}/${MAX_COMMENT}`));
    ta.addEventListener('change', () => store.update(entry.id, { comment: ta.value }));
    box.append(ta, counter);

    li.append(head, meta, grid, params, box);
    return li;
  }

  function render(entries) {
    count.textContent = `${entries.length} ${entries.length === 1 ? 'prueba' : 'pruebas'}`;
    badge.textContent = entries.length;
    badge.hidden = entries.length === 0;
    if (!entries.length) {
      const empty = el('li', 'empty');
      empty.append(el('strong', '', 'Aún no hay pruebas'), el('span', '', 'Cada experimento que termine (finalizado o con colisión) se guarda aquí automáticamente.'));
      list.replaceChildren(empty);
      return;
    }
    // Keep scroll and avoid rebuilding while a textarea is being edited elsewhere.
    const top = list.scrollTop;
    list.replaceChildren(...entries.map(card));
    list.scrollTop = top;
  }

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) close();
  });
  store.subscribe(render);
  render(store.list());

  return { open, close };
}
