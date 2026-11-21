import { describe, expect, it } from 'vitest';
import { stateAt } from '../src/physics/motion.js';
import { CAR_LENGTH, DEFAULTS } from '../src/physics/params.js';
import { axisBounds, buildSeries } from '../src/report/series.js';

describe('buildSeries', () => {
  it('starts at t = 0, ends exactly at the impact and follows the physics', () => {
    const s = buildSeries(DEFAULTS.MRU, 100);
    expect(s.t).toHaveLength(100);
    expect(s.t[0]).toBe(0);
    expect(s.t[99]).toBeCloseTo(10);
    expect(s.impactTime).toBeCloseTo(10);
    const i = 40;
    expect(s.x[i]).toBeCloseTo(stateAt(DEFAULTS.MRU, s.t[i]).x);
    expect(s.v.every((v) => v === 20)).toBe(true);
    expect(s.a.every((a) => a === 0)).toBe(true);
  });
  it('MRUV: x(t) = a t^2 / 2 from rest and the front touches the obstacle at the end', () => {
    const s = buildSeries(DEFAULTS.MRUV, 50);
    expect(s.x[49]).toBeCloseTo(100);
    expect(s.v[49]).toBeCloseTo(20);
    expect(s.x[49] + CAR_LENGTH).toBeCloseTo(DEFAULTS.MRUV.x0 + CAR_LENGTH + DEFAULTS.MRUV.gap);
    for (let i = 1; i < 50; i++) expect(s.v[i]).toBeGreaterThanOrEqual(s.v[i - 1]);
  });
  it('ends at the duration when there is no impact', () => {
    const s = buildSeries({ model: 'MRU', x0: 0, v0: 1, a: 0, duration: 5, gap: 100 }, 10);
    expect(s.t[9]).toBe(5);
    expect(s.impactTime).toBeNull();
  });
  it('rejects invalid parameters', () => {
    expect(() => buildSeries({ model: 'MRU' })).toThrow();
  });
});

describe('axisBounds', () => {
  it('always includes zero and pads the top', () => {
    expect(axisBounds([20, 20])).toEqual({ min: 0, max: 22 });
    expect(axisBounds([0, 0])).toEqual({ min: -1, max: 1 });
    const b = axisBounds([-4, 6]);
    expect(b.min).toBeLessThan(-4);
    expect(b.max).toBeGreaterThan(6);
  });
});
