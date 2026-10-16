# PhysicsLab 3D

Simulación 3D interactiva de un vehículo con **MRU** y **MRUV** que choca contra un obstáculo fijo. Incluye indicadores en vivo, gráficas, historial de pruebas, reportes PDF, varios paisajes, vehículos, obstáculos y ángulos de cámara, y daño visual según la velocidad de impacto.

Stack: Vite · Three.js · Chart.js · jsPDF · Vitest (JavaScript con módulos ES, sin frameworks de UI).

## Requisitos

Node.js 18+ y npm.

## Comandos

```bash
npm install
npm run dev       # servidor de desarrollo en http://localhost:5173
npm test          # pruebas automatizadas (Vitest)
npm run build     # build de producción en dist/
```

En Windows, `dev-panel.bat` abre un panel de consola para iniciar, reiniciar y cerrar el servidor o ejecutar las pruebas.

## Estructura

```
index.html              estructura de la página (paneles, HUD, cajones y diálogo)
src/
  main.js               raíz de composición: crea los módulos y los conecta
  app/                  conexión entre módulos (dashboard, controles, historial, visuales)
  physics/              ecuaciones, validación, colisión y factibilidad (sin DOM ni Three.js)
  sim/                  ciclo de vida del experimento y tiempo simulado
  history/              almacén de pruebas guardadas
  visuals/              catálogo de opciones, regla de daño y preferencias guardadas
  render/               escena Three.js: cámara, entorno, vehículos, obstáculos, efectos y choque
  report/               series de datos, gráficas para impresión y generación del PDF
  ui/                   componentes de interfaz (formulario, gráficas, paneles, diálogos)
  styles/               hojas de estilo por componente (index.css las importa en orden)
  storage.js            lectura y escritura segura de localStorage
tests/                  pruebas por módulo
```

## Principios de diseño

- **El motor físico no conoce la vista.** `physics/` calcula posición, velocidad, aceleración e instante de impacto; `render/`, `ui/` y `report/` solo leen esos resultados.
- **Una sola fuente de verdad.** Indicadores, gráficas, historial y PDF salen de `physics/experiment.js`. Los reportes recalculan sus series con el mismo motor a partir de los parámetros guardados.
- **El tiempo simulado no depende del render.** `sim/controller.js` acumula tiempo con un tope por fotograma.
- **Todo lo visual después del choque es cosmético.** Las abolladuras, piezas sueltas, fuego y reacciones del obstáculo ocurren con la física ya detenida.

Convención de coordenadas: `x` es el extremo trasero del vehículo (largo 4.2 m); el frente es `x + 4.2`. La «distancia al obstáculo» es la separación inicial entre el frente y la cara del obstáculo.

## Cómo ampliar

| Quiero agregar | Dónde |
|---|---|
| Un vehículo | `render/vehicles/` (modelo y `crash(api)`), entrada en `visuals/catalog.js` y su resistencia en `visuals/damage.js` |
| Un obstáculo | `render/obstacles/` (modelo y `crash(api)`) y entrada en `visuals/catalog.js` |
| Un paisaje | tema en `render/environment/themes.js` y entrada en `visuals/catalog.js` |
| Un ángulo de cámara | rig en `render/cameraRigs.js` y entrada en `visuals/catalog.js` |
| Un efecto visual | archivo en `render/effects/` y registro en `render/effects/index.js` |
| Un modelo de movimiento | `physics/motion.js`, `physics/params.js` y `physics/feasibility.js` |

Los vehículos y obstáculos reciben un objeto `api` al chocar (ver `render/crash/index.js`) con el nivel de daño (1 a 5), la fuerza del impacto y utilidades para soltar piezas, emitir humo o fuego y provocar una explosión. Los niveles se definen en `visuals/damage.js`.

## Limitaciones

- La física modela un único obstáculo fijo; no hay fuerzas ni deformaciones físicas, solo representación visual.
- Cada fotograma avanza como máximo 0.05 s en las animaciones y 0.1 s en el tiempo simulado, para evitar saltos tras pausas del navegador.
- Con distancias grandes el obstáculo queda fuera de cuadro en las vistas lateral, aérea y cenital.
