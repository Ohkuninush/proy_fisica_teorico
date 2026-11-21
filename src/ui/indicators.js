import { msToKmh } from '../physics/params.js';
import { isProjectile, launchInfo, PROJECTILE } from '../physics/projectile.js';

const STATUS_LABEL = {
  idle: 'Listo',
  running: 'En ejecución',
  paused: 'Pausado',
  finished: 'Finalizado',
  collided: 'Colisión',
};

const GOAL_STATUS_LABEL = 'Meta alcanzada';
const GROUND_STATUS_LABEL = 'En el suelo';

const fixed = (value, digits = 2) => (Number.isFinite(value) ? value.toFixed(digits) : '—');

export const modelLabel = (params) => (isProjectile(params) ? launchInfo(params.launch).short : params?.model ?? '');

export function indicatorLabels(model, goal = false) {
  if (model === PROJECTILE) {
    return {
      time: 'Tiempo',
      position: 'Posición x',
      traveled: 'Altura y',
      speed: 'Rapidez',
      speedKmh: 'Rapidez',
      acceleration: 'Aceleración (−g)',
      remaining: 'Vel. horizontal vx',
      height: 'Vel. vertical vy',
      slope: 'Dirección de v',
      vMax: 'Rapidez máxima',
    };
  }
  return {
    time: 'Tiempo',
    position: 'Posición',
    traveled: 'Recorrido',
    speed: 'Velocidad',
    speedKmh: 'Velocidad',
    acceleration: 'Aceleración',
    remaining: goal ? 'A la meta' : 'Al obstáculo',
    height: 'Altura',
    slope: 'Pendiente',
    vMax: 'Velocidad máxima',
  };
}

function statusOf(snap, goal) {
  if (snap.status === 'collided' && isProjectile(snap.params)) return GROUND_STATUS_LABEL;
  if (goal && snap.status === 'collided') return GOAL_STATUS_LABEL;
  return STATUS_LABEL[snap.status] ?? snap.status;
}

export function formatIndicators(snap, { goal = false } = {}) {
  const common = {
    time: `${fixed(snap.t)} s`,
    speed: `${fixed(snap.v)} m/s`,
    speedKmh: `${fixed(msToKmh(snap.v), 1)} km/h`,
    acceleration: `${fixed(snap.a)} m/s²`,
    vMax: `${fixed(snap.vMax)} m/s (${fixed(msToKmh(snap.vMax), 1)} km/h)`,
    status: statusOf(snap, goal),
  };
  if (isProjectile(snap.params)) {
    const direction = (Math.atan2(snap.vy ?? 0, snap.vx ?? 0) * 180) / Math.PI;
    return {
      ...common,
      position: `${fixed(snap.x)} m`,
      traveled: `${fixed(snap.y)} m`,
      remaining: `${fixed(snap.vx)} m/s`,
      height: `${fixed(snap.vy)} m/s`,
      slope: `${fixed(direction, 1)} °`,
    };
  }
  return {
    ...common,
    position: `${fixed(snap.x)} m`,
    traveled: `${fixed(snap.traveled)} m`,
    remaining: `${fixed(snap.remaining)} m`,
    height: `${fixed(snap.h ?? 0)} m`,
    slope: `${fixed(snap.slope ?? 0, 1)} °`,
  };
}
