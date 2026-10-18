import { describe, it, expect } from 'vitest';
import { normalizeVisuals, DEFAULT_VISUALS, VIEWS, SCENERIES, VEHICLES, OBSTACLES, defaultColorFor } from '../src/visuals/catalog.js';
import { createVisualsStore } from '../src/visuals/store.js';

const fake = () => {
  const m = {};
  return { getItem: (k) => m[k] ?? null, setItem: (k, v) => (m[k] = v) };
};

describe('catalog', () => {
  it('offers the requested variety with unique ids', () => {
    expect(SCENERIES.length).toBeGreaterThanOrEqual(5);
    expect(VEHICLES.map((v) => v.id)).toEqual(expect.arrayContaining(['sedan', 'moto', 'pickup', 'tank']));
    expect(OBSTACLES.length).toBeGreaterThanOrEqual(5);
    expect(VIEWS.map((v) => v.id)).toEqual(expect.arrayContaining(['side', 'cinematic', 'aerial']));
    for (const list of [VIEWS, SCENERIES, VEHICLES, OBSTACLES]) expect(new Set(list.map((o) => o.id)).size).toBe(list.length);
  });
  it('normalizes invalid input to defaults', () => {
    expect(normalizeVisuals(null)).toEqual(DEFAULT_VISUALS);
    expect(normalizeVisuals({ view: 'x', scenery: 'mars', vehicle: 'ufo', obstacle: 3, color: 'red' })).toEqual(DEFAULT_VISUALS);
    expect(normalizeVisuals({ scenery: 'beach', color: '#00ff88' })).toMatchObject({ scenery: 'beach', color: '#00ff88', vehicle: 'sedan' });
  });
  it('gives each vehicle a default colour', () => {
    expect(defaultColorFor('tank')).toBe('#6b7f3a');
    expect(defaultColorFor('nope')).toBe(DEFAULT_VISUALS.color);
  });
});

describe('visuals store', () => {
  it('persists changes and reloads them', () => {
    const st = fake();
    createVisualsStore(st).set({ vehicle: 'tank', obstacle: 'rock' });
    expect(createVisualsStore(st).get()).toMatchObject({ vehicle: 'tank', obstacle: 'rock' });
  });
  it('ignores corrupted data and invalid patches', () => {
    const st = fake();
    st.setItem('physicslab3d.visuals.v1', '{bad');
    const s = createVisualsStore(st);
    expect(s.get()).toEqual(DEFAULT_VISUALS);
    expect(s.set({ view: 'aerial' }).view).toBe('aerial');
    expect(s.set({ view: 'nope' }).view).toBe('side');
    expect(s.set({ scenery: 'nope' }).scenery).toBe('city');
  });
  it('works without storage', () => {
    const s = createVisualsStore(null);
    expect(s.set({ scenery: 'forest' }).scenery).toBe('forest');
  });
});
