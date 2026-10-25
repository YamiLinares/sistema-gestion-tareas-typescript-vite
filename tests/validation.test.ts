import { describe, expect, it } from "vitest";
import { isTask, normalizeText, validateTaskDraft } from "../src/utils/validation";
import { makeTask } from "./helpers";

const valid = { title: "Leer capítulo 3", description: "", category: "study", priority: "high" };

describe("validateTaskDraft", () => {
  it("acepta datos válidos y normaliza el texto", () => {
    const result = validateTaskDraft({ ...valid, title: "  Leer   capítulo 3  ", description: "  línea 1\n  línea 2  " });
    expect(result).toEqual({
      valid: true,
      draft: { title: "Leer capítulo 3", description: "línea 1\n línea 2", category: "study", priority: "high" },
    });
  });

  it.each(["", "   ", "\n\t "])("rechaza un título vacío o solo con espacios: %j", (title) => {
    const result = validateTaskDraft({ ...valid, title });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.title).toBe("Escribe un título para la tarea.");
  });

  it("rechaza títulos y descripciones demasiado largos", () => {
    const result = validateTaskDraft({ ...valid, title: "a".repeat(101), description: "b".repeat(501) });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.title).toMatch(/100 caracteres/);
      expect(result.errors.description).toMatch(/500 caracteres/);
    }
  });

  it("rechaza categorías y prioridades que no existen", () => {
    const result = validateTaskDraft({ ...valid, category: "ocio", priority: "urgente" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.category).toBeDefined();
      expect(result.errors.priority).toBeDefined();
    }
  });

  it("rechaza valores que no son texto", () => {
    expect(validateTaskDraft({ title: 42, description: null, category: "work", priority: "low" }).valid).toBe(false);
  });

  it("elimina caracteres de control pero conserva el texto con apariencia de HTML", () => {
    expect(normalizeText("Hola\u0007 <b>mundo</b>")).toBe("Hola <b>mundo</b>");
  });
});

describe("isTask", () => {
  it("acepta una tarea completa", () => {
    expect(isTask(makeTask())).toBe(true);
    expect(isTask(makeTask({ status: "completed", completedAt: "2026-10-21T08:00:00.000Z" }))).toBe(true);
  });

  it.each([
    ["null", null],
    ["un texto", "tarea"],
    ["sin id", { ...makeTask(), id: "" }],
    ["título vacío", { ...makeTask(), title: "  " }],
    ["prioridad desconocida", { ...makeTask(), priority: "urgente" }],
    ["estado desconocido", { ...makeTask(), status: "archivada" }],
    ["fecha inválida", { ...makeTask(), createdAt: "ayer" }],
    ["completedAt inválido", { ...makeTask(), completedAt: 5 }],
  ])("rechaza %s", (_label, value) => {
    expect(isTask(value)).toBe(false);
  });
});
