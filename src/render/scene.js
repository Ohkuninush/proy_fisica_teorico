// Three.js view. Reads snapshots only; contains no physics.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CAR_LENGTH } from '../physics/params.js';
import { createEnvironment, LANE_Z } from './environment.js';
import { createCar, createObstacle } from './carModel.js';

const BASE_FOV = 38;

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

  const camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 0.1, 700);

  scene.add(new THREE.HemisphereLight(0x8a7bd8, 0x1a1020, 0.7));
  const sun = new THREE.DirectionalLight(0xffb27a, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 12, bottom: -12, near: 1, far: 70 });
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);

  const env = createEnvironment(scene);
  const carModel = createCar();
  const obstacleModel = createObstacle();
  scene.add(carModel.group, obstacleModel.group);
  carModel.group.position.z = LANE_Z;
  obstacleModel.group.position.z = LANE_Z;

  // Post-processing (bloom) is only used while visual effects are on.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.6, 0.85);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let bloomOn = true;

  // Effects write here; applied at render time on top of the fixed side camera.
  const camFx = { fovAdd: 0, offset: new THREE.Vector3() };
  const base = { pos: new THREE.Vector3(), look: new THREE.Vector3() };

  const api = {
    scene,
    camera,
    renderer,
    camFx,
    car: carModel.group,
    obstacle: obstacleModel.group,
    carZ: LANE_Z,
    setCarColor: (hex) => carModel.setColor(hex),
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
    /** Map physical snapshot -> poses. Car x is the rear; obstacle x is its face. */
    update(snap) {
      carModel.group.position.x = snap.x;
      carModel.pose(snap.x, snap.a);
      obstacleModel.group.position.x = snap.obstacleX + 0.5;
      const cx = snap.x + CAR_LENGTH / 2;
      base.pos.set(cx + 3.5, 3.4, 19);
      base.look.set(cx + 3.5, 1.3, LANE_Z * 0.6);
      sun.position.set(cx - 14, 24, 14);
      sun.target.position.set(cx, 0, 0);
      env.update(cx, camera.position);
    },
    render(time) {
      obstacleModel.animate(time);
      camera.position.copy(base.pos).add(camFx.offset);
      camera.lookAt(base.look);
      const fov = BASE_FOV + camFx.fovAdd;
      if (Math.abs(camera.fov - fov) > 1e-3) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      if (bloomOn) composer.render();
      else renderer.render(scene, camera);
    },
  };
  api.resize();
  return api;
}
