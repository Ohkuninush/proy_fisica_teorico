import { msToKmh } from '../physics/params.js';

const STATUS_LABEL = {
  idle: 'Listo',
  running: 'En ejecución',
  paused: 'Pausado',
  finished: 'Finalizado',
  collided: 'Colisión',
};

const GOAL_STATUS_LABEL = 'Meta alcanzada';

const fixed = (value, digits = 2) => (Number.isFinite(value) ? value.toFixed(digits) : '—');

export function formatIndicators(snap, { goal = false } = {}) {
  return {
    time: `${fixed(snap.t)} s`,
    position: `${fixed(snap.x)} m`,
    traveled: `${fixed(snap.traveled)} m`,
    speed: `${fixed(snap.v)} m/s`,
    speedKmh: `${fixed(msToKmh(snap.v), 1)} km/h`,
    acceleration: `${fixed(snap.a)} m/s²`,
    remaining: `${fixed(snap.remaining)} m`,
    vMax: `${fixed(snap.vMax)} m/s (${fixed(msToKmh(snap.vMax), 1)} km/h)`,
    status: goal && snap.status === 'collided' ? GOAL_STATUS_LABEL : (STATUS_LABEL[snap.status] ?? snap.status),
  };
}
