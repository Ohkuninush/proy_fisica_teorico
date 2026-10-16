// Obstacle models. Origin = the face the vehicle hits (x = 0), body extends toward +x, centred on z = 0.
// Contract: createObstacle(kind) -> { group, animate(t), crash(api), tick(dt), slide, dispose() }.
// crash(api) reacts to the impact according to api.level (1..5, see visuals/damage.js).
import * as THREE from 'three';
import { hazardTexture, softDotTexture } from './textures.js';
import { hash } from './geometries.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = THREE.MathUtils.clamp;
const smooth = (t) => t * t * (3 - 2 * t);
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
const emit = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), toneMapped: false });
const metalBar = () => new THREE.MeshStandardMaterial({ color: 0xb9c2d1, metalness: 1, roughness: 0.3 });
const rv = (n) => Array.from({ length: n }, () => rnd(-1, 1));
const spin = (k = 5) => [rnd(-k, k), rnd(-k, k), rnd(-k, k)];
const pick = (arr, lv) => arr[lv - 1];

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 4;
  return t;
}

function mesh(group, geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

/** Throw `n` small boxes out of a local volume of the obstacle. */
function boxes(api, g, n, { size = [0.15, 0.5], mat, vol, power = 1, up = 4 }) {
  for (let i = 0; i < n; i++) {
    const geo = new THREE.BoxGeometry(rnd(size[0], size[1]), rnd(size[0], size[1]) * 0.8, rnd(size[0], size[1]));
    const p = api.world(g, rnd(vol.x[0], vol.x[1]), rnd(vol.y[0], vol.y[1]), rnd(vol.z[0], vol.z[1]));
    api.piece(geo, mat, p, { vel: [rnd(0.6, 5.5) * api.scale * power, rnd(0, up) + 1, rnd(-3, 3) * power], spin: spin(6), r: size[1] * 0.4, ownGeo: true });
  }
}

function barrier() {
  const g = new THREE.Group();
  const h = 2.6;
  const front = hazardTexture();
  const side = front.clone();
  side.needsUpdate = true;
  const concrete = std(0x8c92a0, { roughness: 0.95 });
  const hazard = () => new THREE.MeshStandardMaterial({ map: side, roughness: 0.6 });
  const block = mesh(g, new THREE.BoxGeometry(1, h, 5), [concrete, new THREE.MeshStandardMaterial({ map: front, roughness: 0.6 }), concrete, concrete, hazard(), hazard()], 0.5, h / 2, 0);
  const cap = mesh(g, new THREE.BoxGeometry(1.2, 0.18, 5.2), std(0xb8bdc9), 0.5, h + 0.09, 0);
  const beacons = [-1.8, 1.8].map((z, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), emit(i ? 2.6 : 2.8, i ? 0.2 : 0.8, i ? 0.2 : 0.1));
    m.position.set(0.5, h + 0.38, z);
    g.add(m);
    return m;
  });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDotTexture(), color: 0xff3b2a, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 }));
  halo.scale.set(5, 5, 1);
  halo.position.set(0.5, h + 0.4, 0);
  g.add(halo);
  let broken = false;
  let tilt = 0;
  return {
    group: g,
    animate(t) {
      if (broken) return;
      const on = Math.sin(t * 7) > 0;
      beacons[0].visible = on;
      beacons[1].visible = !on;
      halo.material.opacity = 0.35 + 0.5 * Math.abs(Math.sin(t * 3.5));
    },
    crash(api) {
      const lv = api.level;
      api.dust(api.world(g, 0, 1, 0), pick([4, 10, 16, 24, 40], lv));
      boxes(api, g, pick([0, 4, 8, 14, 0], lv), { size: [0.12, 0.35], mat: concrete, vol: { x: [0, 0.5], y: [0.3, 2.4], z: [-2.4, 2.4] } });
      tilt = pick([0, 0, 0.08, 0.25, 0], lv);
      if (lv >= 4) {
        broken = true;
        api.detach(cap, { vel: [5 * api.scale, 6, rnd(-2, 2)], spin: spin(5), r: 0.1 });
        beacons.forEach((b) => api.detach(b, { vel: [rnd(2, 6), rnd(4, 8), rnd(-3, 3)], spin: spin(4), r: 0.2 }));
        halo.visible = false;
      }
      if (lv >= 5) {
        block.visible = false;
        boxes(api, g, 30, { size: [0.3, 0.9], mat: concrete, vol: { x: [0, 1], y: [0.2, 2.5], z: [-2.5, 2.5] }, power: 1.6, up: 6 });
      }
      return { slide: pick([0, 0.05, 0.8, 2.5, 0], lv) };
    },
    tick(t) {
      g.rotation.z = -tilt * smooth(clamp(t / 0.6, 0, 1));
    },
  };
}

function brickWall() {
  const g = new THREE.Group();
  const h = 2.8;
  const bricks = (ctx, w, hh) => {
    ctx.fillStyle = '#6b3b2e';
    ctx.fillRect(0, 0, w, hh);
    const rows = 8;
    const rh = hh / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = -1; c < 4; c++) {
        const off = r % 2 ? w / 8 : 0;
        ctx.fillStyle = `hsl(${12 + Math.random() * 10} 55% ${30 + Math.random() * 10}%)`;
        ctx.fillRect(c * (w / 4) + off + 2, r * rh + 2, w / 4 - 4, rh - 4);
      }
    }
  };
  const faceTex = canvasTex(256, 256, bricks, [2, 1.12]);
  const sideTex = canvasTex(256, 256, bricks, [0.4, 1.12]);
  const mat = (t) => std(0xffffff, { map: t, roughness: 0.95 });
  const plain = std(0x8a4a3a);
  const wall = mesh(g, new THREE.BoxGeometry(1, h, 5), [plain, mat(faceTex), plain, plain, mat(sideTex), mat(sideTex)], 0.5, h / 2, 0);
  const cap = mesh(g, new THREE.BoxGeometry(1.15, 0.22, 5.15), std(0x3a3d46), 0.5, h + 0.11, 0);
  const brickMats = [0x8a3f2a, 0x9c4a31, 0x7a3626].map((c) => std(c, { roughness: 0.95 }));
  const brickGeo = new THREE.BoxGeometry(0.42, 0.2, 0.22);
  return {
    group: g,
    animate() {},
    crash(api) {
      const lv = api.level;
      const s = api.scale;
      api.dust(api.world(g, 0, 1.2, 0), pick([6, 14, 40, 70, 110], lv));
      const n = pick([4, 10, 45, 80, 120], lv);
      const collapse = lv >= 3;
      for (let i = 0; i < n; i++) {
        const p = api.world(g, rnd(0, 1), collapse ? rnd(0.2, h) : rnd(h - 0.7, h), rnd(-2.5, 2.5));
        api.piece(brickGeo, brickMats[i % 3], p, { vel: [rnd(0.5, 5) * s * (0.4 + lv * 0.25), rnd(0, 4) + 1, rnd(-2.5, 2.5) * (0.5 + lv * 0.2)], spin: spin(6), r: 0.1 });
      }
      if (collapse) {
        wall.visible = false;
        api.detach(cap, { vel: [4 * s, 5, rnd(-2, 2)], spin: spin(4), r: 0.1 });
      }
      return { slide: pick([0, 0.05, 0, 0, 0], lv) };
    },
  };
}

function container() {
  const g = new THREE.Group();
  const len = 6;
  const h = 2.6;
  const w = 2.4;
  const ribbed = canvasTex(64, 64, (ctx) => {
    ctx.fillStyle = '#2a5ea8';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#1f4a88';
    for (let i = 0; i < 4; i++) ctx.fillRect(i * 16 + 8, 0, 6, 64);
  }, [len / 0.25 / 4, 1]);
  const ribMat = std(0xffffff, { map: ribbed, roughness: 0.55, metalness: 0.35 });
  const endMat = std(0x24539a, { roughness: 0.6, metalness: 0.3 });
  const geo = new THREE.BoxGeometry(len, h, w, 14, 6, 6); // segmented so the front can crumple
  const box = mesh(g, geo, [endMat, endMat, ribMat, ribMat, ribMat, ribMat], len / 2, h / 2 + 0.25, 0);
  const frame = mesh(g, new THREE.BoxGeometry(len + 0.06, 0.25, w + 0.06), std(0x15233d, { metalness: 0.5 }), len / 2, 0.125, 0);
  const bars = [-0.45, -0.15, 0.15, 0.45].map((z) => mesh(g, new THREE.BoxGeometry(0.06, h - 0.3, 0.05), metalBar(), -0.03, h / 2 + 0.25, z));
  const lockBar = mesh(g, new THREE.BoxGeometry(0.08, 0.05, w - 0.2), metalBar(), -0.04, 1.4, 0);
  let tipTarget = 0;

  function dent(amount) {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + len / 2; // 0 at the hit face
      if (x > 2) continue;
      const f = (1 - x / 2) ** 1.5;
      const n = hash(p.getY(i) * 5.1 + p.getZ(i) * 3.7 + x * 2.3);
      p.setX(i, p.getX(i) + amount * f * (0.7 + 0.6 * n));
      p.setY(i, p.getY(i) + (n - 0.5) * amount * 0.25 * f);
      p.setZ(i, p.getZ(i) + (hash(p.getY(i) + x) - 0.5) * amount * 0.25 * f);
    }
    p.needsUpdate = true;
    geo.computeVertexNormals();
  }

  return {
    group: g,
    animate() {},
    crash(api) {
      const lv = api.level;
      const s = api.scale;
      const d = pick([0, 0.12, 0.35, 0.6, 0.9], lv);
      dent(d);
      [...bars, lockBar].forEach((b) => (b.position.x += d * 0.9));
      api.dust(api.world(g, 0, 1.2, 0), pick([5, 12, 20, 32, 50], lv));
      if (lv >= 3) {
        bars.slice(0, 2).forEach((b) => api.detach(b, { vel: [rnd(2, 5) * s, rnd(2, 5), rnd(-3, 3)], spin: spin(6), r: 0.1 }));
        boxes(api, g, pick([0, 0, 4, 8, 18], lv), { size: [0.2, 0.55], mat: std(0x24539a, { metalness: 0.3 }), vol: { x: [0, 0.6], y: [0.5, 2.6], z: [-1.1, 1.1] } });
      }
      if (lv >= 4) api.detach(lockBar, { vel: [4 * s, 5, rnd(-2, 2)], spin: spin(6), r: 0.1 });
      tipTarget = pick([0, 0, 0, 0.12, 0.55], lv);
      return { slide: pick([0, 0.15, 0.5, 1.2, 2.5], lv) };
    },
    tick(t) {
      g.rotation.x = tipTarget * smooth(clamp(t / 0.9, 0, 1));
    },
  };
}

function rock() {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x7d828d, roughness: 0.95, flatShading: true });
  const moss = new THREE.MeshStandardMaterial({ color: 0x5e6b52, roughness: 1, flatShading: true });
  const make = (r, sx, sy, sz, x, y, z, mat, seed) => {
    const geo = new THREE.DodecahedronGeometry(r, 1);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = 1 + Math.sin(p.getX(i) * 7.1 + seed) * Math.cos(p.getZ(i) * 5.3 + seed) * 0.18;
      p.setXYZ(i, p.getX(i) * k * sx, p.getY(i) * k * sy, p.getZ(i) * k * sz);
    }
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    const m = mesh(g, geo, mat, 0, 0, 0);
    m.position.set(x - geo.boundingBox.min.x, y - geo.boundingBox.min.y, z);
    return m;
  };
  make(1.55, 1.0, 0.95, 1.35, 0, 0, 0, stone, 1);
  make(0.9, 1, 0.9, 1, 0.2, 0, 1.6, moss, 4);
  make(0.7, 1, 0.8, 1, 0.5, 0, -1.7, stone, 9);
  make(0.45, 1, 0.8, 1, 0, 0, 0.8, moss, 13);
  let roll = 0;
  const fragment = (api, r, power) => {
    const geo = new THREE.DodecahedronGeometry(r, 0);
    api.piece(geo, stone, api.world(g, rnd(0.3, 2), rnd(0.6, 2.2), rnd(-1.5, 1.5)), { vel: [rnd(3, 9) * api.scale * power, rnd(1, 6), rnd(-4, 4)], spin: spin(7), r: r * 0.8, rest: 0.3, ownGeo: true });
  };
  return {
    group: g,
    animate() {},
    crash(api) {
      const lv = api.level;
      api.dust(api.world(g, 0, 1, 0), pick([5, 10, 18, 40, 70], lv));
      for (let i = 0; i < pick([3, 6, 10, 0, 0], lv); i++) fragment(api, rnd(0.1, 0.3), 0.6);
      roll = pick([0, 0, 0.6, 0, 0], lv);
      if (lv >= 4) {
        g.visible = false;
        for (let i = 0; i < pick([0, 0, 0, 6, 8], lv); i++) fragment(api, rnd(0.45, 0.8), 1);
      }
      if (lv >= 5) for (let i = 0; i < 40; i++) fragment(api, rnd(0.08, 0.22), 1.4);
      return { slide: pick([0, 0.1, 0.5, 0, 0], lv) };
    },
    tick(t) {
      g.rotation.z = -roll * smooth(clamp(t / 0.8, 0, 1));
    },
  };
}

function truck() {
  const g = new THREE.Group();
  const white = std(0xe6e9f0, { roughness: 0.5 });
  const cargoLen = 5.2;
  const cargoH = 2.9;
  const w = 2.4;
  const y0 = 0.95;
  mesh(g, new THREE.BoxGeometry(cargoLen, cargoH, w), white, cargoLen / 2, y0 + cargoH / 2, 0);
  mesh(g, new THREE.BoxGeometry(cargoLen + 0.02, 0.4, w + 0.02), std(0x2a5ea8), cargoLen / 2, y0 + 1.6, 0);
  mesh(g, new THREE.BoxGeometry(1.7, 2.1, w - 0.1), std(0xd9dde6), cargoLen + 0.95, y0 + 1.05, 0);
  mesh(g, new THREE.BoxGeometry(0.06, 0.9, w - 0.35), new THREE.MeshPhysicalMaterial({ color: 0x0a1020, metalness: 0.9, roughness: 0.05 }), cargoLen + 1.82, y0 + 1.45, 0);
  mesh(g, new THREE.BoxGeometry(cargoLen + 1.8, 0.3, 1.5), std(0x1a1c22), (cargoLen + 1.8) / 2, 0.8, 0);
  const bumper = mesh(g, new THREE.BoxGeometry(0.2, 0.3, w), std(0x2b2e36), -0.1, 0.65, 0);
  [0.45, 0.75].forEach((yy, i) => mesh(g, new THREE.BoxGeometry(0.03, 0.14, w - 0.2), std(i ? 0xff3030 : 0xf5f5f5, { emissive: i ? 0x550000 : 0x333333 }), -0.02, yy + 0.2, 0));
  const doorBars = [-0.4, 0, 0.4].map((z) => mesh(g, new THREE.BoxGeometry(0.05, cargoH - 0.2, 0.05), metalBar(), -0.03, y0 + cargoH / 2, z));
  const tire = std(0x0c0c10, { roughness: 0.9 });
  const rim = metalBar();
  [1.2, 1.9, 5.6].forEach((x) =>
    [-1.1, 1.1].forEach((z) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 24).rotateX(Math.PI / 2), tire);
      wheel.position.set(x, 0.5, z);
      wheel.castShadow = true;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.42, 16).rotateX(Math.PI / 2), rim);
      hub.position.copy(wheel.position);
      g.add(wheel, hub);
    }),
  );
  const lamps = [-0.9, 0.9].map((z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.3), emit(2.8, 1.0, 0.1));
    m.position.set(-0.04, 1.35, z);
    g.add(m);
    return m;
  });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDotTexture(), color: 0xffa020, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 }));
  halo.scale.set(4, 4, 1);
  halo.position.set(-0.2, 1.4, 0);
  g.add(halo);
  let tilt = 0;
  let yaw = 0;
  let lightsOut = false;
  const crate = std(0xb08a55, { roughness: 0.9 });
  return {
    group: g,
    animate(t) {
      if (lightsOut) return;
      const on = Math.sin(t * 6) > 0;
      lamps.forEach((l) => (l.visible = on));
      halo.visible = on;
    },
    crash(api) {
      const lv = api.level;
      const s = api.scale;
      api.dust(api.world(g, 0, 1, 0), pick([4, 10, 18, 30, 48], lv));
      if (lv >= 3) {
        api.detach(bumper, { vel: [rnd(2, 4) * s, 2, rnd(-2, 2)], spin: spin(4), r: 0.15 });
        doorBars.forEach((b) => api.detach(b, { vel: [rnd(2, 6) * s, rnd(2, 5), rnd(-3, 3)], spin: spin(6), r: 0.1 }));
        boxes(api, g, pick([0, 0, 4, 10, 22], lv), { size: [0.3, 0.7], mat: crate, vol: { x: [0, 0.6], y: [1.2, 3.6], z: [-1.0, 1.0] } });
      }
      if (lv >= 4) {
        lightsOut = true;
        lamps.forEach((l) => (l.visible = false));
        halo.visible = false;
      }
      if (lv >= 5) api.burn(() => api.world(g, 0.5, 2.2, 0), 6.5, { fireRate: 30, smokeRate: 12, dark: 0.15 });
      tilt = pick([0, 0, 0.02, 0.06, 0.15], lv);
      yaw = pick([0, 0, 0.05, 0.15, 0.35], lv);
      return { slide: pick([0, 0.4, 2, 5, 9], lv) };
    },
    tick(t) {
      const k = smooth(clamp(t / 1.2, 0, 1));
      g.rotation.z = -tilt * k;
      g.rotation.y = yaw * k;
    },
  };
}

function tree() {
  const g = new THREE.Group();
  const bark = new THREE.MeshStandardMaterial({ color: 0x5a3b22, roughness: 1, flatShading: true });
  const leaf = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true });
  const base = 0.55;
  const pivot = new THREE.Group(); // falls around the foot of the trunk
  pivot.position.set(base, 0, 0);
  g.add(pivot);
  const add = (geo, mat, x, y, z) => mesh(pivot, geo, mat, x - base, y, z);
  const trunk = add(new THREE.CylinderGeometry(0.5, 0.65, 5.2, 9), bark, 0.55, 2.6, 0);
  const foliage = [
    add(new THREE.IcosahedronGeometry(2.4, 1), leaf(0x3f8f3a), 0.6, 6.0, 0),
    add(new THREE.IcosahedronGeometry(1.7, 1), leaf(0x4fa043), 1.8, 5.2, 0.9),
    add(new THREE.IcosahedronGeometry(1.6, 1), leaf(0x2f7d36), -0.2, 5.4, -1.1),
  ];
  [-0.5, 0.5].forEach((z) => add(new THREE.BoxGeometry(0.9, 0.35, 0.3), bark, 0.55, 0.15, z));
  const leafMats = [0x3f8f3a, 0x4fa043, 0x2f7d36].map(leaf);
  const leafGeo = new THREE.IcosahedronGeometry(0.18, 0);
  let cfg = { amp: 0, lean: 0, fall: 0 };
  return {
    group: g,
    animate() {},
    crash(api) {
      const lv = api.level;
      const s = api.scale;
      api.dust(api.world(g, 0.4, 0.8, 0), pick([4, 8, 14, 22, 36], lv));
      for (let i = 0; i < pick([8, 20, 40, 60, 60], lv); i++) {
        api.piece(leafGeo, leafMats[i % 3], api.world(g, rnd(-1.5, 2.2), rnd(4.2, 7.4), rnd(-2, 2)), { vel: [rnd(-1, 3) * s, rnd(0, 3), rnd(-2, 2)], spin: spin(4), r: 0.1, rest: 0.2 });
      }
      cfg = { amp: pick([0.03, 0.06, 0.1, 0, 0], lv), lean: pick([0, 0, 0.12, 0, 0.25], lv), fall: lv === 4 ? 1.45 : 0 };
      if (lv >= 5) {
        foliage.forEach((f, i) => api.detach(f, { vel: [rnd(3, 8) * s, rnd(5, 9), rnd(-4, 4)], spin: spin(3), r: 1 + i * 0.1, rest: 0.25 }));
        for (let i = 0; i < 8; i++) {
          const geo = new THREE.BoxGeometry(0.1, rnd(0.5, 1.2), 0.1);
          api.piece(geo, bark, api.world(g, rnd(0.2, 0.9), rnd(2.5, 4.6), rnd(-0.4, 0.4)), { vel: [rnd(1, 6) * s, rnd(2, 7), rnd(-3, 3)], spin: spin(8), r: 0.1, ownGeo: true });
        }
      }
      return { slide: 0 };
    },
    tick(t) {
      const sway = cfg.amp * Math.exp(-1.4 * t) * Math.sin(10 * t);
      const lean = cfg.lean * smooth(clamp(t / 0.6, 0, 1));
      const fall = cfg.fall * smooth(clamp(t / 1.4, 0, 1));
      pivot.rotation.z = sway - lean - fall;
    },
    trunk,
  };
}

const BUILDERS = { barrier, wall: brickWall, container, rock, truck, tree };
const DECEL = 6; // m/s^2 while an obstacle slides after being hit

export function createObstacle(kind = 'barrier') {
  const built = (BUILDERS[kind] ?? BUILDERS.barrier)();
  const st = { level: 0, t: 0, v0: 0, x: 0 };
  return {
    group: built.group,
    kind,
    animate: built.animate,
    crash(api) {
      st.level = api.level;
      st.t = 0;
      const { slide = 0 } = built.crash(api) ?? {};
      st.v0 = Math.sqrt(2 * DECEL * slide);
    },
    tick(dt) {
      if (!st.level) return;
      st.t += dt;
      built.tick?.(st.t);
      const t = Math.min(st.t, st.v0 / DECEL);
      st.x = st.v0 * t - 0.5 * DECEL * t * t;
      built.group.position.x = st.x;
    },
    /** How far the obstacle has been pushed along +x (m). */
    get slide() {
      return st.x;
    },
    dispose() {
      built.group.traverse((o) => {
        o.geometry?.dispose?.();
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        mats.forEach((m) => {
          m.map?.dispose?.();
          m.dispose();
        });
      });
    },
  };
}
