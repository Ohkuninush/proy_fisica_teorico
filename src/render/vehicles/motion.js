import { CAR_LENGTH } from '../../physics/params.js';
import { clamp, smooth } from '../math.js';

export const carMotion = (flipHeight) => ({
  2: { duration: 0.5, lift: 0.04 },
  3: { duration: 0.7, lift: 0.12, hop: 0.15 },
  4: { duration: 1.1, lift: 0.28, roll: 0.35, yaw: 0.2, hop: 0.5 },
  5: { duration: 1.6, flipRotation: Math.PI, flipHeight, flipSideways: 0.8, yaw: 0.3 },
});

export const MOTORBIKE_MOTION = {
  2: { duration: 0.5, lift: 0.05 },
  3: { duration: 0.8, lift: 0.4, hop: 0.3 },
  4: { duration: 1.0, roll: 1.45, flipHeight: 0.4, yaw: 0.3 },
  5: { duration: 1.4, flipRotation: 3.3, flipHeight: 0.9, flipSideways: 1.0, yaw: 0.6 },
};

export const TANK_MOTION = {
  3: { duration: 0.5, lift: 0.03 },
  4: { duration: 0.7, lift: 0.06 },
  5: { duration: 1.0, lift: 0.16, roll: 0.1 },
};

const FLIP_ARC_HEIGHT = 1.6;

export function applyCrashMotion(pivot, motion, elapsed) {
  if (!motion) return;
  const { lift = 0, hop = 0, roll = 0, yaw = 0, flipRotation = 0, flipHeight = 0, flipSideways = 0 } = motion;
  const progress = clamp(elapsed / motion.duration, 0, 1);
  const eased = smooth(progress);
  const arc = Math.sin(Math.PI * progress);

  pivot.rotation.set(roll * eased + flipRotation * eased, yaw * eased, -lift * arc);
  pivot.position.set(CAR_LENGTH, hop * arc + flipHeight * eased + (flipRotation ? FLIP_ARC_HEIGHT * arc : 0), flipSideways * eased);
}
