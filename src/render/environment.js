// Static-looking world that recycles a small pool of meshes around the camera,
// so long physical distances never require long geometry.
import * as THREE from 'three';
import { asphaltTexture, facadeTexture, softDotTexture } from './textures.js';

export const ROAD_HALF_WIDTH = 6;
export const LANE_Z = 2.6;

const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function createSky(scene) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color('#070a24') },
      mid: { value: new THREE.Color('#5b2a86') },
      bottom: { value: new THREE.Color('#ff7a45') },
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
  const sky = new THREE.Mesh(new THREE.SphereGeometry(320, 32, 20), mat);
  sky.renderOrder = -10;
  scene.add(sky);

  // Sun disc
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(26, 48),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.8, 0.45), fog: false, toneMapped: false }),
  );
  sun.position.set(70, 34, -290);
  scene.add(sun);
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: softDotTexture(), color: 0xff8a4c, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.7 }),
  );
  halo.scale.set(260, 260, 1);
  halo.position.copy(sun.position).add(new THREE.Vector3(0, 0, 2));
  scene.add(halo);

  // Stars
  const n = 260;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const y = 0.25 + Math.random() * 0.75;
    const r = Math.sqrt(1 - y * y);
    pos.set([Math.cos(a) * r * 300, y * 300, Math.sin(a) * r * 300], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, color: 0xcfd8ff, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 }));
  scene.add(stars);

  const group = new THREE.Group();
  group.add(sky, sun, halo, stars);
  scene.remove(sky, sun, halo, stars);
  scene.add(group);
  return group;
}

function createRoad(scene, shadowReceive = true) {
  const group = new THREE.Group();
  const tex = asphaltTexture();
  tex.repeat.set(60, 2);
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(480, ROAD_HALF_WIDTH * 2),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0.05 }),
  );
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = shadowReceive;
  group.add(road);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(480, 220),
    new THREE.MeshStandardMaterial({ color: 0x0d101c, roughness: 1 }),
  );
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
  return { group, tex };
}

function createBuildings(scene) {
  const tex = facadeTexture(3);
  const mats = [0x1a2036, 0x232a45, 0x2d2447].map(
    (c) => new THREE.MeshStandardMaterial({ color: c, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.55, map: null, roughness: 0.9 }),
  );
  const heights = [10, 16, 24, 34, 46];
  const geos = heights.map((h) => {
    const w = 9 + (h % 3) * 2;
    const geo = new THREE.BoxGeometry(w, h, 8);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / 7, (uv.getY(i) * h) / 14);
    return geo;
  });
  mats.forEach((m) => m.emissiveMap && (m.emissiveMap = tex));
  const layers = [
    { z: -16, spacing: 19, slots: 16, seed: 1, tint: 0 },
    { z: -34, spacing: 24, slots: 14, seed: 7, tint: 1 },
    { z: -60, spacing: 30, slots: 12, seed: 13, tint: 2 },
  ];
  const pool = layers.map((L) =>
    Array.from({ length: L.slots }, () => {
      const m = new THREE.Mesh(geos[0], mats[L.tint]);
      scene.add(m);
      return m;
    }),
  );
  return {
    update(cx) {
      layers.forEach((L, li) => {
        const k0 = Math.floor(cx / L.spacing) - L.slots / 2;
        pool[li].forEach((m, i) => {
          const k = k0 + i;
          const type = Math.floor(hash(k * 3.1 + L.seed) * geos.length);
          m.geometry = geos[type];
          m.position.set(k * L.spacing + (hash(k + L.seed * 5) - 0.5) * 6, heights[type] / 2, L.z - hash(k * 7.7) * 6);
        });
      });
    },
  };
}

function createLamps(scene) {
  const slots = 14;
  const spacing = 22;
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x20253a, metalness: 0.6, roughness: 0.5 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.7, 0.9), toneMapped: false });
  const glowTex = softDotTexture();
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
    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 5),
      new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffa550, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.22 }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(1.5, 0.02, 4.8);
    g.add(pole, arm, bulb, halo, pool);
    g.position.z = -ROAD_HALF_WIDTH - 1.1;
    scene.add(g);
    return g;
  });
  return {
    update(cx) {
      const k0 = Math.floor(cx / spacing) - slots / 2;
      lamps.forEach((l, i) => (l.position.x = (k0 + i) * spacing));
    },
  };
}

export function createEnvironment(scene) {
  const sky = createSky(scene);
  const road = createRoad(scene);
  const buildings = createBuildings(scene);
  const lamps = createLamps(scene);

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

  return {
    update(cx, cameraPos) {
      sky.position.copy(cameraPos);
      road.group.position.x = cx;
      road.tex.offset.x = ((cx / 8) % 1 + 1) % 1; // keeps asphalt grain fixed in the world
      const base = Math.floor(cx / dashSpacing) * dashSpacing;
      dashes.forEach((d, i) => (d.position.x = base + (i - dashCount / 2) * dashSpacing));
      buildings.update(cx);
      lamps.update(cx);
    },
  };
}
