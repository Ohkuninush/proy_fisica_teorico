// "Exportar Reportes": pick saved experiments and download them as one PDF. DOM only.
// The PDF module (jsPDF + charts) is loaded on demand so it never slows the first paint.
import { msToKmh } from '../physics/params.js';

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

export function createExportDialog({ store, openBtn, dialog, backdrop, list, countEl, allBox, goBtn, cancelBtn, closeBtn, statusEl }) {
  let busy = false;
  let lastFocus = null;
  const checked = new Set();

  const entries = () => store.list();

  function updateControls() {
    const all = entries();
    const n = checked.size;
    countEl.textContent = all.length ? `${n} de ${all.length} seleccionadas` : '';
    allBox.checked = all.length > 0 && n === all.length;
    allBox.indeterminate = n > 0 && n < all.length;
    allBox.disabled = busy || !all.length;
    goBtn.disabled = busy || n === 0;
  }

  function render() {
    const all = entries();
    if (!all.length) {
      const empty = el('li', 'empty');
      empty.append(el('strong', '', 'Aún no hay pruebas para exportar'), el('span', '', 'Completa un experimento (finalizado o con colisión) y aparecerá aquí.'));
      list.replaceChildren(empty);
      updateControls();
      return;
    }
    list.replaceChildren(
      ...all.map((e) => {
        const li = el('li', 'export-item');
        const label = el('label');
        const box = el('input');
        box.type = 'checkbox';
        box.checked = checked.has(e.id);
        box.disabled = busy;
        box.addEventListener('change', () => {
          box.checked ? checked.add(e.id) : checked.delete(e.id);
          updateControls();
        });
        const main = el('span', 'export-main');
        main.append(el('strong', '', e.name), el('time', '', e.savedAt));
        const tags = el('span', 'export-tags');
        tags.append(el('span', 'tag', e.params.model), el('span', `tag st-${e.result.status}`, e.result.status === 'collided' ? 'Colisión' : 'Finalizado'));
        const nums = el('span', 'export-nums', `t = ${e.result.t.toFixed(2)} s · v = ${msToKmh(e.result.v).toFixed(1)} km/h`);
        label.append(box, main, tags, nums);
        li.append(label);
        return li;
      }),
    );
    updateControls();
  }

  function setStatus(text, kind = '') {
    statusEl.textContent = text;
    statusEl.dataset.kind = kind;
  }

  function open() {
    lastFocus = document.activeElement;
    document.dispatchEvent(new CustomEvent('physicslab:drawer', { detail: 'export' }));
    const all = entries();
    checked.clear();
    if (all.length) checked.add(all[0].id); // newest run pre-selected
    setStatus('');
    backdrop.hidden = false;
    dialog.hidden = false;
    requestAnimationFrame(() => {
      backdrop.classList.add('open');
      dialog.classList.add('open');
    });
    render();
    (all.length ? goBtn : closeBtn).focus();
  }

  function close() {
    if (busy || dialog.hidden) return;
    backdrop.classList.remove('open');
    dialog.classList.remove('open');
    setTimeout(() => {
      backdrop.hidden = true;
      dialog.hidden = true;
    }, 250);
    lastFocus?.focus?.();
  }

  async function generate() {
    const chosen = entries()
      .filter((e) => checked.has(e.id))
      .reverse(); // oldest first, so the report reads chronologically
    if (!chosen.length || busy) return;
    busy = true;
    const label = goBtn.textContent;
    goBtn.textContent = 'Generando…';
    setStatus('Preparando el reporte…');
    render();
    try {
      const { buildReportPdf, reportFileName } = await import('../report/pdfReport.js');
      const doc = await buildReportPdf(chosen, {
        onProgress: (i, n) => setStatus(i < n ? `Armando prueba ${i + 1} de ${n}…` : 'Guardando PDF…'),
      });
      const name = reportFileName(chosen);
      doc.save(name);
      setStatus(`Listo: se descargó ${name}`, 'ok');
    } catch (err) {
      console.error(err);
      setStatus('No se pudo generar el PDF. Inténtalo de nuevo.', 'error');
    } finally {
      busy = false;
      goBtn.textContent = label;
      render();
    }
  }

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  cancelBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  goBtn.addEventListener('click', generate);
  allBox.addEventListener('change', () => {
    entries().forEach((e) => (allBox.checked ? checked.add(e.id) : checked.delete(e.id)));
    render();
  });
  document.addEventListener('keydown', (e) => e.key === 'Escape' && close());
  document.addEventListener('physicslab:drawer', (e) => e.detail !== 'export' && close());
  store.subscribe(() => {
    if (dialog.hidden) return;
    const ids = new Set(entries().map((e) => e.id));
    [...checked].forEach((id) => !ids.has(id) && checked.delete(id));
    render();
  });

  return { open, close };
}
