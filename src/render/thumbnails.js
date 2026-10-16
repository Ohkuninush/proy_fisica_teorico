// Renders small PNG previews of the real 3D models (vehicles and obstacles) for the Visuales panel.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createVehicle } from './vehicles.js';
import { createObstacle } from './obstacles.js';
import { VEHICLES, OBSTACLES } from '../visuals/catalog.js';

const SIZE = 240;

function frame(camera, group) {
  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  const radius = box.getSize(new THREE.Vector3()).length() / 2;
  const dist = (radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.02;
  const dir = new THREE.Vector3(0.5, 0.28, 1).normalize();
  camera.position.copy(center).addScaledVector(dir, dist);
  camera.lookAt(center);
  camera.near = dist / 20;
  camera.far = dist * 4;
  camera.updateProjectionMatrix();
}

/** Returns { vehicles: {id: dataURL}, obstacles: {id: dataURL} }. One short-lived WebGL context. */
export function renderThumbnails() {
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
  scene.add(new THREE.HemisphereLight(0xcfd8ff, 0x2a2438, 0.7));
  const key = new THREE.DirectionalLight(0xfff0dd, 2.0);
  key.position.set(4, 8, 6);
  scene.add(key);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  const shoot = (group) => {
    // Sprites (glow halos) would distort the framing and look odd on a transparent background.
    const sprites = [];
    group.traverse((o) => o.isSprite && sprites.push(o));
    sprites.forEach((s) => s.parent.remove(s));
    scene.add(group);
    frame(camera, group);
    renderer.render(scene, camera);
    const url = canvas.toDataURL('image/png');
    scene.remove(group);
    return url;
  };

  const out = { vehicles: {}, obstacles: {} };
  VEHICLES.forEach((v) => {
    const m = createVehicle(v.id);
    m.setColor(v.color);
    // drop the flat shadow/glow planes from the preview
    m.group.children.filter((c) => c.material?.transparent).forEach((c) => m.group.remove(c));
    out.vehicles[v.id] = shoot(m.group);
    m.dispose();
  });
  OBSTACLES.forEach((o) => {
    const m = createObstacle(o.id);
    out.obstacles[o.id] = shoot(m.group);
    m.dispose();
  });

  pmrem.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  return out;
}
