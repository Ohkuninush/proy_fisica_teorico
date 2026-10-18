import * as THREE from 'three';
import { clamp, smooth } from '../math.js';
import { addMesh, drawnTexture, standardMaterial } from '../obstacles/shared.js';
import { finishStrip, labelTexture, POST_Z } from './shared.js';

const RIBBON_Y = 1.3;
const RIBBON_LENGTH = POST_Z;
const SNAP_S = 0.45;
const DROOP = 1.35;
const FLUTTER_SPEED = 3;
const FLUTTER_SIZE = 0.03;

function stripedTexture() {
  return drawnTexture(256, 64, (ctx, w, h) => {
    ctx.fillStyle = '#e5384a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    for (let x = -h; x < w; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + 24, h);
      ctx.lineTo(x + 24 + h, 0);
      ctx.lineTo(x + h, 0);
      ctx.fill();
    }
  }, [4, 1]);
}

export function buildRibbon() {
  const group = new THREE.Group();
  const pole = standardMaterial(0xf0f0f0, { roughness: 0.4 });
  const ribbonMaterial = new THREE.MeshStandardMaterial({ map: stripedTexture(), roughness: 0.5, side: THREE.DoubleSide });
  const board = new THREE.MeshStandardMaterial({ map: labelTexture('META', { background: '#e5384a' }), roughness: 0.6, side: THREE.DoubleSide });

  finishStrip(group, standardMaterial(0xffffff, { roughness: 0.8, opacity: 0.85, transparent: true }));

  const pivots = [-POST_Z, POST_Z].map((z) => {
    addMesh(group, new THREE.CylinderGeometry(0.13, 0.15, 3.4, 12), pole, [0, 1.7, z]);
    const sign = addMesh(group, new THREE.PlaneGeometry(2.6, 0.9), board, [0, 3.9, z]);
    sign.rotation.y = Math.PI / 2;

    const pivot = new THREE.Group();
    pivot.position.set(0, RIBBON_Y, z);
    const half = new THREE.Mesh(new THREE.PlaneGeometry(RIBBON_LENGTH, 0.4), ribbonMaterial);
    half.rotation.y = Math.PI / 2;
    half.position.z = (-Math.sign(z) * RIBBON_LENGTH) / 2;
    half.castShadow = true;
    pivot.add(half);
    group.add(pivot);
    return { pivot, direction: Math.sign(z) };
  });

  let snapAge = Infinity;

  return {
    group,
    animate(time) {
      const droop = DROOP * smooth(clamp(snapAge / SNAP_S, 0, 1));
      const flutter = snapAge === Infinity ? Math.sin(time * FLUTTER_SPEED) * FLUTTER_SIZE : 0;
      pivots.forEach(({ pivot, direction }) => {
        pivot.rotation.x = -direction * droop + flutter;
      });
    },
    celebrate() {
      snapAge = 0;
    },
    tick(dt) {
      if (snapAge !== Infinity) snapAge += dt;
    },
    reset() {
      snapAge = Infinity;
    },
  };
}
