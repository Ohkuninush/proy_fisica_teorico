import { describe, it, expect } from 'vitest';
import { damageLevel, levelInfo, RESILIENCE, DAMAGE_LEVELS } from '../src/visuals/damage.js';
import { VEHICLES } from '../src/visuals/catalog.js';

describe('damageLevel (sedan thresholds)', () => {
  it('maps speed ranges to levels 1..5 with inclusive upper bounds', () => {
    expect(damageLevel(5)).toBe(1);
    expect(damageLevel(25)).toBe(1);
    expect(damageLevel(25.01)).toBe(2);
    expect(damageLevel(60)).toBe(2);
    expect(damageLevel(72)).toBe(3);
    expect(damageLevel(110)).toBe(3);
    expect(damageLevel(144)).toBe(4);
    expect(damageLevel(200)).toBe(4);
    expect(damageLevel(200.1)).toBe(5);
    expect(damageLevel(720)).toBe(5);
  });
  it('no impact means no damage', () => {
    expect(damageLevel(0)).toBe(0);
    expect(damageLevel(NaN)).toBe(0);
  });
  it('treats direction as irrelevant', () => {
    expect(damageLevel(-72)).toBe(3);
  });
  it('vehicles differ: the tank resists, the motorbike is fragile', () => {
    expect(damageLevel(72, 'tank')).toBe(1);
    expect(damageLevel(72, 'moto')).toBe(4);
    expect(damageLevel(72, 'pickup')).toBe(2);
    expect(damageLevel(72, 'sport')).toBe(3);
    expect(damageLevel(720, 'tank')).toBe(5);
  });
  it('unknown vehicles fall back to the sedan', () => {
    expect(damageLevel(72, 'ufo')).toBe(3);
  });
  it('is monotonic in speed for every vehicle', () => {
    for (const v of VEHICLES) {
      let prev = 0;
      for (let s = 1; s <= 800; s += 3) {
        const l = damageLevel(s, v.id);
        expect(l).toBeGreaterThanOrEqual(prev);
        prev = l;
      }
    }
  });
  it('has a resilience for every catalog vehicle and named levels', () => {
    VEHICLES.forEach((v) => expect(RESILIENCE[v.id]).toBeGreaterThan(0));
    expect(DAMAGE_LEVELS.map((l) => l.name)).toEqual(['Roce', 'Leve', 'Fuerte', 'Severo', 'Destrucción total']);
    expect(levelInfo(0).name).toBe('Sin daño');
    expect(levelInfo(4).name).toBe('Severo');
  });
});
