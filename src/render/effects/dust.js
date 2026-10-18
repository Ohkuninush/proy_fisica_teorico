import { rnd } from '../math.js';
import { createParticles } from './particles.js';

const MIN_SPEED = 3;
const PUFFS_PER_METER = 1.1;
const DUST_COLOR = [0.62, 0.58, 0.55];

export function dust(view) {
  const particles = createParticles(view, { max: 260, additive: false, drag: 1.2, grow: 2.2 });
  let pending = 0;

  return {
    update(snap, dt) {
      if (snap.status === 'running' && Math.abs(snap.v) > MIN_SPEED) {
        pending += Math.abs(snap.v) * PUFFS_PER_METER * dt;
        const direction = Math.sign(snap.v) || 1;
        while (pending >= 1) {
          pending -= 1;
          const { rearWheelX, trackZ } = view.vehicleMeta;
          const wheelZ = view.carZ + (Math.random() < 0.5 ? -trackZ : trackZ);
          particles.emit([snap.x + rearWheelX, 0.1, wheelZ], [-direction * rnd(0.5, 2.2), rnd(0.4, 1.4), rnd(-0.3, 0.3)], rnd(0.7, 1.4), rnd(0.5, 0.9), DUST_COLOR);
        }
      }
      particles.update(dt);
    },
    setActive(active) {
      particles.setVisible(active);
      if (!active) particles.clear();
    },
  };
}
