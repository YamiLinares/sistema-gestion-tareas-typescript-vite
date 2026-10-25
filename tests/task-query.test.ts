import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS, type Task } from "../src/types/task";
import { countTasks, filterTasks, hasActiveFilters, sortTasks } from "../src/utils/task-query";
import { makeTask } from "./helpers";

const TASKS: Task[] = [
  makeTask({ id: "1", title: "Informe mensual", priority: "high", createdAt: "2026-10-01T00:00:00.000Z" }),
  makeTask({ id: "2", title: "Comprar café", priority: "low", status: "completed", createdAt: "2026-10-02T00:00:00.000Z" }),
  makeTask({ id: "3", title: "Repasar Matemáticas", priority: "high", status: "completed", createdAt: "2026-10-03T00:00:00.000Z" }),
  makeTask({ id: "4", title: "Revisar INFORME anual", priority: "medium", createdAt: "2026-10-04T00:00:00.000Z" }),
  makeTask({ id: "5", title: "Llamar al banco", priority: "high", createdAt: "2026-10-05T00:00:00.000Z" }),
];

const ids = (tasks: Task[]) => tasks.map((task) => task.id);

describe("filterTasks", () => {
  it("sin filtros devuelve todas las tareas", () => {
    expect(ids(filterTasks(TASKS, DEFAULT_FILTERS))).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("busca por título sin distinguir mayúsculas ni acentos", () => {
    expect(ids(filterTasks(TASKS, { ...DEFAULT_FILTERS, search: "informe" }))).toEqual(["1", "4"]);
    expect(ids(filterTasks(TASKS, { ...DEFAULT_FILTERS, search: "  MATEMATICAS " }))).toEqual(["3"]);
  });

  it("filtra por estado", () => {
    expect(ids(filterTasks(TASKS, { ...DEFAULT_FILTERS, status: "pending" }))).toEqual(["1", "4", "5"]);
    expect(ids(filterTasks(TASKS, { ...DEFAULT_FILTERS, status: "completed" }))).toEqual(["2", "3"]);
  });

  it("filtra por prioridad", () => {
    expect(ids(filterTasks(TASKS, { ...DEFAULT_FILTERS, priority: "high" }))).toEqual(["1", "3", "5"]);
  });

  it("combina búsqueda, estado y prioridad", () => {
    expect(ids(filterTasks(TASKS, { search: "informe", status: "pending", priority: "high" }))).toEqual(["1"]);
    expect(ids(filterTasks(TASKS, { search: "informe", status: "completed", priority: "all" }))).toEqual([]);
  });

  it("no modifica la lista original", () => {
    const copy = structuredClone(TASKS);
    filterTasks(TASKS, { search: "x", status: "completed", priority: "low" });
    sortTasks(TASKS);
    expect(TASKS).toEqual(copy);
  });
});

describe("sortTasks y countTasks", () => {
  it("ordena pendientes primero, luego por prioridad y por fecha más reciente", () => {
    expect(ids(sortTasks(TASKS))).toEqual(["5", "1", "4", "3", "2"]);
  });

  it("cuenta totales, pendientes y completadas", () => {
    expect(countTasks(TASKS)).toEqual({ total: 5, pending: 3, completed: 2 });
    expect(countTasks([])).toEqual({ total: 0, pending: 0, completed: 0 });
  });

  it("detecta filtros activos", () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, search: "   " })).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, priority: "low" })).toBe(true);
  });
});
