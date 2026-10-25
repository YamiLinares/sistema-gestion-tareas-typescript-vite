#!/usr/bin/env node
/**
 * Pruebas funcionales en un navegador real (Edge o Chrome sin interfaz) mediante
 * el Chrome DevTools Protocol. No necesita dependencias adicionales.
 *
 *   npm run build && npm run preview      (en otra terminal)
 *   npm run test:e2e -- http://localhost:4173/
 *
 * Variable opcional: BROWSER_PATH con la ruta del ejecutable del navegador.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = process.argv[2] ?? "http://localhost:4173/";
const outputDir = join(process.cwd(), "e2e-output");
const STORAGE_KEY = "task-manager-tasks-v1";

const browserPath = [
  process.env.BROWSER_PATH,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((path) => path && existsSync(path));

if (!browserPath) {
  console.error("No se encontró Edge ni Chrome. Define BROWSER_PATH.");
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let failures = 0;
const check = (ok, label, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "OK  " : "FAIL"} ${label}${detail !== "" ? ` — ${detail}` : ""}`);
};

const port = 9500 + Math.floor(Math.random() * 400);
const profile = join(tmpdir(), `tareo-e2e-${port}`);
const browser = spawn(
  browserPath,
  ["--headless=new", `--remote-debugging-port=${port}`, "--disable-gpu", "--no-first-run", `--user-data-dir=${profile}`, "about:blank"],
  { stdio: "ignore" },
);

let target;
for (let attempt = 0; attempt < 60 && !target; attempt++) {
  await sleep(250);
  try {
    target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page");
  } catch {
    /* el navegador aún no está listo */
  }
}

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener("open", resolve));
let nextId = 0;
const pending = new Map();
const consoleErrors = [];
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message.result ?? {});
    pending.delete(message.id);
  } else if (message.method === "Runtime.exceptionThrown") {
    consoleErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
  } else if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
    consoleErrors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(" "));
  }
});
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++nextId;
    pending.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });
const js = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.value;
const waitFor = async (expression, timeout = 5000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await js(expression)) return true;
    await sleep(80);
  }
  return false;
};

// Utilidades que se ejecutan dentro de la página
const PAGE_HELPERS = `
  window.$ = (s, r = document) => r.querySelector(s);
  window.$$ = (s, r = document) => [...r.querySelectorAll(s)];
  window.setValue = (selector, value) => {
    const el = $(selector);
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  window.cardByTitle = (text) => $$('#task-results li').find(li => li.querySelector('.task-card__title').textContent === text);
  window.titles = () => $$('#task-results li .task-card__title').map(h => h.textContent);
  window.stat = (name) => $('[data-stat="' + name + '"]').textContent;
  window.toastText = () => $$('#toaster .toast').map(t => t.textContent).join(' | ');
  window.createTask = (title, category, priority, description = '') => {
    $('#new-task-button').click();
    setValue('#task-title', title);
    setValue('#task-description', description);
    setValue('#task-category', category);
    setValue('#task-priority', priority);
    $('#task-dialog button[type=submit]').click();
  };
`;

/** Crea una tarea desde la interfaz y espera a que aparezca en la lista. */
const createTask = async (title, category, priority, description = "") => {
  await waitFor(`!document.querySelector('#task-dialog').open`);
  await js(`createTask(${JSON.stringify(title)}, '${category}', '${priority}', ${JSON.stringify(description)})`);
  return waitFor(`!!cardByTitle(${JSON.stringify(title)}) && !$('#task-dialog').open`);
};

const load = async (url = baseUrl) => {
  await send("Page.navigate", { url });
  await waitFor(`document.readyState === 'complete' && !!document.querySelector('#task-results')`);
  await sleep(200);
  await js(PAGE_HELPERS);
};

await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

try {
  // 13. Carga sin tareas previas
  await load();
  check(await js(`$('.empty-state__title')?.textContent === 'Tu lista está lista para empezar'`), "13. Sin tareas previas se muestra el estado vacío");
  check((await js(`[stat('total'), stat('pending'), stat('completed')].join()`)) === "0,0,0", "    Contadores en cero");

  // 2. Título vacío
  await js(`$('#new-task-button').click()`);
  check(await js(`$('#task-dialog').open && $('#task-dialog-title').textContent === 'Crear tarea'`), "    El formulario se abre en modo creación");
  await js(`setValue('#task-title', '    '); $('#task-dialog button[type=submit]').click()`);
  check(
    await js(`$('#task-dialog').open && $('[data-error-for=title]').textContent === 'Escribe un título para la tarea.' && $('#task-title').getAttribute('aria-invalid') === 'true'`),
    "2. Se rechaza un título vacío con mensaje junto al campo",
  );
  check(await js(`titles().length === 0`), "    No se creó ninguna tarea inválida");
  await js(`$('#task-dialog [data-action=cancel]').click()`);

  // 1 y 16. Crear tareas válidas (una con contenido HTML)
  const xssTitle = `<img src=x onerror="window.__xss=1"> Estudiar TypeScript`;
  await js(`createTask(${JSON.stringify(xssTitle)}, 'study', 'high', '<script>window.__xss=2<\\/script>')`);
  await sleep(150);
  check(await js(`!$('#task-dialog').open && titles().length === 1`), "1. Se crea una tarea válida y se cierra el formulario");
  check(await js(`toastText().includes('Tarea creada correctamente')`), "    Se muestra una confirmación visual");
  check(await js(`$('#task-dialog').open === false && $('#task-title').value === ''`), "    El formulario queda limpio");
  check(
    await js(`titles()[0] === ${JSON.stringify(xssTitle)} && !$('#task-results img') && !$('#task-results script') && window.__xss === undefined`),
    "16. El HTML introducido se muestra como texto y no se ejecuta",
  );
  const created = [
    await createTask("Informe mensual", "work", "medium"),
    await createTask("Comprar café", "personal", "low"),
    await createTask("Revisar informe anual", "work", "low"),
  ];
  check(created.every(Boolean), "    Se crean tres tareas más");
  check((await js(`stat('total') + '/' + stat('pending')`)) === "4/4", "    Contadores: 4 totales, 4 pendientes");

  // Regresión: abrir la edición justo después de cerrar el formulario no debe vaciarlo
  await js(`$('#new-task-button').click(); $('#task-dialog [data-action=cancel]').click(); cardByTitle('Informe mensual').querySelector('[data-action=edit]').click()`);
  await sleep(200);
  check(await js(`$('#task-dialog').open && $('#task-title').value === 'Informe mensual'`), "    Reabrir el formulario de inmediato conserva los datos de edición");
  await js(`$('#task-dialog [data-action=cancel]').click()`);
  await waitFor(`!$('#task-dialog').open`);
  await sleep(100);

  // 3. Editar conservando el id
  const editId = await js(`cardByTitle('Informe mensual').dataset.taskId`);
  await js(`cardByTitle('Informe mensual').querySelector('[data-action=edit]').click()`);
  check(
    await js(`$('#task-dialog').open && $('#task-dialog').classList.contains('dialog--edit') && $('#task-dialog-title').textContent === 'Editar tarea' && $('#task-title').value === 'Informe mensual' && $('#task-category').value === 'work'`),
    "3. El formulario de edición recupera los valores y se distingue visualmente",
  );
  await js(`setValue('#task-title', 'Informe trimestral'); setValue('#task-priority', 'high'); $('#task-dialog button[type=submit]').click()`);
  await sleep(150);
  check(
    await js(`cardByTitle('Informe trimestral')?.dataset.taskId === ${JSON.stringify(editId)} && !cardByTitle('Informe mensual')`),
    "    Se guarda la edición conservando el identificador",
  );
  check(await js(`cardByTitle('Informe trimestral').textContent.includes('Editada') && cardByTitle('Informe trimestral').textContent.includes('Prioridad alta')`), "    Muestra la fecha de modificación y la nueva prioridad");

  // 6. Completar y reabrir
  const toggle = `cardByTitle('Revisar informe anual').querySelector('[data-action=toggle]').click()`;
  await js(toggle);
  check(
    await js(`cardByTitle('Revisar informe anual').querySelector('.task-card--completed') !== null && stat('completed') === '1'`),
    "6. Se completa una tarea (estilo distinto y contador actualizado)",
  );
  await js(toggle);
  check(await js(`cardByTitle('Revisar informe anual').querySelector('.task-card--completed') === null && stat('completed') === '0'`), "    Se reabre la tarea");
  await js(toggle);

  // 4 y 5. Eliminar con confirmación
  await js(`cardByTitle('Comprar café').querySelector('[data-action=delete]').click()`);
  await sleep(100);
  check(
    await js(`$('#confirm-dialog').open && document.activeElement === $('#confirm-dialog [data-action=cancel]') && $('[data-confirm-subject]').textContent === 'Comprar café'`),
    "4. Se pide confirmación antes de eliminar (foco inicial en Cancelar)",
  );
  await js(`$('#confirm-dialog [data-action=cancel]').click()`);
  await sleep(100);
  check(await js(`!$('#confirm-dialog').open && !!cardByTitle('Comprar café')`), "    Cancelar no elimina la tarea");
  await js(`cardByTitle('Comprar café').querySelector('[data-action=delete]').click()`);
  await sleep(100);
  await js(`$('#confirm-dialog [data-action=confirm]').click()`);
  await sleep(150);
  check(await js(`!cardByTitle('Comprar café') && titles().length === 3 && toastText().includes('Tarea eliminada')`), "5. Confirmar elimina la tarea y lo notifica");

  // 7–11. Búsqueda y filtros combinados
  await js(`setValue('#filter-search', 'INFORME')`);
  check((await js(`titles().sort().join(' | ')`)) === "Informe trimestral | Revisar informe anual", "7. Búsqueda por título sin distinguir mayúsculas");
  await js(`$('input[name=status][value=pending]').click()`);
  check((await js(`titles().join()`)) === "Informe trimestral", "8. Filtro por estado combinado con la búsqueda");
  await js(`setValue('#filter-search', ''); $('input[name=status][value=all]').click(); setValue('#filter-priority', 'low')`);
  check((await js(`titles().join()`)) === "Revisar informe anual", "9. Filtro por prioridad");
  await js(`setValue('#filter-search', 'informe'); $('input[name=status][value=pending]').click(); setValue('#filter-priority', 'high')`);
  check((await js(`titles().join()`)) === "Informe trimestral", "10. Búsqueda + estado + prioridad combinados");
  await js(`setValue('#filter-search', 'zzz')`);
  check(
    await js(`$('.empty-state__title')?.textContent === 'No hay coincidencias' && stat('total') === '3'`),
    "    Sin coincidencias se muestra un mensaje distinto y los datos se conservan",
  );
  await js(`$('#task-filters [data-action=clear-filters]').click()`);
  check(
    await js(`titles().length === 3 && $('#filter-search').value === '' && $('#filter-priority').value === 'all' && $('input[name=status]:checked').value === 'all'`),
    "11. Limpiar filtros restablece la vista completa",
  );

  // 12. Persistencia tras recargar
  await load();
  check(
    await js(`titles().length === 3 && !!cardByTitle('Informe trimestral') && cardByTitle('Revisar informe anual').querySelector('.task-card--completed') !== null`),
    "12. Tras recargar, las tareas y sus estados persisten",
  );
  const stored = await js(`JSON.parse(localStorage.getItem('${STORAGE_KEY}'))`);
  check(stored?.version === 1 && stored.tasks.length === 3, `    Se guardan en localStorage con la clave ${STORAGE_KEY}`);

  // Teclado: Escape cierra el formulario
  await js(`$('#new-task-button').focus(); $('#new-task-button').click()`);
  check(await js(`document.activeElement === $('#task-title')`), "    Al abrir el formulario el foco va al título");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await sleep(150);
  check(await js(`!$('#task-dialog').open`), "    Escape cierra el formulario (teclado)");
  check(await js(`document.activeElement === $('#new-task-button')`), "    Al cerrar, el foco vuelve al botón que abrió el formulario");

  // 15. Error al guardar (sin espacio): el formulario conserva los datos
  await js(`Storage.prototype.__setItem = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new DOMException('lleno', 'QuotaExceededError'); }`);
  await js(`createTask('Tarea que no cabe', 'other', 'medium')`);
  await sleep(150);
  check(
    await js(`$('#task-dialog').open && $('[data-form-alert]').textContent.includes('No hay espacio suficiente') && $('#task-title').value === 'Tarea que no cabe' && titles().length === 3`),
    "15. Si no se puede guardar, se informa, no se crea la tarea y se conservan los datos",
  );
  await js(`$('#task-dialog [data-action=cancel]').click(); Storage.prototype.setItem = Storage.prototype.__setItem`);

  // 14. Datos corruptos
  await js(`localStorage.setItem('${STORAGE_KEY}', '{esto no es JSON')`);
  await load();
  check(
    await js(`toastText().includes('dañados') && $('.empty-state__title')?.textContent === 'Tu lista está lista para empezar'`),
    "14. Con datos corruptos la aplicación arranca vacía y avisa",
  );
  check(await js(`localStorage.getItem('${STORAGE_KEY}-backup') === '{esto no es JSON'`), "    Se conserva una copia de respaldo de los datos dañados");

  // Datos de ejemplo opcionales
  await js(`$('[data-action=load-demo]').click()`);
  check(await js(`titles().length === 4 && stat('total') === '4'`), "    El botón opcional carga 4 tareas de ejemplo");
  await js(`cardByTitle('Comprar víveres').querySelector('[data-action=toggle]').click()`);

  // Diseño responsive
  mkdirSync(outputDir, { recursive: true });
  for (const [label, width, height] of [
    ["movil-375", 375, 812],
    ["tablet-768", 768, 1024],
    ["escritorio-1440", 1440, 900],
  ]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    await load();
    await sleep(300);
    const overflow = await js(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
    check(overflow <= 0, `    Sin desbordamiento horizontal a ${width}px`, `${overflow}px`);
    const smallTargets = await js(`$$('button').filter(b => b.offsetParent && (b.getBoundingClientRect().height < 28)).length`);
    check(smallTargets === 0, `    Botones con tamaño táctil suficiente a ${width}px`);
    const fullHeight = Math.min(await js(`document.documentElement.scrollHeight`), 3200);
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: fullHeight, scale: 1 } });
    writeFileSync(join(outputDir, `${label}.png`), Buffer.from(shot.data, "base64"));
  }

  // Captura del formulario en modo edición
  await js(`$$('#task-results [data-action=edit]')[0].click()`);
  await sleep(300);
  const dialogShot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(outputDir, "formulario-edicion.png"), Buffer.from(dialogShot.data, "base64"));

  check(consoleErrors.length === 0, "Sin errores en la consola del navegador", consoleErrors.slice(0, 3).join(" | "));
} finally {
  socket.close();
  browser.kill();
  await sleep(500);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    /* el perfil temporal puede seguir bloqueado unos instantes en Windows */
  }
}

console.log(failures === 0 ? "\nTodas las comprobaciones pasaron." : `\n${failures} comprobación(es) fallaron.`);
console.log(`Capturas en: ${outputDir}`);
process.exit(failures === 0 ? 0 : 1);
