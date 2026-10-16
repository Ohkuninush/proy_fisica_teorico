import * as THREE from 'three';
import { clamp } from '../math.js';
import { softDotTexture } from '../textures.js';

const FLOOR_Y = 0.03;
const MIN_VIEW_DEPTH = 0.1;

const VERTEX_SHADER = `attribute float aSize; attribute float aAlpha; attribute vec3 aColor; uniform float uScale;
  varying float vA; varying vec3 vC;
  void main(){ vA=aAlpha; vC=aColor; vec4 mv=modelViewMatrix*vec4(position,1.0);
    gl_PointSize = aSize*uScale/max(-mv.z,${MIN_VIEW_DEPTH.toFixed(1)}); gl_Position=projectionMatrix*mv; }`;

const FRAGMENT_SHADER = `uniform sampler2D map; varying float vA; varying vec3 vC;
  void main(){ vec4 t=texture2D(map,gl_PointCoord); gl_FragColor=vec4(vC, t.a*vA); }`;

export function createParticles(view, { max, additive, gravity = 0, drag = 0, grow = 0 }) {
  const positions = new Float32Array(max * 3);
  const colors = new Float32Array(max * 3);
  const sizes = new Float32Array(max);
  const alphas = new Float32Array(max);
  const velocities = new Float32Array(max * 3);
  const lives = new Float32Array(max);
  const lifetimes = new Float32Array(max);
  const initialSizes = new Float32Array(max);
  let cursor = 0;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { map: { value: softDotTexture() }, uScale: { value: 600 } },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  view.scene.add(points);

  return {
    emit(position, velocity, life, size, color) {
      const i = cursor++ % max;
      positions.set(position, i * 3);
      velocities.set(velocity, i * 3);
      lives[i] = lifetimes[i] = life;
      sizes[i] = initialSizes[i] = size;
      colors.set(color, i * 3);
    },
    update(dt) {
      material.uniforms.uScale.value = view.pointScale();
      for (let i = 0; i < max; i++) {
        if (lives[i] <= 0) {
          alphas[i] = 0;
          continue;
        }
        lives[i] -= dt;
        const remaining = clamp(lives[i] / lifetimes[i], 0, 1);
        const x = i * 3;
        const y = x + 1;
        const z = x + 2;
        velocities[y] += gravity * dt;
        const damping = Math.exp(-drag * dt);
        velocities[x] *= damping;
        velocities[y] *= damping;
        velocities[z] *= damping;
        positions[x] += velocities[x] * dt;
        positions[y] = Math.max(FLOOR_Y, positions[y] + velocities[y] * dt);
        positions[z] += velocities[z] * dt;
        alphas[i] = additive ? remaining : remaining * 0.5;
        sizes[i] = initialSizes[i] * (1 + grow * (1 - remaining));
      }
      ['position', 'aSize', 'aAlpha', 'aColor'].forEach((name) => (geometry.attributes[name].needsUpdate = true));
    },
    clear() {
      lives.fill(0);
      alphas.fill(0);
      geometry.attributes.aAlpha.needsUpdate = true;
    },
    setVisible(visible) {
      points.visible = visible;
    },
  };
}
