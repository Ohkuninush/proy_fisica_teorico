export const VIEWS = [
  { id: 'side', name: 'Lateral', emoji: '🎥', desc: 'Cámara fija de costado', swatch: 'linear-gradient(135deg,#1d2b53,#4a6fa5)' },
  { id: 'cinematic', name: 'Cinematográfica', emoji: '🎬', desc: 'Travelling bajo y toma del impacto', swatch: 'linear-gradient(135deg,#3b1d4a,#e0457b)' },
  { id: 'aerial', name: 'Aérea', emoji: '🚁', desc: 'Desde lo alto, en diagonal', swatch: 'linear-gradient(135deg,#0f3b57,#4cc9f0)' },
  { id: 'top', name: 'Cenital', emoji: '🛰️', desc: 'Directo desde arriba', swatch: 'linear-gradient(135deg,#14213d,#7a8cff)' },
  { id: 'chase', name: 'Persecución', emoji: '🏎️', desc: 'Detrás del vehículo', swatch: 'linear-gradient(135deg,#3a2a12,#ffb703)' },
  { id: 'driver', name: 'Primera persona', emoji: '👁️', desc: 'Desde el frente del vehículo', swatch: 'linear-gradient(135deg,#1c3a2a,#b8f35a)' },
  { id: 'zoom', name: 'Zoom al impacto', emoji: '🔎', desc: 'Desde el obstáculo, con zoom', swatch: 'linear-gradient(135deg,#4a1428,#f72585)' },
];

export const SCENERIES = [
  { id: 'city', name: 'Ciudad al atardecer', emoji: '🌆', swatch: 'linear-gradient(180deg,#2a1b5c 0%,#b5468f 55%,#ff8a4c 100%)' },
  { id: 'sunny', name: 'Día soleado', emoji: '☀️', swatch: 'linear-gradient(180deg,#2f7be0 0%,#8cc6f5 60%,#5aa63c 61%,#3f8a2e 100%)' },
  { id: 'forest', name: 'Bosque', emoji: '🌲', swatch: 'linear-gradient(180deg,#86b3a4 0%,#cfe5d2 45%,#1f5e3a 46%,#16402a 100%)' },
  { id: 'mountains', name: 'Montañas', emoji: '🏔️', swatch: 'linear-gradient(180deg,#2f5fa8 0%,#c7d8ee 55%,#7e8aa5 56%,#4a5d52 100%)' },
  { id: 'beach', name: 'Playa', emoji: '🏖️', swatch: 'linear-gradient(180deg,#3aa0ee 0%,#ffe7c2 40%,#1fb5d4 41%,#18a0c0 62%,#e6cf9a 63%)' },
];

export const VEHICLES = [
  { id: 'sedan', name: 'Carro', color: '#e5484d' },
  { id: 'sport', name: 'Deportivo', color: '#ffd23f' },
  { id: 'moto', name: 'Moto', color: '#ff7a1a' },
  { id: 'pickup', name: 'Camioneta', color: '#2ec4b6' },
  { id: 'tank', name: 'Tanque', color: '#6b7f3a' },
];

export const OBSTACLES = [
  { id: 'barrier', name: 'Barrera de concreto' },
  { id: 'wall', name: 'Muro de ladrillos' },
  { id: 'container', name: 'Contenedor' },
  { id: 'rock', name: 'Roca' },
  { id: 'truck', name: 'Camión detenido' },
  { id: 'tree', name: 'Árbol' },
];

export const NO_GOAL = 'none';

export const GOALS = [
  { id: NO_GOAL, name: 'Sin meta', emoji: '🚧', desc: 'El vehículo choca', swatch: 'linear-gradient(135deg,#2a2a35,#5a5a6e)' },
  { id: 'checkered', name: 'Cuadros clásica', emoji: '🏁', desc: 'Arco con bandera a cuadros', swatch: 'linear-gradient(135deg,#f5f5f5,#101018)' },
  { id: 'inflatable', name: 'Arco inflable', emoji: '🎈', desc: 'Arco de maratón', swatch: 'linear-gradient(135deg,#e5384a,#2f6df0)' },
  { id: 'neon', name: 'Neón futurista', emoji: '⚡', desc: 'Portal de luz', swatch: 'linear-gradient(135deg,#00e5ff,#ff3cdc)' },
  { id: 'ribbon', name: 'Cinta de llegada', emoji: '🎀', desc: 'Se rompe al cruzar', swatch: 'linear-gradient(135deg,#e5384a,#ffffff)' },
];

export const DEFAULT_VISUALS = Object.freeze({ view: 'side', scenery: 'city', vehicle: 'sedan', obstacle: 'barrier', goal: NO_GOAL, color: '#e5484d' });

const has = (list, id) => list.some((o) => o.id === id);
const HEX = /^#[0-9a-fA-F]{6}$/;

export function normalizeVisuals(input) {
  const v = input && typeof input === 'object' ? input : {};
  return {
    view: has(VIEWS, v.view) ? v.view : DEFAULT_VISUALS.view,
    scenery: has(SCENERIES, v.scenery) ? v.scenery : DEFAULT_VISUALS.scenery,
    vehicle: has(VEHICLES, v.vehicle) ? v.vehicle : DEFAULT_VISUALS.vehicle,
    obstacle: has(OBSTACLES, v.obstacle) ? v.obstacle : DEFAULT_VISUALS.obstacle,
    goal: has(GOALS, v.goal) ? v.goal : DEFAULT_VISUALS.goal,
    color: typeof v.color === 'string' && HEX.test(v.color) ? v.color : DEFAULT_VISUALS.color,
  };
}

export const defaultColorFor = (vehicleId) => VEHICLES.find((v) => v.id === vehicleId)?.color ?? DEFAULT_VISUALS.color;

export const hasGoal = (visuals) => Boolean(visuals?.goal) && visuals.goal !== NO_GOAL;
