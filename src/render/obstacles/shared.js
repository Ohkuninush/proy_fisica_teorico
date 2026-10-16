import * as THREE from 'three';
import { rnd } from '../math.js';

export const standardMaterial = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...options });

export const emissiveMaterial = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), toneMapped: false });

export const steelMaterial = () => new THREE.MeshStandardMaterial({ color: 0xb9c2d1, metalness: 1, roughness: 0.3 });

export const randomSpin = (range = 5) => [rnd(-range, range), rnd(-range, range), rnd(-range, range)];

export function drawnTexture(width, height, draw, repeat) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...repeat);
  texture.anisotropy = 4;
  return texture;
}

export function addMesh(group, geometry, material, [x, y, z]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

export function throwBoxes(api, group, count, { size = [0.15, 0.5], material, volume, power = 1, lift = 4 }) {
  const [minSize, maxSize] = size;
  for (let i = 0; i < count; i++) {
    const geometry = new THREE.BoxGeometry(rnd(minSize, maxSize), rnd(minSize, maxSize) * 0.8, rnd(minSize, maxSize));
    const origin = api.world(group, rnd(...volume.x), rnd(...volume.y), rnd(...volume.z));
    api.piece(geometry, material, origin, {
      vel: [rnd(0.6, 5.5) * api.force * power, rnd(0, lift) + 1, rnd(-3, 3) * power],
      spin: randomSpin(6),
      r: maxSize * 0.4,
      ownGeo: true,
    });
  }
}
