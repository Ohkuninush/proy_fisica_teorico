import { CAR_LENGTH } from '../physics/params.js';
import { createTrack } from '../physics/track.js';

// Traduce posiciones de la física (medidas a lo largo de la pista) a coordenadas
// de la escena: X horizontal, Y altura y la inclinación del vehículo.

const keyOf = (p) => `${p.track ?? 'flat'}|${p.slope}|${p.gap}|${p.x0}`;

export function createTrackView() {
  let key = null;
  let params = null;
  let track = null;

  function sync(next) {
    const nextKey = keyOf(next);
    if (nextKey === key) return false;
    key = nextKey;
    params = next;
    track = createTrack(next);
    return true;
  }

  // u: coordenada de camino (0 = frente del vehículo al inicio).
  const worldAt = (u) => {
    const { s, h } = track.pointAt(u);
    return { x: params.x0 + CAR_LENGTH + s, y: h };
  };

  // pathX: posición física del extremo trasero del vehículo.
  function carPose(pathX) {
    const front = pathX - params.x0;
    const rear = worldAt(front - CAR_LENGTH);
    const nose = worldAt(front);
    const pitch = Math.atan2(nose.y - rear.y, nose.x - rear.x);
    return { x: rear.x, y: rear.y, pitch, centerX: (rear.x + nose.x) / 2, centerY: (rear.y + nose.y) / 2 };
  }

  return {
    sync,
    get track() {
      return track;
    },
    get params() {
      return params;
    },
    worldAt,
    carPose,
    obstacleX: () => worldAt(params.gap).x,
  };
}
