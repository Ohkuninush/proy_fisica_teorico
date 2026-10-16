// Three.js view. Reads snapshots only; contains no physics.
import * as THREE from 'three';
import { CAR_LENGTH } from '../physics/params.js';

const DASH_SPACING = 6;
const DASH_COUNT = 20;
const CAM_BACK = 6; // camera sits this many m behind the car center line target

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1220);
  scene.fog = new THREE.Fog(0x0b1220, 60, 220);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(-10, 20, 15);
  scene.add(sun);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 10),
    new THREE.MeshLambertMaterial({ color: 0x2b2f38 }),
  );
  road.rotation.x = -Math.PI / 2;
  scene.add(road);

  const dashes = [];
  const dashGeo = new THREE.PlaneGeometry(2.5, 0.2);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xe8e8e8 });
  for (let i = 0; i < DASH_COUNT; i++) {
    const d = new THREE.Mesh(dashGeo, dashMat);
    d.rotation.x = -Math.PI / 2;
    d.position.y = 0.01;
    scene.add(d);
    dashes.push(d);
  }

  const car = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xe5484d });
  const body = new THREE.Mesh(new THREE.BoxGeometry(CAR_LENGTH, 0.9, 1.9), bodyMat);
  body.position.set(CAR_LENGTH / 2, 0.75, 0);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(CAR_LENGTH * 0.5, 0.7, 1.7),
    new THREE.MeshLambertMaterial({ color: 0x9ec5e8 }),
  );
  cabin.position.set(CAR_LENGTH * 0.45, 1.5, 0);
  car.add(body, cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 14);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (const wx of [0.8, CAR_LENGTH - 0.8]) {
    for (const wz of [-0.95, 0.95]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.x = Math.PI / 2;
      w.position.set(wx, 0.4, wz);
      car.add(w);
    }
  }
  scene.add(car);

  const obstacle = new THREE.Mesh(
    new THREE.BoxGeometry(1, 3, 6),
    new THREE.MeshLambertMaterial({ color: 0xf5a524 }),
  );
  obstacle.position.y = 1.5;
  scene.add(obstacle);

  // World group that effects may attach to.
  const api = {
    scene,
    camera,
    car,
    obstacle,
    setCarColor(hex) {
      bodyMat.color.set(hex);
    },
    resize() {
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    /** Map physical snapshot -> visuals. Car x is the rear; obstacle x is its face. */
    update(snap) {
      car.position.x = snap.x;
      obstacle.position.x = snap.obstacleX + 0.5;
      const cx = snap.x + CAR_LENGTH / 2;
      camera.position.set(cx + 3, 3.2, 17);
      camera.lookAt(cx + 3, 1.2, 0);
      road.position.x = cx;
      const base = Math.floor(cx / DASH_SPACING) * DASH_SPACING;
      dashes.forEach((d, i) => {
        d.position.x = base + (i - DASH_COUNT / 2) * DASH_SPACING;
      });
      renderer.render(scene, camera);
    },
  };
  api.resize();
  return api;
}
