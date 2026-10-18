import * as THREE from 'three';
import { byLevel, rnd } from '../math.js';
import { impactLevel } from './impact.js';
import { createParticles } from './particles.js';

const DEFAULT_LEVEL = 3;
const NO_BURST_AGE = 99;
const FLASH_S = 0.6;
const RING_S = 0.8;

export function impactBurst(view) {
  const sparks = createParticles(view, { max: 220, additive: true, gravity: -16, drag: 0.6 });
  const smoke = createParticles(view, { max: 70, additive: false, drag: 1.4, grow: 3 });
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1, 48),
    new THREE.MeshBasicMaterial({ color: 0xffc58a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  const flash = new THREE.PointLight(0xffa860, 0, 30, 2);
  view.scene.add(ring, flash);

  let fired = false;
  let age = NO_BURST_AGE;
  let active = true;
  let power = 1;

  function fire(snap) {
    const level = impactLevel(view, snap) || DEFAULT_LEVEL;
    power = byLevel([0.35, 0.6, 1, 1.4, 2], level);
    const origin = [snap.obstacleX, 1.3, view.carZ];

    for (let i = 0; i < byLevel([30, 80, 160, 220, 220], level); i++) {
      const speed = rnd(3, 16);
      const angle = rnd(-1.1, 1.1);
      const velocity = [-Math.cos(angle) * speed, rnd(0, 1) * speed * 0.9 + 1, Math.sin(angle * 1.7) * speed * 0.7];
      sparks.emit(origin, velocity, rnd(0.5, 1.4), rnd(0.18, 0.4), [1, rnd(0.55, 0.9), rnd(0.2, 0.5)]);
    }
    for (let i = 0; i < byLevel([8, 16, 30, 40, 40], level); i++) {
      const position = [origin[0] - 0.4, rnd(0.4, 2.2), origin[2] + rnd(-1.6, 1.6)];
      smoke.emit(position, [rnd(-3, 0.5), rnd(0.5, 2.2), rnd(-1, 1)], rnd(1.2, 2.4), rnd(1, 1.8), [0.32, 0.3, 0.33]);
    }
    ring.position.set(snap.obstacleX - 0.1, 1.4, view.carZ + 2.6);
    age = 0;
  }

  function reset() {
    fired = false;
    sparks.clear();
    smoke.clear();
    age = NO_BURST_AGE;
  }

  return {
    update(snap, dt) {
      if (active && snap.impact && !fired && !view.goalActive) {
        fired = true;
        fire(snap);
      } else if (active && !snap.impact && fired) {
        reset();
      }
      age += dt;
      flash.position.set(snap.obstacleX - 1, 2, view.carZ + 2);
      flash.intensity = age < FLASH_S ? 260 * power * Math.exp(-age * 8) : 0;
      ring.material.opacity = age < RING_S ? 0.9 * (1 - age / RING_S) : 0;
      ring.scale.setScalar(0.4 + age * 11);
      view.camFx.shake = fired ? power * Math.exp(-Math.min(age, 4) * 3.2) : 0;
      sparks.update(dt);
      smoke.update(dt);
    },
    setActive(enabled) {
      active = enabled;
      sparks.setVisible(enabled);
      smoke.setVisible(enabled);
      ring.visible = enabled;
      flash.visible = enabled;
      if (!enabled) {
        sparks.clear();
        smoke.clear();
        flash.intensity = 0;
        view.camFx.shake = 0;
      }
    },
  };
}
