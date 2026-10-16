import { disposeObject } from '../dispose.js';
import { buildBarrier } from './barrier.js';
import { buildBrickWall } from './brickWall.js';
import { buildContainer } from './container.js';
import { buildRock } from './rock.js';
import { buildTree } from './tree.js';
import { buildTruck } from './truck.js';

const BUILDERS = {
  barrier: buildBarrier,
  wall: buildBrickWall,
  container: buildContainer,
  rock: buildRock,
  truck: buildTruck,
  tree: buildTree,
};

const SLIDE_DECELERATION = 6;

export function createObstacle(kind = 'barrier') {
  const model = (BUILDERS[kind] ?? BUILDERS.barrier)();
  const crash = { level: 0, elapsed: 0, launchSpeed: 0, slide: 0 };

  return {
    group: model.group,
    animate: model.animate,
    get slide() {
      return crash.slide;
    },
    crash(api) {
      crash.level = api.level;
      crash.elapsed = 0;
      const { slide = 0 } = model.crash(api) ?? {};
      crash.launchSpeed = Math.sqrt(2 * SLIDE_DECELERATION * slide);
    },
    tick(dt) {
      if (!crash.level) return;
      crash.elapsed += dt;
      model.tick?.(crash.elapsed);
      const sliding = Math.min(crash.elapsed, crash.launchSpeed / SLIDE_DECELERATION);
      crash.slide = crash.launchSpeed * sliding - 0.5 * SLIDE_DECELERATION * sliding * sliding;
      model.group.position.x = crash.slide;
    },
    dispose: () => disposeObject(model.group),
  };
}
