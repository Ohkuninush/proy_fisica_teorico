// Snapshot -> display strings. Pure; no physics beyond unit conversion.
import { msToKmh } from '../physics/params.js';

const STATUS_LABEL = {
  idle: 'Listo',
  running: 'En ejecución',
  paused: 'Pausado',
  finished: 'Finalizado',
  collided: 'Colisión',
};

const f = (n, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : '—');

export function formatIndicators(s) {
  return {
    time: `${f(s.t)} s`,
    position: `${f(s.x)} m`,
    traveled: `${f(s.traveled)} m`,
    speed: `${f(s.v)} m/s`,
    speedKmh: `${f(msToKmh(s.v), 1)} km/h`,
    acceleration: `${f(s.a)} m/s²`,
    remaining: `${f(s.remaining)} m`,
    vMax: `${f(s.vMax)} m/s (${f(msToKmh(s.vMax), 1)} km/h)`,
    status: STATUS_LABEL[s.status] ?? s.status,
  };
}
