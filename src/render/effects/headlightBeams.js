import * as THREE from 'three';
import { CAR_LENGTH } from '../../physics/params.js';

const VERTEX_SHADER = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} ';

const FRAGMENT_SHADER = 'uniform float uOpacity; varying vec2 vUv; void main(){ float f=pow(vUv.y,1.6); gl_FragColor=vec4(1.0,0.93,0.75,f*uOpacity);} ';

export function headlightBeams(view) {
  const geometry = new THREE.ConeGeometry(2.6, 15, 28, 1, true);
  geometry.translate(0, -7.5, 0);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uOpacity: { value: 0.18 } },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
  });
  const beam = new THREE.Mesh(geometry, material);
  beam.rotation.z = Math.PI / 2;
  beam.position.set(CAR_LENGTH + 0.2, 0.75, 0);
  view.car.add(beam);

  return {
    update() {
      material.uniforms.uOpacity.value = view.rig.beams === false ? 0 : view.beam;
    },
    setActive(active) {
      beam.visible = active;
    },
  };
}
