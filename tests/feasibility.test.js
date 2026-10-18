import { describe, it, expect } from 'vitest';
import { analyzeFeasibility, REASON } from '../src/physics/feasibility.js';
import { validateParams, DEFAULTS } from '../src/physics/params.js';

const mru = (o = {}) => ({ model: 'MRU', x0: 0, v0: 20, a: 0, duration: 20, gap: 100, ...o });
const mruv = (o = {}) => ({ model: 'MRUV', x0: 0, v0: 0, a: 2, duration: 30, gap: 100, ...o });

describe('analyzeFeasibility - MRU', () => {
  it('defaults reach the obstacle', () => {
    expect(analyzeFeasibility(DEFAULTS.MRU)).toMatchObject({ ok: true, reason: REASON.OK });
    expect(analyzeFeasibility(DEFAULTS.MRUV).ok).toBe(true);
  });
  it('v0 > 0 hits at gap / v0', () => {
    const r = analyzeFeasibility(mru());
    expect(r.tImpact).toBeCloseTo(5);
    expect(r.vImpact).toBe(20);
  });
  it('v0 = 0 is stationary, v0 < 0 moves away', () => {
    expect(analyzeFeasibility(mru({ v0: 0 })).reason).toBe(REASON.STATIONARY);
    expect(analyzeFeasibility(mru({ v0: -5 })).reason).toBe(REASON.MOVING_AWAY);
  });
  it('ignores a given acceleration', () => {
    expect(analyzeFeasibility(mru({ v0: -5, a: 9 })).reason).toBe(REASON.MOVING_AWAY);
  });
  it('arrives after the duration', () => {
    const r = analyzeFeasibility(mru({ v0: 2, duration: 10 }));
    expect(r.reason).toBe(REASON.DURATION_TOO_SHORT);
    expect(r.minDuration).toBeCloseTo(50);
  });
  it('arriving exactly at the duration is fine', () => {
    expect(analyzeFeasibility(mru({ v0: 10, duration: 10 })).ok).toBe(true);
  });
});

describe('analyzeFeasibility - MRUV', () => {
  it('negative v0 and negative a never reach it', () => {
    expect(analyzeFeasibility(mruv({ v0: -10, a: -2 })).reason).toBe(REASON.MOVING_AWAY);
  });
  it('v0 = 0 with negative a, or v0 < 0 with a = 0, moves away', () => {
    expect(analyzeFeasibility(mruv({ v0: 0, a: -1 })).reason).toBe(REASON.MOVING_AWAY);
    expect(analyzeFeasibility(mruv({ v0: -4, a: 0 })).reason).toBe(REASON.MOVING_AWAY);
  });
  it('v0 = 0 and a = 0 is stationary', () => {
    expect(analyzeFeasibility(mruv({ v0: 0, a: 0 })).reason).toBe(REASON.STATIONARY);
  });
  it('braking that stops short reports the stopping distance', () => {
    const r = analyzeFeasibility(mruv({ v0: 10, a: -5, gap: 20 }));
    expect(r.reason).toBe(REASON.STOPS_SHORT);
    expect(r.stopDistance).toBeCloseTo(10);
  });
  it('braking that stops exactly at the obstacle does not count as an impact', () => {
    const r = analyzeFeasibility(mruv({ v0: 20, a: -2, gap: 100 }));
    expect(r.reason).toBe(REASON.STOPS_AT_OBSTACLE);
  });
  it('braking that still arrives hits at the first root with positive speed', () => {
    const r = analyzeFeasibility(mruv({ v0: 10, a: -2, gap: 21 }));
    expect(r.ok).toBe(true);
    expect(r.tImpact).toBeCloseTo(3);
    expect(r.vImpact).toBeCloseTo(4);
  });
  it('negative v0 with positive a goes back first and still arrives (if time allows)', () => {
    const r = analyzeFeasibility(mruv({ v0: -20, a: 2, gap: 100, duration: 30 }));
    expect(r.ok).toBe(true);
    expect(r.tImpact).toBeCloseTo(10 + Math.sqrt(200));
    expect(analyzeFeasibility(mruv({ v0: -20, a: 2, gap: 100, duration: 20 })).reason).toBe(REASON.DURATION_TOO_SHORT);
  });
  it('positive a from rest, duration too short', () => {
    const r = analyzeFeasibility(mruv({ a: 0.1, gap: 100, duration: 10 }));
    expect(r.reason).toBe(REASON.DURATION_TOO_SHORT);
    expect(r.minDuration).toBeCloseTo(Math.sqrt(2000));
  });
  it('a = 0 behaves as MRU', () => {
    expect(analyzeFeasibility(mruv({ v0: 10, a: 0, gap: 50 })).tImpact).toBeCloseTo(5);
  });
});
