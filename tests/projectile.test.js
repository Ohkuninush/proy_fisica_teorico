import { describe, expect, it } from 'vitest';
import { createExperiment } from '../src/physics/experiment.js';
import { analyzeFeasibility, REASON } from '../src/physics/feasibility.js';
import { DEFAULTS, validateParams } from '../src/physics/params.js';
import { initialVelocity, projectileSummary } from '../src/physics/projectile.js';
import { createController } from '../src/sim/controller.js';
import { damageOf } from '../src/report/pdf/damage.js';
import { statusStyleOf } from '../src/report/pdf/layout.js';
import { projectileEquations } from '../src/report/pdf/projectileReport.js';
import { buildSeries } from '../src/report/series.js';
import { describeFeasibility } from '../src/ui/feasibilityText.js';
import { fieldsFor } from '../src/ui/fieldRules.js';
import { formatIndicators, indicatorLabels, modelLabel } from '../src/ui/indicators.js';

const proy = (overrides = {}) => ({ ...DEFAULTS.PROY, ...overrides });
const G = 9.81;

describe('free fall', () => {
  it('t = √(2h/g) and v = √(2gh)', () => {
    const s = projectileSummary(proy({ launch: 'free', h0: 45, v0: 99 }));
    expect(s.tFlight).toBeCloseTo(Math.sqrt((2 * 45) / G), 9);
    expect(s.vImpact).toBeCloseTo(Math.sqrt(2 * G * 45), 9);
    expect(s.range).toBe(0);
    expect(s.hMax).toBe(45);
  });

  it('ignores v0 and the angle', () => {
    expect(initialVelocity(validateParams(proy({ launch: 'free', v0: 30, angle: 10 })).params)).toEqual({ vx0: 0, vy0: 0 });
  });
});

describe('vertical launch', () => {
  it('up from the ground: peak v0²/2g, time 2v0/g, lands at the same speed', () => {
    const s = projectileSummary(proy({ launch: 'vertical', h0: 0, v0: 20 }));
    expect(s.hMax).toBeCloseTo(400 / (2 * G), 9);
    expect(s.tPeak).toBeCloseTo(20 / G, 9);
    expect(s.tFlight).toBeCloseTo(40 / G, 9);
    expect(s.vImpact).toBeCloseTo(20, 9);
  });

  it('downward throw from a height lands sooner than free fall', () => {
    const down = projectileSummary(proy({ launch: 'vertical', h0: 30, v0: -10 }));
    const free = projectileSummary(proy({ launch: 'free', h0: 30 }));
    expect(down.tFlight).toBeLessThan(free.tFlight);
    expect(down.hMax).toBe(30);
  });
});

describe('horizontal launch', () => {
  it('falls like free fall and travels v0·t', () => {
    const p = proy({ launch: 'horizontal', h0: 20, v0: 15 });
    const s = projectileSummary(p);
    expect(s.tFlight).toBeCloseTo(Math.sqrt((2 * 20) / G), 9);
    expect(s.range).toBeCloseTo(15 * s.tFlight, 9);
  });
});

describe('oblique launch', () => {
  it('from the ground at 45°: range v0²/g, symmetric flight', () => {
    const s = projectileSummary(proy({ launch: 'oblique', h0: 0, v0: 20, angle: 45 }));
    expect(s.range).toBeCloseTo(400 / G, 9);
    expect(s.tFlight).toBeCloseTo(2 * s.tPeak, 9);
    expect(s.impactAngle).toBeCloseTo(45, 9);
  });

  it('complementary angles reach the same range from the ground', () => {
    const a = projectileSummary(proy({ h0: 0, angle: 30 }));
    const b = projectileSummary(proy({ h0: 0, angle: 60 }));
    expect(a.range).toBeCloseTo(b.range, 9);
  });

  it('conserves energy: v_impact² = v0² + 2·g·h0', () => {
    const p = proy({ h0: 20, v0: 20, angle: 35 });
    expect(projectileSummary(p).vImpact ** 2).toBeCloseTo(400 + 2 * G * 20, 6);
  });
});

describe('experiment', () => {
  it('evaluates position and velocity and stops on the ground', () => {
    const e = createExperiment(proy({ h0: 20, v0: 20, angle: 45 }));
    const mid = e.evaluate(1);
    expect(mid.x).toBeCloseTo(20 * Math.cos(Math.PI / 4), 9);
    expect(mid.y).toBeCloseTo(20 + 20 * Math.sin(Math.PI / 4) - G / 2, 9);
    expect(mid.vy).toBeCloseTo(20 * Math.sin(Math.PI / 4) - G, 9);
    expect(mid.a).toBe(-G);
    const end = e.evaluate(999);
    expect(end.t).toBeCloseTo(e.tEnd, 9);
    expect(end.y).toBe(0);
    expect(end.collided).toBe(true);
    expect(end.x).toBeCloseTo(e.summary.range, 9);
  });

  it('uses the chosen gravity (e.g. the Moon)', () => {
    const moon = projectileSummary(proy({ launch: 'free', h0: 20, g: 1.62 }));
    expect(moon.tFlight).toBeCloseTo(Math.sqrt(40 / 1.62), 9);
  });

  it('the controller reports height as "remaining" and lands with status collided', () => {
    const c = createController(proy({ launch: 'free', h0: 20 }), { raf: () => 1, caf: () => {} });
    c.start();
    for (let i = 0; i < 100; i++) c.advance(0.1);
    const s = c.getSnapshot();
    expect(s.status).toBe('collided');
    expect(s.remaining).toBe(0);
    expect(s.impact.v).toBeCloseTo(Math.sqrt(2 * G * 20), 6);
    expect(c.getHistory().at(-1).y).toBe(0);
  });
});

describe('validation and feasibility', () => {
  it('accepts the defaults and every launch type', () => {
    expect(validateParams(DEFAULTS.PROY).ok).toBe(true);
    for (const launch of ['free', 'vertical', 'horizontal', 'oblique']) expect(validateParams(proy({ launch })).ok).toBe(true);
  });

  it('rejects bad values with Spanish messages', () => {
    expect(validateParams(proy({ launch: 'loop' })).ok).toBe(false);
    expect(validateParams(proy({ h0: -1 })).fieldErrors.h0).toMatch(/entre/);
    expect(validateParams(proy({ g: 0 })).ok).toBe(false);
    expect(validateParams(proy({ launch: 'horizontal', v0: 0 })).fieldErrors.v0).toMatch(/v₀ > 0/);
    expect(validateParams(proy({ angle: 120 })).ok).toBe(false);
  });

  it('flags a throw that never leaves the ground', () => {
    expect(analyzeFeasibility(validateParams(proy({ launch: 'vertical', h0: 0, v0: -5 })).params).reason).toBe(REASON.NO_FLIGHT);
    expect(analyzeFeasibility(validateParams(proy({ launch: 'free', h0: 0 })).params).reason).toBe(REASON.NO_FLIGHT);
    const ok = analyzeFeasibility(validateParams(DEFAULTS.PROY).params);
    expect(ok.reason).toBe(REASON.OK);
    expect(ok.tImpact).toBeCloseTo(projectileSummary(DEFAULTS.PROY).tFlight, 9);
  });
});

describe('interface and report for projectiles', () => {
  it('shows only the fields each launch needs', () => {
    expect(fieldsFor('PROY', { launch: 'free' })).toEqual(['h0', 'g']);
    expect(fieldsFor('PROY', { launch: 'oblique' })).toEqual(['h0', 'v0', 'angle', 'g']);
    expect(fieldsFor('MRU', { track: 'platform' })).toContain('slope');
  });

  it('formats indicators and labels for projectiles', () => {
    const snap = { params: proy(), status: 'collided', t: 2, x: 10, y: 0, vx: 5, vy: -5, v: Math.hypot(5, 5), a: -G, vMax: 10 };
    const ind = formatIndicators(snap);
    expect(ind.status).toBe('En el suelo');
    expect(ind.traveled).toBe('0.00 m');
    expect(ind.slope).toBe('-45.0 °');
    expect(indicatorLabels('PROY').traveled).toBe('Altura y');
    expect(modelLabel(proy({ launch: 'free' }))).toBe('Caída libre');
    expect(modelLabel(DEFAULTS.MRU)).toBe('MRU');
  });

  it('describes the flight in the feasibility box', () => {
    const params = validateParams(proy({ h0: 0, v0: 20, angle: 45 })).params;
    const text = describeFeasibility(analyzeFeasibility(params), params);
    expect(text.state).toBe('ok');
    expect(text.detail).toMatch(/Alcance: 40\.77 m/);
  });

  it('labels reports as ground impact without vehicle damage', () => {
    const entry = { params: proy(), result: { status: 'collided', impact: { t: 1, x: 1, v: 20 } }, visuals: { vehicle: 'sedan', goal: 'none' } };
    expect(statusStyleOf(entry).label).toBe('EN EL SUELO');
    expect(damageOf(entry)).toBeNull();
  });

  it('builds height, vertical speed and trajectory series for the PDF', () => {
    const series = buildSeries(proy(), 50);
    expect(series.y[0]).toBe(20);
    expect(series.y.at(-1)).toBeCloseTo(0, 9);
    expect(series.vy[0]).toBeCloseTo(20 * Math.sin(Math.PI / 4), 9);
    expect(projectileEquations(proy({ launch: 'free', h0: 45 }))[1][2]).toBe('y(t) = 45 + 0*t - (1/2)*9.81*t^2');
  });
});
