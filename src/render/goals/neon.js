import * as THREE from 'three';
import { addMesh, drawnTexture, emissiveMaterial, standardMaterial } from '../obstacles/shared.js';
import { finishStrip, POST_Z, ROAD_SPAN } from './shared.js';

const PILLAR_HEIGHT = 7;
const CURTAIN_HEIGHT = 6.6;
const CURTAIN_IDLE_OPACITY = 0.1;
const CURTAIN_FLASH_OPACITY = 0.6;
const FLASH_DECAY_S = 1.5;
const SCROLL_SPEED = 0.18;
const PULSE_SPEED = 3;

function curtainTexture() {
  return drawnTexture(64, 256, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, 'rgba(0,255,240,0)');
    gradient.addColorStop(0.5, 'rgba(120,200,255,1)');
    gradient.addColorStop(1, 'rgba(255,60,220,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    for (let y = 0; y < h; y += 16) ctx.fillRect(0, y, w, 8);
  }, [1, 1]);
}

export function buildNeon() {
  const group = new THREE.Group();
  const dark = standardMaterial(0x14141f, { roughness: 0.4, metalness: 0.6 });
  const cyan = emissiveMaterial(0.2, 2.6, 2.8);
  const magenta = emissiveMaterial(2.8, 0.3, 2.2);

  const line = finishStrip(group, emissiveMaterial(2.4, 2.4, 2.8));
  line.scale.x = 0.3;

  [[-POST_Z, cyan], [POST_Z, magenta]].forEach(([z, glow]) => {
    addMesh(group, new THREE.BoxGeometry(0.5, PILLAR_HEIGHT, 0.5), dark, [0, PILLAR_HEIGHT / 2, z]);
    addMesh(group, new THREE.BoxGeometry(0.58, PILLAR_HEIGHT, 0.1), glow, [0, PILLAR_HEIGHT / 2, z - Math.sign(z) * 0.28]);
  });
  addMesh(group, new THREE.BoxGeometry(0.4, 0.3, ROAD_SPAN / 2), cyan, [0, PILLAR_HEIGHT + 0.15, -ROAD_SPAN / 4]);
  addMesh(group, new THREE.BoxGeometry(0.4, 0.3, ROAD_SPAN / 2), magenta, [0, PILLAR_HEIGHT + 0.15, ROAD_SPAN / 4]);

  const curtainMaterial = new THREE.MeshBasicMaterial({
    map: curtainTexture(),
    transparent: true,
    opacity: CURTAIN_IDLE_OPACITY,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const curtain = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_SPAN, CURTAIN_HEIGHT), curtainMaterial);
  curtain.rotation.y = Math.PI / 2;
  curtain.position.y = CURTAIN_HEIGHT / 2;
  group.add(curtain);

  let flash = 0;

  return {
    group,
    animate(time) {
      curtainMaterial.map.offset.y = -time * SCROLL_SPEED;
      const idle = CURTAIN_IDLE_OPACITY + 0.04 * Math.sin(time * PULSE_SPEED);
      curtainMaterial.opacity = idle + (CURTAIN_FLASH_OPACITY - CURTAIN_IDLE_OPACITY) * flash;
    },
    celebrate() {
      flash = 1;
    },
    tick(dt) {
      flash = Math.max(0, flash - dt / FLASH_DECAY_S);
    },
    reset() {
      flash = 0;
    },
  };
}
