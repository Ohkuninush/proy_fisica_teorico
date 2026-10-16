import { Chart, Filler, LinearScale, LineController, LineElement, PointElement } from 'chart.js';
import { axisBounds } from './series.js';
import { niceTicks } from './ticks.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, Filler);

export const CHART_WIDTH = 1200;
export const CHART_HEIGHT = 380;

const FONT_FAMILY = 'Helvetica, Arial, sans-serif';
const INK = '#4a5470';
const GRID = '#e3e7f0';
const AXIS_LINE = '#aab3cc';

export const SERIES_STYLE = {
  x: { color: '#1b9ac4', yLabel: 'Posición (m)' },
  v: { color: '#5da10f', yLabel: 'Velocidad (m/s)' },
  a: { color: '#e08a00', yLabel: 'Aceleración (m/s²)' },
};

const whiteBackground = {
  id: 'whiteBackground',
  beforeDraw({ ctx, width, height }) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  },
};

const formatTick = (value) => String(+Number(value).toFixed(2));

const printAxis = (label, { min, max, ticks }) => ({
  type: 'linear',
  min,
  max,
  afterBuildTicks: (axis) => (axis.ticks = ticks(axis)),
  title: { display: true, text: label, color: INK, font: { size: 26, family: FONT_FAMILY, weight: 'bold' } },
  ticks: { color: INK, font: { size: 24, family: FONT_FAMILY }, callback: formatTick },
  grid: { color: GRID, lineWidth: 2 },
  border: { color: AXIS_LINE, width: 2 },
});

export function renderChartPng(series, key) {
  const { color, yLabel } = SERIES_STYLE[key];
  const canvas = document.createElement('canvas');
  canvas.width = CHART_WIDTH;
  canvas.height = CHART_HEIGHT;
  const bounds = axisBounds(series[key]);
  const lastIndex = series.t.length - 1;

  const chart = new Chart(canvas, {
    type: 'line',
    plugins: [whiteBackground],
    data: {
      datasets: [
        {
          data: series.t.map((t, i) => ({ x: t, y: series[key][i] })),
          borderColor: color,
          borderWidth: 5,
          backgroundColor: `${color}26`,
          fill: 'origin',
          pointRadius: ({ dataIndex }) => (dataIndex === lastIndex ? 11 : 0),
          pointBackgroundColor: '#ffffff',
          pointBorderColor: color,
          pointBorderWidth: 6,
          tension: 0,
        },
      ],
    },
    options: {
      animation: false,
      responsive: false,
      devicePixelRatio: 1,
      locale: 'en-US',
      parsing: false,
      layout: { padding: { top: 18, right: 30, bottom: 6, left: 6 } },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: printAxis('Tiempo (s)', { min: 0, max: series.tEnd, ticks: (axis) => niceTicks(axis.min, axis.max, { includeEnd: true }) }),
        y: printAxis(yLabel, { min: bounds.min, max: bounds.max, ticks: (axis) => niceTicks(axis.min, axis.max, { target: 5 }) }),
      },
    },
  });
  chart.update('none');
  const url = canvas.toDataURL('image/png');
  chart.destroy();
  return url;
}
