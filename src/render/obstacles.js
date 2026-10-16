// Obstacle models. Origin = the face the vehicle hits (x = 0), body extends toward +x, centred on z = 0.
// Contract: createObstacle(kind) -> { group, animate(t), dispose() }.
import * as THREE from 'three';
import { hazardTexture, softDotTexture } from './textures.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
const emit = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), toneMapped: false });

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

function barrier() {
  const g = new THREE.Group();
  const h = 2.6;
  const front = hazardTexture();
  const side = front.clone();
  side.needsUpdate = true;
  const concrete = std(0x8c92a0, { roughness: 0.95 });
  mesh(g, new THREE.BoxGeometry(1, h, 5), [concrete, new THREE.MeshStandardMaterial({ map: front, roughness: 0.6 }), concrete, concrete, new THREE.MeshStandardMaterial({ map: side, roughness: 0.6 }), new THREE.MeshStandardMaterial({ map: side, roughness: 0.6 })], 0.5, h / 2, 0);
  mesh(g, new THREE.BoxGeometry(1.2, 0.18, 5.2), std(0xb8bdc9), 0.5, h + 0.09, 0);
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
  return {
    group: g,
    animate(t) {
      const on = Math.sin(t * 7) > 0;
      beacons[0].visible = on;
      beacons[1].visible = !on;
      halo.material.opacity = 0.35 + 0.5 * Math.abs(Math.sin(t * 3.5));
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
        const hue = 12 + Math.random() * 10;
        ctx.fillStyle = `hsl(${hue} 55% ${30 + Math.random() * 10}%)`;
        ctx.fillRect(c * (w / 4) + off + 2, r * rh + 2, w / 4 - 4, rh - 4);
      }
    }
  };
  const faceTex = canvasTex(256, 256, bricks, [2, 1.12]);
  const sideTex = canvasTex(256, 256, bricks, [0.4, 1.12]);
  const mat = (t) => std(0xffffff, { map: t, roughness: 0.95 });
  const plain = std(0x8a4a3a);
  mesh(g, new THREE.BoxGeometry(1, h, 5), [plain, mat(faceTex), plain, plain, mat(sideTex), mat(sideTex)], 0.5, h / 2, 0);
  mesh(g, new THREE.BoxGeometry(1.15, 0.22, 5.15), std(0x3a3d46), 0.5, h + 0.11, 0);
  return { group: g, animate() {} };
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
  mesh(g, new THREE.BoxGeometry(len, h, w), [endMat, endMat, ribMat, ribMat, ribMat, ribMat], len / 2, h / 2 + 0.25, 0);
  const frame = std(0x15233d, { metalness: 0.5 });
  mesh(g, new THREE.BoxGeometry(len + 0.06, 0.25, w + 0.06), frame, len / 2, 0.125, 0);
  // door locking bars on the hit face
  [-0.45, -0.15, 0.15, 0.45].forEach((z) => mesh(g, new THREE.BoxGeometry(0.06, h - 0.3, 0.05), metalBar(), -0.03, h / 2 + 0.25, z));
  mesh(g, new THREE.BoxGeometry(0.08, 0.05, w - 0.2), metalBar(), -0.04, 1.4, 0);
  return { group: g, animate() {} };
}
const metalBar = () => new THREE.MeshStandardMaterial({ color: 0xb9c2d1, metalness: 1, roughness: 0.3 });

function rock() {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x7d828d, roughness: 0.95, flatShading: true });
  const moss = new THREE.MeshStandardMaterial({ color: 0x5e6b52, roughness: 1, flatShading: true });
  const make = (r, sx, sy, sz, x, y, z, mat, seed) => {
    const geo = new THREE.DodecahedronGeometry(r, 1);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = 1 + (Math.sin(p.getX(i) * 7.1 + seed) * Math.cos(p.getZ(i) * 5.3 + seed) * 0.18);
      p.setXYZ(i, p.getX(i) * k * sx, p.getY(i) * k * sy, p.getZ(i) * k * sz);
    }
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    const m = mesh(g, geo, mat, 0, 0, 0);
    m.position.set(x - geo.boundingBox.min.x, y - geo.boundingBox.min.y, z); // face at x, base at y
    return m;
  };
  make(1.55, 1.0, 0.95, 1.35, 0, 0, 0, stone, 1);
  make(0.9, 1, 0.9, 1, 0.2, 0, 1.6, moss, 4);
  make(0.7, 1, 0.8, 1, 0.5, 0, -1.7, stone, 9);
  make(0.45, 1, 0.8, 1, -0.0, 0, 0.8, moss, 13);
  return { group: g, animate() {} };
}

function truck() {
  const g = new THREE.Group();
  const white = std(0xe6e9f0, { roughness: 0.5 });
  const cargoLen = 5.2;
  const cargoH = 2.9;
  const w = 2.4;
  const y0 = 0.95;
  mesh(g, new THREE.BoxGeometry(cargoLen, cargoH, w), white, cargoLen / 2, y0 + cargoH / 2, 0);
  // blue stripe along the side + rear
  mesh(g, new THREE.BoxGeometry(cargoLen + 0.02, 0.4, w + 0.02), std(0x2a5ea8), cargoLen / 2, y0 + 1.6, 0);
  // cab
  mesh(g, new THREE.BoxGeometry(1.7, 2.1, w - 0.1), std(0xd9dde6), cargoLen + 0.95, y0 + 1.05, 0);
  mesh(g, new THREE.BoxGeometry(0.06, 0.9, w - 0.35), new THREE.MeshPhysicalMaterial({ color: 0x0a1020, metalness: 0.9, roughness: 0.05 }), cargoLen + 1.82, y0 + 1.45, 0);
  // chassis + bumper
  mesh(g, new THREE.BoxGeometry(cargoLen + 1.8, 0.3, 1.5), std(0x1a1c22), (cargoLen + 1.8) / 2, 0.8, 0);
  mesh(g, new THREE.BoxGeometry(0.2, 0.3, w), std(0x2b2e36), -0.1, 0.65, 0);
  // rear reflective stripes + door bars
  [0.45, 0.75].forEach((yy, i) => mesh(g, new THREE.BoxGeometry(0.03, 0.14, w - 0.2), std(i ? 0xff3030 : 0xf5f5f5, { emissive: i ? 0x550000 : 0x333333 }), -0.02, yy + 0.2, 0));
  [-0.4, 0, 0.4].forEach((z) => mesh(g, new THREE.BoxGeometry(0.05, cargoH - 0.2, 0.05), metalBar(), -0.03, y0 + cargoH / 2, z));
  // wheels
  const tire = std(0x0c0c10, { roughness: 0.9 });
  const rim = metalBar();
  [[1.2, 1.9, 5.6]].flat().forEach((x) =>
    [-1.1, 1.1].forEach((z) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 24).rotateX(Math.PI / 2), tire);
      wheel.position.set(x, 0.5, z);
      wheel.castShadow = true;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.42, 16).rotateX(Math.PI / 2), rim);
      hub.position.copy(wheel.position);
      g.add(wheel, hub);
    }),
  );
  // hazard lights
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
  return {
    group: g,
    animate(t) {
      const on = Math.sin(t * 6) > 0;
      lamps.forEach((l) => (l.visible = on));
      halo.visible = on;
    },
  };
}

function tree() {
  const g = new THREE.Group();
  const bark = new THREE.MeshStandardMaterial({ color: 0x5a3b22, roughness: 1, flatShading: true });
  const leaf = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true });
  mesh(g, new THREE.CylinderGeometry(0.5, 0.65, 5.2, 9), bark, 0.55, 2.6, 0);
  mesh(g, new THREE.IcosahedronGeometry(2.4, 1), leaf(0x3f8f3a), 0.6, 6.0, 0);
  mesh(g, new THREE.IcosahedronGeometry(1.7, 1), leaf(0x4fa043), 1.8, 5.2, 0.9);
  mesh(g, new THREE.IcosahedronGeometry(1.6, 1), leaf(0x2f7d36), -0.2, 5.4, -1.1);
  // roots
  [-0.5, 0.5].forEach((z) => mesh(g, new THREE.BoxGeometry(0.9, 0.35, 0.3), bark, 0.55, 0.15, z));
  return { group: g, animate() {} };
}

const BUILDERS = { barrier, wall: brickWall, container, rock, truck, tree };

export function createObstacle(kind = 'barrier') {
  const built = (BUILDERS[kind] ?? BUILDERS.barrier)();
  return {
    group: built.group,
    animate: built.animate,
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
