// Optional visual effects. Read-only consumers of snapshots; they never touch physics.
import * as THREE from 'three';

/** Speed streaks: thin lines whose horizontal offset follows car position. */
function speedStreaks(view) {
  const count = 24;
  const group = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
  const lines = [];
  for (let i = 0; i < count; i++) {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)]);
    const l = new THREE.Line(geo, mat);
    l.userData = { offset: Math.random() * 60, y: 0.5 + Math.random() * 4, z: -4 + Math.random() * 8 };
    group.add(l);
    lines.push(l);
  }
  view.scene.add(group);
  return {
    name: 'speed-streaks',
    update(snap) {
      const speed = Math.abs(snap.v);
      lines.forEach((l) => {
        const { offset, y, z } = l.userData;
        const ahead = (((offset - snap.x) % 60) + 60) % 60; // world-fixed, wraps around the car
        l.position.set(snap.x - 10 + ahead, y, z);
        l.scale.x = Math.min(speed * 0.15, 8);
        l.visible = speed > 1;
      });
    },
    dispose() {
      view.scene.remove(group);
      group.traverse((o) => o.geometry?.dispose());
      mat.dispose();
    },
  };
}

/** Impact flash: a short-lived light at the obstacle when a collision is registered. */
function impactFlash(view) {
  const light = new THREE.PointLight(0xffa040, 0, 25);
  view.scene.add(light);
  return {
    name: 'impact-flash',
    update(snap) {
      light.position.set(snap.obstacleX, 2, 2);
      light.intensity = snap.impact ? 60 : 0;
    },
    dispose() {
      view.scene.remove(light);
    },
  };
}

export function createEffectsManager(view, factories = [speedStreaks, impactFlash]) {
  let enabled = true;
  const effects = factories.map((make) => make(view));
  return {
    register(make) {
      effects.push(make(view));
    },
    setEnabled(on) {
      enabled = on;
      if (!on) effects.forEach((e) => e.update({ x: 0, v: 0, obstacleX: 0, impact: null }));
    },
    get enabled() {
      return enabled;
    },
    update(snap) {
      if (enabled) effects.forEach((e) => e.update(snap));
    },
  };
}
