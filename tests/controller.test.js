import { describe, it, expect, vi } from 'vitest';
import { createController, STATUS } from '../src/sim/controller.js';
import { DEFAULTS } from '../src/physics/params.js';
import { stateAt } from '../src/physics/motion.js';
import { formatIndicators } from '../src/ui/indicators.js';

function fakeRaf() {
  let queue = [];
  let id = 0;
  return {
    raf: (fn) => {
      queue.push([++id, fn]);
      return id;
    },
    caf: (i) => {
      queue = queue.filter(([k]) => k !== i);
    },
    pending: () => queue.length,
    tick(ts) {
      const q = queue;
      queue = [];
      q.forEach(([, fn]) => fn(ts));
    },
  };
}

const make = (params = DEFAULTS.MRU) => {
  const clock = fakeRaf();
  return { clock, c: createController(params, clock) };
};

describe('controller lifecycle', () => {
  it('start / pause / resume / reset transitions', () => {
    const { c } = make();
    expect(c.status).toBe(STATUS.IDLE);
    expect(c.pause()).toBe(false);
    expect(c.start()).toBe(true);
    expect(c.start()).toBe(false);
    expect(c.pause()).toBe(true);
    expect(c.status).toBe(STATUS.PAUSED);
    expect(c.resume()).toBe(true);
    c.reset();
    expect(c.status).toBe(STATUS.IDLE);
    expect(c.getSnapshot().t).toBe(0);
  });

  it('never runs more than one loop', () => {
    const { c, clock } = make();
    c.start();
    c.pause();
    c.resume();
    c.pause();
    c.resume();
    expect(clock.pending()).toBe(1);
  });

  it('time is frozen while paused', () => {
    const { c, clock } = make();
    c.start();
    clock.tick(0);
    clock.tick(50);
    const t = c.getSnapshot().t;
    c.pause();
    clock.tick(500);
    expect(c.getSnapshot().t).toBe(t);
  });

  it('result is independent of frame rate', () => {
    const run = (stepMs) => {
      const { c, clock } = make();
      c.start();
      for (let ts = 0; ts <= 3000; ts += stepMs) clock.tick(ts);
      return c.getSnapshot();
    };
    const a = run(8);
    const b = run(50);
    expect(a.t).toBeCloseTo(3, 1);
    expect(b.t).toBeCloseTo(3, 1);
    expect(a.x).toBeCloseTo(stateAt(DEFAULTS.MRU, a.t).x);
    expect(b.x).toBeCloseTo(stateAt(DEFAULTS.MRU, b.t).x);
  });

  it('finishes at duration', () => {
    const { c } = make({ ...DEFAULTS.MRU, v0: 1, duration: 1, gap: 500 });
    c.start();
    for (let i = 0; i < 30; i++) c.advance(0.1);
    expect(c.status).toBe(STATUS.FINISHED);
    expect(c.getSnapshot().t).toBe(1);
  });

  it('collision stops time, records impact, keeps values', () => {
    const { c } = make({ ...DEFAULTS.MRU, v0: 20, gap: 100 });
    c.start();
    for (let i = 0; i < 100; i++) c.advance(0.1);
    const s = c.getSnapshot();
    expect(c.status).toBe(STATUS.COLLIDED);
    expect(s.impact.t).toBeCloseTo(5);
    expect(s.impact.v).toBeCloseTo(20);
    expect(s.remaining).toBeCloseTo(0);
    c.advance(1);
    expect(c.getSnapshot().t).toBe(s.t);
    const h = c.getHistory();
    expect(h[h.length - 1].t).toBeCloseTo(s.impact.t);
  });

  it('reset after collision allows a new run, config kept', () => {
    const { c } = make({ ...DEFAULTS.MRU, gap: 50 });
    c.start();
    for (let i = 0; i < 100; i++) c.advance(0.1);
    c.reset();
    expect(c.getSnapshot().params.gap).toBe(50);
    expect(c.getSnapshot().impact).toBeNull();
    expect(c.getSnapshot().vMax).toBe(20);
    expect(c.start()).toBe(true);
  });

  it('configure only when not running/paused, and throws on invalid', () => {
    const { c } = make();
    c.start();
    expect(c.configure(DEFAULTS.MRUV)).toBe(false);
    c.reset();
    expect(c.configure(DEFAULTS.MRUV)).toBe(true);
    expect(c.getSnapshot().params.model).toBe('MRUV');
    expect(() => c.configure({ model: 'MRU' })).toThrow();
  });

  it('tracks max speed in MRUV', () => {
    const { c } = make({ ...DEFAULTS.MRUV, gap: 1e4 });
    c.start();
    for (let i = 0; i < 30; i++) c.advance(0.1);
    expect(c.getSnapshot().vMax).toBeCloseTo(6);
  });

  it('notifies subscribers and unsubscribes', () => {
    const { c } = make();
    const fn = vi.fn();
    const off = c.subscribe(fn);
    c.start();
    expect(fn).toHaveBeenCalled();
    off();
    fn.mockClear();
    c.advance(0.1);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('indicators coherence', () => {
  it('match the snapshot and the theoretical values', () => {
    const { c } = make({ model: 'MRUV', x0: 0, v0: 0, a: 2, duration: 20, gap: 1000 });
    c.start();
    for (let i = 0; i < 30; i++) c.advance(0.1);
    const s = c.getSnapshot();
    const ind = formatIndicators(s);
    expect(s.t).toBeCloseTo(3);
    expect(ind.time).toBe('3.00 s');
    expect(ind.position).toBe('9.00 m');
    expect(ind.speed).toBe('6.00 m/s');
    expect(ind.speedKmh).toBe('21.6 km/h');
    expect(ind.acceleration).toBe('2.00 m/s²');
    expect(ind.remaining).toBe('991.00 m');
    expect(ind.status).toBe('En ejecución');
  });
});
