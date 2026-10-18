export const ALL_FIELDS = ['x0', 'v0', 'a', 'duration', 'gap'];

const BY_MODEL = {
  MRU: ['x0', 'v0', 'duration', 'gap'],
  MRUV: ['x0', 'v0', 'a', 'duration', 'gap'],
};

export const MODEL_HINT = {
  MRU: 'Velocidad constante: la aceleración es siempre 0.',
  MRUV: 'Aceleración constante: positiva acelera, negativa frena.',
};

export const fieldsFor = (model) => BY_MODEL[model] ?? BY_MODEL.MRU;
export const isFieldVisible = (model, field) => fieldsFor(model).includes(field);
