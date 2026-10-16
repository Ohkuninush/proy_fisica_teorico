import * as THREE from 'three';
import { hash } from '../math.js';

export function createBackdropLayer(scene, definition) {
  const { slots, spacing, jitter, seed, skip, geos, mat, yaw, z } = definition;
  const [minScale, maxScale] = definition.scale ?? [1, 1];

  const meshes = Array.from({ length: slots }, () => {
    const mesh = new THREE.Mesh(geos[0], mat);
    scene.add(mesh);
    return mesh;
  });

  return {
    meshes,
    dispose() {
      meshes.forEach((mesh) => scene.remove(mesh));
      mat.dispose();
      geos.forEach((geometry) => geometry.dispose());
    },
    update(centerX) {
      const first = Math.floor(centerX / spacing) - slots / 2;
      meshes.forEach((mesh, i) => {
        const k = first + i;
        const noise = (n) => hash(k * n + seed * 7.3);
        mesh.visible = !(skip && noise(1.7) < skip);
        if (!mesh.visible) return;
        mesh.geometry = geos[Math.floor(noise(3.1) * geos.length)];
        mesh.position.set(k * spacing + (noise(5.3) - 0.5) * jitter, 0, z - noise(7.7) * jitter * 0.6);
        mesh.scale.setScalar(minScale + noise(11.3) * (maxScale - minScale));
        mesh.rotation.y = yaw ? noise(13.1) * Math.PI * 2 : 0;
      });
    },
  };
}
