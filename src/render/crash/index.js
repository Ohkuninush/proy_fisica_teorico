import * as THREE from 'three';
import { DEBRIS_LIFETIME_S } from '../../visuals/damage.js';
import { clamp } from '../math.js';
import { createDebris } from './debris.js';
import { createCrashFx } from './fx.js';

export function createCrash(view) {
  const debris = createDebris(view.scene);
  const fx = createCrashFx(view);

  let age = Infinity;
  let level = 0;

  const api = {
    get level() {
      return level;
    },
    speed: 0,
    force: 1,
    world: (object, x = 0, y = 0, z = 0) => object.localToWorld(new THREE.Vector3(x, y, z)),
    detach: debris.detach,
    piece: debris.piece,
    smoke: fx.smoke,
    fire: fx.fire,
    shards: fx.shards,
    dust: fx.dust,
    burn: fx.burn,
    explode: fx.explode,
  };

  function moveWreckage(dt) {
    const vehicle = view.getVehicle();
    const obstacle = view.getObstacle();
    vehicle?.tick?.(dt);
    obstacle?.tick?.(dt);
    if (vehicle && obstacle) vehicle.group.position.x = (vehicle.crushOffset ?? 0) + (obstacle.slide ?? 0);
  }

  return {
    get level() {
      return level;
    },
    get active() {
      return age < DEBRIS_LIFETIME_S;
    },
    trigger({ level: crashLevel, speedKmh }) {
      debris.clear();
      fx.clearEmitters();
      level = crashLevel;
      age = 0;
      api.speed = speedKmh;
      api.force = clamp(speedKmh / 110, 0.4, 2.2);
      view.getVehicle()?.crash?.(api);
      view.getObstacle()?.crash?.(api);
    },
    update(dt) {
      if (age < Infinity) {
        age += dt;
        moveWreckage(dt);
      }
      debris.update(dt, age);
      fx.update(dt, age);
    },
    reset() {
      debris.clear();
      fx.reset();
      age = Infinity;
      level = 0;
    },
    setVisible: fx.setVisible,
  };
}
