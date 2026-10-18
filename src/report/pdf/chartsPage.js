import { CHART_HEIGHT, CHART_WIDTH, renderChartPng, SERIES_STYLE } from '../chartImages.js';
import { hasGoal } from '../../visuals/catalog.js';
import { buildSeries } from '../series.js';
import { COLORS, CONTENT_WIDTH, MARGIN } from './layout.js';
import { drawHeader, drawSectionTitle, setInk, setStroke } from './primitives.js';
import { fixed, toLatin1 } from './text.js';

const SAMPLES = 240;
const CHARTS = [
  { key: 'x', title: 'Posición vs. tiempo' },
  { key: 'v', title: 'Velocidad vs. tiempo' },
  { key: 'a', title: 'Aceleración vs. tiempo' },
];
const IMAGE_HEIGHT = (CONTENT_WIDTH * CHART_HEIGHT) / CHART_WIDTH;

const hexToRgb = (hex) => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));

function captionsFor(params, series, goal) {
  const impact = series.impactTime !== null ? ` El último punto marca ${goal ? 'la llegada a la meta' : 'el impacto'} (t = ${fixed(series.impactTime)} s).` : '';
  if (params.model === 'MRU') {
    return {
      x: `Recta: el vehículo avanza con rapidez constante; la pendiente es la velocidad (v0 = ${fixed(params.v0, 1)} m/s).${impact}`,
      v: 'Recta horizontal: la velocidad no cambia durante el movimiento.',
      a: 'Valor nulo: en MRU no hay aceleración (a = 0).',
    };
  }
  let trend = 'recta: no hay aceleración';
  if (params.a > 0) trend = 'curva cada vez más empinada: el vehículo acelera';
  if (params.a < 0) trend = 'curva que se aplana: el vehículo frena';
  return {
    x: `Parábola, ${trend}.${impact}`,
    v: `Recta inclinada: la velocidad cambia de forma uniforme; su pendiente es la aceleración (a = ${fixed(params.a, 2)} m/s²).`,
    a: `Recta horizontal: la aceleración es constante (a = ${fixed(params.a, 2)} m/s²).`,
  };
}

export function drawChartsPage(doc, entry, dateText) {
  const series = buildSeries(entry.params, SAMPLES);
  const captions = captionsFor(entry.params, series, hasGoal(entry.visuals));
  drawHeader(doc, `Gráficas  ·  ${entry.name}`, dateText);

  let y = 41;
  CHARTS.forEach(({ key, title }) => {
    y = drawSectionTitle(doc, title, y, hexToRgb(SERIES_STYLE[key].color)) + 2.5;
    setStroke(doc, COLORS.line);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN - 0.5, y - 0.5, CONTENT_WIDTH + 1, IMAGE_HEIGHT + 1, 1.6, 1.6, 'S');
    doc.addImage(renderChartPng(series, key), 'PNG', MARGIN, y, CONTENT_WIDTH, IMAGE_HEIGHT, undefined, 'FAST');
    y += IMAGE_HEIGHT + 4.6;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.2);
    setInk(doc, COLORS.muted);
    doc.text(doc.splitTextToSize(toLatin1(captions[key]), CONTENT_WIDTH), MARGIN, y);
    y += 9;
  });
}
