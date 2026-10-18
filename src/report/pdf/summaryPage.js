import { msToKmh } from '../../physics/params.js';
import { damageOf } from './damage.js';
import { COLORS, CONTENT_WIDTH, GOAL_STATUS, MARGIN, STATUS_STYLE, statusStyleOf } from './layout.js';
import { drawHeader, drawSectionTitle, drawZebraRow, setFill, setInk } from './primitives.js';
import { fixed, toLatin1 } from './text.js';

const ROW_HEIGHT = 8;
const ROWS_PER_PAGE = 27;
const CELL_PADDING = 2.5;

const COLUMNS = [
  { header: '#', weight: 7, align: 'left' },
  { header: 'Prueba', weight: 36, align: 'left' },
  { header: 'Fecha y hora', weight: 34, align: 'left' },
  { header: 'Modelo', weight: 14, align: 'left' },
  { header: 'Estado', weight: 22, align: 'left' },
  { header: 'Daño', weight: 16, align: 'left' },
  { header: 't (s)', weight: 13, align: 'right' },
  { header: 'v (km/h)', weight: 17, align: 'right' },
  { header: 'Recorrido (m)', weight: 24, align: 'right' },
];
const STATUS_COLUMN = 4;

const columnWidths = (() => {
  const scale = CONTENT_WIDTH / COLUMNS.reduce((sum, column) => sum + column.weight, 0);
  return COLUMNS.map((column) => column.weight * scale);
})();

function rowCells(entry, index) {
  const damage = damageOf(entry);
  return [
    String(index + 1),
    toLatin1(entry.name),
    entry.savedAt,
    entry.params.model,
    statusStyleOf(entry).label,
    damage ? `Nivel ${damage.level}` : '-',
    fixed(entry.result.t),
    fixed(msToKmh(entry.result.v), 1),
    fixed(entry.result.traveled),
  ];
}

function drawCell(doc, text, column, x, width, y) {
  const textX = column.align === 'right' ? x + width - CELL_PADDING : x + CELL_PADDING;
  doc.text(text, textX, y, { align: column.align });
}

function drawTableHeader(doc, y) {
  setFill(doc, COLORS.navy);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, ROW_HEIGHT, 1.6, 1.6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setInk(doc, COLORS.white);
  let x = MARGIN;
  COLUMNS.forEach((column, i) => {
    drawCell(doc, column.header, column, x, columnWidths[i], y + 5.3);
    x += columnWidths[i];
  });
}

function fitText(doc, text, width) {
  let fitted = text;
  while (doc.getTextWidth(fitted) > width - 5 && fitted.length > 3) fitted = fitted.slice(0, -2);
  return fitted;
}

function drawRow(doc, cells, y, index) {
  drawZebraRow(doc, { x: MARGIN, y, width: CONTENT_WIDTH, height: ROW_HEIGHT, index });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setInk(doc, COLORS.ink);
  let x = MARGIN;
  COLUMNS.forEach((column, i) => {
    const isStatus = i === STATUS_COLUMN;
    if (isStatus) {
      setInk(doc, cells[i] === STATUS_STYLE.collided.label ? COLORS.pink : cells[i] === GOAL_STATUS.label ? COLORS.lime : COLORS.violet);
      doc.setFont('helvetica', 'bold');
    }
    drawCell(doc, fitText(doc, cells[i], columnWidths[i]), column, x, columnWidths[i], y + 5.4);
    setInk(doc, COLORS.ink);
    doc.setFont('helvetica', 'normal');
    x += columnWidths[i];
  });
}

export function drawSummaryPages(doc, entries, dateText) {
  const rows = entries.map(rowCells);
  for (let start = 0; start < rows.length; start += ROWS_PER_PAGE) {
    if (start > 0) doc.addPage();
    drawHeader(doc, 'Resumen de pruebas', dateText);
    const tableTop = drawSectionTitle(doc, `Pruebas incluidas (${entries.length})`, 42) + 4;
    drawTableHeader(doc, tableTop);
    rows.slice(start, start + ROWS_PER_PAGE).forEach((cells, i) => drawRow(doc, cells, tableTop + ROW_HEIGHT + i * ROW_HEIGHT, i));
  }
}
