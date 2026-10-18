import { disposeObject } from '../dispose.js';
import { buildCheckered } from './checkered.js';
import { buildInflatable } from './inflatable.js';
import { buildNeon } from './neon.js';
import { buildRibbon } from './ribbon.js';

const BUILDERS = {
  checkered: buildCheckered,
  inflatable: buildInflatable,
  neon: buildNeon,
  ribbon: buildRibbon,
};

const idle = () => {};

export function createGoal(kind) {
  const model = BUILDERS[kind]();

  return {
    group: model.group,
    animate: model.animate ?? idle,
    celebrate: model.celebrate ?? idle,
    tick: model.tick ?? idle,
    reset: model.reset ?? idle,
    dispose: () => disposeObject(model.group),
  };
}
