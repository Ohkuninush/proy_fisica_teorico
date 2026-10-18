import * as THREE from 'three';
import { asphaltTexture } from '../textures.js';
import { ROAD_HALF_WIDTH } from './constants.js';

const ROAD_LENGTH = 480;
const ASPHALT_TILE_M = 8;
const DASH_COUNT = 24;
const DASH_SPACING = 7;

const flatPlane = (width, depth, material) => {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
};

export function createRoad(scene) {
  const group = new THREE.Group();

  const asphalt = asphaltTexture();
  asphalt.repeat.set(60, 2);
  const road = flatPlane(ROAD_LENGTH, ROAD_HALF_WIDTH * 2, new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.85, metalness: 0.05 }));
  road.receiveShadow = true;

  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x0d101c, roughness: 1 });
  const ground = flatPlane(ROAD_LENGTH, 220, groundMaterial);
  ground.position.y = -0.03;
  ground.receiveShadow = true;
  group.add(road, ground);

  const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0xf2f2f2 });
  for (const z of [-ROAD_HALF_WIDTH + 0.5, ROAD_HALF_WIDTH - 0.5]) {
    const line = flatPlane(ROAD_LENGTH, 0.16, edgeMaterial);
    line.position.set(0, 0.012, z);
    group.add(line);
  }

  const curbMaterial = new THREE.MeshStandardMaterial({ color: 0x3a3f4d, roughness: 0.9 });
  for (const z of [-ROAD_HALF_WIDTH - 0.3, ROAD_HALF_WIDTH + 0.3]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(ROAD_LENGTH, 0.2, 0.6), curbMaterial);
    curb.position.set(0, 0.1, z);
    curb.receiveShadow = true;
    group.add(curb);
  }
  scene.add(group);

  return {
    setGroundColor: (color) => groundMaterial.color.set(color),
    update(centerX) {
      group.position.x = centerX;
      asphalt.offset.x = (((centerX / ASPHALT_TILE_M) % 1) + 1) % 1;
    },
  };
}

export function createLaneDashes(scene) {
  const geometry = new THREE.PlaneGeometry(2.6, 0.18);
  const material = new THREE.MeshBasicMaterial({ color: 0xe9e9e9 });
  const dashes = Array.from({ length: DASH_COUNT }, () => {
    const dash = new THREE.Mesh(geometry, material);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.014, 0);
    scene.add(dash);
    return dash;
  });

  return {
    update(centerX) {
      const base = Math.floor(centerX / DASH_SPACING) * DASH_SPACING;
      dashes.forEach((dash, i) => (dash.position.x = base + (i - DASH_COUNT / 2) * DASH_SPACING));
    },
  };
}
