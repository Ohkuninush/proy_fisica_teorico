import { msToKmh } from '../physics/params.js';
import { hasGoal } from '../visuals/catalog.js';
import { el } from './dom.js';
import { announceOverlay, onEscape, onOtherOverlayOpened } from './overlay.js';

const CLOSE_ANIMATION_MS = 250;

export function createExportDialog({ store, openBtn, dialog, backdrop, list, countEl, allBox, goBtn, cancelBtn, closeBtn, statusEl }) {
  const selected = new Set();
  let busy = false;
  let previousFocus = null;

  function updateControls() {
    const total = store.list().length;
    countEl.textContent = total ? `${selected.size} de ${total} seleccionadas` : '';
    allBox.checked = total > 0 && selected.size === total;
    allBox.indeterminate = selected.size > 0 && selected.size < total;
    allBox.disabled = busy || total === 0;
    goBtn.disabled = busy || selected.size === 0;
  }

  function entryRow(entry) {
    const checkbox = el('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selected.has(entry.id);
    checkbox.disabled = busy;
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selected.add(entry.id);
      else selected.delete(entry.id);
      updateControls();
    });

    const main = el('span', 'export-main');
    main.append(el('strong', '', entry.name), el('time', '', entry.savedAt));
    const tags = el('span', 'export-tags');
    const statusLabel = entry.result.status === 'collided' ? (hasGoal(entry.visuals) ? 'Meta' : 'Colisión') : 'Finalizado';
    tags.append(el('span', 'tag', entry.params.model), el('span', `tag st-${entry.result.status}`, statusLabel));
    const numbers = el('span', 'export-nums', `t = ${entry.result.t.toFixed(2)} s · v = ${msToKmh(entry.result.v).toFixed(1)} km/h`);

    const label = el('label');
    label.append(checkbox, main, tags, numbers);
    const row = el('li', 'export-item');
    row.append(label);
    return row;
  }

  function renderEmpty() {
    const empty = el('li', 'empty');
    empty.append(el('strong', '', 'Aún no hay pruebas para exportar'), el('span', '', 'Completa un experimento (finalizado o con colisión) y aparecerá aquí.'));
    list.replaceChildren(empty);
  }

  function render() {
    const entries = store.list();
    if (entries.length) list.replaceChildren(...entries.map(entryRow));
    else renderEmpty();
    updateControls();
  }

  function setStatus(text, kind = '') {
    statusEl.textContent = text;
    statusEl.dataset.kind = kind;
  }

  function open() {
    previousFocus = document.activeElement;
    announceOverlay('export');
    const entries = store.list();
    selected.clear();
    if (entries.length) selected.add(entries[0].id);
    setStatus('');
    backdrop.hidden = false;
    dialog.hidden = false;
    requestAnimationFrame(() => {
      backdrop.classList.add('open');
      dialog.classList.add('open');
    });
    render();
    (entries.length ? goBtn : closeBtn).focus();
  }

  function close() {
    if (busy || dialog.hidden) return;
    backdrop.classList.remove('open');
    dialog.classList.remove('open');
    setTimeout(() => {
      backdrop.hidden = true;
      dialog.hidden = true;
    }, CLOSE_ANIMATION_MS);
    previousFocus?.focus?.();
  }

  async function generate() {
    const chosen = store.list().filter((entry) => selected.has(entry.id)).reverse();
    if (!chosen.length || busy) return;

    busy = true;
    const buttonLabel = goBtn.textContent;
    goBtn.textContent = 'Generando…';
    setStatus('Preparando el reporte…');
    render();
    try {
      const { buildReportPdf, reportFileName } = await import('../report/pdf/index.js');
      const pdf = await buildReportPdf(chosen, {
        onProgress: (done, total) => setStatus(done < total ? `Armando prueba ${done + 1} de ${total}…` : 'Guardando PDF…'),
      });
      const fileName = reportFileName(chosen);
      pdf.save(fileName);
      setStatus(`Listo: se descargó ${fileName}`, 'ok');
    } catch (error) {
      console.error(error);
      setStatus('No se pudo generar el PDF. Inténtalo de nuevo.', 'error');
    } finally {
      busy = false;
      goBtn.textContent = buttonLabel;
      render();
    }
  }

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  cancelBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  goBtn.addEventListener('click', generate);
  allBox.addEventListener('change', () => {
    store.list().forEach((entry) => (allBox.checked ? selected.add(entry.id) : selected.delete(entry.id)));
    render();
  });
  onEscape(close);
  onOtherOverlayOpened('export', close);
  store.subscribe((entries) => {
    if (dialog.hidden) return;
    const available = new Set(entries.map((entry) => entry.id));
    selected.forEach((id) => !available.has(id) && selected.delete(id));
    render();
  });
}
