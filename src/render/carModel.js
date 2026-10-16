// Car + obstacle visuals. Pure presentation: swap this file to change the models.
// Car origin is the rear bumper; the front is at CAR_LENGTH (+x).
import * as THREE from 'three';
import { CAR_LENGTH } from '../physics/params.js';
import { hazardTexture, softDotTexture } from './textures.js';

const WHEEL_R = 0.38;
const WHEEL_XS = [0.85, 3.4];
const WHEEL_Z = 0.9;
const BODY_DEPTH = 1.7;

function bodyShape() {
  const s = new THREE.Shape();
  s.moveTo(0.1, 0.38);
  s.lineTo(0.0, 0.8);
  s.quadraticCurveTo(0.1, 0.97, 0.6, 1.0);
  s.lineTo(1.35, 1.03);
  s.quadraticCurveTo(1.55, 1.08, 1.8, 1.42);
  s.quadraticCurveTo(1.95, 1.56, 2.3, 1.56);
  s.lineTo(2.75, 1.54);
  s.quadraticCurveTo(3.05, 1.5, 3.35, 1.05);
  s.lineTo(3.85, 0.95);
  s.quadraticCurveTo(4.15, 0.9, 4.18, 0.7);
  s.lineTo(4.18, 0.5);
  s.quadraticCurveTo(4.15, 0.38, 4.05, 0.38);
  s.lineTo(WHEEL_XS[1] + 0.47, 0.38);
  s.absarc(WHEEL_XS[1], 0.38, 0.47, 0, Math.PI, false);
  s.lineTo(WHEEL_XS[0] + 0.47, 0.38);
  s.absarc(WHEEL_XS[0], 0.38, 0.47, 0, Math.PI, false);
  s.lineTo(0.1, 0.38);
  return s;
}

function glassShape(x0, x1, y0, y1, slant0, slant1) {
  const s = new THREE.Shape();
  s.moveTo(x0, y0);
  s.lineTo(x0 + slant0, y1);
  s.lineTo(x1 - slant1, y1);
  s.lineTo(x1, y0);
  s.closePath();
  return s;
}

export function createCar() {
  const car = new THREE.Group();
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0xe5484d, metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });
  const bevel = { depth: BODY_DEPTH, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 4, curveSegments: 16 };

  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(bodyShape(), bevel), bodyMat);
  body.position.z = -BODY_DEPTH / 2;
  body.castShadow = true;
  car.add(body);

  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0a1020, metalness: 0.9, roughness: 0.05, clearcoat: 1 });
  const glassOpts = { depth: BODY_DEPTH + 0.1, bevelEnabled: false };
  for (const shape of [glassShape(1.62, 2.52, 1.08, 1.5, 0.3, 0.05), glassShape(2.62, 3.22, 1.08, 1.5, 0.06, 0.4)]) {
    const glass = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, glassOpts), glassMat);
    glass.position.z = -(BODY_DEPTH + 0.1) / 2;
    car.add(glass);
  }

  const under = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.5, 1.4), new THREE.MeshStandardMaterial({ color: 0x07080c, roughness: 1 }));
  under.position.set(2.1, 0.55, 0);
  car.add(under);

  // Wheels
  const wheels = [];
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xcfd6e4, metalness: 1, roughness: 0.25 });
  const tireGeo = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.3, 28).rotateX(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.32, 24).rotateX(Math.PI / 2);
  const spokeGeo = new THREE.BoxGeometry(0.46, 0.05, 0.34);
  for (const wx of WHEEL_XS) {
    for (const wz of [-WHEEL_Z, WHEEL_Z]) {
      const w = new THREE.Group();
      w.position.set(wx, WHEEL_R, wz);
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      w.add(tire, new THREE.Mesh(rimGeo, rimMat));
      for (let i = 0; i < 5; i++) {
        const sp = new THREE.Mesh(spokeGeo, rimMat);
        sp.rotation.z = (i * Math.PI * 2) / 5;
        w.add(sp);
      }
      car.add(w);
      wheels.push(w);
    }
  }

  // Lights
  const headMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.8, 2.2), toneMapped: false });
  const tailMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.15, 0.2), toneMapped: false });
  for (const z of [-0.62, 0.62]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.38), headMat);
    h.position.set(CAR_LENGTH + 0.1, 0.72, z);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.42), tailMat);
    t.position.set(-0.08, 0.84, z);
    car.add(h, t);
  }
  const spot = new THREE.SpotLight(0xfff0d0, 900, 55, 0.5, 0.7, 1.6);
  spot.position.set(CAR_LENGTH, 0.75, 0);
  spot.target.position.set(CAR_LENGTH + 10, 0.2, 0);
  car.add(spot, spot.target);

  // Soft shadow blob + underglow
  const dot = softDotTexture();
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(CAR_LENGTH + 2, 3),
    new THREE.MeshBasicMaterial({ map: dot, color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.set(CAR_LENGTH / 2, 0.02, 0);
  const glowMat = new THREE.MeshBasicMaterial({ map: dot, color: 0xe5484d, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(CAR_LENGTH + 1.2, 2.6), glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(CAR_LENGTH / 2, 0.035, 0);
  car.add(blob, glow);

  return {
    group: car,
    setColor(hex) {
      bodyMat.color.set(hex);
      glowMat.color.set(hex);
    },
    /** Visual-only: rolling angle from distance, body pitch from acceleration. */
    pose(x, a) {
      const ang = -x / WHEEL_R;
      wheels.forEach((w) => (w.rotation.z = ang));
      body.rotation.z = THREE.MathUtils.clamp(a * 0.0025, -0.03, 0.03);
    },
  };
}

export function createObstacle() {
  const g = new THREE.Group();
  const tex = hazardTexture();
  const stripes = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0x8c92a0, roughness: 0.95 });
  tex.repeat.set(1, 1);

  const h = 2.6;
  const block = new THREE.Mesh(new THREE.BoxGeometry(1, h, 5), [concrete, stripes, concrete, concrete, stripes, stripes]);
  block.position.y = h / 2;
  block.castShadow = true;
  block.receiveShadow = true;
  g.add(block);

  const cap = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 5.2), new THREE.MeshStandardMaterial({ color: 0xb8bdc9, roughness: 0.8 }));
  cap.position.y = h + 0.09;
  g.add(cap);

  const beaconMat = (c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
  const beacons = [-1.8, 1.8].map((z, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), beaconMat(i ? 0xff2a2a : 0xff8a1a));
    m.position.set(0, h + 0.38, z);
    g.add(m);
    return m;
  });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDotTexture(), color: 0xff3b2a, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 }));
  halo.scale.set(5, 5, 1);
  halo.position.set(0, h + 0.4, 0);
  g.add(halo);

  return {
    group: g,
    animate(t) {
      const on = Math.sin(t * 7) > 0;
      beacons[0].visible = on;
      beacons[1].visible = !on;
      halo.material.opacity = 0.35 + 0.5 * Math.abs(Math.sin(t * 3.5));
    },
  };
}
