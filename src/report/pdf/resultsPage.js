import { obstacleX } from '../../physics/collision.js';
import { CAR_LENGTH, msToKmh } from '../../physics/params.js';
import { GOALS, hasGoal, OBSTACLES, VEHICLES } from '../../visuals/catalog.js';
import { damageOf } from './damage.js';
import { COLORS, CONTENT_WIDTH, DAMAGE_COLORS, MARGIN, mix, statusStyleOf } from './layout.js';
import { drawAccentCard, drawChip, drawHeader, drawKpiCard, drawPanel, drawSectionTitle, drawZebraRow, setFill, setInk, setStroke } from './primitives.js';
import { fixed, toLatin1 } from './text.js';

const KPI_GAP = 4;
const KPI_HEIGHT = 21;
const CONDITION_ROW_HEIGHT = 8;
const EQUATION_ROW_HEIGHT = 7.5;
const DAMAGE_SEGMENT_STEP = 8.6;

const parenthesized = (value) => (value < 0 ? `(${value})` : `${value}`);

function equationsFor(params) {
  const x0 = parenthesized(params.x0);
  const v0 = parenthesized(params.v0);
  if (params.model === 'MRU') {
    return [
      ['Posición', 'x(t) = x0 + v0*t', `x(t) = ${x0} + ${v0}*t`],
      ['Velocidad', 'v(t) = v0', `v(t) = ${v0}`],
      ['Aceleración', 'a(t) = 0', 'a(t) = 0'],
    ];
  }
  const a = parenthesized(params.a);
  return [
    ['Posición', 'x(t) = x0 + v0*t + (1/2)*a*t^2', `x(t) = ${x0} + ${v0}*t + (1/2)*${a}*t^2`],
    ['Velocidad', 'v(t) = v0 + a*t', `v(t) = ${v0} + ${a}*t`],
    ['Aceleración', 'a(t) = a', `a(t) = ${a}`],
  ];
}

function drawTitle(doc, entry) {
  const status = statusStyleOf(entry);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  setInk(doc, COLORS.ink);
  doc.text(toLatin1(entry.name), MARGIN, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setInk(doc, COLORS.muted);
  const meta = `Guardado: ${entry.savedAt}   |   Modelo: ${entry.params.model}   |   Resultado:`;
  doc.text(meta, MARGIN, 49);
  drawChip(doc, status.label, status.color, MARGIN + doc.getTextWidth(meta) + 2.5, 49);
}

function drawKpis(doc, result, top, goal) {
  const width = (CONTENT_WIDTH - 3 * KPI_GAP) / 4;
  const cards = [
    ['Tiempo', fixed(result.t), 's', COLORS.cyan],
    ['Posición final', fixed(result.x), 'm', COLORS.cyan],
    ['Recorrido', fixed(result.traveled), 'm', COLORS.cyan],
    ['Velocidad', fixed(result.v), 'm/s', COLORS.lime],
    ['Velocidad', fixed(msToKmh(result.v), 1), 'km/h', COLORS.lime],
    ['Aceleración', fixed(result.a), 'm/s²', COLORS.amber],
    [goal ? 'Dist. a la meta' : 'Dist. al obstáculo', fixed(result.remaining), 'm', COLORS.pink],
    ['Velocidad máxima', fixed(result.vMax), 'm/s', COLORS.violet],
  ];
  cards.forEach(([label, value, unit, color], i) => {
    drawKpiCard(doc, {
      x: MARGIN + (i % 4) * (width + KPI_GAP),
      y: top + Math.floor(i / 4) * (KPI_HEIGHT + KPI_GAP),
      width,
      height: KPI_HEIGHT,
      label,
      value,
      unit,
      color,
    });
  });
  return top + 2 * KPI_HEIGHT + KPI_GAP;
}

function drawDamageScale(doc, damage, top) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setInk(doc, COLORS.ink);
  doc.text('Nivel de daño', MARGIN + 6, top + 2.5);

  const scaleX = MARGIN + 31;
  DAMAGE_COLORS.forEach((color, i) => {
    setFill(doc, i < damage.level ? color : mix(COLORS.line, COLORS.white, 0.2));
    doc.roundedRect(scaleX + i * DAMAGE_SEGMENT_STEP, top, 7.6, 3.4, 1.2, 1.2, 'F');
  });

  setInk(doc, DAMAGE_COLORS[damage.level - 1]);
  doc.setFontSize(8.6);
  doc.text(`${damage.level} de 5 · ${damage.name}`, scaleX + 5 * DAMAGE_SEGMENT_STEP + 3, top + 2.7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  setInk(doc, COLORS.muted);
  const vehicle = `${damage.vehicle}${damage.assumed ? ' (supuesto)' : ''}`;
  const subject = damage.obstacle ? `${vehicle} contra ${damage.obstacle}` : vehicle;
  doc.text(toLatin1(subject), MARGIN + CONTENT_WIDTH - 3, top + 2.7, { align: 'right' });
}

function drawOutcome(doc, entry, top) {
  const { params, result } = entry;
  const impact = result.impact;
  const damage = damageOf(entry);
  const height = damage ? 20 : 13;
  const goal = hasGoal(entry.visuals);
  const tone = impact ? (goal ? COLORS.lime : COLORS.pink) : COLORS.violet;

  drawAccentCard(doc, { x: MARGIN, y: top, width: CONTENT_WIDTH, height, accent: tone, fill: mix(tone, COLORS.white, 0.9), stroke: mix(tone, COLORS.white, 0.5) });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  setInk(doc, tone);
  doc.text(impact ? (goal ? 'Meta alcanzada' : 'Impacto detectado') : (goal ? 'Experimento finalizado sin llegar a la meta' : 'Experimento finalizado sin colisión'), MARGIN + 6, top + 5.4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.6);
  setInk(doc, COLORS.ink);
  const target = goal ? 'la meta' : 'el obstáculo';
  const sentence = impact
    ? `El frente del vehículo ${goal ? 'cruzó la meta' : 'alcanzó el obstáculo'} en t = ${fixed(impact.t)} s con v = ${fixed(impact.v)} m/s (${fixed(msToKmh(impact.v), 1)} km/h).`
    : `Terminó al cumplirse la duración (${fixed(params.duration, 1)} s); ${target} quedó a ${fixed(result.remaining)} m.`;
  doc.text(sentence, MARGIN + 6, top + 10);
  if (damage) drawDamageScale(doc, damage, top + 15.2);
  return top + height;
}

function conditionRows(entry) {
  const { params } = entry;
  const goal = hasGoal(entry.visuals);
  const nameOf = (list, id) => list.find((item) => item.id === id)?.name ?? 'No registrado';
  const speed = `${fixed(params.v0)} m/s  (${fixed(msToKmh(params.v0), 1)} km/h)`;
  const acceleration = params.model === 'MRU' ? '0 m/s²  (constante)' : `${fixed(params.a)} m/s²`;
  return [
    [
      ['Modelo físico', params.model === 'MRU' ? 'MRU (velocidad constante)' : 'MRUV (aceleración constante)'],
      ['Posición inicial (x0)', `${fixed(params.x0)} m`],
      ['Velocidad inicial (v0)', speed],
      ['Aceleración (a)', acceleration],
      ['Vehículo', nameOf(VEHICLES, entry.visuals?.vehicle)],
    ],
    [
      ['Duración máxima', `${fixed(params.duration, 1)} s`],
      [goal ? 'Distancia a la meta' : 'Distancia al obstáculo', `${fixed(params.gap)} m`],
      [goal ? 'Línea de meta' : 'Cara del obstáculo', `x = ${fixed(obstacleX(params))} m`],
      ['Largo del vehículo', `${fixed(CAR_LENGTH, 1)} m`],
      goal ? ['Meta', nameOf(GOALS, entry.visuals.goal)] : ['Obstáculo', nameOf(OBSTACLES, entry.visuals?.obstacle)],
    ],
  ];
}

function drawConditions(doc, entry, top) {
  const columnWidth = (CONTENT_WIDTH - 6) / 2;
  conditionRows(entry).forEach((rows, column) => {
    const x = MARGIN + column * (columnWidth + 6);
    rows.forEach(([label, value], i) => {
      const y = top + i * CONDITION_ROW_HEIGHT;
      drawZebraRow(doc, { x, y, width: columnWidth, height: CONDITION_ROW_HEIGHT, index: i });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.4);
      setInk(doc, COLORS.muted);
      doc.text(toLatin1(label), x + 2.5, y + 5.4);
      doc.setFont('helvetica', 'bold');
      setInk(doc, COLORS.ink);
      doc.text(toLatin1(value), x + columnWidth - 2.5, y + 5.4, { align: 'right' });
    });
  });
  return top + 5 * CONDITION_ROW_HEIGHT;
}

function drawEquations(doc, params, top) {
  const equations = equationsFor(params);
  const height = equations.length * EQUATION_ROW_HEIGHT + 4;
  drawPanel(doc, { x: MARGIN, y: top, width: CONTENT_WIDTH, height });
  equations.forEach(([name, general, substituted], i) => {
    const y = top + 7 + i * EQUATION_ROW_HEIGHT;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.4);
    setInk(doc, COLORS.ink);
    doc.text(name, MARGIN + 4, y);
    doc.setFont('courier', 'normal');
    doc.setFontSize(8.6);
    setInk(doc, COLORS.muted);
    doc.text(general, MARGIN + 30, y);
    setInk(doc, COLORS.cyan);
    doc.setFont('courier', 'bold');
    doc.text(substituted, MARGIN + 98, y);
  });
  return top + height;
}

function drawComment(doc, comment, top) {
  const titleBottom = drawSectionTitle(doc, 'Comentario', top, COLORS.violet) + 3;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9.5);
  const lines = doc.splitTextToSize(toLatin1(comment.trim()), CONTENT_WIDTH - 10);
  setFill(doc, mix(COLORS.violet, COLORS.white, 0.93));
  setStroke(doc, mix(COLORS.violet, COLORS.white, 0.6));
  doc.roundedRect(MARGIN, titleBottom, CONTENT_WIDTH, lines.length * 5 + 6, 2.2, 2.2, 'FD');
  setInk(doc, COLORS.ink);
  doc.text(lines, MARGIN + 5, titleBottom + 6.4);
}

export function drawResultsPage(doc, entry, dateText) {
  drawHeader(doc, 'Reporte de experimento', dateText);
  drawTitle(doc, entry);

  const kpisBottom = drawKpis(doc, entry.result, drawSectionTitle(doc, 'Resultados', 62) + 3, hasGoal(entry.visuals));
  const outcomeBottom = drawOutcome(doc, entry, kpisBottom + 7);
  const conditionsBottom = drawConditions(doc, entry, drawSectionTitle(doc, 'Condiciones iniciales', outcomeBottom + 10) + 3);
  const equationsBottom = drawEquations(doc, entry.params, drawSectionTitle(doc, 'Ecuaciones del modelo', conditionsBottom + 9) + 3);
  if (entry.comment?.trim()) drawComment(doc, entry.comment, equationsBottom + 9);
}
