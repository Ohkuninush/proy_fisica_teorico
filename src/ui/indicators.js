import { msToKmh } from '../physics/params.js';
import { launchInfo } from '../physics/projectile.js';

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

const isProjectileSnap = (snap) => snap.params?.model === 'PROY';

// Nombre corto para etiquetas: MRU, MRUV o el tipo de lanzamiento.
export const modelLabel = (params) => (params?.model === 'PROY' ? launchInfo(params.launch).short : params?.model ?? '');

// Rótulos de los indicadores (claves = ids i-<clave> del panel).
export function indicatorLabels(model, goal = false) {
  if (model === 'PROY') {
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
  if (snap.status === 'collided' && isProjectileSnap(snap)) return GROUND_STATUS_LABEL;
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
  if (isProjectileSnap(snap)) {
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
