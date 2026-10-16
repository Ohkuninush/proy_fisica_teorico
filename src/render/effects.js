// Optional visual effects. Read-only consumers of snapshots; they never touch physics.
// Each effect: { name, update(snap, dt), setActive(on) }. Add new ones via register().
import * as THREE from 'three';
import { softDotTexture } from './textures.js';
import { CAR_LENGTH } from '../physics/params.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = THREE.MathUtils.clamp;

/** Pooled point sprites with per-particle size/alpha/colour. */
function createParticles(view, { max, additive, gravity = 0, drag = 0, grow = 0 }) {
  const pos = new Float32Array(max * 3);
  const col = new Float32Array(max * 3);
  const size = new Float32Array(max);
  const alpha = new Float32Array(max);
  const vel = new Float32Array(max * 3);
  const life = new Float32Array(max);
  const maxLife = new Float32Array(max);
  const size0 = new Float32Array(max);
  const color0 = new Float32Array(max * 3);
  let cursor = 0;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { map: { value: softDotTexture() }, uScale: { value: 600 } },
    vertexShader: `attribute float aSize; attribute float aAlpha; attribute vec3 aColor; uniform float uScale;
      varying float vA; varying vec3 vC;
      void main(){ vA=aAlpha; vC=aColor; vec4 mv=modelViewMatrix*vec4(position,1.0);
        gl_PointSize = aSize*uScale/max(-mv.z,0.1); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform sampler2D map; varying float vA; varying vec3 vC;
      void main(){ vec4 t=texture2D(map,gl_PointCoord); gl_FragColor=vec4(vC, t.a*vA); }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  view.scene.add(points);

  return {
    points,
    emit(p, v, lifeS, s, c) {
      const i = cursor++ % max;
      pos.set(p, i * 3);
      vel.set(v, i * 3);
      life[i] = maxLife[i] = lifeS;
      size[i] = size0[i] = s;
      color0.set(c, i * 3);
      col.set(c, i * 3);
    },
    update(dt) {
      mat.uniforms.uScale.value = view.pointScale();
      for (let i = 0; i < max; i++) {
        if (life[i] <= 0) {
          alpha[i] = 0;
          continue;
        }
        life[i] -= dt;
        const k = clamp(life[i] / maxLife[i], 0, 1);
        const j = i * 3;
        vel[j + 1] += gravity * dt;
        const d = Math.exp(-drag * dt);
        vel[j] *= d;
        vel[j + 1] *= d;
        vel[j + 2] *= d;
        pos[j] += vel[j] * dt;
        pos[j + 1] = Math.max(0.03, pos[j + 1] + vel[j + 1] * dt);
        pos[j + 2] += vel[j + 2] * dt;
        alpha[i] = additive ? k : k * 0.5;
        size[i] = size0[i] * (1 + grow * (1 - k));
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.aSize.needsUpdate = true;
      geo.attributes.aAlpha.needsUpdate = true;
      geo.attributes.aColor.needsUpdate = true;
    },
    clear() {
      life.fill(0);
      alpha.fill(0);
      geo.attributes.aAlpha.needsUpdate = true;
    },
    setVisible(v) {
      points.visible = v;
    },
  };
}

/** Wind streaks that scroll past the camera in proportion to speed. */
function windStreaks(view) {
  const count = 36;
  const geo = new THREE.PlaneGeometry(1, 0.035);
  const mat = new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const group = new THREE.Group();
  const streaks = Array.from({ length: count }, (_, i) => {
    const m = new THREE.Mesh(geo, mat);
    m.userData = { off: rnd(0, 60), y: rnd(0.4, 5.5), z: i % 2 ? rnd(8, 15) : rnd(-4, -1), len: rnd(0.6, 1.4) };
    group.add(m);
    return m;
  });
  view.scene.add(group);
  return {
    name: 'wind-streaks',
    update(snap) {
      group.visible = view.rig.streaks;
      const speed = Math.abs(snap.v);
      mat.opacity = clamp((speed - 4) / 30, 0, 0.55);
      streaks.forEach((m) => {
        const { off, y, z, len } = m.userData;
        const along = (((off - snap.x) % 60) + 60) % 60;
        m.position.set(snap.x - 14 + along, y, z);
        m.scale.x = clamp(speed * 0.16, 0.1, 9) * len;
      });
    },
    setActive(on) {
      group.visible = on;
    },
  };
}

/** Dust kicked up behind the wheels while moving. */
function dust(view) {
  const ps = createParticles(view, { max: 260, additive: false, drag: 1.2, grow: 2.2 });
  let acc = 0;
  return {
    name: 'dust',
    update(snap, dt) {
      if (snap.status === 'running' && Math.abs(snap.v) > 3) {
        acc += Math.abs(snap.v) * 1.1 * dt;
        const dir = Math.sign(snap.v) || 1;
        while (acc >= 1) {
          acc -= 1;
          const { rearWheelX, trackZ } = view.vehicleMeta;
          const wz = view.carZ + (Math.random() < 0.5 ? -trackZ : trackZ);
          const wx = snap.x + rearWheelX;
          ps.emit([wx, 0.1, wz], [-dir * rnd(0.5, 2.2), rnd(0.4, 1.4), rnd(-0.3, 0.3)], rnd(0.7, 1.4), rnd(0.5, 0.9), [0.62, 0.58, 0.55]);
        }
      }
      ps.update(dt);
    },
    setActive(on) {
      ps.setVisible(on);
      if (!on) ps.clear();
    },
  };
}

/** Sparks, smoke, shockwave, flash and camera shake when the impact is registered. */
function impactBurst(view) {
  const sparks = createParticles(view, { max: 220, additive: true, gravity: -16, drag: 0.6 });
  const smoke = createParticles(view, { max: 70, additive: false, drag: 1.4, grow: 3 });
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1, 48),
    new THREE.MeshBasicMaterial({ color: 0xffc58a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  const flash = new THREE.PointLight(0xffa860, 0, 30, 2);
  view.scene.add(ring, flash);
  let fired = false;
  let age = 99;
  let active = true;

  function fire(snap) {
    const o = [snap.obstacleX, 1.3, view.carZ];
    for (let i = 0; i < 160; i++) {
      const sp = rnd(3, 16);
      const a = rnd(-1.1, 1.1);
      sparks.emit(o, [-Math.cos(a) * sp, rnd(0, 1) * sp * 0.9 + 1, Math.sin(a * 1.7) * sp * 0.7], rnd(0.5, 1.4), rnd(0.18, 0.4), [1, rnd(0.55, 0.9), rnd(0.2, 0.5)]);
    }
    for (let i = 0; i < 40; i++) {
      smoke.emit([o[0] - 0.4, rnd(0.4, 2.2), o[2] + rnd(-1.6, 1.6)], [rnd(-3, 0.5), rnd(0.5, 2.2), rnd(-1, 1)], rnd(1.2, 2.4), rnd(1, 1.8), [0.32, 0.3, 0.33]);
    }
    ring.position.set(snap.obstacleX - 0.1, 1.4, view.carZ + 2.6);
    age = 0;
  }

  return {
    name: 'impact-burst',
    update(snap, dt) {
      if (active) {
        if (snap.impact && !fired) {
          fired = true;
          fire(snap);
        } else if (!snap.impact && fired) {
          fired = false;
          sparks.clear();
          smoke.clear();
          age = 99;
        }
      }
      age += dt;
      const t = Math.min(age, 4);
      flash.position.set(snap.obstacleX - 1, 2, view.carZ + 2);
      flash.intensity = age < 0.6 ? 260 * Math.exp(-age * 8) : 0;
      ring.material.opacity = age < 0.8 ? 0.9 * (1 - age / 0.8) : 0;
      ring.scale.setScalar(0.4 + age * 11);
      view.camFx.shake = fired ? Math.exp(-t * 3.2) : 0;
      sparks.update(dt);
      smoke.update(dt);
    },
    setActive(on) {
      active = on;
      sparks.setVisible(on);
      smoke.setVisible(on);
      ring.visible = on;
      flash.visible = on;
      if (!on) {
        sparks.clear();
        smoke.clear();
        flash.intensity = 0;
        view.camFx.shake = 0;
      }
    },
  };
}

/** Additive headlight beams attached to the car. */
function headlightBeams(view) {
  const geo = new THREE.ConeGeometry(2.6, 15, 28, 1, true);
  geo.translate(0, -7.5, 0);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uOpacity: { value: 0.18 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
    fragmentShader: 'uniform float uOpacity; varying vec2 vUv; void main(){ float f=pow(vUv.y,1.6); gl_FragColor=vec4(1.0,0.93,0.75,f*uOpacity);} ',
  });
  const cone = new THREE.Mesh(geo, mat);
  cone.rotation.z = Math.PI / 2;
  cone.position.set(CAR_LENGTH + 0.2, 0.75, 0);
  view.car.add(cone);
  return {
    name: 'headlight-beams',
    update() {
      mat.uniforms.uOpacity.value = view.rig.beams === false ? 0 : view.beam;
    },
    setActive(on) {
      cone.visible = on;
    },
  };
}

/** FOV kick with speed, vibration and impact shake. Offsets are applied on top of the fixed camera. */
function cameraFeel(view) {
  let fov = 0;
  let t = 0;
  return {
    name: 'camera-feel',
    update(snap, dt) {
      t += dt;
      const target = clamp(Math.abs(snap.v) / 35, 0, 1) * 9;
      fov += (target - fov) * Math.min(1, dt * 3);
      view.camFx.fovAdd = fov;
      const running = snap.status === 'running' ? clamp(Math.abs(snap.v) / 40, 0, 1) * 0.012 : 0;
      const k = (view.camFx.shake || 0) * 0.55 + running;
      view.camFx.offset.set(Math.sin(t * 61) * k, Math.sin(t * 47 + 1) * k, Math.sin(t * 53 + 2) * k * 0.4);
    },
    setActive(on) {
      if (!on) {
        view.camFx.fovAdd = 0;
        view.camFx.offset.set(0, 0, 0);
        fov = 0;
      }
    },
  };
}

export function createEffectsManager(view, factories = [windStreaks, dust, headlightBeams, impactBurst, cameraFeel]) {
  let enabled = true;
  const effects = factories.map((make) => make(view));
  view.camFx.shake = 0;
  return {
    register(make) {
      const e = make(view);
      e.setActive(enabled);
      effects.push(e);
    },
    setEnabled(on) {
      enabled = on;
      view.setBloom(on);
      effects.forEach((e) => e.setActive(on));
    },
    get enabled() {
      return enabled;
    },
    update(snap, dt) {
      if (enabled) effects.forEach((e) => e.update(snap, dt));
    },
  };
}
