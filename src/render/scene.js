// Three.js view. Reads snapshots only; contains no physics.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CAR_LENGTH } from '../physics/params.js';
import { createEnvironment, LANE_Z } from './environment.js';
import { createVehicle } from './vehicles.js';
import { createObstacle } from './obstacles.js';
import { RIGS, DEFAULT_VIEW, blendPose } from './cameraRigs.js';

const TRANSITION_S = 1.0; // seconds to glide between viewpoints

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x4a2a5c, 70, 260);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 700);

  const hemi = new THREE.HemisphereLight(0x8a7bd8, 0x1a1020, 0.7);
  const sun = new THREE.DirectionalLight(0xffb27a, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 12, bottom: -12, near: 1, far: 70 });
  sun.shadow.bias = -0.0004;
  scene.add(hemi, sun, sun.target);

  const env = createEnvironment(scene);

  // Swappable models live inside persistent roots (effects attach to carRoot).
  const carRoot = new THREE.Group();
  carRoot.position.z = LANE_Z;
  const obstacleRoot = new THREE.Group();
  obstacleRoot.position.z = LANE_Z;
  scene.add(carRoot, obstacleRoot);

  const spot = new THREE.SpotLight(0xfff0d0, 900, 55, 0.5, 0.7, 1.6);
  spot.position.set(CAR_LENGTH, 0.75, 0);
  spot.target.position.set(CAR_LENGTH + 10, 0.2, 0);
  carRoot.add(spot, spot.target);

  let vehicle = null;
  let obstacle = null;
  let color = '#e5484d';

  // Post-processing (bloom) is only used while visual effects are on.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.6, 0.85);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let bloomOn = true;

  // Effects write here; applied at render time on top of the fixed side camera.
  const camFx = { fovAdd: 0, offset: new THREE.Vector3() };
  let viewId = DEFAULT_VIEW;
  let lastSnap = null;
  let lastPose = null;
  let transition = null; // { from, start }
  let now = 0;
  let themeBloom = 0.55;

  const api = {
    scene,
    camera,
    renderer,
    camFx,
    car: carRoot,
    carZ: LANE_Z,
    vehicleMeta: { rearWheelX: 0.85, trackZ: 0.9 },
    beam: 0.18, // headlight beam opacity (daylight scenes use less)
    setCarColor(hex) {
      color = hex;
      vehicle?.setColor(hex);
    },
    setVehicle(kind) {
      if (vehicle) {
        carRoot.remove(vehicle.group);
        vehicle.dispose();
      }
      vehicle = createVehicle(kind);
      vehicle.setColor(color);
      carRoot.add(vehicle.group);
      api.vehicleMeta = vehicle.meta;
    },
    setObstacle(kind) {
      if (obstacle) {
        obstacleRoot.remove(obstacle.group);
        obstacle.dispose();
      }
      obstacle = createObstacle(kind);
      obstacleRoot.add(obstacle.group);
    },
    setScenery(id) {
      const t = env.setTheme(id);
      scene.fog.color.set(t.fog[0]);
      scene.fog.near = t.fog[1];
      scene.fog.far = t.fog[2];
      hemi.color.set(t.hemi[0]);
      hemi.groundColor.set(t.hemi[1]);
      hemi.intensity = t.hemi[2];
      sun.color.set(t.sun.color);
      sun.intensity = t.sun.intensity;
      renderer.toneMappingExposure = t.exposure;
      bloom.strength = t.bloom[0];
      themeBloom = t.bloom[0];
      bloom.threshold = t.bloom[1];
      api.beam = t.beam;
    },
    setBloom(on) {
      bloomOn = on;
    },
    /** Screen-space scale for point sprites. */
    pointScale() {
      return renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    },
    resize() {
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      bloom.resolution.set(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    get rig() {
      return RIGS[viewId];
    },
    setView(id) {
      if (!RIGS[id] || id === viewId) return;
      transition = lastPose ? { from: lastPose, start: now } : null;
      viewId = id;
    },
    /** Map physical snapshot -> poses. Car x is the rear; obstacle x is the face that gets hit. */
    update(snap) {
      lastSnap = snap;
      carRoot.position.x = snap.x;
      vehicle?.pose(snap.x, snap.a);
      obstacleRoot.position.x = snap.obstacleX;
      const cx = snap.x + CAR_LENGTH / 2;
      sun.position.set(cx - 14, 24, 14);
      sun.target.position.set(cx, 0, 0);
    },
    render(time) {
      now = time;
      obstacle?.animate(time);
      const snap = lastSnap;
      const rig = RIGS[viewId];
      let pose = rig.pose({ carX: snap.x, cx: snap.x + CAR_LENGTH / 2, obstacleX: snap.obstacleX, snap, time, eye: api.vehicleMeta.eye ?? [3.4, 1.3] });
      lastPose = pose;
      if (transition) {
        const k = (time - transition.start) / TRANSITION_S;
        if (k >= 1) transition = null;
        else pose = blendPose(transition.from, pose, k);
      }
      // cameras that sit in or face the headlights get a much softer glare
      const glare = rig.beams === false;
      spot.intensity = glare ? 220 : 900;
      bloom.strength = glare ? themeBloom * 0.45 : themeBloom;
      camera.up.copy(pose.up);
      camera.position.copy(pose.pos).add(camFx.offset);
      camera.lookAt(pose.look);
      env.update(snap.x + CAR_LENGTH / 2, camera.position, time);
      const fov = pose.fov + camFx.fovAdd * rig.fx;
      if (Math.abs(camera.fov - fov) > 1e-3) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      if (bloomOn) composer.render();
      else renderer.render(scene, camera);
    },
  };
  api.setScenery('city');
  api.setVehicle('sedan');
  api.setObstacle('barrier');
  api.resize();
  return api;
}
