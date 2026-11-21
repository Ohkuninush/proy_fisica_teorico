import * as THREE from 'three';
import { disposeObject } from '../dispose.js';
import { asphaltTexture, hazardTexture } from '../textures.js';
import { LANE_Z } from './constants.js';

const WIDTH = 5.2;
const EDGE_INSET = 0.35;
const RAIL_HEIGHT = 0.9;
const POST_SPACING = 3;
const GROUND_EPS = 1e-6;

function createMaterials() {
  const top = asphaltTexture();
  top.repeat.set(0.12, 0.12);
  const materials = {
    side: new THREE.MeshStandardMaterial({ color: 0x7d838f, roughness: 0.92, metalness: 0.02 }),
    top: new THREE.MeshStandardMaterial({ map: top, color: 0x9aa0ad, roughness: 0.85, metalness: 0.05 }),
    edge: new THREE.MeshBasicMaterial({ color: 0xf2f2f2 }),
    rail: new THREE.MeshStandardMaterial({ color: 0xc9ced8, roughness: 0.4, metalness: 0.7 }),
    hazard: new THREE.MeshStandardMaterial({ map: hazardTexture(), roughness: 0.7 }),
  };
  materials.hazard.map.repeat.set(1, 5);
  return materials;
}

function elevatedBlocks(points) {
  const blocks = [];
  let current = null;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const next = points[i + 1];
    const raised = p.y > GROUND_EPS || (next && next.y > GROUND_EPS);
    if (raised) {
      if (!current) current = [];
      current.push(p);
    } else if (current) {
      current.push(p);
      blocks.push(current);
      current = null;
    }
  }
  if (current) blocks.push(current);
  return blocks.filter((block) => block.length > 1);
}

function blockMesh(block, materials) {
  const shape = new THREE.Shape();
  shape.moveTo(block[0].x, 0);
  block.slice(1).forEach((p) => shape.lineTo(p.x, Math.max(p.y, 0)));
  if (block.at(-1).y > GROUND_EPS) shape.lineTo(block.at(-1).x, 0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: WIDTH, bevelEnabled: false });
  const mesh = new THREE.Mesh(geometry, [materials.side, materials.top]);
  mesh.position.z = LANE_Z - WIDTH / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function alongSegment(a, b, geometryFor, material, y, z) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  const mesh = new THREE.Mesh(geometryFor(length), material);
  mesh.position.set((a.x + b.x) / 2, (a.y + b.y) / 2 + y, z);
  mesh.rotation.z = Math.atan2(dy, dx);
  return mesh;
}

function decorate(group, block, materials) {
  for (let i = 0; i < block.length - 1; i++) {
    const a = block[i];
    const b = block[i + 1];
    for (const side of [-1, 1]) {
      const edgeZ = LANE_Z + side * (WIDTH / 2 - EDGE_INSET);
      group.add(alongSegment(a, b, (length) => new THREE.BoxGeometry(length, 0.02, 0.16), materials.edge, 0.012, edgeZ));
      if (Math.max(a.y, b.y) < 1) continue;
      const railZ = LANE_Z + side * (WIDTH / 2 - 0.08);
      group.add(alongSegment(a, b, (length) => new THREE.BoxGeometry(length, 0.08, 0.08), materials.rail, RAIL_HEIGHT, railZ));
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const count = Math.max(1, Math.floor(Math.hypot(dx, dy) / POST_SPACING));
      for (let k = 0; k <= count; k++) {
        const f = k / count;
        const y = a.y + dy * f;
        if (y < 0.6) continue;
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, RAIL_HEIGHT, 0.08), materials.rail);
        post.position.set(a.x + dx * f, y + RAIL_HEIGHT / 2, railZ);
        group.add(post);
      }
    }
  }
  for (const [p, q] of [[block[0], block[1]], [block.at(-1), block.at(-2)]]) {
    const direction = Math.sign(q.x - p.x) || 1;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, WIDTH), materials.hazard);
    strip.position.set(p.x - direction * 0.5, 0.02, LANE_Z);
    strip.receiveShadow = true;
    group.add(strip);
  }
}

export function createRamps(scene) {
  const materials = createMaterials();
  const root = new THREE.Group();
  scene.add(root);

  function clear() {
    root.children.slice().forEach((child) => {
      root.remove(child);
      child.geometry?.dispose();
    });
  }

  return {
    setVisible(visible) {
      root.visible = visible;
    },
    build(trackView) {
      clear();
      const { segments } = trackView.track;
      if (!segments.length) return;
      const points = [trackView.worldAt(segments[0].u0), ...segments.map((seg) => trackView.worldAt(seg.u1))];
      elevatedBlocks(points).forEach((block) => {
        root.add(blockMesh(block, materials));
        decorate(root, block, materials);
      });
    },
    dispose() {
      clear();
      scene.remove(root);
      disposeObject(root);
      Object.values(materials).forEach((material) => {
        material.map?.dispose();
        material.dispose();
      });
    },
  };
}
