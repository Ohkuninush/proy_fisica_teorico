import { COLORS, MARGIN, mix, PAGE_HEIGHT, PAGE_WIDTH } from './layout.js';
import { toLatin1 } from './text.js';

const HEADER_HEIGHT = 27;
const HEADER_STRIPS = 70;
const ACCENT_STRIP_WIDTH = 1.7;

export const setFill = (doc, color) => doc.setFillColor(color[0], color[1], color[2]);
export const setStroke = (doc, color) => doc.setDrawColor(color[0], color[1], color[2]);
export const setInk = (doc, color) => doc.setTextColor(color[0], color[1], color[2]);

function drawHeaderBackground(doc) {
  const stripWidth = PAGE_WIDTH / HEADER_STRIPS;
  for (let i = 0; i < HEADER_STRIPS; i++) {
    const progress = i / (HEADER_STRIPS - 1);
    setFill(doc, mix(COLORS.navy, COLORS.navyAccent, progress));
    doc.rect(stripWidth * i, 0, stripWidth + 0.3, HEADER_HEIGHT, 'F');
    setFill(doc, mix([76, 201, 240], [247, 37, 133], progress));
    doc.rect(stripWidth * i, HEADER_HEIGHT, stripWidth + 0.3, 1.1, 'F');
  }
}

function drawLogo(doc) {
  setStroke(doc, [76, 201, 240]);
  doc.setLineWidth(0.7);
  doc.roundedRect(MARGIN, 8, 11, 11, 2.6, 2.6, 'S');
  doc.setLineCap('round');
  doc.lines([[2.6, -3.4], [2.4, 2.4], [3.2, -4]], MARGIN + 2.4, 15.6, [1, 1], 'S');
}

export function drawHeader(doc, subtitle, dateText) {
  drawHeaderBackground(doc);
  drawLogo(doc);
  setInk(doc, COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('PhysicsLab 3D', MARGIN + 15, 14.6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setInk(doc, [170, 190, 232]);
  doc.text(toLatin1(subtitle), MARGIN + 15, 20.6);
  doc.setFontSize(8.5);
  doc.text(toLatin1(dateText), PAGE_WIDTH - MARGIN, 14.6, { align: 'right' });
}

export function drawFooters(doc, label) {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    setStroke(doc, COLORS.line);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, PAGE_HEIGHT - 13, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setInk(doc, COLORS.muted);
    doc.text(toLatin1(label), MARGIN, PAGE_HEIGHT - 8);
    doc.text(`Página ${page} de ${pageCount}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 8, { align: 'right' });
  }
}

export function drawSectionTitle(doc, text, y, color = COLORS.cyan) {
  setFill(doc, color);
  doc.roundedRect(MARGIN, y - 4.2, 1.4, 5.4, 0.6, 0.6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setInk(doc, COLORS.ink);
  doc.text(toLatin1(text), MARGIN + 4, y);
  return y + 4;
}

export function drawChip(doc, text, color, x, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const width = doc.getTextWidth(text) + 7;
  setFill(doc, mix(color, COLORS.white, 0.86));
  setStroke(doc, mix(color, COLORS.white, 0.45));
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y - 4.3, width, 6, 3, 3, 'FD');
  setInk(doc, color);
  doc.text(text, x + 3.5, y);
}

export function drawAccentCard(doc, { x, y, width, height, radius = 2.2, accent, fill, stroke }) {
  setFill(doc, accent);
  setStroke(doc, stroke);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, width, height, radius, radius, 'FD');
  setFill(doc, fill);
  doc.roundedRect(x + ACCENT_STRIP_WIDTH, y, width - ACCENT_STRIP_WIDTH, height, radius, radius, 'F');
}

export function drawKpiCard(doc, { x, y, width, height, label, value, unit, color }) {
  drawAccentCard(doc, { x, y, width, height, accent: color, fill: COLORS.panel, stroke: COLORS.line });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  setInk(doc, COLORS.muted);
  doc.text(toLatin1(label).toUpperCase(), x + 5.6, y + 6.2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  setInk(doc, COLORS.ink);
  doc.text(value, x + 5.6, y + 15.4);
  const valueWidth = doc.getTextWidth(value);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setInk(doc, COLORS.muted);
  doc.text(toLatin1(unit), x + 5.6 + valueWidth + 1.6, y + 15.4);
}

export const drawZebraRow = (doc, { x, y, width, height, index }) => {
  if (index % 2 !== 0) return;
  setFill(doc, COLORS.panel);
  doc.rect(x, y, width, height, 'F');
};

export const drawPanel = (doc, { x, y, width, height }) => {
  setFill(doc, COLORS.panel);
  setStroke(doc, COLORS.line);
  doc.roundedRect(x, y, width, height, 2.2, 2.2, 'FD');
};
