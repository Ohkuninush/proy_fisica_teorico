import { describe, it, expect } from 'vitest';
import { stateAt } from '../src/physics/motion.js';
import { validateParams, DEFAULTS, msToKmh, CAR_LENGTH } from '../src/physics/params.js';
import { impactTime } from '../src/physics/collision.js';
import { createExperiment } from '../src/physics/experiment.js';

describe('MRU', () => {
  const p = { model: 'MRU', x0: 5, v0: 10, a: 0, duration: 20, gap: 500 };
  it('x = x0 + v0 t, v constant, a = 0', () => {
    const s = stateAt(p, 3);
    expect(s.x).toBeCloseTo(35);
    expect(s.v).toBe(10);
    expect(s.a).toBe(0);
  });
  it('ignores a given acceleration', () => {
    expect(stateAt({ ...p, a: 9 }, 2).v).toBe(10);
  });
  it('rejects negative or non-finite time', () => {
    expect(() => stateAt(p, -1)).toThrow();
    expect(() => stateAt(p, NaN)).toThrow();
  });
});

describe('MRUV', () => {
  const p = { model: 'MRUV', x0: 2, v0: 3, a: 4, duration: 20, gap: 500 };
  it('x = x0 + v0 t + a t^2 / 2, v = v0 + a t', () => {
    const s = stateAt(p, 2);
    expect(s.x).toBeCloseTo(2 + 6 + 8);
    expect(s.v).toBeCloseTo(11);
    expect(s.a).toBe(4);
  });
  it('supports deceleration', () => {
    const s = stateAt({ ...p, v0: 10, a: -2 }, 5);
    expect(s.v).toBeCloseTo(0);
    expect(s.x).toBeCloseTo(2 + 50 - 25);
  });
});

describe('units', () => {
  it('converts m/s to km/h', () => {
    expect(msToKmh(10)).toBeCloseTo(36);
    expect(msToKmh(20)).toBeCloseTo(72);
    expect(msToKmh(0)).toBe(0);
  });
});

describe('validateParams', () => {
  it('accepts defaults', () => {
    expect(validateParams(DEFAULTS.MRU).ok).toBe(true);
    expect(validateParams(DEFAULTS.MRUV).ok).toBe(true);
  });
  it('rejects unknown model, NaN, Infinity, out of range', () => {
    expect(validateParams({ ...DEFAULTS.MRU, model: 'X' }).ok).toBe(false);
    expect(validateParams({ ...DEFAULTS.MRU, v0: NaN }).ok).toBe(false);
    expect(validateParams({ ...DEFAULTS.MRU, v0: Infinity }).ok).toBe(false);
    expect(validateParams({ ...DEFAULTS.MRU, duration: 0 }).ok).toBe(false);
    expect(validateParams({ ...DEFAULTS.MRU, gap: -3 }).ok).toBe(false);
    expect(validateParams({ ...DEFAULTS.MRUV, a: 1000 }).ok).toBe(false);
    expect(validateParams(undefined).ok).toBe(false);
  });
  it('coerces numeric strings, rejects empty strings', () => {
    expect(validateParams({ ...DEFAULTS.MRU, v0: '15' }).params.v0).toBe(15);
    expect(validateParams({ ...DEFAULTS.MRU, v0: '' }).ok).toBe(false);
  });
  it('forces a = 0 for MRU', () => {
    expect(validateParams({ ...DEFAULTS.MRU, a: 7 }).params.a).toBe(0);
  });
});

describe('impactTime', () => {
  it('MRU: gap / v0', () => {
    expect(impactTime({ ...DEFAULTS.MRU, v0: 20, gap: 100 })).toBeCloseTo(5);
  });
  it('MRU: never if v0 <= 0', () => {
    expect(impactTime({ ...DEFAULTS.MRU, v0: 0 })).toBeNull();
    expect(impactTime({ ...DEFAULTS.MRU, v0: -5 })).toBeNull();
  });
  it('MRUV from rest: sqrt(2 gap / a)', () => {
    expect(impactTime({ ...DEFAULTS.MRUV, v0: 0, a: 2, gap: 100 })).toBeCloseTo(10);
  });
  it('MRUV with v0: root of a/2 t^2 + v0 t - gap', () => {
    const p = { model: 'MRUV', x0: 0, v0: 10, a: 2, duration: 99, gap: 24 };
    expect(impactTime(p)).toBeCloseTo(2);
  });
  it('MRUV braking that stops short: no impact', () => {
    expect(impactTime({ model: 'MRUV', x0: 0, v0: 10, a: -5, duration: 99, gap: 20 })).toBeNull();
  });
  it('MRUV braking that just reaches: impact at the first root', () => {
    expect(impactTime({ model: 'MRUV', x0: 0, v0: 10, a: -2, duration: 99, gap: 21 })).toBeCloseTo(3);
  });
});

describe('createExperiment', () => {
  it('stops at impact, front touches obstacle, state frozen afterwards', () => {
    const e = createExperiment({ model: 'MRU', x0: 0, v0: 20, a: 0, duration: 20, gap: 100 });
    expect(e.impactTime).toBeCloseTo(5);
    const at = e.evaluate(5);
    expect(at.collided).toBe(true);
    expect(at.x + CAR_LENGTH).toBeCloseTo(e.obstacleX);
    expect(e.evaluate(12)).toEqual({ ...at, t: at.t });
    expect(e.evaluate(4.99).collided).toBe(false);
  });
  it('ignores impact beyond the duration', () => {
    const e = createExperiment({ model: 'MRU', x0: 0, v0: 1, a: 0, duration: 10, gap: 100 });
    expect(e.impactTime).toBeNull();
    expect(e.evaluate(100).t).toBe(10);
    expect(e.evaluate(100).finished).toBe(true);
  });
  it('throws on invalid params', () => {
    expect(() => createExperiment({ model: 'MRU' })).toThrow(/Invalid/);
  });
});
