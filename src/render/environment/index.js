import { disposeObject } from '../dispose.js';
import { createBackdropLayer } from './backdrop.js';
import { createLamps } from './lamps.js';
import { createLaneDashes, createRoad } from './road.js';
import { createSea } from './sea.js';
import { createSky } from './sky.js';
import { THEMES } from './themes.js';

export { LANE_Z } from './constants.js';

export function createEnvironment(scene) {
  const sky = createSky(scene);
  const road = createRoad(scene);
  const dashes = createLaneDashes(scene);

  let layers = [];
  let lamps = null;
  let sea = null;

  function clearTheme() {
    layers.forEach((layer) => layer.dispose());
    layers = [];
    if (lamps) {
      scene.remove(lamps.root);
      disposeObject(lamps.root);
      lamps = null;
    }
    if (sea) {
      scene.remove(sea);
      disposeObject(sea);
      sea = null;
    }
  }

  return {
    setTheme(id) {
      const theme = THEMES[id] ?? THEMES.city;
      clearTheme();
      sky.applyTheme(theme);
      road.setGroundColor(theme.ground);
      layers = theme.layers().map((definition) => createBackdropLayer(scene, definition));
      if (theme.lamps) lamps = createLamps(scene);
      if (theme.sea) sea = createSea(scene);
      return theme;
    },
    update(centerX, cameraPosition, time) {
      sky.group.position.copy(cameraPosition);
      sky.update(centerX, time);
      road.update(centerX);
      dashes.update(centerX);
      if (sea) sea.position.x = centerX;
      layers.forEach((layer) => layer.update(centerX));
      lamps?.update(centerX);
    },
  };
}
