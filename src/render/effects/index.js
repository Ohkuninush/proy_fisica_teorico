import { cameraFeel } from './cameraFeel.js';
import { crashDamage } from './crashDamage.js';
import { dust } from './dust.js';
import { headlightBeams } from './headlightBeams.js';
import { finishLine } from './finishLine.js';
import { impactBurst } from './impactBurst.js';
import { windStreaks } from './windStreaks.js';

const DEFAULT_EFFECTS = [windStreaks, dust, headlightBeams, impactBurst, crashDamage, finishLine, cameraFeel];

export function createEffectsManager(view, factories = DEFAULT_EFFECTS) {
  const effects = factories.map((create) => create(view));
  let enabled = true;
  view.camFx.shake = 0;

  return {
    get enabled() {
      return enabled;
    },
    setEnabled(on) {
      enabled = on;
      view.setBloom(on);
      effects.forEach((effect) => effect.setActive(on));
    },
    update(snap, dt) {
      if (enabled) effects.forEach((effect) => effect.update(snap, dt));
    },
  };
}
