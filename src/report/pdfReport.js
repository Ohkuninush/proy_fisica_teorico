// PDF report builder (A4 portrait). Pages: optional summary table, then per experiment
// one page of results + one page of charts. Standard PDF fonts: text is kept to Latin-1.
import { buildSeries } from './series.js';
import { renderChartPng, CHART_W, CHART_H, SERIES_STYLE } from './chartImages.js';
import { CAR_LENGTH, msToKmh } from '../physics/params.js';
import { obstacleX } from '../physics/collision.js';

const PAGE_W = 210;
const PAGE_H = 297;
const M = 15;
const CW = PAGE_W - 2 * M;

const C = {
  navy: [11, 18, 32],
  navy2: [44, 22, 78],
  ink: [28, 36, 56],
  muted: [107, 118, 148],
  line: [226, 231, 242],
  panel: [246, 248, 252],
  cyan: [27, 154, 196],
  pink: [214, 36, 110],
  lime: [93, 161, 15],
  amber: [224, 138, 0],
  violet: [123, 92, 214],
  white: [255, 255, 255],
};

const STATUS = {
  collided: { label: 'COLISIÓN', color: C.pink },
  finished: { label: 'FINALIZADO', color: C.violet },
};

const f = (n, d = 2) => Number(n).toFixed(d);
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/** Replace anything outside Latin-1 (standard PDF fonts) so user text never renders as garbage. */
export function toLatin1(s) {
  return String(s ?? '')
    .normalize('NFC')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/•/g, '·')
    .replace(/[^ -~¡-ÿ\n]/gu, '?'); // 'u': one "?" per character, even for emoji
}

export function reportFileName(entries, now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
  if (entries.length === 1) {
    const safe = toLatin1(entries[0].name).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'prueba';
    return `PhysicsLab3D_${safe}_${stamp}.pdf`;
  }
  return `PhysicsLab3D_reporte_${entries.length}-pruebas_${stamp}.pdf`;
}

const fmtTerm = (n) => (n < 0 ? `(${n})` : `${n}`);

function equations(p) {
  const x0 = fmtTerm(p.x0);
  const v0 = fmtTerm(p.v0);
  if (p.model === 'MRU') {
    return [
      ['Posición', `x(t) = x0 + v0*t`, `x(t) = ${x0} + ${v0}*t`],
      ['Velocidad', `v(t) = v0`, `v(t) = ${v0}`],
      ['Aceleración', `a(t) = 0`, `a(t) = 0`],
    ];
  }
  const a = fmtTerm(p.a);
  return [
    ['Posición', `x(t) = x0 + v0*t + (1/2)*a*t^2`, `x(t) = ${x0} + ${v0}*t + (1/2)*${a}*t^2`],
    ['Velocidad', `v(t) = v0 + a*t`, `v(t) = ${v0} + ${a}*t`],
    ['Aceleración', `a(t) = a`, `a(t) = ${a}`],
  ];
}

function captions(p, series) {
  const impact = series.impactTime !== null ? ` El último punto marca el impacto (t = ${f(series.impactTime)} s).` : '';
  if (p.model === 'MRU') {
    return {
      x: `Recta: el vehículo avanza con rapidez constante; la pendiente es la velocidad (v0 = ${f(p.v0, 1)} m/s).${impact}`,
      v: 'Recta horizontal: la velocidad no cambia durante el movimiento.',
      a: 'Valor nulo: en MRU no hay aceleración (a = 0).',
    };
  }
  const trend = p.a > 0 ? 'curva cada vez más empinada: el vehículo acelera' : p.a < 0 ? 'curva que se aplana: el vehículo frena' : 'recta: no hay aceleración';
  return {
    x: `Parábola, ${trend}.${impact}`,
    v: `Recta inclinada: la velocidad cambia de forma uniforme; su pendiente es la aceleración (a = ${f(p.a, 2)} m/s²).`,
    a: `Recta horizontal: la aceleración es constante (a = ${f(p.a, 2)} m/s²).`,
  };
}

/* ---------- drawing helpers ---------- */

function setFill(doc, c) {
  doc.setFillColor(c[0], c[1], c[2]);
}
function setDraw(doc, c) {
  doc.setDrawColor(c[0], c[1], c[2]);
}
function setInk(doc, c) {
  doc.setTextColor(c[0], c[1], c[2]);
}

function header(doc, subtitle, dateText) {
  const strips = 70;
  for (let i = 0; i < strips; i++) {
    setFill(doc, mix(C.navy, C.navy2, i / (strips - 1)));
    doc.rect((PAGE_W / strips) * i, 0, PAGE_W / strips + 0.3, 27, 'F');
  }
  for (let i = 0; i < strips; i++) {
    setFill(doc, mix([76, 201, 240], [247, 37, 133], i / (strips - 1)));
    doc.rect((PAGE_W / strips) * i, 27, PAGE_W / strips + 0.3, 1.1, 'F');
  }
  // logo mark
  setDraw(doc, [76, 201, 240]);
  doc.setLineWidth(0.7);
  doc.roundedRect(M, 8, 11, 11, 2.6, 2.6, 'S');
  doc.setLineCap('round');
  doc.lines([[2.6, -3.4], [2.4, 2.4], [3.2, -4]], M + 2.4, 15.6, [1, 1], 'S');
  setInk(doc, C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('PhysicsLab 3D', M + 15, 14.6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setInk(doc, [170, 190, 232]);
  doc.text(toLatin1(subtitle), M + 15, 20.6);
  doc.setFontSize(8.5);
  doc.text(toLatin1(dateText), PAGE_W - M, 14.6, { align: 'right' });
}

function footers(doc, label) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    setDraw(doc, C.line);
    doc.setLineWidth(0.3);
    doc.line(M, PAGE_H - 13, PAGE_W - M, PAGE_H - 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setInk(doc, C.muted);
    doc.text(toLatin1(label), M, PAGE_H - 8);
    doc.text(`Página ${i} de ${n}`, PAGE_W - M, PAGE_H - 8, { align: 'right' });
  }
}

function sectionTitle(doc, text, y, color = C.cyan) {
  setFill(doc, color);
  doc.roundedRect(M, y - 4.2, 1.4, 5.4, 0.6, 0.6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setInk(doc, C.ink);
  doc.text(toLatin1(text), M + 4, y);
  return y + 4;
}

function chip(doc, text, color, x, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const w = doc.getTextWidth(text) + 7;
  setFill(doc, mix(color, C.white, 0.86));
  setDraw(doc, mix(color, C.white, 0.45));
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y - 4.3, w, 6, 3, 3, 'FD');
  setInk(doc, color);
  doc.text(text, x + 3.5, y);
  return w;
}

function kpiCard(doc, x, y, w, h, label, value, unit, color) {
  setFill(doc, C.panel);
  setDraw(doc, C.line);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2.2, 2.2, 'FD');
  setFill(doc, color);
  doc.roundedRect(x, y + 3, 1.3, h - 6, 0.6, 0.6, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  setInk(doc, C.muted);
  doc.text(toLatin1(label).toUpperCase(), x + 4.5, y + 6.2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  setInk(doc, C.ink);
  doc.text(value, x + 4.5, y + 15.4);
  const vw = doc.getTextWidth(value);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setInk(doc, C.muted);
  doc.text(toLatin1(unit), x + 4.5 + vw + 1.6, y + 15.4);
}

/* ---------- pages ---------- */

function summaryPages(doc, entries, dateText) {
  const rows = entries.map((e, i) => [
    String(i + 1),
    toLatin1(e.name),
    e.savedAt,
    e.params.model,
    STATUS[e.result.status]?.label ?? e.result.status,
    f(e.result.t),
    f(msToKmh(e.result.v), 1),
    f(e.result.traveled),
  ]);
  const cols = [
    { h: '#', w: 8, a: 'left' },
    { h: 'Prueba', w: 42, a: 'left' },
    { h: 'Fecha y hora', w: 35, a: 'left' },
    { h: 'Modelo', w: 16, a: 'left' },
    { h: 'Estado', w: 24, a: 'left' },
    { h: 't (s)', w: 15, a: 'right' },
    { h: 'v (km/h)', w: 20, a: 'right' },
    { h: 'Recorrido (m)', w: 26, a: 'right' },
  ];
  const scale = CW / cols.reduce((s, c) => s + c.w, 0);
  const rowsPerPage = 27;
  for (let start = 0; start < rows.length; start += rowsPerPage) {
    if (start > 0) doc.addPage();
    header(doc, 'Resumen de pruebas', dateText);
    let y = sectionTitle(doc, `Pruebas incluidas (${entries.length})`, 42);
    y += 4;
    setFill(doc, C.navy);
    doc.roundedRect(M, y, CW, 8, 1.6, 1.6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setInk(doc, C.white);
    let x = M;
    cols.forEach((c) => {
      const w = c.w * scale;
      doc.text(c.h, c.a === 'right' ? x + w - 2.5 : x + 2.5, y + 5.3, { align: c.a === 'right' ? 'right' : 'left' });
      x += w;
    });
    y += 8;
    rows.slice(start, start + rowsPerPage).forEach((r, i) => {
      if (i % 2 === 0) {
        setFill(doc, C.panel);
        doc.rect(M, y, CW, 8, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      setInk(doc, C.ink);
      let cx = M;
      cols.forEach((c, k) => {
        const w = c.w * scale;
        let text = r[k];
        while (doc.getTextWidth(text) > w - 5 && text.length > 3) text = text.slice(0, -2);
        if (k === 4) {
          setInk(doc, r[k] === 'COLISIÓN' ? C.pink : C.violet);
          doc.setFont('helvetica', 'bold');
        }
        doc.text(text, c.a === 'right' ? cx + w - 2.5 : cx + 2.5, y + 5.4, { align: c.a === 'right' ? 'right' : 'left' });
        setInk(doc, C.ink);
        doc.setFont('helvetica', 'normal');
        cx += w;
      });
      y += 8;
    });
  }
}

function resultsPage(doc, entry, dateText) {
  const p = entry.params;
  const r = entry.result;
  const st = STATUS[r.status] ?? { label: r.status, color: C.violet };
  header(doc, 'Reporte de experimento', dateText);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  setInk(doc, C.ink);
  doc.text(toLatin1(entry.name), M, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setInk(doc, C.muted);
  const meta = `Guardado: ${entry.savedAt}   |   Modelo: ${p.model}   |   Resultado:`;
  doc.text(meta, M, 49);
  chip(doc, st.label, st.color, M + doc.getTextWidth(meta) + 2.5, 49);

  // results
  let y = sectionTitle(doc, 'Resultados', 62);
  const cw = (CW - 3 * 4) / 4;
  const ch = 21;
  const cards = [
    ['Tiempo', f(r.t), 's', C.cyan],
    ['Posición final', f(r.x), 'm', C.cyan],
    ['Recorrido', f(r.traveled), 'm', C.cyan],
    ['Velocidad', f(r.v), 'm/s', C.lime],
    ['Velocidad', f(msToKmh(r.v), 1), 'km/h', C.lime],
    ['Aceleración', f(r.a), 'm/s²', C.amber],
    ['Dist. al obstáculo', f(r.remaining), 'm', C.pink],
    ['Velocidad máxima', f(r.vMax), 'm/s', C.violet],
  ];
  y += 3;
  cards.forEach((c, i) => kpiCard(doc, M + (i % 4) * (cw + 4), y + Math.floor(i / 4) * (ch + 4), cw, ch, ...c));
  y += 2 * ch + 4 + 7;

  // outcome banner
  const hit = r.impact;
  const tone = hit ? C.pink : C.violet;
  setFill(doc, mix(tone, C.white, 0.9));
  setDraw(doc, mix(tone, C.white, 0.5));
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, CW, 13, 2.2, 2.2, 'FD');
  setFill(doc, tone);
  doc.roundedRect(M, y + 2.5, 1.3, 8, 0.6, 0.6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  setInk(doc, tone);
  doc.text(hit ? 'Impacto detectado' : 'Experimento finalizado sin colisión', M + 5, y + 5.4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.6);
  setInk(doc, C.ink);
  doc.text(
    hit
      ? `El frente del vehículo alcanzó el obstáculo en t = ${f(hit.t)} s con v = ${f(hit.v)} m/s (${f(msToKmh(hit.v), 1)} km/h).`
      : `Terminó al cumplirse la duración (${f(p.duration, 1)} s); el obstáculo quedó a ${f(r.remaining)} m.`,
    M + 5,
    y + 10,
  );
  y += 13 + 10;

  // initial conditions (two columns of label/value rows)
  y = sectionTitle(doc, 'Condiciones iniciales', y);
  y += 3;
  const wall = obstacleX(p);
  const left = [
    ['Modelo físico', p.model === 'MRU' ? 'MRU (velocidad constante)' : 'MRUV (aceleración constante)'],
    ['Posición inicial (x0)', `${f(p.x0)} m`],
    ['Velocidad inicial (v0)', `${f(p.v0)} m/s  (${f(msToKmh(p.v0), 1)} km/h)`],
    ['Aceleración (a)', p.model === 'MRU' ? '0 m/s²  (constante)' : `${f(p.a)} m/s²`],
  ];
  const right = [
    ['Duración máxima', `${f(p.duration, 1)} s`],
    ['Distancia al obstáculo', `${f(p.gap)} m`],
    ['Cara del obstáculo', `x = ${f(wall)} m`],
    ['Largo del vehículo', `${f(CAR_LENGTH, 1)} m`],
  ];
  const colW = (CW - 6) / 2;
  [left, right].forEach((col, ci) => {
    col.forEach((row, i) => {
      const x = M + ci * (colW + 6);
      const ry = y + i * 8;
      if (i % 2 === 0) {
        setFill(doc, C.panel);
        doc.rect(x, ry, colW, 8, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.4);
      setInk(doc, C.muted);
      doc.text(toLatin1(row[0]), x + 2.5, ry + 5.4);
      doc.setFont('helvetica', 'bold');
      setInk(doc, C.ink);
      doc.text(toLatin1(row[1]), x + colW - 2.5, ry + 5.4, { align: 'right' });
    });
  });
  y += 4 * 8 + 9;

  // equations
  y = sectionTitle(doc, 'Ecuaciones del modelo', y);
  y += 3;
  setFill(doc, C.panel);
  setDraw(doc, C.line);
  doc.roundedRect(M, y, CW, 3 * 7.5 + 4, 2.2, 2.2, 'FD');
  equations(p).forEach(([name, general, sub], i) => {
    const ly = y + 7 + i * 7.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.4);
    setInk(doc, C.ink);
    doc.text(name, M + 4, ly);
    doc.setFont('courier', 'normal');
    doc.setFontSize(8.6);
    setInk(doc, C.muted);
    doc.text(general, M + 30, ly);
    setInk(doc, C.cyan);
    doc.setFont('courier', 'bold');
    doc.text(sub, M + 98, ly);
  });
  y += 3 * 7.5 + 4 + 9;

  // comment
  if (entry.comment?.trim()) {
    y = sectionTitle(doc, 'Comentario', y, C.violet);
    y += 3;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    const lines = doc.splitTextToSize(toLatin1(entry.comment.trim()), CW - 10);
    const bh = lines.length * 5 + 6;
    setFill(doc, mix(C.violet, C.white, 0.93));
    setDraw(doc, mix(C.violet, C.white, 0.6));
    doc.roundedRect(M, y, CW, bh, 2.2, 2.2, 'FD');
    setInk(doc, C.ink);
    doc.text(lines, M + 5, y + 6.4);
  }
}

function chartsPage(doc, entry, dateText) {
  const series = buildSeries(entry.params, 240);
  const caps = captions(entry.params, series);
  header(doc, `Gráficas  ·  ${entry.name}`, dateText);
  const keys = [
    ['x', 'Posición vs. tiempo'],
    ['v', 'Velocidad vs. tiempo'],
    ['a', 'Aceleración vs. tiempo'],
  ];
  const imgW = CW;
  const imgH = (CW * CHART_H) / CHART_W;
  let y = 41;
  keys.forEach(([key, title]) => {
    const color = SERIES_STYLE[key].color;
    const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
    y = sectionTitle(doc, title, y, rgb);
    y += 2.5;
    setDraw(doc, C.line);
    doc.setLineWidth(0.3);
    doc.roundedRect(M - 0.5, y - 0.5, imgW + 1, imgH + 1, 1.6, 1.6, 'S');
    doc.addImage(renderChartPng(series, key), 'PNG', M, y, imgW, imgH, undefined, 'FAST');
    y += imgH + 4.6;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.2);
    setInk(doc, C.muted);
    doc.text(doc.splitTextToSize(toLatin1(caps[key]), CW), M, y);
    y += 9;
  });
}

/**
 * @param entries history entries (see history/store.js), in the order they should appear
 * @returns {Promise<import('jspdf').jsPDF>}
 */
export async function buildReportPdf(entries, { now = new Date(), onProgress = () => {} } = {}) {
  if (!entries.length) throw new Error('No experiments selected');
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  const p = (n) => String(n).padStart(2, '0');
  const dateText = `Generado el ${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;

  let first = true;
  const nextPage = () => (first ? (first = false) : doc.addPage());

  if (entries.length > 1) {
    nextPage();
    summaryPages(doc, entries, dateText);
  }
  for (let i = 0; i < entries.length; i++) {
    onProgress(i, entries.length);
    // yield so the UI can repaint between experiments
    await new Promise((r) => setTimeout(r, 0));
    nextPage();
    resultsPage(doc, entries[i], dateText);
    doc.addPage();
    chartsPage(doc, entries[i], dateText);
  }
  footers(doc, entries.length === 1 ? `Reporte: ${entries[0].name}` : `Reporte de ${entries.length} pruebas`);
  doc.setProperties({
    title: entries.length === 1 ? `PhysicsLab 3D - ${toLatin1(entries[0].name)}` : `PhysicsLab 3D - ${entries.length} pruebas`,
    subject: 'Reporte de experimentos MRU / MRUV',
    author: 'PhysicsLab 3D',
    creator: 'PhysicsLab 3D',
  });
  onProgress(entries.length, entries.length);
  return doc;
}
