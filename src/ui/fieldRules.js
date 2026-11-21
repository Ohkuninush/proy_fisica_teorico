export const ALL_FIELDS = ['x0', 'h0', 'v0', 'angle', 'g', 'a', 'duration', 'gap', 'slope'];

const BY_MODEL = {
  MRU: ['x0', 'v0', 'duration', 'gap'],
  MRUV: ['x0', 'v0', 'a', 'duration', 'gap'],
};

const BY_LAUNCH = {
  free: ['h0', 'g'],
  vertical: ['h0', 'v0', 'g'],
  horizontal: ['h0', 'v0', 'g'],
  oblique: ['h0', 'v0', 'angle', 'g'],
};

export const MODEL_HINT = {
  MRU: 'Velocidad constante: la aceleración es siempre 0.',
  MRUV: 'Aceleración constante: positiva acelera, negativa frena.',
  PROY: 'Solo actúa la gravedad (sin aire): a = −g en vertical y 0 en horizontal.',
};

export const V0_LABEL = {
  vertical: 'Velocidad inicial (+ arriba, − abajo)',
  horizontal: 'Rapidez horizontal inicial',
  oblique: 'Rapidez inicial',
};

export const TRACK_HINT_PREFIX = 'En las rampas la gravedad suma a = −g·sen θ: frena al subir y acelera al bajar.';

export const isProjectileModel = (model) => model === 'PROY';

// options: { track, launch }. Se acepta también el recorrido como texto (compatibilidad).
export function fieldsFor(model, options = {}) {
  const { track = 'flat', launch = 'oblique' } = typeof options === 'string' ? { track: options } : options;
  if (isProjectileModel(model)) return BY_LAUNCH[launch] ?? BY_LAUNCH.oblique;
  return [...(BY_MODEL[model] ?? BY_MODEL.MRU), ...(track && track !== 'flat' ? ['slope'] : [])];
}

export const isFieldVisible = (model, field, options) => fieldsFor(model, options).includes(field);
