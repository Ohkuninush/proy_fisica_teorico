import { impactLevel, impactSpeedKmh } from './impact.js';

export function crashDamage(view) {
  let fired = false;
  let active = true;

  const restoreModels = () => {
    view.crash.reset();
    view.restoreModels();
  };

  return {
    update(snap, dt) {
      if (active && snap.impact && !fired && !view.goalActive) {
        fired = true;
        const level = impactLevel(view, snap);
        if (level > 0) view.crash.trigger({ level, speedKmh: impactSpeedKmh(snap) });
      } else if (!snap.impact && fired) {
        fired = false;
        restoreModels();
      }
      view.crash.update(dt);
    },
    setActive(enabled) {
      active = enabled;
      view.crash.setVisible(enabled);
      if (!enabled && (fired || view.crash.active)) {
        fired = false;
        restoreModels();
      }
    },
  };
}
