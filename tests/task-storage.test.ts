import { describe, expect, it } from "vitest";
import { BACKUP_KEY, STORAGE_KEY, TaskStorage } from "../src/services/task-storage";
import { MemoryStorage, makeTask } from "./helpers";

describe("TaskStorage", () => {
  it("guarda con JSON.stringify y vuelve a cargar las mismas tareas", () => {
    const memory = new MemoryStorage();
    const storage = new TaskStorage(memory);
    const tasks = [makeTask(), makeTask({ id: "t-2", title: "Otra", status: "completed", completedAt: "2026-10-21T00:00:00.000Z" })];

    expect(storage.save(tasks)).toEqual({ ok: true });
    expect(JSON.parse(memory.getItem(STORAGE_KEY) ?? "")).toEqual({ version: 1, tasks });
    expect(storage.load()).toEqual({ status: "ok", tasks });
  });

  it("devuelve una lista vacía si no hay datos guardados", () => {
    expect(new TaskStorage(new MemoryStorage()).load()).toEqual({ status: "empty", tasks: [] });
  });

  it("detecta JSON corrupto, no lanza errores y guarda una copia de respaldo", () => {
    const memory = new MemoryStorage();
    memory.data.set(STORAGE_KEY, "{esto no es JSON");
    expect(new TaskStorage(memory).load()).toEqual({ status: "corrupt", tasks: [], backupSaved: true });
    expect(memory.getItem(BACKUP_KEY)).toBe("{esto no es JSON");
  });

  it("trata como corruptos los datos con una estructura incompatible", () => {
    for (const raw of ['{"version":99,"tasks":[]}', '"texto"', "42", '{"tasks":"no es arreglo","version":1}']) {
      const memory = new MemoryStorage();
      memory.data.set(STORAGE_KEY, raw);
      expect(new TaskStorage(memory).load().status).toBe("corrupt");
    }
  });

  it("recupera las tareas válidas y descarta las inválidas o duplicadas", () => {
    const memory = new MemoryStorage();
    const good = makeTask();
    memory.data.set(STORAGE_KEY, JSON.stringify({ version: 1, tasks: [good, { id: "x" }, good, null] }));
    expect(new TaskStorage(memory).load()).toEqual({ status: "recovered", tasks: [good], discarded: 3 });
    expect(memory.getItem(BACKUP_KEY)).not.toBeNull();
  });

  it("acepta el formato de arreglo simple", () => {
    const memory = new MemoryStorage();
    memory.data.set(STORAGE_KEY, JSON.stringify([makeTask()]));
    expect(new TaskStorage(memory).load()).toEqual({ status: "ok", tasks: [makeTask()] });
  });

  it("informa la falta de espacio sin lanzar excepciones", () => {
    const memory = new MemoryStorage();
    memory.failWith = new DOMException("Sin espacio", "QuotaExceededError");
    expect(new TaskStorage(memory).save([makeTask()])).toEqual({ ok: false, reason: "quota" });
  });

  it("informa otros errores de escritura", () => {
    const memory = new MemoryStorage();
    memory.failWith = new Error("Bloqueado");
    expect(new TaskStorage(memory).save([makeTask()])).toEqual({ ok: false, reason: "unknown" });
  });

  it("funciona sin almacenamiento disponible", () => {
    const storage = new TaskStorage(null);
    expect(storage.isAvailable).toBe(false);
    expect(storage.load()).toEqual({ status: "unavailable", tasks: [] });
    expect(storage.save([])).toEqual({ ok: false, reason: "unavailable" });
  });
});
