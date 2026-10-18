const MS_TO_KMH = 3.6;

export const CAR_LENGTH = 4.2;

export const DEFAULTS = Object.freeze({
  MRU: Object.freeze({ model: 'MRU', x0: 0, v0: 20, a: 0, duration: 20, gap: 200 }),
  MRUV: Object.freeze({ model: 'MRUV', x0: 0, v0: 0, a: 2, duration: 20, gap: 100 }),
});

export const LIMITS = {
  x0: [-1e5, 1e5],
  v0: [-200, 200],
  a: [-50, 50],
  duration: [0.1, 600],
  gap: [0.1, 1e5],
};

export const msToKmh = (v) => v * MS_TO_KMH;

const isModel = (model) => model === 'MRU' || model === 'MRUV';

const toNumber = (raw) => (typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw);

export function validateParams(input) {
  const model = input?.model;
  if (!isModel(model)) {
    return { ok: false, errors: ['model must be MRU or MRUV'], fieldErrors: { model: 'Elige MRU o MRUV' }, params: null };
  }

  const errors = [];
  const fieldErrors = {};
  const params = { model };

  for (const [key, [min, max]] of Object.entries(LIMITS)) {
    if (key === 'a' && model === 'MRU') {
      params.a = 0;
      continue;
    }
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

  const ok = errors.length === 0;
  return { ok, errors, fieldErrors, params: ok ? params : null };
}
