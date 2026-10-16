// Parameter defaults and validation. Units: m, s, m/s, m/s^2.

export const MODELS = Object.freeze({ MRU: 'MRU', MRUV: 'MRUV' });
export const CAR_LENGTH = 4.2; // m
export const MS_TO_KMH = 3.6;

export const DEFAULTS = Object.freeze({
  MRU: Object.freeze({ model: 'MRU', x0: 0, v0: 20, a: 0, duration: 20, gap: 200 }),
  MRUV: Object.freeze({ model: 'MRUV', x0: 0, v0: 0, a: 2, duration: 20, gap: 100 }),
});

const LIMITS = {
  x0: [-1e5, 1e5],
  v0: [-200, 200],
  a: [-50, 50],
  duration: [0.1, 600],
  gap: [0.1, 1e5],
};

export const msToKmh = (v) => v * MS_TO_KMH;
export const kmhToMs = (v) => v / MS_TO_KMH;

/** Returns { ok, errors, params }. params is a normalized copy (MRU forces a = 0). */
export function validateParams(input) {
  const errors = [];
  const model = input?.model;
  if (model !== MODELS.MRU && model !== MODELS.MRUV) {
    return { ok: false, errors: ['model must be MRU or MRUV'], params: null };
  }
  const params = { model };
  for (const key of Object.keys(LIMITS)) {
    if (key === 'a' && model === MODELS.MRU) {
      params.a = 0;
      continue;
    }
    const raw = input[key];
    const value = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
    const [min, max] = LIMITS[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      errors.push(`${key} must be a finite number`);
    } else if (value < min || value > max) {
      errors.push(`${key} must be between ${min} and ${max}`);
    } else {
      params[key] = value;
    }
  }
  return errors.length ? { ok: false, errors, params: null } : { ok: true, errors, params };
}
