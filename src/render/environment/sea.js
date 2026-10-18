import * as THREE from 'three';

const SEA_LENGTH = 480;
const FOAM_STRIPS = [
  { width: 1.4, z: -18.3 },
  { width: 0.6, z: -20.5 },
];

const flatPlane = (width, depth, material) => {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
};

export function createSea(scene) {
  const group = new THREE.Group();

  const water = flatPlane(SEA_LENGTH, 260, new THREE.MeshStandardMaterial({ color: 0x1fb5d4, emissive: 0x0a4a6a, roughness: 0.15, metalness: 0.2 }));
  water.position.set(0, -0.01, -148);
  group.add(water);

  const foamMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  FOAM_STRIPS.forEach(({ width, z }) => {
    const foam = flatPlane(SEA_LENGTH, width, foamMaterial);
    foam.position.set(0, 0, z);
    group.add(foam);
  });

  scene.add(group);
  return group;
}
