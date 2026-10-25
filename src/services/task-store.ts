/**
 * Estado de las tareas y sus operaciones (crear, editar, completar, reabrir, eliminar).
 *
 * Cada operación es transaccional: se calcula la nueva lista, se intenta
 * guardar y solo si el guardado funciona se aplica en memoria. Así la interfaz
 * nunca muestra como guardado algo que no lo está.
 *
 * Excepción: si el navegador no permite usar localStorage en absoluto, la
 * aplicación funciona solo en memoria y lo indica (`persisted: false`).
 */
import type { Task, TaskDraft } from "../types/task";
import { createId } from "../utils/id";
import type { LoadResult, SaveFailure, TaskStorage } from "./task-storage";

export type StoreError = SaveFailure | "not-found";

export type StoreResult<T> = { ok: true; value: T; persisted: boolean } | { ok: false; error: StoreError };

export class TaskStore {
  private tasks: Task[] = [];

  constructor(
    private readonly storage: TaskStorage,
    private readonly now: () => Date = () => new Date(),
  ) {}

  load(): LoadResult {
    const result = this.storage.load();
    this.tasks = result.tasks;
    return result;
  }

  getAll(): readonly Task[] {
    return this.tasks;
  }

  getById(id: string): Task | undefined {
    return this.tasks.find((task) => task.id === id);
  }

  create(draft: TaskDraft): StoreResult<Task> {
    const timestamp = this.now().toISOString();
    const task: Task = {
      id: createId(),
      ...draft,
      status: "pending",
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: null,
    };
    return this.commit([...this.tasks, task], task);
  }

  createMany(drafts: readonly TaskDraft[]): StoreResult<Task[]> {
    const base = this.now().getTime();
    const created = drafts.map((draft, index): Task => {
      // Fechas escalonadas para mantener un orden estable entre las tareas creadas a la vez.
      const timestamp = new Date(base - index * 1000).toISOString();
      return { id: createId(), ...draft, status: "pending", createdAt: timestamp, updatedAt: timestamp, completedAt: null };
    });
    return this.commit([...this.tasks, ...created], created);
  }

  /** Conserva id y fecha de creación; actualiza la fecha de modificación. */
  update(id: string, draft: TaskDraft): StoreResult<Task> {
    const current = this.getById(id);
    if (!current) return { ok: false, error: "not-found" };
    const updated: Task = { ...current, ...draft, id: current.id, createdAt: current.createdAt, updatedAt: this.now().toISOString() };
    return this.commit(this.replace(updated), updated);
  }

  /** Completa una tarea pendiente o reabre una completada. */
  toggle(id: string): StoreResult<Task> {
    const current = this.getById(id);
    if (!current) return { ok: false, error: "not-found" };
    const timestamp = this.now().toISOString();
    const completing = current.status === "pending";
    const updated: Task = {
      ...current,
      status: completing ? "completed" : "pending",
      completedAt: completing ? timestamp : null,
      updatedAt: timestamp,
    };
    return this.commit(this.replace(updated), updated);
  }

  remove(id: string): StoreResult<Task> {
    const current = this.getById(id);
    if (!current) return { ok: false, error: "not-found" };
    return this.commit(
      this.tasks.filter((task) => task.id !== id),
      current,
    );
  }

  private replace(updated: Task): Task[] {
    return this.tasks.map((task) => (task.id === updated.id ? updated : task));
  }

  private commit<T>(next: Task[], value: T): StoreResult<T> {
    const result = this.storage.save(next);
    if (result.ok) {
      this.tasks = next;
      return { ok: true, value, persisted: true };
    }
    if (result.reason === "unavailable" && !this.storage.isAvailable) {
      this.tasks = next;
      return { ok: true, value, persisted: false };
    }
    return { ok: false, error: result.reason };
  }
}
