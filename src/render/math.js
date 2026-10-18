import { MathUtils } from 'three';

export const clamp = MathUtils.clamp;

export const rnd = (min, max) => min + Math.random() * (max - min);

export const smooth = (t) => t * t * (3 - 2 * t);

export const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export const byLevel = (values, level) => values[level - 1];
