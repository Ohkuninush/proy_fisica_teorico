import * as THREE from 'three';
import { CAR_LENGTH } from '../../physics/params.js';
import { clamp, smooth } from '../math.js';
import { disposeObject } from '../dispose.js';
import { softDotTexture } from '../textures.js';
import { buildCar, CAR_SPECS } from './extruded.js';
import { buildMotorbike } from './moto.js';
import { applyCrashMotion } from './motion.js';
import { buildTank } from './tank.js';

const BUILDERS = {
  sedan: () => buildCar(CAR_SPECS.sedan),
  sport: () => buildCar(CAR_SPECS.sport),
  pickup: () => buildCar(CAR_SPECS.pickup),
  moto: buildMotorbike,
  tank: buildTank,
};

const CRUSH_RAMP_S = 0.14;
const CHAR_DELAY_S = 0.3;
const CHAR_DURATION_S = 3;
const CHARRED = new THREE.Color(0x121214);

function createGroundDecals(kind) {
  const texture = softDotTexture();
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(CAR_LENGTH + 2, 3),
    new THREE.MeshBasicMaterial({ map: texture, color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(CAR_LENGTH / 2, 0.02, 0);

  const isMotorbike = kind === 'moto';
  const glowMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    color: 0xe5484d,
    transparent: true,
    opacity: isMotorbike ? 0.35 : 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(CAR_LENGTH + 1.2, isMotorbike ? 1.4 : 2.6), glowMaterial);
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(CAR_LENGTH / 2, 0.035, 0);

  return { shadow, glow, glowMaterial };
}

export function createVehicle(kind = 'sedan') {
  const model = (BUILDERS[kind] ?? BUILDERS.sedan)();

  const group = new THREE.Group();
  const pivot = new THREE.Group();
  pivot.position.x = CAR_LENGTH;
  model.root.position.x = -CAR_LENGTH;
  pivot.add(model.root);
  group.add(pivot);
  model.root.traverse((node) => {
    if (node.isMesh) node.castShadow = true;
  });

  const { shadow, glow, glowMaterial } = createGroundDecals(kind);
  group.add(shadow, glow);

  const crash = { level: 0, elapsed: 0, crush: 0, offset: 0 };
  let originalColors = null;

  return {
    group,
    meta: model.meta,
    get crushOffset() {
      return crash.offset;
    },
    setColor(hex) {
      model.colorMaterials.forEach((material) => material.color.set(hex));
      glowMaterial.color.set(hex);
    },
    pose(x, acceleration) {
      if (!crash.level) model.pose(x, acceleration);
    },
    crash(api) {
      crash.level = api.level;
      crash.elapsed = 0;
      originalColors = model.colorMaterials.map((material) => material.color.clone());
      crash.crush = model.crash(api)?.crush ?? 0;
      glow.visible = false;
    },
    tick(dt) {
      if (!crash.level) return;
      crash.elapsed += dt;
      crash.offset = crash.crush * smooth(clamp(crash.elapsed / CRUSH_RAMP_S, 0, 1));
      applyCrashMotion(pivot, model.motion[crash.level], crash.elapsed);
      if (crash.level >= 4) {
        const charring = clamp((crash.elapsed - CHAR_DELAY_S) / CHAR_DURATION_S, 0, 1);
        model.colorMaterials.forEach((material, i) => material.color.copy(originalColors[i]).lerp(CHARRED, charring));
      }
    },
    dispose: () => disposeObject(group),
  };
}
