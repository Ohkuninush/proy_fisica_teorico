import * as THREE from 'three';
import { projectileSummary, stateAtProjectile } from '../../physics/projectile.js';
import { LANE_Z } from '../environment/constants.js';
import { clamp } from '../math.js';
import { softDotTexture } from '../textures.js';

// Escena de caída libre y lanzamientos: edificio de altura h0, pelota, trayectoria
// prevista (punteada), estela recorrida, marcas de altura máxima y de impacto.
//
// La física pone el origen en el punto de lanzamiento (x = 0, y = h0 sobre el
// suelo). En la escena, la pelota sale justo delante de la fachada: su centro
// está en (ORIGIN_X + x, y + radio).

const BALL_RADIUS = 0.35;
const ORIGIN_X = BALL_RADIUS + 0.08;
const BUILDING_WIDTH = 8;
const BUILDING_DEPTH = 7;
const FLOOR_HEIGHT = 3.2;
const PATH_POINTS = 160;
const PATH_DOTS = 48;
const RING_LIFETIME_S = 0.9;
const LABEL_SCALE = 0.03;
// A más distancia de cámara, la pelota y la estela se dibujan más grandes para seguir viéndose.
const VISUAL_SCALE_DISTANCE = 22;

// Fachada clara de concreto con ventanas, para distinguir el edificio del fondo.
function concreteTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  g.fillStyle = '#cfd5e2';
  g.fillRect(0, 0, 128, 256);
  for (let y = 10; y < 256; y += 32) {
    g.fillStyle = '#9aa3b8';
    g.fillRect(0, y + 22, 128, 3);
    for (let x = 8; x < 128; x += 30) {
      g.fillStyle = '#2b3a5c';
      g.fillRect(x, y, 22, 18);
      g.fillStyle = 'rgba(160, 210, 255, 0.35)';
      g.fillRect(x + 2, y + 2, 8, 14);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function textSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 128;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
  sprite.renderOrder = 10;
  let current = null;
  return {
    sprite,
    set(text, color = '#ffffff') {
      if (text === current) return;
      current = text;
      const g = canvas.getContext('2d');
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.font = '600 52px "JetBrains Mono", monospace';
      const width = Math.min(canvas.width - 8, g.measureText(text).width + 48);
      g.fillStyle = 'rgba(8, 12, 26, 0.78)';
      g.beginPath();
      g.roundRect((canvas.width - width) / 2, 18, width, 92, 24);
      g.fill();
      g.fillStyle = color;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(text, canvas.width / 2, 66);
      texture.needsUpdate = true;
    },
    // Tamaño constante en pantalla: escala con la distancia a la cámara.
    fit(distance) {
      const s = Math.max(1.4, distance * LABEL_SCALE);
      sprite.scale.set(s * 6, s, 1);
    },
  };
}

function lineOf(material, count) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  const line = new THREE.Line(geometry, material);
  line.frustumCulled = false;
  return line;
}

function setPoints(line, points) {
  const attribute = line.geometry.getAttribute('position');
  points.forEach(([x, y, z], i) => attribute.setXYZ(i, x, y, z));
  attribute.needsUpdate = true;
  line.geometry.setDrawRange(0, points.length);
  line.geometry.computeBoundingSphere();
  if (line.material.isLineDashedMaterial) line.computeLineDistances();
}

function createBuilding() {
  const facade = concreteTexture();
  const material = new THREE.MeshStandardMaterial({ map: facade, roughness: 0.85, metalness: 0.05 });
  const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x4cc9f0, emissive: 0x1a6f8c, roughness: 0.5 });
  const tower = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  tower.castShadow = tower.receiveShadow = true;
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(BUILDING_WIDTH + 0.4, 0.3, BUILDING_DEPTH + 0.4), roofMaterial);
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.9, BUILDING_DEPTH), roofMaterial);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1, 0.12, 24), new THREE.MeshStandardMaterial({ color: 0xffb703, roughness: 0.6 }));
  const group = new THREE.Group();
  group.add(tower, ledge, parapet, pad);

  return {
    group,
    setHeight(h0) {
      const raised = h0 > 0.3;
      tower.visible = ledge.visible = parapet.visible = raised;
      pad.visible = !raised;
      if (raised) {
        tower.scale.set(BUILDING_WIDTH, h0, BUILDING_DEPTH);
        tower.position.set(-BUILDING_WIDTH / 2, h0 / 2, LANE_Z);
        facade.repeat.set(2, Math.max(1, h0 / (FLOOR_HEIGHT * 8)));
        ledge.position.set(-BUILDING_WIDTH / 2, h0 - 0.15, LANE_Z);
        // Baranda en el borde trasero de la azotea (no estorba la salida de la pelota).
        parapet.position.set(-BUILDING_WIDTH + 0.2, h0 + 0.45, LANE_Z);
      } else {
        pad.position.set(ORIGIN_X, 0.06, LANE_Z);
      }
    },
  };
}

export function createProjectileScene(scene) {
  const root = new THREE.Group();
  root.visible = false;
  scene.add(root);

  const building = createBuilding();
  root.add(building.group);

  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_RADIUS, 32, 20),
    new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.45, metalness: 0.05, emissive: 0xff5a00, emissiveIntensity: 0.55 }),
  );
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDotTexture(), color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7 }));
  halo.scale.setScalar(BALL_RADIUS * 6);
  ball.add(halo);
  ball.castShadow = true;
  const seam = new THREE.Mesh(new THREE.TorusGeometry(BALL_RADIUS * 1.002, 0.025, 8, 40), new THREE.MeshBasicMaterial({ color: 0x1a1a22 }));
  ball.add(seam);
  root.add(ball);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: softDotTexture(), color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  root.add(shadow);

  // Trayectoria prevista: puntos blancos; estela recorrida: tubo celeste.
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }), PATH_DOTS);
  dots.frustumCulled = false;
  const trailMaterial = new THREE.MeshBasicMaterial({ color: 0x4cc9f0, toneMapped: false });
  const trail = new THREE.Mesh(new THREE.BufferGeometry(), trailMaterial);
  trail.frustumCulled = false;
  const predicted = dots;
  const peakGuide = lineOf(new THREE.LineDashedMaterial({ color: 0xb8f35a, dashSize: 0.4, gapSize: 0.3 }), 2);
  root.add(predicted, trail, peakGuide);

  const landing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.85, 40), new THREE.MeshBasicMaterial({ color: 0xf72585, transparent: true, opacity: 0.85, depthWrite: false }));
  landing.rotation.x = -Math.PI / 2;
  const burst = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
  burst.rotation.x = -Math.PI / 2;
  root.add(landing, burst);

  const labels = { h0: textSprite(), peak: textSprite(), range: textSprite() };
  Object.values(labels).forEach((label) => root.add(label.sprite));

  let key = null;
  let params = null;
  let summary = null;
  let path = [];
  let landedAt = null;
  let bounds = { xMin: -BUILDING_WIDTH, xMax: 10, yMax: 10 };
  let visualScale = 1;
  let trailKey = '';

  function placeDots() {
    const matrix = new THREE.Matrix4();
    const radius = 0.07 * visualScale;
    for (let i = 0; i < PATH_DOTS; i++) {
      const [x, y, z] = path[Math.round((i * (PATH_POINTS - 1)) / (PATH_DOTS - 1))];
      matrix.makeScale(radius, radius, radius).setPosition(x, y, z);
      dots.setMatrixAt(i, matrix);
    }
    dots.instanceMatrix.needsUpdate = true;
  }

  function buildTrail(points) {
    trail.geometry.dispose();
    if (points.length < 2) {
      trail.geometry = new THREE.BufferGeometry();
      return;
    }
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, 'centripetal');
    trail.geometry = new THREE.TubeGeometry(curve, Math.min(200, points.length * 2), 0.06 * visualScale, 6, false);
  }

  const world = (x, y) => [ORIGIN_X + x, y + BALL_RADIUS, LANE_Z];

  function build(next) {
    params = next;
    summary = projectileSummary(next);
    building.setHeight(next.h0);
    path = Array.from({ length: PATH_POINTS }, (_, i) => {
      const s = stateAtProjectile(next, (summary.tFlight * i) / (PATH_POINTS - 1));
      return world(s.x, Math.max(0, s.y));
    });
    placeDots();
    trailKey = '';

    const peakX = ORIGIN_X + summary.xPeak;
    const rises = summary.tPeak > 0;
    peakGuide.visible = labels.peak.sprite.visible = rises;
    if (rises) setPoints(peakGuide, [[peakX, 0.05, LANE_Z], [peakX, summary.hMax + BALL_RADIUS, LANE_Z]]);
    labels.peak.set(`h máx = ${summary.hMax.toFixed(2)} m`, '#b8f35a');
    labels.peak.sprite.position.set(peakX, summary.hMax + BALL_RADIUS + 2.2, LANE_Z);

    labels.h0.sprite.visible = next.h0 > 0.3;
    labels.h0.set(`h₀ = ${next.h0.toFixed(1)} m`, '#4cc9f0');
    labels.h0.sprite.position.set(-BUILDING_WIDTH / 2, next.h0 + 2.4, LANE_Z);

    const rangeX = ORIGIN_X + summary.range;
    landing.position.set(rangeX, 0.03, LANE_Z);
    labels.range.set(summary.range > 1e-6 ? `alcance = ${summary.range.toFixed(2)} m` : `t vuelo = ${summary.tFlight.toFixed(2)} s`, '#ff7ac8');
    labels.range.sprite.position.set(rangeX, 1.8, LANE_Z + 1.5);

    bounds = {
      xMin: -BUILDING_WIDTH - 2,
      xMax: Math.max(rangeX, ORIGIN_X + 6) + 4,
      yMax: Math.max(summary.hMax, next.h0) + 5,
    };
  }

  return {
    root,
    get bounds() {
      return bounds;
    },
    get ball() {
      return ball;
    },
    setVisible(visible) {
      root.visible = visible;
    },
    update(snap) {
      const nextKey = JSON.stringify(snap.params);
      if (nextKey !== key) {
        key = nextKey;
        build(snap.params);
      }
      const [bx, rawY, bz] = world(snap.x, Math.max(0, snap.y));
      // Con la pelota agrandada, su centro se eleva para que siga apoyándose en el suelo.
      const by = rawY + BALL_RADIUS * (visualScale - 1);
      ball.position.set(bx, by, bz);
      ball.scale.setScalar(visualScale);
      // Rueda en el aire según lo avanzado; la costura muestra el giro.
      ball.rotation.z = -(snap.x + Math.abs(snap.y - params.h0) * 0.6) / BALL_RADIUS;

      const height = Math.max(0, snap.y);
      shadow.position.set(bx, 0.025, bz);
      shadow.scale.setScalar(clamp(1.3 + height * 0.06, 1.3, 4));
      shadow.material.opacity = clamp(0.55 - height * 0.012, 0.12, 0.55);

      // Estela: puntos de la trayectoria ya recorridos más la posición actual.
      const fraction = summary.tFlight > 0 ? clamp(snap.t / summary.tFlight, 0, 1) : 0;
      const done = Math.floor(fraction * (PATH_POINTS - 1));
      const nextTrail = `${done}|${snap.t.toFixed(3)}|${visualScale.toFixed(2)}`;
      if (nextTrail !== trailKey) {
        trailKey = nextTrail;
        const head = [bx, rawY, bz];
        const points = path.slice(0, done + 1);
        const last = points.at(-1);
        if (!last || Math.hypot(head[0] - last[0], head[1] - last[1]) > 1e-3) points.push(head);
        buildTrail(snap.t > 0 ? points : []);
      }

      landedAt = snap.impact ? landedAt ?? performance.now() / 1000 : null;
      landing.material.opacity = snap.impact ? 1 : 0.55;
    },
    animate(time, cameraDistance) {
      Object.values(labels).forEach((label) => label.fit(cameraDistance));
      const scale = Math.max(1, cameraDistance / VISUAL_SCALE_DISTANCE);
      if (Math.abs(scale - visualScale) > 0.05) {
        visualScale = scale;
        if (path.length) placeDots();
        trailKey = '';
      }
      const age = landedAt === null ? Infinity : performance.now() / 1000 - landedAt;
      const k = clamp(age / RING_LIFETIME_S, 0, 1);
      burst.visible = age < RING_LIFETIME_S;
      burst.position.copy(landing.position);
      burst.position.y = 0.04;
      burst.scale.setScalar(1 + k * 5);
      burst.material.opacity = 0.9 * (1 - k);
      landing.scale.setScalar(1 + 0.08 * Math.sin(time * 4));
    },
  };
}

// Cámara que encuadra todo el lanzamiento (edificio, trayectoria e impacto).
export function framingPose(bounds, aspect, fovDeg) {
  const { xMin, xMax, yMax } = bounds;
  const halfW = ((xMax - xMin) / 2) * 1.12;
  const halfH = (yMax / 2) * 1.18;
  const tan = Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2);
  const distance = Math.max(halfH / tan, halfW / (tan * Math.max(aspect, 0.3)), 14);
  const cx = (xMin + xMax) / 2;
  const cy = yMax / 2;
  return {
    pos: new THREE.Vector3(cx, cy + distance * 0.06, LANE_Z + distance),
    look: new THREE.Vector3(cx, cy, LANE_Z),
    distance,
  };
}

// Cámara que sigue de cerca a la pelota.
export function followPose(ball, bounds) {
  const p = ball.position;
  const distance = 16;
  return {
    pos: new THREE.Vector3(p.x - 4, Math.max(p.y + 2.5, 2), LANE_Z + distance),
    look: new THREE.Vector3(p.x + 2, Math.max(p.y, 1), LANE_Z),
    distance: Math.max(distance, bounds.yMax * 0.2),
  };
}
