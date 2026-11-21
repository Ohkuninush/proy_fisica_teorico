import { describe, expect, it } from 'vitest';
import { createExperiment } from '../src/physics/experiment.js';
import { analyzeFeasibility } from '../src/physics/feasibility.js';
import { LIMITS, validateParams } from '../src/physics/params.js';
import { createProjectileExperiment, LAUNCHES, projectileSummary } from '../src/physics/projectile.js';
import { G, MIN_TRACK_GAP, TRACKS } from '../src/physics/track.js';

// Deterministic PRNG so failures are reproducible.
function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (rand, min, max) => min + (max - min) * rand();
const pick = (rand, list) => list[Math.floor(rand() * list.length)];
const TRACK_IDS = TRACKS.map((track) => track.id);
const SAMPLES = 160;

function randomLinearInput(rand) {
  const track = pick(rand, TRACK_IDS);
  return {
    model: pick(rand, ['MRU', 'MRUV']),
    track,
    slope: between(rand, 1, 35),
    x0: between(rand, -50, 50),
    v0: between(rand, -10, 60),
    a: between(rand, -8, 8),
    gap: track === 'flat' ? between(rand, 5, 800) : between(rand, MIN_TRACK_GAP, 800),
    duration: between(rand, 1, 120),
  };
}

const sample = (experiment, n = SAMPLES) => Array.from({ length: n }, (_, i) => experiment.evaluate((experiment.tEnd * i) / (n - 1)));

describe('ramp motion invariants (random inputs)', () => {
  const rand = mulberry32(20260121);
  const inputs = Array.from({ length: 400 }, () => randomLinearInput(rand));

  it('every valid input builds an experiment with finite, monotone-in-time states', () => {
    for (const input of inputs) {
      const validation = validateParams(input);
      expect(validation.ok, JSON.stringify(input)).toBe(true);
      const e = createExperiment(input);
      expect(Number.isFinite(e.tEnd) && e.tEnd > 0, JSON.stringify(input)).toBe(true);
      for (const s of sample(e)) {
        for (const key of ['t', 'x', 'v', 'a', 'h', 'slope']) expect(Number.isFinite(s[key]), `${key} ${JSON.stringify(input)}`).toBe(true);
        expect(s.h).toBeGreaterThanOrEqual(-1e-9);
      }
    }
  });

  it('conserves energy: v² − 2·a_motor·(x − x0) + 2·g·h is constant (= v0²)', () => {
    for (const input of inputs) {
      const params = validateParams(input).params;
      const e = createExperiment(params);
      const motor = params.model === 'MRU' ? 0 : params.a;
      for (const s of sample(e)) {
        const energy = s.v * s.v - 2 * motor * (s.x - params.x0) + 2 * G * s.h;
        // After a crash the car is clamped to the obstacle face, so skip the exact end state.
        if (s.collided) continue;
        expect(energy, `t=${s.t} ${JSON.stringify(input)}`).toBeCloseTo(params.v0 * params.v0, 5);
      }
    }
  });

  it('position and velocity are continuous (no jumps between tramos)', () => {
    for (const input of inputs) {
      const params = validateParams(input).params;
      const e = createExperiment(params);
      const n = 600;
      const states = sample(e, n);
      const dt = e.tEnd / (n - 1);
      const vMax = Math.max(Math.abs(params.v0), e.vPeak) + 1;
      const aMax = Math.abs(params.model === 'MRU' ? 0 : params.a) + G;
      for (let i = 1; i < n; i++) {
        if (states[i].collided) continue;
        expect(Math.abs(states[i].x - states[i - 1].x), JSON.stringify(input)).toBeLessThanOrEqual(vMax * dt + 1e-6);
        expect(Math.abs(states[i].v - states[i - 1].v), JSON.stringify(input)).toBeLessThanOrEqual(aMax * dt + 1e-6);
      }
    }
  });

  it('feasibility agrees with the experiment: predicted impact time and speed match the run', () => {
    for (const input of inputs) {
      const params = validateParams(input).params;
      const feasibility = analyzeFeasibility(params);
      const e = createExperiment(params);
      if (feasibility.reason === 'ok') {
        expect(e.impactTime, JSON.stringify(input)).not.toBeNull();
        expect(e.impactTime).toBeCloseTo(feasibility.tImpact, 6);
        expect(e.evaluate(e.tEnd).v).toBeCloseTo(feasibility.vImpact, 6);
      }
      if (feasibility.reason === 'duration-too-short') expect(e.impactTime, JSON.stringify(input)).toBeNull();
    }
  });

  it('a crash leaves the front exactly at the obstacle (travel = gap)', () => {
    for (const input of inputs) {
      const params = validateParams(input).params;
      const e = createExperiment(params);
      if (e.impactTime === null) continue;
      const end = e.evaluate(e.tEnd);
      expect(end.collided).toBe(true);
      expect(end.x - params.x0).toBeCloseTo(params.gap, 6);
    }
  });
});

describe('ramp engine edge cases', () => {
  const SLOPES = [1, 10, 20, 35];
  const GAPS = [MIN_TRACK_GAP, 100, 100000];
  const V0S = [-5, 0, 1, 20, 200];
  const ACCELS = [-50, -1, 0, 1, 5, 50];

  it('survives a coarse grid of extreme inputs without throwing, hanging or producing NaN', () => {
    const started = performance.now();
    let runs = 0;
    for (const track of TRACK_IDS.filter((id) => id !== 'flat')) {
      for (const slope of SLOPES) {
        for (const gap of GAPS) {
          for (const v0 of V0S) {
            for (const a of ACCELS) {
              const input = { model: 'MRUV', track, slope, gap, v0, a, x0: 0, duration: 600 };
              const params = validateParams(input).params;
              analyzeFeasibility(params);
              const e = createExperiment(params);
              for (const s of sample(e, 25)) expect(Number.isFinite(s.x) && Number.isFinite(s.v), JSON.stringify(input)).toBe(true);
              runs++;
            }
          }
        }
      }
    }
    expect(runs).toBe(4 * SLOPES.length * GAPS.length * V0S.length * ACCELS.length);
    expect(performance.now() - started).toBeLessThan(20000);
  });

  it('a car whose motor is weaker than gravity never crests the ramp or reaches the obstacle', () => {
    const params = validateParams({ model: 'MRUV', track: 'platform', slope: 30, gap: 200, v0: 0, a: 1, x0: 0, duration: 30 }).params;
    const feasibility = analyzeFeasibility(params);
    expect(feasibility.ok).toBe(false);
    expect(feasibility.reason).toBe('fails-ramp');
    const e = createExperiment(params);
    expect(e.impactTime).toBeNull();
    for (const s of sample(e, 400)) expect(s.h).toBeLessThan(e.track.maxHeight);
  });

  it('rejects ramps closer than the minimum gap and slopes outside 1°–35°', () => {
    expect(validateParams({ model: 'MRU', track: 'hill', slope: 10, gap: MIN_TRACK_GAP - 1, v0: 20, x0: 0, duration: 20 }).ok).toBe(false);
    for (const slope of [0.9, 35.1, 90, -10]) {
      expect(validateParams({ model: 'MRU', track: 'hill', slope, gap: 100, v0: 20, x0: 0, duration: 20 }).ok, `slope ${slope}`).toBe(false);
    }
    expect(validateParams({ model: 'MRU', track: 'nope', gap: 100, v0: 20, x0: 0, duration: 20 }).ok).toBe(false);
  });
});

describe('projectile invariants (random inputs)', () => {
  const rand = mulberry32(777);
  const inputs = Array.from({ length: 500 }, () => {
    const launch = pick(rand, LAUNCHES.map((l) => l.id));
    return {
      model: 'PROY',
      launch,
      h0: launch === 'free' || launch === 'horizontal' ? between(rand, 0.5, 500) : pick(rand, [0, between(rand, 0, 500)]),
      v0: launch === 'free' ? 0 : launch === 'vertical' ? between(rand, -200, 200) : between(rand, 0.5, 200),
      angle: between(rand, -90, 90),
      g: between(rand, 0.1, 50),
    };
  });

  it('lands at y = 0 at tFlight, with range = vx0·tFlight and impact speed from energy conservation', () => {
    for (const input of inputs) {
      const validation = validateParams(input);
      expect(validation.ok, JSON.stringify(input)).toBe(true);
      const p = validation.params;
      const s = projectileSummary(p);
      if (s.tFlight <= 1e-9) continue;
      const e = createProjectileExperiment(p);
      const end = e.evaluate(e.tEnd);
      expect(end.y).toBe(0);
      const raw = { ...e.evaluate(e.tEnd - 1e-9) };
      expect(Math.abs(raw.y), JSON.stringify(input)).toBeLessThan(1e-3 * Math.max(1, p.h0, s.v0 ** 2 / p.g));
      expect(s.range).toBeCloseTo(s.vx0 * s.tFlight, 9);
      const energySpeed = Math.sqrt(s.v0 ** 2 + 2 * p.g * p.h0);
      expect(s.vImpact, JSON.stringify(input)).toBeCloseTo(energySpeed, 6);
      expect(s.hMax).toBeGreaterThanOrEqual(p.h0 - 1e-9);
    }
  });

  it('horizontal speed is constant and vertical speed changes by exactly −g·t', () => {
    for (const input of inputs.slice(0, 120)) {
      const p = validateParams(input).params;
      const e = createProjectileExperiment(p);
      if (e.tEnd <= 1e-9) continue;
      const a = e.evaluate(e.tEnd * 0.25);
      const b = e.evaluate(e.tEnd * 0.75);
      expect(b.vx).toBeCloseTo(a.vx, 9);
      expect((b.vy - a.vy) / (b.t - a.t)).toBeCloseTo(-p.g, 6);
    }
  });

  it('oblique range from the ground follows R = v0²·sen(2θ)/g and 45° is optimal', () => {
    const range = (angle) => projectileSummary({ model: 'PROY', launch: 'oblique', h0: 0, v0: 30, angle, g: 9.81 }).range;
    expect(range(30)).toBeCloseTo((30 * 30 * Math.sin(Math.PI / 3)) / 9.81, 9);
    expect(range(30)).toBeCloseTo(range(60), 9);
    expect(range(45)).toBeGreaterThan(range(40));
    expect(range(45)).toBeGreaterThan(range(50));
  });

  it('flags launches that never leave the ground', () => {
    for (const input of [
      { model: 'PROY', launch: 'horizontal', h0: 0, v0: 10, g: 9.81 },
      { model: 'PROY', launch: 'vertical', h0: 0, v0: -5, g: 9.81 },
      { model: 'PROY', launch: 'oblique', h0: 0, v0: 10, angle: -30, g: 9.81 },
    ]) {
      const p = validateParams(input).params;
      expect(analyzeFeasibility(p).reason, JSON.stringify(input)).toBe('no-flight');
    }
  });
});

describe('validateParams is robust to garbage input', () => {
  const rand = mulberry32(42);
  const junk = [undefined, null, NaN, Infinity, -Infinity, '', ' ', 'abc', '1e999', {}, [], true, 1e308, -1e308, '12abc', '0x10'];

  it('never throws and always reports a field error when rejecting', () => {
    for (let i = 0; i < 600; i++) {
      const input = {
        model: pick(rand, ['MRU', 'MRUV', 'PROY', 'XYZ', undefined, null, 5]),
        launch: pick(rand, ['free', 'vertical', 'horizontal', 'oblique', 'bad', undefined]),
        track: pick(rand, [...TRACK_IDS, 'bad', undefined, null, '']),
        ...Object.fromEntries(Object.keys(LIMITS).map((key) => [key, rand() < 0.5 ? pick(rand, junk) : between(rand, -300, 300)])),
      };
      let result;
      expect(() => (result = validateParams(input)), JSON.stringify(input)).not.toThrow();
      if (!result.ok) {
        expect(result.params).toBeNull();
        expect(Object.keys(result.fieldErrors).length).toBeGreaterThan(0);
      } else {
        expect(() => createExperiment(result.params)).not.toThrow();
      }
    }
    expect(() => validateParams(undefined)).not.toThrow();
    expect(validateParams(undefined).ok).toBe(false);
  });
});
