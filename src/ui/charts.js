import { Chart, Filler, LinearScale, LineController, LineElement, PointElement, Tooltip } from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip, Filler);

const MAX_POINTS = 400;
const AXIS_COLOR = '#8693b5';
const GRID_COLOR = 'rgba(140,160,255,0.09)';
const FONT = { size: 11, family: 'JetBrains Mono, monospace' };

const SERIES = [
  { key: 'x', yLabel: 'x (m)', color: '#4cc9f0' },
  { key: 'v', yLabel: 'v (m/s)', color: '#b8f35a' },
  { key: 'a', yLabel: 'a (m/s²)', color: '#ffb703' },
];

export function decimate(points, max = MAX_POINTS) {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => points[Math.round(i * step)]);
}

const fadingFill = (color) => ({ chart }) => {
  const { ctx, chartArea } = chart;
  if (!chartArea) return 'transparent';
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, `${color}55`);
  gradient.addColorStop(1, `${color}00`);
  return gradient;
};

const lastPointOnly = ({ dataIndex, dataset }) => (dataIndex === dataset.data.length - 1 ? 5 : 0);

const axis = (label) => ({
  type: 'linear',
  title: { display: true, text: label, color: AXIS_COLOR, font: FONT },
  ticks: { color: AXIS_COLOR, font: FONT, maxTicksLimit: 6 },
  grid: { color: GRID_COLOR },
  border: { display: false },
});

function createChart(canvas, { color, yLabel }) {
  return new Chart(canvas, {
    type: 'line',
    data: {
      datasets: [
        {
          data: [],
          borderColor: color,
          borderWidth: 2.4,
          backgroundColor: fadingFill(color),
          fill: 'origin',
          pointRadius: lastPointOnly,
          pointBackgroundColor: '#fff',
          pointBorderColor: color,
          pointBorderWidth: 3,
          tension: 0,
        },
      ],
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      parsing: false,
      layout: { padding: { right: 8, top: 4 } },
      plugins: { legend: { display: false } },
      scales: { x: axis('t (s)'), y: axis(yLabel) },
    },
  });
}

export function createCharts(canvases) {
  const charts = SERIES.map((series, i) => createChart(canvases[i], series));

  return {
    update(history) {
      const points = decimate(history);
      SERIES.forEach(({ key }, i) => {
        charts[i].data.datasets[0].data = points.map((point) => ({ x: point.t, y: point[key] }));
        charts[i].update('none');
      });
    },
  };
}
