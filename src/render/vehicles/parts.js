import * as THREE from 'three';

export const darkMaterial = (color = 0x0c0c10) => new THREE.MeshStandardMaterial({ color, roughness: 0.9 });

export const metalMaterial = (color = 0xcfd6e4) => new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: 0.25 });

export const headlightMaterial = () => new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.8, 2.2), toneMapped: false });

export const taillightMaterial = () => new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.15, 0.2), toneMapped: false });

export const switchOffHeadlight = (material) => material.color.setRGB(0.05, 0.05, 0.05);

export const switchOffTaillight = (material) => material.color.setRGB(0.2, 0.02, 0.03);

export function addBox(parent, [width, height, depth], material, [x, y, z], rotationZ = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.rotation.z = rotationZ;
  parent.add(mesh);
  return mesh;
}

export function makeWheel(radius, width, { rim = metalMaterial(), tire = darkMaterial(), spokes = 5 } = {}) {
  const wheel = new THREE.Group();
  wheel.add(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 28).rotateX(Math.PI / 2), tire));
  wheel.add(new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.66, radius * 0.66, width + 0.02, 24).rotateX(Math.PI / 2), rim));
  const spokeGeometry = new THREE.BoxGeometry(radius * 1.2, 0.05, width + 0.03);
  for (let i = 0; i < spokes; i++) {
    const spoke = new THREE.Mesh(spokeGeometry, rim);
    spoke.rotation.z = (i * Math.PI * 2) / spokes;
    wheel.add(spoke);
  }
  return wheel;
}
