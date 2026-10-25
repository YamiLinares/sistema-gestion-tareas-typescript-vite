import type { StorageLike } from "../src/services/task-storage";
import type { Task } from "../src/types/task";

/** Almacenamiento en memoria que imita localStorage y permite simular fallos. */
export class MemoryStorage implements StorageLike {
  readonly data = new Map<string, string>();
  failWith: Error | null = null;

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWith) throw this.failWith;
    this.data.set(key, value);
  }
}

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t-1",
    title: "Estudiar TypeScript",
    description: "",
    category: "study",
    priority: "medium",
    status: "pending",
    createdAt: "2026-10-20T10:00:00.000Z",
    updatedAt: "2026-10-20T10:00:00.000Z",
    completedAt: null,
    ...overrides,
  };
}
