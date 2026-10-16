import { drawChartsPage } from './chartsPage.js';
import { drawFooters } from './primitives.js';
import { drawResultsPage } from './resultsPage.js';
import { drawSummaryPages } from './summaryPage.js';
import { generatedAtLabel, toLatin1 } from './text.js';

export { reportFileName } from './text.js';

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function buildReportPdf(entries, { now = new Date(), onProgress = () => {} } = {}) {
  if (!entries.length) throw new Error('No experiments selected');

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  const dateText = generatedAtLabel(now);
  const single = entries.length === 1;

  if (!single) drawSummaryPages(doc, entries, dateText);
  for (let i = 0; i < entries.length; i++) {
    onProgress(i, entries.length);
    await nextTick();
    if (i > 0 || !single) doc.addPage();
    drawResultsPage(doc, entries[i], dateText);
    doc.addPage();
    drawChartsPage(doc, entries[i], dateText);
  }

  drawFooters(doc, single ? `Reporte: ${entries[0].name}` : `Reporte de ${entries.length} pruebas`);
  doc.setProperties({
    title: single ? `PhysicsLab 3D - ${toLatin1(entries[0].name)}` : `PhysicsLab 3D - ${entries.length} pruebas`,
    subject: 'Reporte de experimentos MRU / MRUV',
    author: 'PhysicsLab 3D',
    creator: 'PhysicsLab 3D',
  });
  onProgress(entries.length, entries.length);
  return doc;
}
