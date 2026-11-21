import { describe, it, expect } from 'vitest';
import { damageOf } from '../src/report/pdf/damage.js';
import { statusStyleOf } from '../src/report/pdf/layout.js';
import { formatIndicators } from '../src/ui/indicators.js';
import { toGoalWording } from '../src/ui/wording.js';
import { DEFAULT_VISUALS, GOALS, hasGoal, NO_GOAL, normalizeVisuals } from '../src/visuals/catalog.js';

const crashEntry = (visuals) => ({ result: { status: 'collided', impact: { t: 1, v: 30 } }, visuals });

describe('goal catalog', () => {
  it('offers four finish lines plus the option without goal, defaulting to none', () => {
    expect(GOALS.map((goal) => goal.id)).toEqual([NO_GOAL, 'checkered', 'inflatable', 'neon', 'ribbon']);
    expect(DEFAULT_VISUALS.goal).toBe(NO_GOAL);
    expect(normalizeVisuals({ goal: 'moon' }).goal).toBe(NO_GOAL);
    expect(normalizeVisuals({ goal: 'neon' }).goal).toBe('neon');
  });
  it('detects an active goal only for known non-empty values', () => {
    expect(hasGoal({ goal: 'ribbon' })).toBe(true);
    expect([hasGoal({ goal: NO_GOAL }), hasGoal({}), hasGoal(null)]).toEqual([false, false, false]);
  });
});

describe('goal wording and reports', () => {
  it('rewrites obstacle phrases for the goal', () => {
    expect(toGoalWording('Choque estimado en t = 3 s')).toBe('Llegada estimada en t = 3 s');
    expect(toGoalWording('Nunca alcanza el obstáculo')).toBe('Nunca alcanza la meta');
    expect(toGoalWording('Se detiene a 2 m del obstáculo. Obstáculo en x = 9 m.')).toBe('Se detiene a 2 m de la meta. Meta en x = 9 m.');
  });
  it('reports a reached goal instead of damage', () => {
    expect(damageOf(crashEntry({ vehicle: 'sedan', goal: 'neon' }))).toBeNull();
    expect(damageOf(crashEntry({ vehicle: 'sedan', goal: NO_GOAL }))).not.toBeNull();
    expect(statusStyleOf(crashEntry({ goal: 'neon' })).label).toBe('META');
    expect(statusStyleOf(crashEntry({ goal: NO_GOAL })).label).toBe('COLISIÓN');
    expect(formatIndicators({ status: 'collided', t: 1, x: 1, traveled: 1, v: 1, a: 0, remaining: 0, vMax: 1 }, { goal: true }).status).toBe('Meta alcanzada');
  });
});
