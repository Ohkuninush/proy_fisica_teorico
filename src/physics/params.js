import { EARTH_G, isLaunch, PROJECTILE } from './projectile.js';
import { DEFAULT_SLOPE, FLAT_TRACK, isTrack, MIN_TRACK_GAP } from './track.js';

const MS_TO_KMH = 3.6;

export { CAR_LENGTH } from './constants.js';

export const DEFAULTS = Object.freeze({
  MRU: Object.freeze({ model: 'MRU', x0: 0, v0: 20, a: 0, duration: 20, gap: 200, track: FLAT_TRACK, slope: DEFAULT_SLOPE }),
  MRUV: Object.freeze({ model: 'MRUV', x0: 0, v0: 0, a: 2, duration: 20, gap: 100, track: FLAT_TRACK, slope: DEFAULT_SLOPE }),
  PROY: Object.freeze({ model: PROJECTILE, launch: 'oblique', h0: 20, v0: 20, angle: 45, g: EARTH_G }),
});

// Valores iniciales sugeridos al cambiar de tipo de lanzamiento.
export const LAUNCH_DEFAULTS = Object.freeze({
  free: Object.freeze({ h0: 45, v0: 0, angle: 45 }),
  vertical: Object.freeze({ h0: 0, v0: 25, angle: 90 }),
  horizontal: Object.freeze({ h0: 30, v0: 15, angle: 0 }),
  oblique: Object.freeze({ h0: 20, v0: 20, angle: 45 }),
});

export const LIMITS = {
  x0: [-1e5, 1e5],
  v0: [-200, 200],
  a: [-50, 50],
  duration: [0.1, 600],
  gap: [0.1, 1e5],
  slope: [1, 35],
  h0: [0, 500],
  angle: [-90, 90],
  g: [0.1, 50],
};

export const MODELS = ['MRU', 'MRUV', PROJECTILE];

export const msToKmh = (v) => v * MS_TO_KMH;

const isModel = (model) => MODELS.includes(model);

const toNumber = (raw) => (typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw);

const LINEAR_FIELDS = ['x0', 'v0', 'a', 'duration', 'gap', 'slope'];

function readNumber(input, key, params, errors, fieldErrors) {
  const [min, max] = LIMITS[key];
  const value = toNumber(input[key]);
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.push(`${key} must be a finite number`);
    fieldErrors[key] = 'Debe ser un número';
  } else if (value < min || value > max) {
    errors.push(`${key} must be between ${min} and ${max}`);
    fieldErrors[key] = `Debe estar entre ${min} y ${max}`;
  } else {
    params[key] = value;
  }
}

// Caída libre y lanzamientos: h0, g siempre; v0 salvo en caída libre; θ solo en tiro parabólico.
function validateProjectile(input) {
  const errors = [];
  const fieldErrors = {};
  const launch = input.launch ?? 'oblique';
  if (!isLaunch(launch)) {
    errors.push('launch must be a known launch type');
    fieldErrors.launch = 'Elige un tipo de lanzamiento';
  }
  const params = { model: PROJECTILE, launch };
  readNumber(input, 'h0', params, errors, fieldErrors);
  readNumber(input, 'g', params, errors, fieldErrors);
  if (launch === 'free') params.v0 = 0;
  else readNumber(input, 'v0', params, errors, fieldErrors);
  if (launch === 'oblique') readNumber(input, 'angle', params, errors, fieldErrors);
  else params.angle = { free: -90, vertical: 90, horizontal: 0 }[launch] ?? 45;

  if (launch === 'horizontal' && params.v0 !== undefined && params.v0 <= 0) {
    errors.push('v0 must be positive for a horizontal launch');
    fieldErrors.v0 = 'En lanzamiento horizontal usa v₀ > 0';
  }
  if (launch === 'oblique' && params.v0 !== undefined && params.v0 < 0) {
    errors.push('v0 must be >= 0 for an oblique launch');
    fieldErrors.v0 = 'Usa la rapidez (v₀ ≥ 0); la dirección la da θ';
  }

  const ok = errors.length === 0;
  return { ok, errors, fieldErrors, params: ok ? params : null };
}

export function validateParams(input) {
  const model = input?.model;
  if (!isModel(model)) {
    return { ok: false, errors: ['model must be MRU, MRUV or PROY'], fieldErrors: { model: 'Elige un modelo' }, params: null };
  }
  if (model === PROJECTILE) return validateProjectile(input);

  const errors = [];
  const fieldErrors = {};
  const track = input.track === undefined || input.track === null || input.track === '' ? FLAT_TRACK : input.track;
  if (!isTrack(track)) {
    errors.push('track must be a known track');
    fieldErrors.track = 'Elige un recorrido de la lista';
  }
  const params = { model, track };

  for (const key of LINEAR_FIELDS) {
    const [min, max] = LIMITS[key];
    if (key === 'a' && model === 'MRU') {
      params.a = 0;
      continue;
    }
    if (key === 'slope' && track === FLAT_TRACK) {
      const slope = toNumber(input.slope);
      params.slope = typeof slope === 'number' && slope >= min && slope <= max ? slope : DEFAULT_SLOPE;
      continue;
    }
    readNumber(input, key, params, errors, fieldErrors);
  }

  if (track !== FLAT_TRACK && params.gap !== undefined && params.gap < MIN_TRACK_GAP) {
    errors.push(`gap must be at least ${MIN_TRACK_GAP} with ramps`);
    fieldErrors.gap = `Con rampas, usa al menos ${MIN_TRACK_GAP} m`;
  }

  const ok = errors.length === 0;
  return { ok, errors, fieldErrors, params: ok ? params : null };
}
