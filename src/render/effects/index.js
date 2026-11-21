import { cameraFeel } from './cameraFeel.js';
import { crashDamage } from './crashDamage.js';
import { dust } from './dust.js';
import { headlightBeams } from './headlightBeams.js';
import { finishLine } from './finishLine.js';
import { impactBurst } from './impactBurst.js';
import { windStreaks } from './windStreaks.js';
import { isProjectile } from '../../physics/projectile.js';

const DEFAULT_EFFECTS = [windStreaks, dust, headlightBeams, impactBurst, crashDamage, finishLine, cameraFeel];

export function createEffectsManager(view, factories = DEFAULT_EFFECTS) {
  const effects = factories.map((create) => create(view));
  let enabled = true;
  let suspended = false;
  view.camFx.shake = 0;
  const applyActive = () => effects.forEach((effect) => effect.setActive(enabled && !suspended));

  return {
    get enabled() {
      return enabled;
    },
    setEnabled(on) {
      enabled = on;
      view.setBloom(on);
      applyActive();
    },
    update(snap, dt) {
      const projectile = isProjectile(snap.params);
      if (projectile !== suspended) {
        suspended = projectile;
        applyActive();
      }
      if (enabled && !suspended) effects.forEach((effect) => effect.update(snap, dt));
    },
  };
}
