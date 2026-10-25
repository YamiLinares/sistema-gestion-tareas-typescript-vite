import { describe, expect, it } from "vitest";
import { STORAGE_KEY, TaskStorage } from "../src/services/task-storage";
import { TaskStore } from "../src/services/task-store";
import type { TaskDraft } from "../src/types/task";
import { MemoryStorage } from "./helpers";

const DRAFT: TaskDraft = { title: "Preparar exposición", description: "Diapositivas", category: "study", priority: "high" };

function setup() {
  const memory = new MemoryStorage();
  let clock = new Date("2026-10-25T09:00:00.000Z");
  const store = new TaskStore(new TaskStorage(memory), () => clock);
  const advance = (ms: number) => {
    clock = new Date(clock.getTime() + ms);
  };
  return { memory, store, advance };
}

const saved = (memory: MemoryStorage) => (JSON.parse(memory.getItem(STORAGE_KEY) ?? "{}") as { tasks: unknown[] }).tasks;

describe("TaskStore", () => {
  it("crea una tarea pendiente con id único y fechas, y la persiste", () => {
    const { memory, store } = setup();
    const first = store.create(DRAFT);
    const second = store.create(DRAFT);
    if (!first.ok || !second.ok) throw new Error("se esperaba éxito");

    expect(first.value).toMatchObject({ ...DRAFT, status: "pending", completedAt: null, createdAt: "2026-10-25T09:00:00.000Z" });
    expect(first.value.updatedAt).toBe(first.value.createdAt);
    expect(first.value.id).not.toBe(second.value.id);
    expect(first.persisted).toBe(true);
    expect(saved(memory)).toHaveLength(2);
  });

  it("edita conservando id y fecha de creación y actualiza la fecha de modificación", () => {
    const { store, advance } = setup();
    const created = store.create(DRAFT);
    if (!created.ok) throw new Error("se esperaba éxito");
    advance(60_000);

    const updated = store.update(created.value.id, { ...DRAFT, title: "Exposición final", priority: "low" });
    if (!updated.ok) throw new Error("se esperaba éxito");
    expect(updated.value).toMatchObject({
      id: created.value.id,
      title: "Exposición final",
      priority: "low",
      createdAt: created.value.createdAt,
      updatedAt: "2026-10-25T09:01:00.000Z",
    });
  });

  it("completa y reabre una tarea", () => {
    const { store } = setup();
    const created = store.create(DRAFT);
    if (!created.ok) throw new Error("se esperaba éxito");

    const completed = store.toggle(created.value.id);
    expect(completed.ok && completed.value.status).toBe("completed");
    expect(completed.ok && completed.value.completedAt).toBeTruthy();

    const reopened = store.toggle(created.value.id);
    expect(reopened.ok && reopened.value.status).toBe("pending");
    expect(reopened.ok && reopened.value.completedAt).toBeNull();
  });

  it("elimina una tarea y lo persiste", () => {
    const { memory, store } = setup();
    const created = store.create(DRAFT);
    if (!created.ok) throw new Error("se esperaba éxito");
    expect(store.remove(created.value.id).ok).toBe(true);
    expect(store.getAll()).toEqual([]);
    expect(saved(memory)).toEqual([]);
  });

  it("devuelve not-found para ids inexistentes", () => {
    const { store } = setup();
    expect(store.update("nada", DRAFT)).toEqual({ ok: false, error: "not-found" });
    expect(store.toggle("nada")).toEqual({ ok: false, error: "not-found" });
    expect(store.remove("nada")).toEqual({ ok: false, error: "not-found" });
  });

  it("no aplica el cambio si no se pudo guardar (operación transaccional)", () => {
    const { memory, store } = setup();
    const created = store.create(DRAFT);
    if (!created.ok) throw new Error("se esperaba éxito");

    memory.failWith = new DOMException("Sin espacio", "QuotaExceededError");
    expect(store.create(DRAFT)).toEqual({ ok: false, error: "quota" });
    expect(store.toggle(created.value.id)).toEqual({ ok: false, error: "quota" });
    expect(store.remove(created.value.id)).toEqual({ ok: false, error: "quota" });
    expect(store.getAll()).toEqual([created.value]);
  });

  it("funciona solo en memoria si el navegador no permite almacenamiento", () => {
    const store = new TaskStore(new TaskStorage(null));
    expect(store.load().status).toBe("unavailable");
    const result = store.create(DRAFT);
    expect(result.ok && result.persisted).toBe(false);
    expect(store.getAll()).toHaveLength(1);
  });

  it("carga las tareas guardadas al iniciar (persistencia entre sesiones)", () => {
    const { memory, store } = setup();
    store.create(DRAFT);
    const reloaded = new TaskStore(new TaskStorage(memory));
    expect(reloaded.load().status).toBe("ok");
    expect(reloaded.getAll()).toHaveLength(1);
  });
});
