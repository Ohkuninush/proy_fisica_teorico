import { describe, expect, it } from 'vitest';
import { decimate } from '../src/ui/charts.js';

describe('decimate', () => {
  it('keeps small series, caps large ones, keeps endpoints, does not mutate', () => {
    const pts = Array.from({ length: 5000 }, (_, i) => ({ t: i }));
    const out = decimate(pts, 400);
    expect(out).toHaveLength(400);
    expect(out[0]).toBe(pts[0]);
    expect(out[399]).toBe(pts[4999]);
    expect(pts).toHaveLength(5000);
    expect(decimate(pts.slice(0, 10), 400)).toHaveLength(10);
  });
});
