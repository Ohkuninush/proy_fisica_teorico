// Chart.js panels. Data = controller history only (no physics computed here).
import { Chart, LineController, LineElement, PointElement, LinearScale, Tooltip, Filler } from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip, Filler);

export const MAX_POINTS = 400;

/** Keep first and last point; evenly pick the rest. Never alters the source. */
export function decimate(points, max = MAX_POINTS) {
  if (points.length <= max) return points;
  const out = [];
  const step = (points.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) out.push(points[Math.round(i * step)]);
  return out;
}

const SERIES = [
  { key: 'x', title: 'Posición vs. tiempo', yLabel: 'x (m)', color: '#4cc9f0' },
  { key: 'v', title: 'Velocidad vs. tiempo', yLabel: 'v (m/s)', color: '#b8f35a' },
  { key: 'a', title: 'Aceleración vs. tiempo', yLabel: 'a (m/s²)', color: '#ffb703' },
];

const AXIS = '#8693b5';
const GRID = 'rgba(140,160,255,0.09)';

function fillGradient(color) {
  return (ctx) => {
    const { chart } = ctx;
    const { ctx: c, chartArea } = chart;
    if (!chartArea) return 'transparent';
    const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    g.addColorStop(0, `${color}55`);
    g.addColorStop(1, `${color}00`);
    return g;
  };
}

export function createCharts(canvases) {
  const charts = SERIES.map((s, i) => {
    const tick = { color: AXIS, font: { size: 11, family: 'JetBrains Mono, monospace' }, maxTicksLimit: 6 };
    const title = (text) => ({ display: true, text, color: AXIS, font: { size: 11, family: 'JetBrains Mono, monospace' } });
    return new Chart(canvases[i], {
      type: 'line',
      data: {
        datasets: [
          {
            data: [],
            borderColor: s.color,
            borderWidth: 2.4,
            backgroundColor: fillGradient(s.color),
            fill: 'origin',
            pointRadius: (ctx) => (ctx.dataIndex === ctx.dataset.data.length - 1 ? 5 : 0),
            pointBackgroundColor: '#fff',
            pointBorderColor: s.color,
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
        scales: {
          x: { type: 'linear', title: title('t (s)'), ticks: tick, grid: { color: GRID }, border: { display: false } },
          y: { type: 'linear', title: title(s.yLabel), ticks: tick, grid: { color: GRID }, border: { display: false } },
        },
      },
    });
  });

  return {
    /** history: [{t,x,v,a}] */
    update(history) {
      const pts = decimate(history);
      SERIES.forEach((s, i) => {
        charts[i].data.datasets[0].data = pts.map((p) => ({ x: p.t, y: p[s.key] }));
        charts[i].update('none');
      });
    },
  };
}

export const CHART_TITLES = SERIES.map((s) => s.title);
