# PhysicsLab 3D

Laboratorio virtual de física en el navegador. Simula un vehículo que avanza en línea recta con **MRU** (velocidad constante) o **MRUV** (aceleración constante) hacia un **obstáculo** o una **meta**, y muestra en tiempo real su posición, velocidad y aceleración en una escena 3D, con indicadores y gráficas. Cada prueba se guarda en un historial y puede exportarse como reporte PDF.

Stack: Vite · Three.js · Chart.js · jsPDF · Vitest (JavaScript con módulos ES, sin frameworks de UI).

## Cómo ponerlo a funcionar

### En Windows (recomendado)

1. Abre `dev-panel.bat`.
2. Elige **5. Instalar dependencias**. Instala Node.js LTS (con winget), los paquetes del proyecto y `devtunnel`. Si lo omites, se ejecuta solo la primera vez que inicies el servidor.
3. Elige **1. Iniciar y abrir**. El navegador abre la aplicación en http://localhost:5190.

### En cualquier sistema

Requiere Node.js 20 o superior y npm.

```bash
npm install
npm run dev
```

Abre la dirección que muestra la consola (por defecto http://localhost:5173).

## Cómo usarla

1. Elige el modelo: **MRU** o **MRUV**.
2. Ingresa posición inicial, velocidad inicial, aceleración (solo MRUV), duración y distancia al obstáculo o a la meta. La aplicación avisa si con esos datos el vehículo nunca llegaría y bloquea el inicio.
3. Pulsa **Iniciar**. Puedes pausar, reiniciar o volver a los valores predeterminados.
4. Abre **Visuales** para cambiar paisaje, vehículo y color, obstáculo, meta y ángulo de cámara.
5. Al terminar, la prueba queda en **Revisar Historial**, donde puedes renombrarla y comentarla. **Exportar Reportes** genera un PDF con indicadores, condiciones y gráficas.

## Qué incluye

- Dos modelos de movimiento con validación y chequeo de factibilidad antes de iniciar.
- Indicadores en vivo y tres gráficas: posición, velocidad y aceleración contra el tiempo.
- Cinco paisajes, cinco vehículos con color personalizable, seis obstáculos y siete ángulos de cámara.
- Daño visual del choque en cinco niveles según la velocidad de impacto.
- Cuatro metas (cuadros, arco inflable, neón y cinta) que sustituyen al obstáculo: el vehículo cruza la línea, frena y se celebra con confeti.
- Historial persistente y reportes PDF con los textos adaptados a obstáculo o meta.

## Compartir la aplicación con un enlace

Con el servidor iniciado, en `dev-panel.bat` elige **6. Crear tunel y compartir enlace**. Se crea un túnel de [Dev Tunnels](https://learn.microsoft.com/azure/developer/dev-tunnels/) (`*.devtunnels.ms`) y el enlace queda copiado en el portapapeles. La primera vez pide iniciar sesión. Cualquiera con el enlace puede abrir la aplicación mientras el túnel siga activo.

Opciones del panel: 1 iniciar, 2 reiniciar, 3 cerrar servidor, 4 ejecutar pruebas, 5 instalar dependencias, 6 crear túnel, 7 ver o copiar el enlace, 8 cerrar túnel, 9 salir. El panel usa el puerto 5190 para no chocar con otros proyectos.

## Comandos

```bash
npm install       # instala las dependencias
npm run dev       # servidor de desarrollo
npm test          # pruebas automatizadas (Vitest)
npm run build     # build de producción en dist/
npm run preview   # sirve el build de producción
```

## Estructura

```
index.html              estructura de la página (paneles, HUD, cajones y diálogo)
dev-panel.bat / .ps1    panel de consola para Windows
vite.config.js          configuración de Vite (hosts permitidos para el túnel)
src/
  main.js               raíz de composición: crea los módulos y los conecta
  app/                  conexión entre módulos (dashboard, controles, historial, visuales)
  physics/              ecuaciones, validación, colisión y factibilidad (sin DOM ni Three.js)
  sim/                  ciclo de vida del experimento y tiempo simulado
  history/              almacén de pruebas guardadas
  visuals/              catálogo de opciones, regla de daño y preferencias guardadas
  render/               escena Three.js: cámara, entorno, vehículos, obstáculos, metas, efectos y choque
  report/               series de datos, gráficas para impresión y generación del PDF
  ui/                   componentes de interfaz (formulario, gráficas, paneles, diálogos)
  styles/               hojas de estilo por componente (index.css las importa en orden)
  storage.js            lectura y escritura segura de localStorage
tests/                  pruebas por módulo
```

## Principios de diseño

- **El motor físico no conoce la vista.** `physics/` calcula posición, velocidad, aceleración e instante de llegada; `render/`, `ui/` y `report/` solo leen esos resultados.
- **Una sola fuente de verdad.** Indicadores, gráficas, historial y PDF salen de `physics/experiment.js`. Los reportes recalculan sus series con el mismo motor a partir de los parámetros guardados.
- **El tiempo simulado no depende del render.** `sim/controller.js` acumula tiempo con un tope por fotograma.
- **Todo lo visual después de la llegada es cosmético.** Abolladuras, piezas sueltas, fuego, confeti y el avance del vehículo tras la meta ocurren con la física ya detenida.

Convención de coordenadas: `x` es el extremo trasero del vehículo (largo 4.2 m); el frente es `x + 4.2`. La distancia al obstáculo o a la meta es la separación inicial entre el frente y la cara del obstáculo o la línea de meta.

## Cómo ampliar

| Quiero agregar | Dónde |
|---|---|
| Un vehículo | `render/vehicles/` (modelo y `crash(api)`), entrada en `visuals/catalog.js` y su resistencia en `visuals/damage.js` |
| Un obstáculo | `render/obstacles/` (modelo y `crash(api)`) y entrada en `visuals/catalog.js` |
| Una meta | `render/goals/` (modelo con `animate`, `celebrate`, `tick` y `reset` opcionales), registro en `render/goals/index.js` y entrada en `visuals/catalog.js` |
| Un paisaje | tema en `render/environment/themes.js` y entrada en `visuals/catalog.js` |
| Un ángulo de cámara | rig en `render/cameraRigs.js` y entrada en `visuals/catalog.js` |
| Un efecto visual | archivo en `render/effects/` y registro en `render/effects/index.js` |
| Un modelo de movimiento | `physics/motion.js`, `physics/params.js` y `physics/feasibility.js` |

Los vehículos y obstáculos reciben un objeto `api` al chocar (ver `render/crash/index.js`) con el nivel de daño (1 a 5), la fuerza del impacto y utilidades para soltar piezas, emitir humo o fuego y provocar una explosión. Los niveles se definen en `visuals/damage.js`.

## Limitaciones

- La física modela un único obstáculo o meta fijos; no hay fuerzas ni deformaciones físicas, solo representación visual.
- Cada fotograma avanza como máximo 0.05 s en las animaciones y 0.1 s en el tiempo simulado, para evitar saltos tras pausas del navegador.
- Con distancias grandes el obstáculo o la meta quedan fuera de cuadro en las vistas lateral, aérea y cenital.
