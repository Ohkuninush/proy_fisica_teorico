import * as THREE from 'three';
import { DEBRIS_LIFETIME_S } from '../../visuals/damage.js';
import { disposeObject } from '../dispose.js';
import { clamp, rnd } from '../math.js';

const GRAVITY = 18;
const FADE_S = 1.5;
const RESTING_BOUNCE_SPEED = 1.2;
const GROUND_FRICTION = 3.5;
const GROUND_SPIN_DAMPING = 2.5;
const AIR_SPIN_DAMPING = 0.15;

const materialsOf = (node) => (Array.isArray(node.material) ? node.material : [node.material]);

function makeFadable(object) {
  object.traverse((node) => {
    if (!node.isMesh) return;
    node.material = Array.isArray(node.material) ? node.material.map((m) => m.clone()) : node.material.clone();
    materialsOf(node).forEach((material) => (material.transparent = true));
    node.castShadow = true;
  });
}

function setOpacity(object, opacity) {
  object.traverse((node) => {
    if (node.isMesh) materialsOf(node).forEach((material) => (material.opacity = opacity));
  });
}

export function createDebris(scene) {
  const pieces = [];

  const register = (object, { vel = [0, 0, 0], spin = [0, 0, 0], r = 0.25, rest = 0.35, ownGeometry = true }) => {
    pieces.push({ object, velocity: new THREE.Vector3(...vel), spin: new THREE.Vector3(...spin), radius: r, bounce: rest, ownGeometry });
  };

  function remove(piece) {
    scene.remove(piece.object);
    disposeObject(piece.object, { geometry: piece.ownGeometry, maps: false });
  }

  function step(piece, dt) {
    const { object, velocity, spin } = piece;
    velocity.y -= GRAVITY * dt;
    object.position.addScaledVector(velocity, dt);

    if (object.position.y < piece.radius) {
      object.position.y = piece.radius;
      if (Math.abs(velocity.y) > RESTING_BOUNCE_SPEED) velocity.y *= -piece.bounce;
      else velocity.y = 0;
      const friction = Math.exp(-GROUND_FRICTION * dt);
      velocity.x *= friction;
      velocity.z *= friction;
      spin.multiplyScalar(Math.exp(-GROUND_SPIN_DAMPING * dt));
    } else {
      spin.multiplyScalar(Math.exp(-AIR_SPIN_DAMPING * dt));
    }
    object.rotation.x += spin.x * dt;
    object.rotation.y += spin.y * dt;
    object.rotation.z += spin.z * dt;
  }

  return {
    detach(object, options = {}) {
      object.updateWorldMatrix(true, false);
      makeFadable(object);
      scene.attach(object);
      register(object, { ...options, ownGeometry: false });
    },
    piece(geometry, material, position, options = {}) {
      const mesh = new THREE.Mesh(geometry, material.clone());
      mesh.material.transparent = true;
      mesh.castShadow = true;
      mesh.position.copy(position);
      mesh.rotation.set(rnd(0, 6), rnd(0, 6), rnd(0, 6));
      scene.add(mesh);
      register(mesh, options);
    },
    update(dt, age) {
      const opacity = clamp((DEBRIS_LIFETIME_S - age) / FADE_S, 0, 1);
      for (let i = pieces.length - 1; i >= 0; i--) {
        const piece = pieces[i];
        if (age >= DEBRIS_LIFETIME_S) {
          remove(piece);
          pieces.splice(i, 1);
          continue;
        }
        step(piece, dt);
        if (opacity < 1) setOpacity(piece.object, opacity);
      }
    },
    clear() {
      pieces.forEach(remove);
      pieces.length = 0;
    },
  };
}
