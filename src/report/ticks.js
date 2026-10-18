const EPSILON = 1e-9;
const END_TICK_MIN_GAP = 0.3;

function niceStep(range, target) {
  const raw = range / target;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const multiplier = normalized < 1.5 ? 1 : normalized < 3 ? 2 : normalized < 7 ? 5 : 10;
  return multiplier * magnitude;
}

export function niceTicks(min, max, { includeEnd = false, target = 6 } = {}) {
  const step = niceStep(max - min, target);
  const ticks = [];
  for (let value = Math.ceil(min / step - EPSILON) * step; value <= max + EPSILON; value += step) {
    ticks.push({ value: +value.toFixed(10) });
  }
  const last = ticks[ticks.length - 1];
  if (includeEnd && last && max - last.value > step * END_TICK_MIN_GAP) ticks.push({ value: max });
  return ticks;
}
