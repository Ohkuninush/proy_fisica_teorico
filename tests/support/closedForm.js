export function stateAt(params, t) {
  const { x0, v0 } = params;
  const a = params.model === 'MRU' ? 0 : params.a;
  return { t, x: x0 + v0 * t + 0.5 * a * t * t, v: v0 + a * t, a };
}
