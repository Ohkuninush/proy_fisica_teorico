import * as THREE from 'three';
import { softDotTexture } from '../textures.js';

const DOME_RADIUS = 320;
const STAR_COUNT = 260;
const STAR_RADIUS = 300;
const CLOUD_COUNT = 14;
const CLOUD_LOOP = 700;

const VERTEX_SHADER = 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} ';

const FRAGMENT_SHADER = `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP;
  void main(){
    float h = clamp(vP.y, 0.0, 1.0);
    vec3 c = mix(bottom, mid, smoothstep(0.0, 0.22, h));
    c = mix(c, top, smoothstep(0.18, 0.75, h));
    gl_FragColor = vec4(c, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

function createDome() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color() },
      mid: { value: new THREE.Color() },
      bottom: { value: new THREE.Color() },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(DOME_RADIUS, 32, 20), material);
  dome.renderOrder = -10;
  return { dome, colors: material.uniforms };
}

function createSun() {
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, toneMapped: false });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 48), material);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDotTexture(), blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  return { disc, halo };
}

function createStars() {
  const positions = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const height = 0.25 + Math.random() * 0.75;
    const ring = Math.sqrt(1 - height * height);
    positions.set([Math.cos(angle) * ring * STAR_RADIUS, height * STAR_RADIUS, Math.sin(angle) * ring * STAR_RADIUS], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ size: 1.6, color: 0xcfd8ff, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 });
  return new THREE.Points(geometry, material);
}

function createClouds() {
  const texture = softDotTexture();
  return Array.from({ length: CLOUD_COUNT }, (_, i) => {
    const material = new THREE.SpriteMaterial({ map: texture, color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false, fog: false });
    const cloud = new THREE.Sprite(material);
    cloud.scale.set(90 + (i % 3) * 30, 30 + (i % 2) * 12, 1);
    cloud.userData = { seed: i, y: 55 + (i % 4) * 17, z: -(150 + (i % 3) * 45) };
    return cloud;
  });
}

export function createSky(scene) {
  const { dome, colors } = createDome();
  const { disc, halo } = createSun();
  const stars = createStars();
  const clouds = createClouds();
  const cloudGroup = new THREE.Group();
  cloudGroup.add(...clouds);

  const group = new THREE.Group();
  group.add(dome, disc, halo, stars, cloudGroup);
  scene.add(group);

  return {
    group,
    applyTheme(theme) {
      colors.top.value.set(theme.sky.top);
      colors.mid.value.set(theme.sky.mid);
      colors.bottom.value.set(theme.sky.bottom);
      disc.position.set(...theme.disc.pos);
      disc.scale.setScalar(theme.disc.r);
      disc.material.color.setRGB(...theme.disc.color);
      halo.position.set(theme.disc.pos[0], theme.disc.pos[1], theme.disc.pos[2] + 2);
      halo.scale.set(theme.disc.r * 10, theme.disc.r * 10, 1);
      halo.material.color.set(theme.disc.halo);
      halo.material.opacity = theme.disc.haloOpacity;
      stars.visible = Boolean(theme.stars);
      cloudGroup.visible = Boolean(theme.clouds);
    },
    update(centerX, time) {
      clouds.forEach((cloud) => {
        const { seed, y, z } = cloud.userData;
        const drift = seed * 97 - centerX * 0.03 + time * 1.2;
        cloud.position.set((((drift % CLOUD_LOOP) + CLOUD_LOOP) % CLOUD_LOOP) - CLOUD_LOOP / 2, y, z);
      });
    },
  };
}
