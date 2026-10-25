/**
 * Único punto de acceso a localStorage.
 *
 * - Guarda `{ version: 1, tasks: [...] }` con JSON.stringify.
 * - Al leer, JSON.parse va protegido y cada tarea se valida antes de usarla.
 * - Si los datos están dañados, se conserva una copia de respaldo en lugar
 *   de sobrescribirlos en silencio.
 * - Los errores (almacenamiento bloqueado, sin espacio) se devuelven como
 *   resultados tipados para que la interfaz informe con exactitud.
 */
import type { Task } from "../types/task";
import { isTask } from "../utils/validation";

export const STORAGE_KEY = "task-manager-tasks-v1";
export const BACKUP_KEY = `${STORAGE_KEY}-backup`;
const SCHEMA_VERSION = 1;

/** Interfaz mínima de Storage (permite usar un almacenamiento simulado en las pruebas). */
export type StorageLike = Pick<Storage, "getItem" | "setItem">;

export type LoadResult =
  | { status: "ok"; tasks: Task[] }
  | { status: "empty"; tasks: Task[] }
  | { status: "recovered"; tasks: Task[]; discarded: number }
  | { status: "corrupt"; tasks: Task[]; backupSaved: boolean }
  | { status: "unavailable"; tasks: Task[] };

export type SaveFailure = "quota" | "unavailable" | "unknown";
export type SaveResult = { ok: true } | { ok: false; reason: SaveFailure };

function defaultStorage(): StorageLike | null {
  try {
    // Acceder a la propiedad puede lanzar una excepción si el navegador bloquea el almacenamiento.
    const storage = window.localStorage;
    const probe = `${STORAGE_KEY}-probe`;
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

export class TaskStorage {
  private readonly storage: StorageLike | null;

  constructor(storage: StorageLike | null = defaultStorage()) {
    this.storage = storage;
  }

  get isAvailable(): boolean {
    return this.storage !== null;
  }

  load(): LoadResult {
    if (!this.storage) return { status: "unavailable", tasks: [] };

    let raw: string | null;
    try {
      raw = this.storage.getItem(STORAGE_KEY);
    } catch {
      return { status: "unavailable", tasks: [] };
    }
    if (raw === null || raw.trim() === "") return { status: "empty", tasks: [] };

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { status: "corrupt", tasks: [], backupSaved: this.backup(raw) };
    }

    // Formato actual `{ version, tasks }`; se acepta también un arreglo simple.
    const items: unknown =
      Array.isArray(parsed)
        ? parsed
        : typeof parsed === "object" && parsed !== null && (parsed as { version?: unknown }).version === SCHEMA_VERSION
          ? (parsed as { tasks?: unknown }).tasks
          : undefined;

    if (!Array.isArray(items)) {
      return { status: "corrupt", tasks: [], backupSaved: this.backup(raw) };
    }

    const seen = new Set<string>();
    const tasks = items.filter((item): item is Task => {
      if (!isTask(item) || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    const discarded = items.length - tasks.length;
    if (discarded > 0) {
      this.backup(raw);
      return { status: "recovered", tasks, discarded };
    }
    return { status: "ok", tasks };
  }

  save(tasks: readonly Task[]): SaveResult {
    if (!this.storage) return { ok: false, reason: "unavailable" };
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, tasks }));
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: isQuotaError(error) ? "quota" : "unknown" };
    }
  }

  private backup(raw: string): boolean {
    try {
      this.storage?.setItem(BACKUP_KEY, raw);
      return true;
    } catch {
      return false;
    }
  }
}
