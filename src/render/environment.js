// World that recycles a small pool of meshes around the camera, so long physical distances
// never require long geometry. The scenery (sky, backdrop layers, ground) is swappable at runtime.
import * as THREE from 'three';
import { asphaltTexture, softDotTexture } from './textures.js';
import { THEMES } from './themes.js';
import { hash } from './geometries.js';

export const ROAD_HALF_WIDTH = 6;
export const LANE_Z = 2.6;

const disposeObject = (obj) => {
  obj.traverse((o) => {
    o.geometry?.dispose?.();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    mats.forEach((m) => m.dispose());
  });
};

function createSky(scene) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color() },
      mid: { value: new THREE.Color() },
      bottom: { value: new THREE.Color() },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP;
      void main(){
        float h = clamp(vP.y, 0.0, 1.0);
        vec3 c = mix(bottom, mid, smoothstep(0.0, 0.22, h));
        c = mix(c, top, smoothstep(0.18, 0.75, h));
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(320, 32, 20), mat);
  dome.renderOrder = -10;

  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, toneMapped: false });
  const sun = new THREE.Mesh(new THREE.CircleGeometry(1, 48), sunMat);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDotTexture(), blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));

  const n = 260;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const y = 0.25 + Math.random() * 0.75;
    const r = Math.sqrt(1 - y * y);
    pos.set([Math.cos(a) * r * 300, y * 300, Math.sin(a) * r * 300], i * 3);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.6, color: 0xcfd8ff, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 }));

  const cloudTex = softDotTexture();
  const clouds = Array.from({ length: 14 }, (_, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false, fog: false }));
    s.scale.set(90 + (i % 3) * 30, 30 + (i % 2) * 12, 1);
    s.userData = { seed: i, y: 55 + (i % 4) * 17, z: -(150 + (i % 3) * 45) };
    return s;
  });
  const cloudGroup = new THREE.Group();
  cloudGroup.add(...clouds);

  const group = new THREE.Group();
  group.add(dome, sun, halo, stars, cloudGroup);
  scene.add(group);

  return {
    group,
    apply(t) {
      mat.uniforms.top.value.set(t.sky.top);
      mat.uniforms.mid.value.set(t.sky.mid);
      mat.uniforms.bottom.value.set(t.sky.bottom);
      sun.position.set(...t.disc.pos);
      sun.scale.setScalar(t.disc.r);
      sunMat.color.setRGB(...t.disc.color);
      halo.position.set(t.disc.pos[0], t.disc.pos[1], t.disc.pos[2] + 2);
      halo.scale.set(t.disc.r * 10, t.disc.r * 10, 1);
      halo.material.color.set(t.disc.halo);
      halo.material.opacity = t.disc.haloOpacity;
      stars.visible = !!t.stars;
      cloudGroup.visible = !!t.clouds;
    },
    update(cx, time) {
      clouds.forEach((c) => {
        const { seed, y, z } = c.userData;
        const x = ((((seed * 97 - cx * 0.03 + time * 1.2) % 700) + 700) % 700) - 350;
        c.position.set(x, y, z);
      });
    },
  };
}

function createRoad(scene) {
  const group = new THREE.Group();
  const tex = asphaltTexture();
  tex.repeat.set(60, 2);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(480, ROAD_HALF_WIDTH * 2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0.05 }));
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  group.add(road);

  const groundMat = new THREE.MeshStandardMaterial({ color: 0x0d101c, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(480, 220), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.03;
  ground.receiveShadow = true;
  group.add(ground);

  const edgeMat = new THREE.MeshBasicMaterial({ color: 0xf2f2f2 });
  for (const z of [-ROAD_HALF_WIDTH + 0.5, ROAD_HALF_WIDTH - 0.5]) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(480, 0.16), edgeMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.012, z);
    group.add(line);
  }
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x3a3f4d, roughness: 0.9 });
  for (const z of [-ROAD_HALF_WIDTH - 0.3, ROAD_HALF_WIDTH + 0.3]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(480, 0.2, 0.6), curbMat);
    curb.position.set(0, 0.1, z);
    curb.receiveShadow = true;
    group.add(curb);
  }
  scene.add(group);
  return { group, tex, groundMat };
}

function createLamps(scene) {
  const slots = 14;
  const spacing = 22;
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x20253a, metalness: 0.6, roughness: 0.5 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.7, 0.9), toneMapped: false });
  const glowTex = softDotTexture();
  const root = new THREE.Group();
  const lamps = Array.from({ length: slots }, () => {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 7, 8), poleMat);
    pole.position.y = 3.5;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.1), poleMat);
    arm.position.set(0.8, 7, 0);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.25), bulbMat);
    bulb.position.set(1.5, 6.94, 0);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffb35a, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 }));
    halo.scale.set(7, 7, 1);
    halo.position.set(1.5, 6.9, 0.2);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffa550, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.22 }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(1.5, 0.02, 4.8);
    g.add(pole, arm, bulb, halo, pool);
    g.position.z = -ROAD_HALF_WIDTH - 1.1;
    root.add(g);
    return g;
  });
  scene.add(root);
  return {
    root,
    update(cx) {
      const k0 = Math.floor(cx / spacing) - slots / 2;
      lamps.forEach((l, i) => (l.position.x = (k0 + i) * spacing));
    },
  };
}

function createSea(scene) {
  const group = new THREE.Group();
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(480, 260), new THREE.MeshStandardMaterial({ color: 0x1fb5d4, emissive: 0x0a4a6a, roughness: 0.15, metalness: 0.2 }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -0.01, -148);
  const foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  [[1.4, -18.3], [0.6, -20.5]].forEach(([w, z]) => {
    const foam = new THREE.Mesh(new THREE.PlaneGeometry(480, w), foamMat);
    foam.rotation.x = -Math.PI / 2;
    foam.position.set(0, 0.0, z);
    group.add(foam);
  });
  group.add(sea);
  scene.add(group);
  return group;
}

function createLayer(scene, def) {
  const meshes = Array.from({ length: def.slots }, () => {
    const m = new THREE.Mesh(def.geos[0], def.mat);
    m.castShadow = false;
    scene.add(m);
    return m;
  });
  const [s0, s1] = def.scale ?? [1, 1];
  return {
    def,
    meshes,
    update(cx) {
      const k0 = Math.floor(cx / def.spacing) - def.slots / 2;
      meshes.forEach((m, i) => {
        const k = k0 + i;
        const r = (n) => hash(k * n + def.seed * 7.3);
        m.visible = !(def.skip && r(1.7) < def.skip);
        if (!m.visible) return;
        m.geometry = def.geos[Math.floor(r(3.1) * def.geos.length)];
        m.position.set(k * def.spacing + (r(5.3) - 0.5) * def.jitter, 0, def.z - r(7.7) * def.jitter * 0.6);
        m.scale.setScalar(s0 + r(11.3) * (s1 - s0));
        m.rotation.y = def.yaw ? r(13.1) * Math.PI * 2 : 0;
      });
    },
  };
}

export function createEnvironment(scene) {
  const sky = createSky(scene);
  const road = createRoad(scene);

  const dashGeo = new THREE.PlaneGeometry(2.6, 0.18);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xe9e9e9 });
  const dashCount = 24;
  const dashSpacing = 7;
  const dashes = Array.from({ length: dashCount }, () => {
    const d = new THREE.Mesh(dashGeo, dashMat);
    d.rotation.x = -Math.PI / 2;
    d.position.set(0, 0.014, 0);
    scene.add(d);
    return d;
  });

  let layers = [];
  let lamps = null;
  let sea = null;

  function clearTheme() {
    layers.forEach((l) => {
      l.meshes.forEach((m) => scene.remove(m));
      const mats = new Set([l.def.mat]);
      mats.forEach((m) => m.dispose());
      l.def.geos.forEach((g) => g.dispose());
    });
    layers = [];
    if (lamps) {
      scene.remove(lamps.root);
      lamps.root.traverse((o) => {
        o.geometry?.dispose?.();
        o.material?.dispose?.();
      });
      lamps = null;
    }
    if (sea) {
      scene.remove(sea);
      disposeObject(sea);
      sea = null;
    }
  }

  return {
    /** Build the scenery for `id` and return its theme (lighting hints for the scene). */
    setTheme(id) {
      const t = THEMES[id] ?? THEMES.city;
      clearTheme();
      sky.apply(t);
      road.groundMat.color.set(t.ground);
      // layers share geometries across slots, so build each layer's defs once
      const defs = t.layers();
      layers = defs.map((d) => createLayer(scene, d));
      if (t.lamps) lamps = createLamps(scene);
      if (t.sea) sea = createSea(scene);
      return t;
    },
    update(cx, cameraPos, time) {
      sky.group.position.copy(cameraPos);
      sky.update(cx, time);
      road.group.position.x = cx;
      if (sea) sea.position.x = cx;
      road.tex.offset.x = ((cx / 8) % 1 + 1) % 1; // keeps asphalt grain fixed in the world
      const base = Math.floor(cx / dashSpacing) * dashSpacing;
      dashes.forEach((d, i) => (d.position.x = base + (i - dashCount / 2) * dashSpacing));
      layers.forEach((l) => l.update(cx));
      lamps?.update(cx);
    },
  };
}
