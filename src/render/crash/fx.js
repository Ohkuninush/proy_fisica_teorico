import * as THREE from 'three';
import { clamp, rnd } from '../math.js';
import { createParticles } from '../effects/particles.js';
import { softDotTexture } from '../textures.js';

const EMITTERS_END_S = 6.8;
const FIREBALL_GROW_S = 0.55;
const FIREBALL_VISIBLE_S = 0.6;
const FIREBALL_LIGHT_S = 0.8;
const FIREBALL_DONE_S = 1;

function createFireball(scene) {
  const material = new THREE.SpriteMaterial({ map: softDotTexture(), color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 });
  const sprite = new THREE.Sprite(material);
  sprite.visible = false;
  const light = new THREE.PointLight(0xffa050, 0, 40, 2);
  scene.add(sprite, light);

  let elapsed = Infinity;

  return {
    ignite(center) {
      sprite.position.copy(center);
      sprite.visible = true;
      light.position.copy(center).add(new THREE.Vector3(-1, 1.5, 2));
      elapsed = 0;
    },
    update(dt) {
      if (elapsed === Infinity) return;
      elapsed += dt;
      const growth = clamp(elapsed / FIREBALL_GROW_S, 0, 1);
      sprite.scale.setScalar(1 + 11 * growth);
      material.opacity = (1 - growth) * 0.95;
      light.intensity = elapsed < FIREBALL_LIGHT_S ? 900 * Math.exp(-elapsed * 5) : 0;
      if (elapsed > FIREBALL_VISIBLE_S) {
        sprite.visible = false;
        material.opacity = 0;
      }
      if (elapsed > FIREBALL_DONE_S) elapsed = Infinity;
    },
    reset() {
      sprite.visible = false;
      light.intensity = 0;
      elapsed = Infinity;
    },
  };
}

export function createCrashFx(view) {
  const smokeParticles = createParticles(view, { max: 220, additive: false, gravity: 2.2, drag: 0.7, grow: 3.2 });
  const fireParticles = createParticles(view, { max: 260, additive: true, gravity: 3.5, drag: 0.5, grow: -0.6 });
  const shardParticles = createParticles(view, { max: 160, additive: true, gravity: -14, drag: 0.4 });
  const dustParticles = createParticles(view, { max: 160, additive: false, gravity: 0, drag: 1.6, grow: 2.6 });
  const allParticles = [smokeParticles, fireParticles, shardParticles, dustParticles];
  const fireball = createFireball(view.scene);
  const burners = [];

  const smoke = (p, count, { shade = 0.55, size = 1.2 } = {}) => {
    for (let i = 0; i < count; i++) {
      smokeParticles.emit([p.x + rnd(-0.3, 0.3), p.y, p.z + rnd(-0.3, 0.3)], [rnd(-1, 1.2), rnd(0.8, 2.4), rnd(-0.8, 0.8)], rnd(1.4, 3.2), size * rnd(0.7, 1.4), [shade, shade, shade * 1.05]);
    }
  };

  const fire = (p, count, { size = 0.8, speed = 3 } = {}) => {
    for (let i = 0; i < count; i++) {
      fireParticles.emit([p.x + rnd(-0.3, 0.3), p.y, p.z + rnd(-0.3, 0.3)], [rnd(-1, 1), rnd(1, speed), rnd(-1, 1)], rnd(0.5, 1.2), size * rnd(0.6, 1.3), [1, rnd(0.4, 0.75), rnd(0.08, 0.25)]);
    }
  };

  const updateBurners = (dt, age) => {
    for (let i = burners.length - 1; i >= 0; i--) {
      const burner = burners[i];
      if (age > burner.until) {
        burners.splice(i, 1);
        continue;
      }
      const point = burner.position();
      burner.fireDebt += burner.fireRate * dt;
      burner.smokeDebt += burner.smokeRate * dt;
      if (burner.fireDebt >= 1) {
        fire(point, Math.floor(burner.fireDebt), { size: 0.7 });
        burner.fireDebt %= 1;
      }
      if (burner.smokeDebt >= 1) {
        smoke(point, Math.floor(burner.smokeDebt), { shade: burner.dark, size: 1.1 });
        burner.smokeDebt %= 1;
      }
    }
  };

  return {
    smoke,
    fire,
    shards(p, count, spread = 7) {
      for (let i = 0; i < count; i++) {
        shardParticles.emit([p.x + rnd(-0.4, 0.4), p.y + rnd(-0.2, 0.3), p.z + rnd(-0.8, 0.8)], [rnd(-1, 1) * spread * 0.6, rnd(0.5, 1) * spread, rnd(-1, 1) * spread], rnd(0.9, 1.6), rnd(0.12, 0.26), [0.8, 0.95, 1]);
      }
    },
    dust(p, count, spread = 4) {
      for (let i = 0; i < count; i++) {
        dustParticles.emit([p.x + rnd(-0.4, 0.4), p.y + rnd(0, 1.5), p.z + rnd(-1.5, 1.5)], [rnd(-0.4, 1) * spread, rnd(0.3, 1.6), rnd(-1, 1) * spread * 0.6], rnd(1, 2), rnd(0.8, 1.8), [0.72, 0.68, 0.62]);
      }
    },
    burn(position, seconds, { fireRate = 0, smokeRate = 10, dark = 0.2 } = {}) {
      burners.push({ position, until: Math.min(seconds, EMITTERS_END_S), fireRate, smokeRate, dark, fireDebt: 0, smokeDebt: 0 });
    },
    explode(p, size = 1) {
      fireball.ignite(p);
      for (let i = 0; i < 70; i++) {
        fireParticles.emit([p.x + rnd(-1, 1), p.y + rnd(0, 1.5), p.z + rnd(-1.5, 1.5)], [rnd(-6, 6) * size, rnd(1, 9) * size, rnd(-6, 6) * size], rnd(0.7, 1.5), rnd(0.9, 1.9) * size, [1, rnd(0.35, 0.7), rnd(0.05, 0.2)]);
      }
      for (let i = 0; i < 24; i++) {
        smokeParticles.emit([p.x + rnd(-1, 1), p.y + rnd(0, 2), p.z + rnd(-1.5, 1.5)], [rnd(-2, 2), rnd(2, 5), rnd(-2, 2)], rnd(2.2, 3.4), rnd(1.6, 2.8), [0.12, 0.12, 0.13]);
      }
    },
    update(dt, age) {
      updateBurners(dt, age);
      fireball.update(dt);
      allParticles.forEach((particles) => particles.update(dt));
    },
    clearEmitters() {
      burners.length = 0;
    },
    reset() {
      burners.length = 0;
      allParticles.forEach((particles) => particles.clear());
      fireball.reset();
    },
    setVisible(visible) {
      allParticles.forEach((particles) => particles.setVisible(visible));
    },
  };
}
