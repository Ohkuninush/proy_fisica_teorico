import * as THREE from 'three';
import { clamp, rnd } from '../math.js';

const STREAK_COUNT = 36;
const LOOP_LENGTH = 60;

export function windStreaks(view) {
  const geometry = new THREE.PlaneGeometry(1, 0.035);
  const material = new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const group = new THREE.Group();
  const streaks = Array.from({ length: STREAK_COUNT }, (_, i) => {
    const streak = new THREE.Mesh(geometry, material);
    streak.userData = { phase: rnd(0, LOOP_LENGTH), y: rnd(0.4, 5.5), z: i % 2 ? rnd(8, 15) : rnd(-4, -1), length: rnd(0.6, 1.4) };
    group.add(streak);
    return streak;
  });
  view.scene.add(group);

  return {
    update(snap) {
      group.visible = view.rig.streaks;
      const speed = Math.abs(snap.v);
      material.opacity = clamp((speed - 4) / 30, 0, 0.55);
      streaks.forEach((streak) => {
        const { phase, y, z, length } = streak.userData;
        const along = (((phase - snap.x) % LOOP_LENGTH) + LOOP_LENGTH) % LOOP_LENGTH;
        streak.position.set(snap.x - 14 + along, y, z);
        streak.scale.x = clamp(speed * 0.16, 0.1, 9) * length;
      });
    },
    setActive(active) {
      group.visible = active;
    },
  };
}
