# Tareo · Sistema de gestión de tareas con TypeScript y Vite

Aplicación web para organizar tareas personales, de estudio y de trabajo. Está construida con **TypeScript estricto**, **Vite**, **HTML5 semántico** y **CSS3 puro**, sin frameworks de interfaz. Las tareas se guardan en el navegador mediante `localStorage`.

**Repositorio:** https://github.com/YamiLinares/sistema-gestion-tareas-typescript-vite

## Objetivo

Actividad académica *Sistema de Gestión de Tareas con TypeScript y Vite*. El proyecto demuestra:

- un modelo de datos tipado;
- validación;
- una capa de persistencia separada de la interfaz;
- manipulación segura del DOM;
- una interfaz accesible y responsive sin bibliotecas de UI.

## Características

- **Crear tareas** con título (obligatorio), descripción (opcional), categoría y prioridad. El estado inicial es *pendiente* y cada tarea recibe un id único (`crypto.randomUUID`) y su fecha de creación.
- **Validación** junto a cada campo:
  - el título no puede estar vacío ni tener solo espacios, y admite hasta 100 caracteres;
  - la descripción admite hasta 500 caracteres;
  - la categoría y la prioridad deben ser valores permitidos.
- **Editar tareas.** El formulario recupera los valores actuales y conserva el id y la fecha de creación; la fecha de modificación se actualiza. El modo edición se distingue con el distintivo «Editando», el borde naranja y el botón «Guardar cambios».
- **Eliminar con confirmación.** Un diálogo accesible pone el foco inicial en «Cancelar» para evitar eliminaciones accidentales. Escape también cancela.
- **Completar y reabrir.** Las tareas completadas se muestran tachadas, con fondo atenuado y la etiqueta «Completada», y los contadores se actualizan.
- **Resumen** de tareas totales, pendientes y completadas, con barra de progreso.
- **Búsqueda por título** sin distinguir mayúsculas ni acentos.
- **Filtros de estado** (todas, pendientes, completadas) y **de prioridad** (todas, baja, media, alta). Se combinan con la búsqueda.
- **Limpiar filtros** con un botón. Los filtros solo cambian lo que se muestra, nunca los datos.
- **Estados vacíos diferenciados:** «todavía no hay tareas» y «no hay coincidencias».
- **Orden útil:** primero las pendientes; dentro de cada grupo, la prioridad más alta y luego la más reciente.
- **Persistencia automática** tras crear, editar, completar, reabrir o eliminar.
- **Errores de almacenamiento:** se manejan los datos corruptos o incompatibles, la falta de espacio y el almacenamiento bloqueado.
- **Notificaciones accesibles** (`role="status"` o `role="alert"`) en lugar de `alert()`.
- **Tareas de ejemplo opcionales:** un botón que solo aparece con la lista vacía. Nunca se cargan en silencio.
- **Accesibilidad:**
  - `<dialog>` nativo, con el foco atrapado y devuelto al cerrar;
  - etiquetas en todos los campos y nombres accesibles en los botones de icono;
  - foco visible, enlace para saltar al contenido y `prefers-reduced-motion`.
- **Seguridad:** el contenido del usuario se inserta solo con `textContent`, nunca con `innerHTML`.

## Tecnologías

| Herramienta | Versión utilizada | Uso |
| --- | --- | --- |
| TypeScript | 6.0.3 | Lenguaje (con `strict` y comprobaciones adicionales) |
| Vite | 8.3.5 | Servidor de desarrollo y compilación |
| ESLint + typescript-eslint | 10.13.0 / 8.72.0 | Lint con reglas `strictTypeChecked` |
| Vitest | 5.0.5 | Pruebas unitarias |
| HTML5, CSS3, `localStorage` | — | Interfaz y persistencia |

Todas son dependencias de desarrollo; la aplicación compilada no tiene dependencias en tiempo de ejecución. TypeScript está fijado en `~6.0.3` porque `typescript-eslint` 8.72 admite TypeScript `< 6.1`.

## Requisitos previos

- Node.js 20.19 o superior (probado con Node.js 24.16) y npm.
- Un navegador moderno (Edge, Chrome, Firefox o Safari).
- Opcional, para `npm run test:e2e`: Microsoft Edge o Google Chrome.

## Instalación (Windows PowerShell)

```powershell
git clone https://github.com/YamiLinares/sistema-gestion-tareas-typescript-vite.git
cd sistema-gestion-tareas-typescript-vite
npm install
```

## Ejecución y scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en http://localhost:5173/ |
| `npm run build` | Comprueba los tipos y compila para producción en `dist/` |
| `npm run preview` | Sirve la compilación de producción en http://localhost:4173/ |
| `npm run typecheck` | Comprobación de tipos con `tsc --noEmit` |
| `npm run lint` | ESLint sobre todo el proyecto |
| `npm test` | Pruebas unitarias con Vitest |
| `npm run verify` | `typecheck` + `lint` + `test` + `build` |
| `npm run test:e2e -- http://localhost:4173/` | Pruebas funcionales en un navegador real (requiere `npm run preview` en otra terminal) |

## Estructura

```text
sistema-gestion-tareas-typescript-vite/
├── index.html                  # Estructura semántica, formularios y diálogos
├── public/favicon.svg
├── scripts/e2e-browser.mjs     # Pruebas funcionales en Edge/Chrome (DevTools Protocol)
├── src/
│   ├── main.ts                 # Punto de entrada: estilos + inicialización
│   ├── app.ts                  # Orquestador: conecta datos e interfaz
│   ├── types/task.ts           # Modelo Task, tipos, etiquetas y límites
│   ├── services/
│   │   ├── task-storage.ts     # Único acceso a localStorage (lectura/escritura segura)
│   │   └── task-store.ts       # Estado y operaciones transaccionales
│   ├── components/
│   │   ├── task-form.ts        # Formulario de creación/edición en <dialog>
│   │   ├── task-list.ts        # Lista, estados vacíos y delegación de eventos
│   │   ├── task-card.ts        # Tarjeta de una tarea
│   │   ├── task-filters.ts     # Búsqueda y filtros
│   │   ├── task-stats.ts       # Resumen y progreso
│   │   ├── confirmation-dialog.ts
│   │   ├── toaster.ts          # Notificaciones
│   │   └── icons.ts            # Iconos SVG sin dependencias
│   ├── utils/
│   │   ├── validation.ts       # Validación del formulario y de los datos guardados
│   │   ├── task-query.ts       # Filtros, búsqueda, orden y contadores (funciones puras)
│   │   ├── dom.ts              # Creación segura de elementos
│   │   ├── id.ts · date.ts
│   ├── data/demo-tasks.ts      # Tareas de ejemplo opcionales
│   └── styles/                 # variables.css, base.css, layout.css, components.css
├── tests/                      # Pruebas unitarias (Vitest)
├── eslint.config.js · tsconfig.json · vite.config.ts
└── package.json
```

## Modelo de datos

```ts
type TaskPriority = "low" | "medium" | "high";
type TaskCategory = "personal" | "study" | "work" | "other";
type TaskStatus = "pending" | "completed";

interface Task {
  id: string;                 // único e inmutable
  title: string;              // 1–100 caracteres
  description: string;        // 0–500 caracteres
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string;          // ISO 8601
  updatedAt: string;          // ISO 8601, cambia al editar, completar o reabrir
  completedAt: string | null; // fecha de finalización o null
}
```

En la interfaz, las etiquetas se muestran en español: Baja/Media/Alta, Personal/Estudio/Trabajo/Otros, Pendiente/Completada.

## Cómo funciona `localStorage`

- **Clave:** `task-manager-tasks-v1`.
- **Formato:** `JSON.stringify({ version: 1, tasks: [...] })`.
- **Acceso centralizado** en `src/services/task-storage.ts`. Ningún otro módulo usa `localStorage`.
- **Al iniciar** se lee la clave y se valida cada tarea con `isTask`:
  - sin datos, la lista empieza vacía;
  - con JSON inválido o una estructura incompatible, se guarda una copia en `task-manager-tasks-v1-backup`, la aplicación arranca vacía y lo avisa;
  - si hay registros inválidos o duplicados, se recuperan las tareas válidas y se informa cuántos se omitieron.
- **Al guardar**, las operaciones son **transaccionales**. Si `setItem` falla (por ejemplo, `QuotaExceededError`), el cambio no se aplica y se muestra el motivo. El formulario conserva los datos para reintentar.
- **Almacenamiento bloqueado** (algunos modos privados): la aplicación funciona solo en memoria, con un aviso permanente. Las notificaciones indican que los cambios no se guardarán.
- Los datos persisten al recargar o cerrar el navegador **mientras no se borren los datos del sitio**. Son locales de este navegador y no se sincronizan entre dispositivos.

## Cómo probar las funcionalidades

1. `npm run dev` y abre http://localhost:5173/.
2. Con la lista vacía verás el estado inicial. Pulsa **Crear mi primera tarea** o **Cargar tareas de ejemplo**.
3. **Validación:** pulsa **Nueva tarea** y luego **Crear tarea** sin título. Aparece «Escribe un título para la tarea».
4. **Crear:** escribe un título, elige categoría y prioridad y guarda. Se muestra la notificación «Tarea creada correctamente».
5. **Editar:** usa el icono del lápiz. El formulario aparece en modo «Editando» con los datos actuales.
6. **Completar o reabrir:** usa el círculo a la izquierda del título.
7. **Eliminar:** usa el icono de la papelera. Prueba primero **Cancelar** y después **Eliminar tarea**.
8. **Buscar y filtrar:** escribe en «Buscar por título» y combina **Estado** y **Prioridad**. **Limpiar filtros** restablece la vista.
9. **Persistencia:** recarga la página (F5). Las tareas siguen ahí.
10. **Inspeccionar los datos:** abre las DevTools (F12) y ve a **Aplicación** (Application) → **Almacenamiento local**. Ahí está la clave `task-manager-tasks-v1`.
11. **Datos corruptos:** en la consola de DevTools ejecuta `localStorage.setItem("task-manager-tasks-v1", "{malo")` y recarga. La aplicación avisa y arranca vacía.

## Pruebas y resultados verificados

- `npm run typecheck`: sin errores.
- `npm run lint`: sin errores ni advertencias (`strictTypeChecked` + `stylisticTypeChecked`).
- `npm test`: **43 pruebas aprobadas** en 4 archivos:
  - `validation`: título vacío o largo, valores inválidos y validación de datos guardados;
  - `task-query`: búsqueda, filtros combinados, orden, contadores e inmutabilidad;
  - `task-storage`: guardado y carga, vacío, JSON corrupto, estructura incompatible, registros inválidos, falta de espacio y almacenamiento no disponible;
  - `task-store`: crear, editar conservando id y `createdAt`, completar, reabrir, eliminar, ids inexistentes, rollback ante errores de guardado, modo en memoria y recarga.
- `npm run build`: compilación correcta.
- `npm run test:e2e`: **42 comprobaciones aprobadas** en Microsoft Edge sin interfaz, contra `npm run preview`. Cubren los 16 escenarios pedidos, más:
  - navegación con teclado (Escape cierra el formulario y el foco vuelve al botón que lo abrió);
  - una regresión de los diálogos (reabrir el formulario de inmediato no lo vacía);
  - ausencia de desbordamiento horizontal y tamaño táctil de los botones a 375, 768 y 1440 px;
  - consola sin errores.
  Las capturas se guardan en `e2e-output/`, que no se sube al repositorio.

## Limitaciones conocidas

- Los datos viven solo en el navegador y el dispositivo actuales. Borrar los datos del sitio elimina las tareas.
- No hay sincronización entre pestañas abiertas al mismo tiempo: la última que guarda prevalece.
- El modelo no incluye fechas de vencimiento ni etiquetas personalizadas, porque la actividad no las pedía.
- `npm run test:e2e` necesita Edge o Chrome instalados. Si están en otra ruta, define `$env:BROWSER_PATH`.
