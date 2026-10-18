import * as THREE from 'three';
import { drawnTexture } from '../obstacles/shared.js';

export const POST_Z = 7;
export const ROAD_SPAN = POST_Z * 2;

export function checkerTexture(columns, rows, cell, repeat = [1, 1]) {
  return drawnTexture(columns * cell, rows * cell, (ctx) => {
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        ctx.fillStyle = (row + column) % 2 ? '#101018' : '#f5f5f5';
        ctx.fillRect(column * cell, row * cell, cell, cell);
      }
    }
  }, repeat);
}

export function labelTexture(text, { background, color = '#ffffff', width = 512, height = 160 }) {
  return drawnTexture(width, height, (ctx, w, h) => {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = color;
    ctx.font = `800 ${Math.round(h * 0.62)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + h * 0.04);
  }, [1, 1]);
}

export function finishStrip(group, material) {
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(1.6, ROAD_SPAN - 1.4), material);
  strip.rotation.x = -Math.PI / 2;
  strip.position.set(0, 0.045, 0);
  strip.receiveShadow = true;
  group.add(strip);
  return strip;
}
