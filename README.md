# PhysicsLab 3D

Simulación 3D de un automóvil con MRU y MRUV, colisión con obstáculo fijo, indicadores y gráficas (Three.js + Chart.js + Vite + Vitest).

## Requisitos
Node.js 18+ y npm.

## Uso
```bash
npm install
npm run dev     # servidor de desarrollo (http://localhost:5173)
npm test        # pruebas automatizadas
npm run build   # build de producción en dist/
```

## Arquitectura
| Módulo | Responsabilidad |
|---|---|
| `src/physics/` | `params` (defaults, validación, unidades), `motion` (ecuaciones), `collision` (tiempo de impacto), `experiment` (fuente única de verdad). Sin DOM. |
| `src/sim/controller.js` | Ciclo de vida (iniciar/pausar/reanudar/reiniciar), tiempo simulado, historial. |
| `src/render/scene.js` | Escena Three.js; solo lee snapshots. |
| `src/render/effects.js` | Efectos opcionales (estelas, destello); activables sin afectar la física. |
| `src/ui/` | Indicadores, gráficas, estado de controles. |

Convenciones: `x` es la posición del extremo trasero del auto (largo 4.2 m); el frente es `x + 4.2`. «Distancia al obstáculo» es la separación inicial entre el frente y el obstáculo. La velocidad máxima es el máximo de |v| observado.

## Limitaciones
- Sin deformaciones ni fuerzas de impacto; obstáculo fijo.
- Cada fotograma avanza como máximo 0.1 s simulados (evita saltos tras pausas del navegador).
- Si la distancia al obstáculo es grande, éste queda fuera de cámara (la cámara sigue al auto).
