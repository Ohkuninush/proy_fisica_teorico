// Chart.js panels. Data = controller history only (no physics computed here).
import { Chart, LineController, LineElement, PointElement, LinearScale, Tooltip } from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip);

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
  { key: 'v', title: 'Velocidad vs. tiempo', yLabel: 'v (m/s)', color: '#80ed99' },
  { key: 'a', title: 'Aceleración vs. tiempo', yLabel: 'a (m/s²)', color: '#ffb703' },
];

export function createCharts(canvases) {
  const charts = SERIES.map((s, i) => {
    const tick = { color: '#9aa4b2', font: { size: 11 } };
    return new Chart(canvases[i], {
      type: 'line',
      data: { datasets: [{ data: [], borderColor: s.color, borderWidth: 2, pointRadius: 0, tension: 0 }] },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        parsing: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { type: 'linear', title: { display: true, text: 't (s)', color: '#9aa4b2' }, ticks: tick, grid: { color: '#1f2937' } },
          y: { type: 'linear', title: { display: true, text: s.yLabel, color: '#9aa4b2' }, ticks: tick, grid: { color: '#1f2937' } },
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
