import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OBSTACLES, VEHICLES } from '../visuals/catalog.js';
import { createObstacle } from './obstacles/index.js';
import { createVehicle } from './vehicles/index.js';

const SIZE = 240;
const FIELD_OF_VIEW = 30;
const VIEW_DIRECTION = new THREE.Vector3(0.5, 0.28, 1).normalize();

function frameObject(camera, object) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const radius = box.getSize(new THREE.Vector3()).length() / 2;
  const distance = (radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.02;
  camera.position.copy(center).addScaledVector(VIEW_DIRECTION, distance);
  camera.lookAt(center);
  camera.near = distance / 20;
  camera.far = distance * 4;
  camera.updateProjectionMatrix();
}

function createStudio() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(SIZE, SIZE, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.4;
  const keyLight = new THREE.DirectionalLight(0xfff0dd, 2.0);
  keyLight.position.set(4, 8, 6);
  scene.add(new THREE.HemisphereLight(0xcfd8ff, 0x2a2438, 0.7), keyLight);

  const camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW, 1, 0.1, 100);

  return {
    photograph(object) {
      const sprites = [];
      object.traverse((node) => node.isSprite && sprites.push(node));
      sprites.forEach((sprite) => sprite.parent.remove(sprite));
      scene.add(object);
      frameObject(camera, object);
      renderer.render(scene, camera);
      const url = canvas.toDataURL('image/png');
      scene.remove(object);
      return url;
    },
    close() {
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

export function renderThumbnails() {
  const studio = createStudio();
  const thumbnails = { vehicles: {}, obstacles: {} };

  VEHICLES.forEach(({ id, color }) => {
    const vehicle = createVehicle(id);
    vehicle.setColor(color);
    vehicle.group.children.filter((child) => child.material?.transparent).forEach((child) => vehicle.group.remove(child));
    thumbnails.vehicles[id] = studio.photograph(vehicle.group);
    vehicle.dispose();
  });
  OBSTACLES.forEach(({ id }) => {
    const obstacle = createObstacle(id);
    thumbnails.obstacles[id] = studio.photograph(obstacle.group);
    obstacle.dispose();
  });

  studio.close();
  return thumbnails;
}
