import { describe, expect, it } from 'vitest';
import { createExperiment } from '../src/physics/experiment.js';
import { analyzeFeasibility, REASON } from '../src/physics/feasibility.js';
import { CAR_LENGTH, DEFAULTS, validateParams } from '../src/physics/params.js';
import { buildSegments, createTrack, G, MIN_TRACK_GAP, TRACKS } from '../src/physics/track.js';

const withTrack = (overrides = {}) => ({ ...DEFAULTS.MRU, gap: 200, duration: 30, track: 'platform', slope: 10, ...overrides });

describe('track geometry', () => {
  it('flat track has no segments and maps path to horizontal 1:1', () => {
    const track = createTrack(DEFAULTS.MRU);
    expect(track.segments).toHaveLength(0);
    expect(track.pointAt(37).s).toBe(37);
    expect(track.pointAt(37).h).toBe(0);
  });

  it('every preset fits before the obstacle and ends back on the ground', () => {
    for (const { id } of TRACKS.filter((t) => t.id !== 'flat')) {
      for (const gap of [MIN_TRACK_GAP, 100, 1000]) {
        const segments = buildSegments(id, 20, gap);
        expect(segments[0].u0).toBeGreaterThan(0);
        expect(segments.at(-1).u1).toBeLessThanOrEqual(gap - CAR_LENGTH);
        expect(createTrack({ ...withTrack({ track: id, gap }) }).pointAt(gap).h).toBeCloseTo(0, 6);
      }
    }
  });

  it('ramp height is length · sin θ', () => {
    const params = withTrack({ slope: 30 });
    const [up] = createTrack(params).segments;
    expect(createTrack(params).maxHeight).toBeCloseTo((up.u1 - up.u0) * Math.sin(Math.PI / 6));
  });
});

describe('motion on ramps', () => {
  it('uphill acceleration is −g·sen θ in MRU and the car speeds back up downhill', () => {
    const e = createExperiment(withTrack());
    const samples = Array.from({ length: 300 }, (_, i) => e.evaluate((e.tEnd * i) / 299));
    const up = samples.find((s) => s.slope > 0);
    const down = samples.find((s) => s.slope < 0);
    expect(up.a).toBeCloseTo(-G * Math.sin((10 * Math.PI) / 180));
    expect(down.a).toBeCloseTo(G * Math.sin((10 * Math.PI) / 180));
  });

  it('conserves mechanical energy: speed on the platform is √(v0² − 2gh)', () => {
    const params = withTrack();
    const e = createExperiment(params);
    const h = createTrack(params).maxHeight;
    const onPlatform = Array.from({ length: 400 }, (_, i) => e.evaluate((e.tEnd * i) / 399)).find((s) => s.slope === 0 && s.h > h - 1e-6);
    expect(onPlatform.v).toBeCloseTo(Math.sqrt(params.v0 ** 2 - 2 * G * h), 6);
  });

  it('adds the motor acceleration in MRUV', () => {
    const e = createExperiment(withTrack({ model: 'MRUV', v0: 15, a: 1 }));
    const up = Array.from({ length: 300 }, (_, i) => e.evaluate((e.tEnd * i) / 299)).find((s) => s.slope > 0);
    expect(up.a).toBeCloseTo(1 - G * Math.sin((10 * Math.PI) / 180));
  });

  it('back on flat ground after the down ramp the MRU speed returns to v0', () => {
    const e = createExperiment(withTrack());
    expect(e.impactTime).not.toBeNull();
    expect(e.evaluate(e.tEnd).v).toBeCloseTo(20, 6);
    expect(e.evaluate(e.tEnd).x + CAR_LENGTH).toBeCloseTo(e.obstacleX);
  });

  it('position is continuous across segment boundaries', () => {
    const e = createExperiment(withTrack({ track: 'double' }));
    let previous = e.evaluate(0);
    for (let i = 1; i <= 2000; i++) {
      const s = e.evaluate((e.tEnd * i) / 2000);
      expect(Math.abs(s.x - previous.x)).toBeLessThan(0.5);
      previous = s;
    }
  });
});

describe('feasibility with ramps', () => {
  it('reports a ramp the car cannot climb, with the height reached', () => {
    const r = analyzeFeasibility(withTrack({ v0: 8, slope: 20 }));
    expect(r.reason).toBe(REASON.FAILS_RAMP);
    expect(r.reachedHeight).toBeCloseTo(64 / (2 * G), 6);
  });

  it('is ok when the car has enough energy and the impact matches the experiment', () => {
    const params = withTrack();
    const r = analyzeFeasibility(params);
    expect(r.reason).toBe(REASON.OK);
    expect(r.tImpact).toBeCloseTo(createExperiment(params).impactTime, 6);
    expect(r.vImpact).toBeCloseTo(20, 6);
  });

  it('suggests a longer duration when needed', () => {
    const r = analyzeFeasibility(withTrack({ duration: 5 }));
    expect(r.reason).toBe(REASON.DURATION_TOO_SHORT);
    expect(r.minDuration).toBeGreaterThan(5);
  });
});

describe('validation', () => {
  it('defaults to the flat track for older saved params', () => {
    const { ok, params } = validateParams({ model: 'MRU', x0: 0, v0: 20, a: 0, duration: 20, gap: 100 });
    expect(ok).toBe(true);
    expect(params.track).toBe('flat');
  });

  it('rejects unknown tracks, bad slopes and too short distances with ramps', () => {
    expect(validateParams(withTrack({ track: 'loop' })).ok).toBe(false);
    expect(validateParams(withTrack({ slope: 60 })).ok).toBe(false);
    expect(validateParams(withTrack({ gap: MIN_TRACK_GAP - 1 })).fieldErrors.gap).toMatch(/rampas/);
    expect(validateParams({ ...DEFAULTS.MRU, slope: 60 }).ok).toBe(true);
  });
});
