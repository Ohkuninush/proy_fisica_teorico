import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CAR_LENGTH } from '../physics/params.js';
import { NO_GOAL } from '../visuals/catalog.js';
import { createCameraDirector } from './cameraDirector.js';
import { createCrash } from './crash/index.js';
import { LANE_Z } from './environment/constants.js';
import { createEnvironment } from './environment/index.js';
import { createGoal } from './goals/index.js';
import { createObstacle } from './obstacles/index.js';
import { createVehicle } from './vehicles/index.js';

const HEADLIGHT_INTENSITY = 900;
const GLARE_HEADLIGHT_INTENSITY = 220;
const GLARE_BLOOM_FACTOR = 0.45;
const DEFAULT_COLOR = '#e5484d';
const ROLLOUT_FRAMING = 0.5;

function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  return renderer;
}

function createLights(scene) {
  const hemisphere = new THREE.HemisphereLight(0x8a7bd8, 0x1a1020, 0.7);
  const sun = new THREE.DirectionalLight(0xffb27a, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 12, bottom: -12, near: 1, far: 70 });
  sun.shadow.bias = -0.0004;
  scene.add(hemisphere, sun, sun.target);
  return { hemisphere, sun };
}

function createHeadlight(carRoot) {
  const spot = new THREE.SpotLight(0xfff0d0, HEADLIGHT_INTENSITY, 55, 0.5, 0.7, 1.6);
  spot.position.set(CAR_LENGTH, 0.75, 0);
  spot.target.position.set(CAR_LENGTH + 10, 0.2, 0);
  carRoot.add(spot, spot.target);
  return spot;
}

function createPostProcessing(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.6, 0.85);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  return { composer, bloom };
}

function headlightIntensity(crashLevel, hasGlare) {
  if (crashLevel >= 2) return 0;
  const base = hasGlare ? GLARE_HEADLIGHT_INTENSITY : HEADLIGHT_INTENSITY;
  return crashLevel === 1 ? base * 0.5 : base;
}

export function createScene(canvas) {
  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x4a2a5c, 70, 260);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 700);
  const cameraEffects = { fovAdd: 0, offset: new THREE.Vector3() };
  const director = createCameraDirector(camera, cameraEffects);

  const { hemisphere, sun } = createLights(scene);
  const environment = createEnvironment(scene);

  const carRoot = new THREE.Group();
  const obstacleRoot = new THREE.Group();
  carRoot.position.z = obstacleRoot.position.z = LANE_Z;
  const goalRoot = new THREE.Group();
  scene.add(carRoot, obstacleRoot, goalRoot);
  const headlight = createHeadlight(carRoot);

  const { composer, bloom } = createPostProcessing(renderer, scene, camera);

  let vehicle = null;
  let obstacle = null;
  let goal = null;
  let vehicleKind = 'sedan';
  let obstacleKind = 'barrier';
  let color = DEFAULT_COLOR;
  let bloomEnabled = true;
  let themeBloom = bloom.strength;
  let latestSnap = null;

  const view = {
    scene,
    camFx: cameraEffects,
    car: carRoot,
    carZ: LANE_Z,
    vehicleMeta: { rearWheelX: 0.85, trackZ: 0.9 },
    beam: 0.18,
    get rig() {
      return director.rig;
    },
    get vehicleKind() {
      return vehicleKind;
    },
    getVehicle: () => vehicle,
    rollout: 0,
    get goalActive() {
      return goal !== null;
    },
    getObstacle: () => obstacle,
    getGoal: () => goal,
    setView: (id) => director.setView(id),
    setBloom(enabled) {
      bloomEnabled = enabled;
    },
    setCarColor(hex) {
      color = hex;
      vehicle?.setColor(hex);
    },
    setVehicle(kind) {
      if (vehicle) {
        carRoot.remove(vehicle.group);
        vehicle.dispose();
      }
      vehicleKind = kind;
      vehicle = createVehicle(kind);
      vehicle.setColor(color);
      carRoot.add(vehicle.group);
      view.vehicleMeta = vehicle.meta;
    },
    setObstacle(kind) {
      if (obstacle) {
        obstacleRoot.remove(obstacle.group);
        obstacle.dispose();
      }
      obstacleKind = kind;
      obstacle = createObstacle(kind);
      obstacleRoot.add(obstacle.group);
    },
    setGoal(kind) {
      if (goal) {
        goalRoot.remove(goal.group);
        goal.dispose();
      }
      goal = kind === NO_GOAL ? null : createGoal(kind);
      if (goal) goalRoot.add(goal.group);
      obstacleRoot.visible = !goal;
      view.rollout = 0;
    },
    restoreModels() {
      view.setVehicle(vehicleKind);
      view.setObstacle(obstacleKind);
    },
    setScenery(id) {
      const theme = environment.setTheme(id);
      const [fogColor, fogNear, fogFar] = theme.fog;
      scene.fog.color.set(fogColor);
      scene.fog.near = fogNear;
      scene.fog.far = fogFar;
      const [skyLight, groundLight, lightIntensity] = theme.hemi;
      hemisphere.color.set(skyLight);
      hemisphere.groundColor.set(groundLight);
      hemisphere.intensity = lightIntensity;
      sun.color.set(theme.sun.color);
      sun.intensity = theme.sun.intensity;
      renderer.toneMappingExposure = theme.exposure;
      [themeBloom, bloom.threshold] = theme.bloom;
      bloom.strength = themeBloom;
      view.beam = theme.beam;
    },
    pointScale() {
      return renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    },
    resize() {
      const width = canvas.clientWidth || 1;
      const height = canvas.clientHeight || 1;
      renderer.setSize(width, height, false);
      composer.setSize(width, height);
      bloom.resolution.set(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    update(snap) {
      latestSnap = snap;
      const carX = snap.x + view.rollout;
      carRoot.position.x = carX;
      vehicle?.pose(carX, snap.a);
      obstacleRoot.position.x = goalRoot.position.x = snap.obstacleX;
      const centerX = carX + CAR_LENGTH / 2;
      sun.position.set(centerX - 14, 24, 14);
      sun.target.position.set(centerX, 0, 0);
    },
    render(time) {
      const snap = latestSnap;
      const carX = snap.x + view.rollout;
      const centerX = carX + CAR_LENGTH / 2;
      obstacle?.animate(time);
      goal?.animate(time);

      const rig = director.frame({ carX, centerX: centerX - view.rollout * ROLLOUT_FRAMING, obstacleX: snap.obstacleX, snap, time, eye: view.vehicleMeta.eye ?? [3.4, 1.3] }, time);
      const hasGlare = rig.beams === false;
      headlight.intensity = headlightIntensity(view.crash.level, hasGlare);
      bloom.strength = hasGlare ? themeBloom * GLARE_BLOOM_FACTOR : themeBloom;
      environment.update(centerX, camera.position, time);

      if (bloomEnabled) composer.render();
      else renderer.render(scene, camera);
    },
  };

  view.crash = createCrash(view);
  view.setScenery('city');
  view.setVehicle('sedan');
  view.setObstacle('barrier');
  view.setGoal(NO_GOAL);
  view.resize();
  return view;
}
