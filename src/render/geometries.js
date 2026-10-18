import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hash } from './math.js';

function paint(geo, hex) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

function paintTriangles(geo, colorOf) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.attributes.position;
  const arr = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i += 3) {
    const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3;
    const cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
    const cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    c.set(colorOf(cx, cy, cz));
    for (let k = 0; k < 3; k++) arr.set([c.r, c.g, c.b], (i + k) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

const merge = (parts) => {
  const out = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  return out;
};

const PINE = { trunk: 0x5b3a22, tiers: [0x1f5e3a, 0x23703f, 0x2b8248] };
const SNOWY_PINE = { trunk: 0x4a3322, tiers: [0x2d5a46, 0xdfe8f2, 0xf4f8ff] };

export function pine(variant = 0, snowy = false) {
  const pal = snowy ? SNOWY_PINE : PINE;
  const k = 0.9 + variant * 0.12;
  const parts = [paint(new THREE.CylinderGeometry(0.22, 0.3, 1.4, 6).translate(0, 0.7, 0), pal.trunk)];
  [[2.5, 3.2, 1.6], [2.0, 2.8, 3.3], [1.4, 2.4, 4.9]].forEach(([r, h, y], i) => {
    parts.push(paint(new THREE.ConeGeometry(r * k, h, 7).translate(0, y + h / 2, 0), pal.tiers[i]));
  });
  return merge(parts);
}

export function roundTree(variant = 0) {
  const greens = [0x3f8f3a, 0x4fa043, 0x2f7d36];
  const g = greens[variant % 3];
  const blob = (r, x, y, z, c) => paint(new THREE.IcosahedronGeometry(r, 1).translate(x, y, z), c);
  return merge([
    paint(new THREE.CylinderGeometry(0.3, 0.42, 3, 6).translate(0, 1.5, 0), 0x6b4a2b),
    blob(2.3, 0, 4.4, 0, g),
    blob(1.6, 1.4, 3.6, 0.5, 0x58ad4a),
    blob(1.5, -1.3, 3.8, -0.4, 0x2f7d36),
  ]);
}

export function bush(variant = 0) {
  const c = [0x3b7d3a, 0x4a8f3f, 0x2f6b33][variant % 3];
  return merge([
    paint(new THREE.IcosahedronGeometry(0.9, 1).translate(0, 0.6, 0), c),
    paint(new THREE.IcosahedronGeometry(0.65, 1).translate(0.8, 0.45, 0.2), 0x4fa043),
  ]);
}

export function palm(variant = 0) {
  const lean = 0.35 + variant * 0.25;
  const parts = [];
  let px = 0;
  let py = 0;
  for (let i = 0; i < 6; i++) {
    const a = -lean * 0.08 * (i + 1);
    const seg = new THREE.CylinderGeometry(0.2 - i * 0.015, 0.24 - i * 0.015, 1.4, 6);
    seg.translate(0, 0.7, 0).rotateZ(a).translate(px, py, 0);
    parts.push(paint(seg, i % 2 ? 0x8a6a46 : 0x9a7a52));
    px += -Math.sin(a) * 1.4;
    py += Math.cos(a) * 1.4;
  }
  for (let i = 0; i < 8; i++) {
    const leaf = new THREE.BoxGeometry(3.4, 0.05, 0.75).translate(1.7, 0, 0).rotateZ(-0.45).rotateY((i * Math.PI) / 4).translate(px, py, 0);
    parts.push(paint(leaf, i % 2 ? 0x2e9a4a : 0x3dae55));
  }
  for (let i = 0; i < 3; i++) parts.push(paint(new THREE.SphereGeometry(0.22, 8, 6).translate(px + (i - 1) * 0.3, py - 0.3, (i % 2) * 0.3), 0x5b3a22));
  return merge(parts);
}

export function mountain(w, h, seed = 1, pal = {}) {
  const { rock = 0x6d7a96, low = 0x4f6a4a, snow = 0xf4f8ff, snowLine = 0.6 } = pal;
  const geo = new THREE.ConeGeometry(w, h, 8, 6);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const ny = (y + h / 2) / h;
    if (ny < 0.97) {
      const k = 0.16 * (1 - ny) + 0.05;
      p.setX(i, x * (1 + (hash(x * 12.9 + z * 78.2 + seed) - 0.5) * k * 2));
      p.setZ(i, z * (1 + (hash(z * 12.1 + x * 37.7 + seed * 3) - 0.5) * k * 2));
      if (ny > 0.05) p.setY(i, y + (hash(x * 5.3 + y * 9.1 + z * 2.7 + seed) - 0.5) * h * 0.06);
    }
  }
  geo.translate(0, h / 2 - h * 0.04, 0);
  const lowC = new THREE.Color(low);
  const rockC = new THREE.Color(rock);
  return paintTriangles(geo, (x, y, z) => {
    const ny = (y + h * 0.04) / h;
    const n = hash(x * 3.1 + z * 7.7 + seed) * 0.07;
    if (ny > snowLine + n) return snow;
    if (ny > 0.28 + n) return rockC.clone().multiplyScalar(0.85 + n * 3);
    return lowC;
  });
}

export function hill(r, seed = 1, color = 0x5fa84a) {
  const geo = new THREE.SphereGeometry(r, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2);
  geo.scale(1, 0.32, 1);
  const base = new THREE.Color(color);
  return paintTriangles(geo, (x, y, z) => base.clone().multiplyScalar(0.82 + hash(x * 1.7 + z * 2.9 + seed) * 0.3));
}
