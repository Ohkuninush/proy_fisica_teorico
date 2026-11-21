import { describe, expect, it } from 'vitest';
import { controlsState } from '../src/ui/controlsState.js';

describe('controlsState', () => {
  it('idle: only start/defaults/config', () => {
    const c = controlsState('idle');
    expect([c.start, c.pause, c.reset, c.defaults, c.configInputs]).toEqual([true, false, false, true, true]);
  });
  it('running: only pause and reset; config locked', () => {
    const c = controlsState('running');
    expect([c.start, c.pause, c.reset, c.defaults, c.configInputs]).toEqual([false, true, true, false, false]);
    expect(c.pauseLabel).toBe('Pausar');
  });
  it('paused: label becomes Reanudar', () => {
    expect(controlsState('paused').pauseLabel).toBe('Reanudar');
  });
  it('collided/finished: reset and config enabled, start/pause disabled', () => {
    for (const s of ['collided', 'finished']) {
      const c = controlsState(s);
      expect([c.start, c.pause, c.reset, c.configInputs]).toEqual([false, false, true, true]);
    }
  });
});
