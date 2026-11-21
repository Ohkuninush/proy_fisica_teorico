import { describe, it, expect, vi } from 'vitest';
import { createHistoryStore, formatTimestamp, MAX_COMMENT } from '../src/history/store.js';
import { DEFAULTS } from '../src/physics/params.js';

const fake = () => {
  const m = {};
  return { getItem: (k) => m[k] ?? null, setItem: (k, v) => (m[k] = v), raw: m };
};
const snap = (over = {}) => ({
  status: 'collided',
  params: DEFAULTS.MRU,
  t: 10,
  x: 200,
  traveled: 200,
  v: 20,
  a: 0,
  remaining: 0,
  vMax: 20,
  impact: { t: 10, x: 200, v: 20 },
  ...over,
});

describe('formatTimestamp', () => {
  it('uses AAAA-MM-DD HH:MM:SS with zero padding', () => {
    expect(formatTimestamp(new Date(2026, 0, 5, 3, 4, 9))).toBe('2026-01-05 03:04:09');
  });
});

describe('history store', () => {
  it('adds entries with default name, timestamp and empty comment, newest first', () => {
    const s = createHistoryStore(fake());
    const a = s.add(snap(), new Date(2026, 9, 16, 12, 0, 0));
    s.add(snap({ status: 'finished', impact: null }), new Date(2026, 9, 16, 12, 5, 0));
    expect(a.name).toBe('Prueba 1');
    expect(a.savedAt).toBe('2026-10-16 12:00:00');
    expect(a.comment).toBe('');
    expect(s.list().map((e) => e.name)).toEqual(['Prueba 2', 'Prueba 1']);
    expect(s.list()[1].result.impact.v).toBe(20);
  });

  it('keeps the vehicle and obstacle of the run when given', () => {
    const s = createHistoryStore(fake());
    expect(s.add(snap(), new Date(), { vehicle: 'tank', obstacle: 'rock', goal: 'neon', extra: 1 }).visuals).toEqual({ vehicle: 'tank', obstacle: 'rock', goal: 'neon' });
    expect(s.add(snap()).visuals).toBeNull();
  });

  it('does not reuse numbers after deleting', () => {
    const s = createHistoryStore(fake());
    const a = s.add(snap());
    s.remove(a.id);
    expect(s.add(snap()).name).toBe('Prueba 2');
  });

  it('renames; rejects empty or too long names', () => {
    const s = createHistoryStore(fake());
    const { id } = s.add(snap());
    expect(s.update(id, { name: '  Frenado suave  ' })).toBe(true);
    expect(s.list()[0].name).toBe('Frenado suave');
    expect(s.update(id, { name: '   ' })).toBe(false);
    expect(s.update(id, { name: 'x'.repeat(61) })).toBe(false);
    expect(s.list()[0].name).toBe('Frenado suave');
  });

  it('accepts a comment up to 200 chars and rejects longer', () => {
    const s = createHistoryStore(fake());
    const { id } = s.add(snap());
    expect(s.update(id, { comment: 'a'.repeat(MAX_COMMENT) })).toBe(true);
    expect(s.update(id, { comment: 'a'.repeat(MAX_COMMENT + 1) })).toBe(false);
    expect(s.list()[0].comment).toHaveLength(200);
  });

  it('persists and reloads; survives corrupted storage', () => {
    const st = fake();
    createHistoryStore(st).add(snap());
    expect(createHistoryStore(st).list()).toHaveLength(1);
    const bad = fake();
    bad.setItem('physicslab3d.history.v1', '{nope');
    expect(createHistoryStore(bad).list()).toEqual([]);
  });

  it('keeps working when storage throws', () => {
    const s = createHistoryStore({ getItem: () => null, setItem: () => { throw new Error('quota'); } });
    expect(() => s.add(snap())).not.toThrow();
    expect(s.list()).toHaveLength(1);
  });

  it('notifies subscribers; unknown ids are ignored', () => {
    const s = createHistoryStore(fake());
    const fn = vi.fn();
    s.subscribe(fn);
    const { id } = s.add(snap());
    s.update(id, { name: 'X' });
    expect(fn).toHaveBeenCalledTimes(2);
    expect(s.update('nope', { name: 'Y' })).toBe(false);
    expect(s.remove('nope')).toBe(false);
  });
});
