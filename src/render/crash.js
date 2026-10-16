// Crash core: loose debris (cheap ballistic physics), smoke/fire/shards/dust and the explosion.
// Purely visual and started after the physical impact; everything loose is gone DEBRIS_LIFETIME_S later.
import * as THREE from 'three';
import { createParticles } from './effects.js';
import { softDotTexture } from './textures.js';
import { DEBRIS_LIFETIME_S } from '../visuals/damage.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = THREE.MathUtils.clamp;
const GRAVITY = 18;
const FADE_S = 1.5;
const EMIT_END_S = 6.8; // continuous emitters stop here so their particles die before the lifetime ends

export function createCrash(view) {
  const smoke = createParticles(view, { max: 220, additive: false, gravity: 2.2, drag: 0.7, grow: 3.2 });
  const fire = createParticles(view, { max: 260, additive: true, gravity: 3.5, drag: 0.5, grow: -0.6 });
  const shards = createParticles(view, { max: 160, additive: true, gravity: -14, drag: 0.4 });
  const dust = createParticles(view, { max: 160, additive: false, gravity: 0, drag: 1.6, grow: 2.6 });

  const debris = [];
  const burners = [];
  const boomMat = new THREE.SpriteMaterial({ map: softDotTexture(), color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 });
  const boom = new THREE.Sprite(boomMat);
  boom.visible = false;
  const boomLight = new THREE.PointLight(0xffa050, 0, 40, 2);
  view.scene.add(boom, boomLight);

  let age = Infinity;
  let level = 0;
  let boomT = Infinity;

  const world = (obj, x = 0, y = 0, z = 0) => obj.localToWorld(new THREE.Vector3(x, y, z));

  function fadeMaterials(obj) {
    obj.traverse((o) => {
      if (!o.isMesh) return;
      o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => (m.transparent = true));
      o.castShadow = true;
    });
  }

  function register(obj, { vel = [0, 0, 0], spin = [0, 0, 0], r = 0.25, rest = 0.35, ownGeo = true }) {
    debris.push({ obj, vel: new THREE.Vector3(...vel), spin: new THREE.Vector3(...spin), r, rest, ownGeo });
  }

  const api = {
    get level() {
      return level;
    },
    speed: 0,
    /** 0.4..2.2: how hard things fly. */
    scale: 1,
    world,
    /** Take a mesh/group out of its model and let it fly (keeps its world transform). */
    detach(obj, opts = {}) {
      obj.updateWorldMatrix(true, false);
      fadeMaterials(obj);
      view.scene.attach(obj);
      register(obj, { ...opts, ownGeo: false });
    },
    /** New loose piece at a world position (geometry is shared unless ownGeo). */
    piece(geo, mat, pos, opts = {}) {
      const m = new THREE.Mesh(geo, mat.clone());
      m.material.transparent = true;
      m.castShadow = true;
      m.position.copy(pos);
      m.rotation.set(rnd(0, 6), rnd(0, 6), rnd(0, 6));
      view.scene.add(m);
      register(m, opts);
      return m;
    },
    smoke(p, n, { shade = 0.55, size = 1.2 } = {}) {
      for (let i = 0; i < n; i++) smoke.emit([p.x + rnd(-0.3, 0.3), p.y, p.z + rnd(-0.3, 0.3)], [rnd(-1, 1.2), rnd(0.8, 2.4), rnd(-0.8, 0.8)], rnd(1.4, 3.2), size * rnd(0.7, 1.4), [shade, shade, shade * 1.05]);
    },
    fire(p, n, { size = 0.8, speed = 3 } = {}) {
      for (let i = 0; i < n; i++) fire.emit([p.x + rnd(-0.3, 0.3), p.y, p.z + rnd(-0.3, 0.3)], [rnd(-1, 1), rnd(1, speed), rnd(-1, 1)], rnd(0.5, 1.2), size * rnd(0.6, 1.3), [1, rnd(0.4, 0.75), rnd(0.08, 0.25)]);
    },
    shards(p, n, spread = 7) {
      for (let i = 0; i < n; i++) shards.emit([p.x + rnd(-0.4, 0.4), p.y + rnd(-0.2, 0.3), p.z + rnd(-0.8, 0.8)], [rnd(-1, 1) * spread * 0.6, rnd(0.5, 1) * spread, rnd(-1, 1) * spread], rnd(0.9, 1.6), rnd(0.12, 0.26), [0.8, 0.95, 1]);
    },
    dust(p, n, spread = 4) {
      for (let i = 0; i < n; i++) dust.emit([p.x + rnd(-0.4, 0.4), p.y + rnd(0, 1.5), p.z + rnd(-1.5, 1.5)], [rnd(-0.4, 1) * spread, rnd(0.3, 1.6), rnd(-1, 1) * spread * 0.6], rnd(1, 2), rnd(0.8, 1.8), [0.72, 0.68, 0.62]);
    },
    /** Continuous flames + smoke at a (moving) world point for `seconds`. */
    burn(posFn, seconds, { fireRate = 0, smokeRate = 10, dark = 0.2 } = {}) {
      burners.push({ posFn, until: Math.min(seconds, EMIT_END_S), fireRate, smokeRate, dark, accF: 0, accS: 0 });
    },
    explode(p, size = 1) {
      boom.position.copy(p);
      boom.visible = true;
      boomT = 0;
      boomLight.position.copy(p).add(new THREE.Vector3(-1, 1.5, 2));
      for (let i = 0; i < 70; i++) fire.emit([p.x + rnd(-1, 1), p.y + rnd(0, 1.5), p.z + rnd(-1.5, 1.5)], [rnd(-6, 6) * size, rnd(1, 9) * size, rnd(-6, 6) * size], rnd(0.7, 1.5), rnd(0.9, 1.9) * size, [1, rnd(0.35, 0.7), rnd(0.05, 0.2)]);
      for (let i = 0; i < 24; i++) smoke.emit([p.x + rnd(-1, 1), p.y + rnd(0, 2), p.z + rnd(-1.5, 1.5)], [rnd(-2, 2), rnd(2, 5), rnd(-2, 2)], rnd(2.2, 3.4), rnd(1.6, 2.8), [0.12, 0.12, 0.13]);
    },
  };

  function disposeDebris(d) {
    view.scene.remove(d.obj);
    d.obj.traverse((o) => {
      if (d.ownGeo) o.geometry?.dispose?.();
      (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach((m) => m.dispose());
    });
  }

  function clearDebris() {
    debris.forEach(disposeDebris);
    debris.length = 0;
    burners.length = 0;
  }

  return {
    api,
    get age() {
      return age;
    },
    /** Current crash level (0 = none). */
    get level() {
      return level;
    },
    get active() {
      return age < DEBRIS_LIFETIME_S;
    },
    /** Start a crash of the given level; models decide what breaks (see vehicles.js / obstacles.js). */
    trigger({ level: lv, speedKmh }) {
      clearDebris();
      level = lv;
      age = 0;
      api.speed = speedKmh;
      api.scale = clamp(speedKmh / 110, 0.4, 2.2);
      view.getVehicle()?.crash?.(api);
      view.getObstacle()?.crash?.(api);
    },
    update(dt) {
      const veh = view.getVehicle();
      const obs = view.getObstacle();
      if (age < Infinity) {
        age += dt;
        veh?.tick?.(dt);
        obs?.tick?.(dt);
        if (veh && obs) veh.group.position.x = (veh.crushOffset ?? 0) + (obs.slide ?? 0);
      }

      const fade = clamp((DEBRIS_LIFETIME_S - age) / FADE_S, 0, 1);
      for (let i = debris.length - 1; i >= 0; i--) {
        const d = debris[i];
        if (age >= DEBRIS_LIFETIME_S) {
          disposeDebris(d);
          debris.splice(i, 1);
          continue;
        }
        d.vel.y -= GRAVITY * dt;
        d.obj.position.addScaledVector(d.vel, dt);
        if (d.obj.position.y < d.r) {
          d.obj.position.y = d.r;
          if (Math.abs(d.vel.y) > 1.2) d.vel.y *= -d.rest;
          else d.vel.y = 0;
          const g = Math.exp(-3.5 * dt);
          d.vel.x *= g;
          d.vel.z *= g;
          d.spin.multiplyScalar(Math.exp(-2.5 * dt));
        } else d.spin.multiplyScalar(Math.exp(-0.15 * dt));
        d.obj.rotation.x += d.spin.x * dt;
        d.obj.rotation.y += d.spin.y * dt;
        d.obj.rotation.z += d.spin.z * dt;
        if (fade < 1) d.obj.traverse((o) => o.isMesh && (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => (m.opacity = fade)));
      }

      for (let i = burners.length - 1; i >= 0; i--) {
        const b = burners[i];
        if (age > b.until) {
          burners.splice(i, 1);
          continue;
        }
        const p = b.posFn();
        b.accF += b.fireRate * dt;
        b.accS += b.smokeRate * dt;
        if (b.accF >= 1) {
          api.fire(p, Math.floor(b.accF), { size: 0.7 });
          b.accF %= 1;
        }
        if (b.accS >= 1) {
          api.smoke(p, Math.floor(b.accS), { shade: b.dark, size: 1.1 });
          b.accS %= 1;
        }
      }

      if (boomT < Infinity) {
        boomT += dt;
        const k = clamp(boomT / 0.55, 0, 1);
        boom.scale.setScalar(1 + 11 * k);
        boomMat.opacity = (1 - k) * 0.95;
        boomLight.intensity = boomT < 0.8 ? 900 * Math.exp(-boomT * 5) : 0;
        if (boomT > 0.6) {
          boom.visible = false;
          boomMat.opacity = 0;
        }
        if (boomT > 1) boomT = Infinity;
      }

      smoke.update(dt);
      fire.update(dt);
      shards.update(dt);
      dust.update(dt);
    },
    /** Remove everything loose; the caller restores the (damaged) models. */
    reset() {
      clearDebris();
      [smoke, fire, shards, dust].forEach((p) => p.clear());
      boom.visible = false;
      boomLight.intensity = 0;
      boomT = Infinity;
      age = Infinity;
      level = 0;
    },
    setVisible(v) {
      [smoke, fire, shards, dust].forEach((p) => p.setVisible(v));
    },
  };
}
