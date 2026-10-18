import { describe, expect, it } from 'vitest';
import { niceTicks } from '../src/report/ticks.js';

describe('niceTicks', () => {
  it('uses round steps and closes the axis with its exact end when far from the last tick', () => {
    expect(niceTicks(0, 10).map((t) => t.value)).toEqual([0, 2, 4, 6, 8, 10]);
    const t = niceTicks(0, 7.85, { includeEnd: true }).map((x) => x.value);
    expect(t[0]).toBe(0);
    expect(t[t.length - 1]).toBe(7.85);
    expect(niceTicks(-1.7, 0).every((x) => x.value >= -1.7 && x.value <= 0)).toBe(true);
  });
});
