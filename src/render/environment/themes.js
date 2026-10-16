import * as THREE from 'three';
import { facadeTexture } from '../textures.js';
import { pine, roundTree, bush, palm, mountain, hill } from '../geometries.js';

const vegMat = () => new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 });

function cityLayers() {
  const tex = facadeTexture(3);
  const heights = [10, 16, 24, 34, 46];
  const geos = heights.map((h) => {
    const w = 9 + (h % 3) * 2;
    const geo = new THREE.BoxGeometry(w, h, 8);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / 7, (uv.getY(i) * h) / 14);
    geo.translate(0, h / 2, 0);
    return geo;
  });
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.55, roughness: 0.9 });
  return [
    { z: -16, jitter: 6, spacing: 19, slots: 16, seed: 1, geos, mat: mat(0x1a2036) },
    { z: -34, jitter: 6, spacing: 24, slots: 14, seed: 7, geos, mat: mat(0x232a45) },
    { z: -60, jitter: 6, spacing: 30, slots: 12, seed: 13, geos, mat: mat(0x2d2447) },
  ];
}

const variants = (fn, n) => Array.from({ length: n }, (_, i) => fn(i));

export const THEMES = {
  city: {
    sky: { top: '#070a24', mid: '#5b2a86', bottom: '#ff7a45' },
    fog: ['#4a2a5c', 70, 260],
    hemi: [0x8a7bd8, 0x1a1020, 0.7],
    sun: { color: 0xffb27a, intensity: 2.2 },
    disc: { pos: [70, 34, -290], r: 26, color: [1.6, 0.8, 0.45], halo: 0xff8a4c, haloOpacity: 0.7 },
    stars: true,
    ground: 0x0d101c,
    exposure: 1.05,
    bloom: [0.55, 0.85],
    beam: 0.18,
    lamps: true,
    layers: cityLayers,
  },
  sunny: {
    sky: { top: '#2f7be0', mid: '#79b8f0', bottom: '#dcefff' },
    fog: ['#c3def5', 90, 330],
    hemi: [0xcfe6ff, 0x6b8f4a, 1.15],
    sun: { color: 0xfff1d0, intensity: 3.4 },
    disc: { pos: [-90, 140, -270], r: 16, color: [3, 2.8, 2], halo: 0xfff2c0, haloOpacity: 0.55 },
    stars: false,
    clouds: true,
    ground: 0x4f9a3a,
    exposure: 0.95,
    bloom: [0.3, 1.0],
    beam: 0.04,
    layers: () => {
      const m = vegMat();
      return [
        { z: -120, jitter: 20, spacing: 80, slots: 8, seed: 3, geos: variants((i) => hill(46 + i * 10, i, 0x6fb457), 3), mat: m, scale: [1, 1.6], yaw: true },
        { z: -65, jitter: 10, spacing: 46, slots: 10, seed: 5, geos: variants((i) => hill(24 + i * 6, i + 7, 0x5fa84a), 3), mat: m, scale: [1, 1.5], yaw: true },
        { z: -30, jitter: 6, spacing: 17, slots: 18, seed: 9, geos: variants(roundTree, 3), mat: m, scale: [0.9, 1.5], skip: 0.25, yaw: true },
        { z: -12, jitter: 4, spacing: 22, slots: 14, seed: 11, geos: variants(roundTree, 3), mat: m, scale: [0.8, 1.2], skip: 0.45, yaw: true },
        { z: -8.3, jitter: 1, spacing: 8, slots: 36, seed: 15, geos: variants(bush, 3), mat: m, scale: [0.7, 1.3], skip: 0.5, yaw: true },
      ];
    },
  },
  forest: {
    sky: { top: '#5f8f8c', mid: '#a9cdbb', bottom: '#eef6e3' },
    fog: ['#a9c9b4', 25, 170],
    hemi: [0xd4ead9, 0x1d3a22, 0.95],
    sun: { color: 0xfff0c0, intensity: 2.0 },
    disc: { pos: [60, 90, -260], r: 14, color: [2.4, 2.2, 1.4], halo: 0xffeeb0, haloOpacity: 0.4 },
    stars: false,
    ground: 0x24452a,
    exposure: 1.0,
    bloom: [0.35, 0.95],
    beam: 0.1,
    layers: () => {
      const m = vegMat();
      return [
        { z: -9.5, jitter: 2.5, spacing: 6, slots: 24, seed: 21, geos: variants((i) => pine(i), 3), mat: m, scale: [0.9, 1.5], skip: 0.1, yaw: true },
        { z: -19, jitter: 4, spacing: 7, slots: 22, seed: 23, geos: variants((i) => pine(i), 3), mat: m, scale: [1.2, 2], yaw: true },
        { z: -34, jitter: 5, spacing: 9, slots: 18, seed: 25, geos: variants((i) => pine(i), 3), mat: m, scale: [1.8, 3], yaw: true },
        { z: -58, jitter: 8, spacing: 12, slots: 16, seed: 27, geos: variants((i) => pine(i), 3), mat: m, scale: [2.6, 4], yaw: true },
        { z: -8, jitter: 1, spacing: 6, slots: 30, seed: 29, geos: variants(bush, 3), mat: m, scale: [0.7, 1.4], skip: 0.45, yaw: true },
      ];
    },
  },
  mountains: {
    sky: { top: '#2a56a0', mid: '#8fb4e0', bottom: '#eaf0f9' },
    fog: ['#bccbe2', 150, 540],
    hemi: [0xc9dcf5, 0x5a6a5a, 1.0],
    sun: { color: 0xfff4dc, intensity: 3.0 },
    disc: { pos: [120, 110, -270], r: 14, color: [3, 2.8, 2.2], halo: 0xfff2d0, haloOpacity: 0.45 },
    stars: false,
    clouds: true,
    ground: 0x6c7b6a,
    exposure: 1.0,
    bloom: [0.3, 1.0],
    beam: 0.04,
    layers: () => {
      const m = vegMat();
      const far = [mountain(52, 62, 1), mountain(62, 84, 2), mountain(46, 52, 3)];
      const mid = [mountain(34, 38, 4), mountain(40, 46, 5), mountain(30, 32, 6)];
      return [
        { z: -160, jitter: 25, spacing: 95, slots: 8, seed: 31, geos: far, mat: m, scale: [1, 1.5], yaw: true },
        { z: -95, jitter: 14, spacing: 62, slots: 10, seed: 33, geos: mid, mat: m, scale: [1, 1.4], yaw: true },
        { z: -32, jitter: 6, spacing: 10, slots: 22, seed: 35, geos: variants((i) => pine(i, true), 3), mat: m, scale: [1, 1.8], skip: 0.25, yaw: true },
        { z: -15, jitter: 3, spacing: 14, slots: 16, seed: 37, geos: variants((i) => pine(i, true), 3), mat: m, scale: [0.9, 1.5], skip: 0.35, yaw: true },
      ];
    },
  },
  beach: {
    sky: { top: '#1f86e6', mid: '#71c1f2', bottom: '#fff0cf' },
    fog: ['#d3ebf5', 110, 340],
    hemi: [0xd6ecff, 0xd9c28a, 1.15],
    sun: { color: 0xffe8c0, intensity: 3.3 },
    disc: { pos: [-60, 70, -270], r: 16, color: [3, 2.6, 1.8], halo: 0xffe0a0, haloOpacity: 0.55 },
    stars: false,
    clouds: true,
    ground: 0xe3cd98,
    exposure: 0.95,
    bloom: [0.3, 1.0],
    beam: 0.04,
    sea: true,
    layers: () => {
      const m = vegMat();
      return [
        { z: -11.5, jitter: 2, spacing: 13, slots: 18, seed: 41, geos: variants(palm, 3), mat: m, scale: [0.9, 1.3], skip: 0.25, yaw: true },
        { z: -16, jitter: 3, spacing: 19, slots: 14, seed: 43, geos: variants(palm, 3), mat: m, scale: [0.8, 1.2], skip: 0.4, yaw: true },
        { z: -240, jitter: 30, spacing: 160, slots: 5, seed: 45, geos: [mountain(70, 22, 8, { low: 0x3f8f5a, rock: 0x4f9a63, snow: 0x6fb27a, snowLine: 2 })], mat: m, scale: [1, 1.6], yaw: true },
      ];
    },
  },
};
