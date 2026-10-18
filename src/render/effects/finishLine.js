import { clamp, rnd } from '../math.js';
import { createParticles } from './particles.js';

const MIN_ROLLOUT_M = 4;
const MAX_ROLLOUT_M = 16;
const ROLLOUT_PER_MS = 0.6;
const CONFETTI_BURST = 200;
const CONFETTI_RAIN_S = 2;
const CONFETTI_RAIN_PER_S = 70;
const CONFETTI_COLORS = [[1, 0.25, 0.35], [1, 0.85, 0.2], [0.25, 0.8, 1], [0.5, 1, 0.45], [1, 0.45, 0.95], [1, 1, 1]];

export function finishLine(view) {
  const confetti = createParticles(view, { max: 320, additive: false, gravity: -7, drag: 0.9 });

  let fired = false;
  let active = true;
  let age = 0;
  let rain = 0;
  let speed = 0;
  let deceleration = 1;
  let stopTime = 0;

  function spawn(lineX, spread, height) {
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    confetti.emit([lineX, height, rnd(-spread, spread)], [rnd(-3, 7), rnd(2, 8), rnd(-5, 5)], rnd(1.8, 3.2), rnd(0.14, 0.3), color);
  }

  function celebrate(snap) {
    speed = Math.abs(snap.impact.v);
    const distance = clamp(speed * ROLLOUT_PER_MS, MIN_ROLLOUT_M, MAX_ROLLOUT_M);
    deceleration = (speed * speed) / (2 * distance);
    stopTime = speed / deceleration;
    age = 0;
    rain = 0;
    view.getGoal()?.celebrate();
    for (let i = 0; i < CONFETTI_BURST; i++) spawn(snap.obstacleX, 6, rnd(2, 7));
  }

  function reset() {
    fired = false;
    age = 0;
    view.rollout = 0;
    confetti.clear();
    view.getGoal()?.reset();
  }

  return {
    update(snap, dt) {
      const goal = view.getGoal();
      goal?.tick(dt);
      if (active && goal && snap.impact && !fired) {
        fired = true;
        celebrate(snap);
      } else if (fired && !snap.impact) {
        reset();
      }
      if (fired) {
        age += dt;
        const moving = Math.min(age, stopTime);
        view.rollout = speed * moving - 0.5 * deceleration * moving * moving;
        if (age < CONFETTI_RAIN_S) {
          rain += CONFETTI_RAIN_PER_S * dt;
          for (; rain >= 1; rain -= 1) spawn(snap.obstacleX, 7, rnd(5, 9));
        }
      }
      confetti.update(dt);
    },
    setActive(enabled) {
      active = enabled;
      confetti.setVisible(enabled);
      if (!enabled) reset();
    },
  };
}
