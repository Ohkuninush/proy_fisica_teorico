import { clamp } from '../math.js';

const MAX_FOV_KICK = 9;
const FOV_KICK_SPEED = 35;
const FOV_FOLLOW_RATE = 3;
const VIBRATION_SPEED = 40;
const VIBRATION_AMPLITUDE = 0.012;
const IMPACT_SHAKE = 0.55;

export function cameraFeel(view) {
  let fovKick = 0;
  let time = 0;

  return {
    update(snap, dt) {
      time += dt;
      const targetKick = clamp(Math.abs(snap.v) / FOV_KICK_SPEED, 0, 1) * MAX_FOV_KICK;
      fovKick += (targetKick - fovKick) * Math.min(1, dt * FOV_FOLLOW_RATE);
      view.camFx.fovAdd = fovKick;

      const vibration = snap.status === 'running' ? clamp(Math.abs(snap.v) / VIBRATION_SPEED, 0, 1) * VIBRATION_AMPLITUDE : 0;
      const amplitude = (view.camFx.shake || 0) * IMPACT_SHAKE + vibration;
      view.camFx.offset.set(Math.sin(time * 61) * amplitude, Math.sin(time * 47 + 1) * amplitude, Math.sin(time * 53 + 2) * amplitude * 0.4);
    },
    setActive(active) {
      if (active) return;
      view.camFx.fovAdd = 0;
      view.camFx.offset.set(0, 0, 0);
      fovKick = 0;
    },
  };
}
