import { blendPose, DEFAULT_VIEW, RIGS } from './cameraRigs.js';

const TRANSITION_S = 1;
const FOV_EPSILON = 1e-3;

export function createCameraDirector(camera, cameraEffects) {
  let viewId = DEFAULT_VIEW;
  let lastPose = null;
  let lastTime = 0;
  let transition = null;

  return {
    get rig() {
      return RIGS[viewId];
    },
    setView(id) {
      if (!RIGS[id] || id === viewId) return;
      transition = lastPose ? { from: lastPose, startedAt: lastTime } : null;
      viewId = id;
    },
    frame(shot, time) {
      lastTime = time;
      const rig = RIGS[viewId];
      lastPose = rig.pose(shot);
      let pose = lastPose;
      if (transition) {
        const progress = (time - transition.startedAt) / TRANSITION_S;
        if (progress >= 1) transition = null;
        else pose = blendPose(transition.from, lastPose, progress);
      }

      camera.up.copy(pose.up);
      camera.position.copy(pose.pos).add(cameraEffects.offset);
      camera.lookAt(pose.look);
      const fov = pose.fov + cameraEffects.fovAdd * rig.fovKick;
      if (Math.abs(camera.fov - fov) > FOV_EPSILON) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      return rig;
    },
  };
}
