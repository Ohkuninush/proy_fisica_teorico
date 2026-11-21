import { describe, expect, it } from 'vitest';
import { readJson, writeJson } from '../src/storage.js';

const fakeStorage = () => {
  const items = {};
  return { getItem: (key) => items[key] ?? null, setItem: (key, value) => (items[key] = value) };
};

describe('storage helpers', () => {
  it('round-trips JSON values', () => {
    const storage = fakeStorage();
    expect(writeJson(storage, 'k', { a: [1, 2] })).toBe(true);
    expect(readJson(storage, 'k')).toEqual({ a: [1, 2] });
  });
  it('returns null for missing, corrupted or unavailable storage', () => {
    const storage = fakeStorage();
    expect(readJson(storage, 'missing')).toBeNull();
    storage.setItem('bad', '{nope');
    expect(readJson(storage, 'bad')).toBeNull();
    expect(readJson(null, 'k')).toBeNull();
  });
  it('reports a failed write instead of throwing', () => {
    const full = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    expect(writeJson(full, 'k', 1)).toBe(false);
    expect(writeJson(null, 'k', 1)).toBe(false);
  });
});
