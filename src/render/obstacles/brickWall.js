import * as THREE from 'three';
import { byLevel, rnd } from '../math.js';
import { addMesh, drawnTexture, randomSpin, standardMaterial } from './shared.js';

const HEIGHT = 2.8;
const BRICK_ROWS = 8;

function paintBricks(context, width, height) {
  context.fillStyle = '#6b3b2e';
  context.fillRect(0, 0, width, height);
  const rowHeight = height / BRICK_ROWS;
  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let column = -1; column < 4; column++) {
      const offset = row % 2 ? width / 8 : 0;
      context.fillStyle = `hsl(${12 + Math.random() * 10} 55% ${30 + Math.random() * 10}%)`;
      context.fillRect(column * (width / 4) + offset + 2, row * rowHeight + 2, width / 4 - 4, rowHeight - 4);
    }
  }
}

export function buildBrickWall() {
  const group = new THREE.Group();
  const bricksMaterial = (texture) => standardMaterial(0xffffff, { map: texture, roughness: 0.95 });
  const face = bricksMaterial(drawnTexture(256, 256, paintBricks, [2, 1.12]));
  const side = bricksMaterial(drawnTexture(256, 256, paintBricks, [0.4, 1.12]));
  const plain = standardMaterial(0x8a4a3a);

  const wall = addMesh(group, new THREE.BoxGeometry(1, HEIGHT, 5), [plain, face, plain, plain, side, side], [0.5, HEIGHT / 2, 0]);
  const cap = addMesh(group, new THREE.BoxGeometry(1.15, 0.22, 5.15), standardMaterial(0x3a3d46), [0.5, HEIGHT + 0.11, 0]);

  const brickMaterials = [0x8a3f2a, 0x9c4a31, 0x7a3626].map((color) => standardMaterial(color, { roughness: 0.95 }));
  const brickGeometry = new THREE.BoxGeometry(0.42, 0.2, 0.22);

  return {
    group,
    animate() {},
    crash(api) {
      const { level, force } = api;
      const collapses = level >= 3;
      api.dust(api.world(group, 0, 1.2, 0), byLevel([6, 14, 40, 70, 110], level));

      for (let i = 0; i < byLevel([4, 10, 45, 80, 120], level); i++) {
        const origin = api.world(group, rnd(0, 1), collapses ? rnd(0.2, HEIGHT) : rnd(HEIGHT - 0.7, HEIGHT), rnd(-2.5, 2.5));
        api.piece(brickGeometry, brickMaterials[i % 3], origin, {
          vel: [rnd(0.5, 5) * force * (0.4 + level * 0.25), rnd(0, 4) + 1, rnd(-2.5, 2.5) * (0.5 + level * 0.2)],
          spin: randomSpin(6),
          r: 0.1,
        });
      }
      if (collapses) {
        wall.visible = false;
        api.detach(cap, { vel: [4 * force, 5, rnd(-2, 2)], spin: randomSpin(4), r: 0.1 });
      }
      return { slide: byLevel([0, 0.05, 0, 0, 0], level) };
    },
  };
}
