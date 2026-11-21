import * as THREE from 'three';
import { clamp, smooth } from './math.js';
import { LANE_Z } from './environment/constants.js';

const vec = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = vec(0, 1, 0);

export const DEFAULT_VIEW = 'side';

export const RIGS = {
  side: {
    fovKick: 1,
    streaks: true,
    pose: ({ centerX, carY = 0 }) => ({ pos: vec(centerX + 3.5, 3.4 + carY, 19), look: vec(centerX + 3.5, 1.3 + carY, LANE_Z * 0.6), fov: 38, up: UP }),
  },
  cinematic: {
    fovKick: 0.4,
    streaks: true,
    pose: ({ centerX, obstacleX, snap, time, carY = 0 }) => {
      if (snap.impact) {
        return { pos: vec(obstacleX - 9, 1.4, 12), look: vec(obstacleX - 1.5, 1.7, LANE_Z), fov: 34, up: UP };
      }
      return {
        pos: vec(centerX - 7 + 2.5 * Math.sin(time * 0.3), 0.95 + carY + 0.3 * Math.sin(time * 0.55), 9 + 2 * Math.cos(time * 0.25)),
        look: vec(centerX + 5, 1.3 + carY, LANE_Z),
        fov: 32,
        up: UP,
      };
    },
  },
  aerial: {
    fovKick: 0.2,
    streaks: false,
    pose: ({ centerX, carY = 0 }) => ({ pos: vec(centerX + 6, 24 + carY, 17), look: vec(centerX + 6, carY, LANE_Z - 1), fov: 42, up: UP }),
  },
  top: {
    fovKick: 0,
    streaks: false,
    pose: ({ centerX }) => ({ pos: vec(centerX + 5, 30, LANE_Z), look: vec(centerX + 5, 0, LANE_Z), fov: 45, up: vec(0, 0, -1) }),
  },
  chase: {
    fovKick: 1,
    streaks: true,
    pose: ({ carX, carY = 0 }) => ({ pos: vec(carX - 8.5, 3.0 + carY, LANE_Z + 0.6), look: vec(carX + 22, 1.3 + carY, LANE_Z), fov: 52, up: UP }),
  },
  driver: {
    fovKick: 1,
    streaks: true,
    beams: false,
    pose: ({ carX, rearY = 0, pitch = 0, eye: [eyeX, eyeY] }) => {
      const cos = Math.cos(pitch);
      const sin = Math.sin(pitch);
      const pos = vec(carX + eyeX * cos - eyeY * sin, rearY + eyeX * sin + eyeY * cos, LANE_Z);
      return { pos, look: vec(pos.x + 30 * cos + 0.2 * sin, pos.y + 30 * sin - 0.2 * cos, LANE_Z), fov: 68, up: UP };
    },
  },
  zoom: {
    fovKick: 0,
    streaks: false,
    beams: false,
    pose: ({ carX, obstacleX, carY = 0 }) => {
      const distance = Math.max(Math.hypot(obstacleX - carX, carY), 1);
      const fov = clamp(THREE.MathUtils.radToDeg(2 * Math.atan(6 / distance)), 9, 60);
      return { pos: vec(obstacleX - 1.2, 1.3, LANE_Z + 3.4), look: vec(carX + 2.1, 1.1 + carY, LANE_Z), fov, up: UP };
    },
  },
};

export function blendPose(from, to, t) {
  const k = smooth(clamp(t, 0, 1));
  return {
    pos: from.pos.clone().lerp(to.pos, k),
    look: from.look.clone().lerp(to.look, k),
    fov: from.fov + (to.fov - from.fov) * k,
    up: from.up.clone().lerp(to.up, k).normalize(),
  };
}
