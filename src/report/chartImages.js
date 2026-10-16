// Print-friendly chart images (white background, dark ink) rendered off-screen with Chart.js.
import { Chart, LineController, LineElement, PointElement, LinearScale, Filler } from 'chart.js';
import { axisBounds } from './series.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, Filler);

export const CHART_W = 1200;
export const CHART_H = 380;
const FONT = 'Helvetica, Arial, sans-serif';
const INK = '#4a5470';
const GRID = '#e3e7f0';

function niceStep(range, target) {
  const raw = range / target;
  const p = 10 ** Math.floor(Math.log10(raw));
  const n = raw / p;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p;
}

/** Round tick values (1, 2, 5 x 10^n); optionally close the axis with its exact end value. */
export function niceTicks(min, max, { includeEnd = false, target = 6 } = {}) {
  const step = niceStep(max - min, target);
  const out = [];
  for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + 1e-9; v += step) out.push({ value: +v.toFixed(10) });
  if (includeEnd && out.length && max - out[out.length - 1].value > step * 0.3) out.push({ value: max });
  return out;
}

const fmtTick = (v) => String(+Number(v).toFixed(2));

export const SERIES_STYLE = {
  x: { color: '#1b9ac4', yLabel: 'Posición (m)' },
  v: { color: '#5da10f', yLabel: 'Velocidad (m/s)' },
  a: { color: '#e08a00', yLabel: 'Aceleración (m/s²)' },
};

const whiteBackground = {
  id: 'whiteBackground',
  beforeDraw(chart) {
    const { ctx, width, height } = chart;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  },
};

/** @param key 'x' | 'v' | 'a'  @returns PNG data URL */
export function renderChartPng(series, key) {
  const { color, yLabel } = SERIES_STYLE[key];
  const canvas = document.createElement('canvas');
  canvas.width = CHART_W;
  canvas.height = CHART_H;
  const b = axisBounds(series[key]);
  const last = series.t.length - 1;
  const tick = { color: INK, font: { size: 24, family: FONT }, callback: fmtTick };
  const title = (text) => ({ display: true, text, color: INK, font: { size: 26, family: FONT, weight: 'bold' } });

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
          pointRadius: (ctx) => (ctx.dataIndex === last ? 11 : 0),
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
        x: { type: 'linear', min: 0, max: series.tEnd, afterBuildTicks: (ax) => (ax.ticks = niceTicks(ax.min, ax.max, { includeEnd: true })), title: title('Tiempo (s)'), ticks: tick, grid: { color: GRID, lineWidth: 2 }, border: { color: '#aab3cc', width: 2 } },
        y: { type: 'linear', min: b.min, max: b.max, afterBuildTicks: (ax) => (ax.ticks = niceTicks(ax.min, ax.max, { target: 5 })), title: title(yLabel), ticks: tick, grid: { color: GRID, lineWidth: 2 }, border: { color: '#aab3cc', width: 2 } },
      },
    },
  });
  chart.update('none');
  const url = canvas.toDataURL('image/png');
  chart.destroy();
  return url;
}
