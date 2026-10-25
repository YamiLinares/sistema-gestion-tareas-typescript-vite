/**
 * Consultas sobre la lista de tareas: búsqueda, filtros, orden y contadores.
 * Son funciones puras: nunca modifican el arreglo original, así que filtrar
 * solo afecta a lo que se muestra.
 */
import { DEFAULT_FILTERS, type Task, type TaskFilters, type TaskPriority } from "../types/task";

/** Minúsculas y sin acentos, para buscar «Matemáticas» escribiendo «matematicas». */
export function normalizeForSearch(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Aplica búsqueda por título, estado y prioridad de forma combinada. */
export function filterTasks(tasks: readonly Task[], filters: TaskFilters): Task[] {
  const search = normalizeForSearch(filters.search);
  return tasks.filter(
    (task) =>
      (filters.status === "all" || task.status === filters.status) &&
      (filters.priority === "all" || task.priority === filters.priority) &&
      (search === "" || normalizeForSearch(task.title).includes(search)),
  );
}

export function hasActiveFilters(filters: TaskFilters): boolean {
  return (
    filters.search.trim() !== DEFAULT_FILTERS.search ||
    filters.status !== DEFAULT_FILTERS.status ||
    filters.priority !== DEFAULT_FILTERS.priority
  );
}

export interface TaskCounts {
  total: number;
  pending: number;
  completed: number;
}

const PRIORITY_WEIGHT: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

/**
 * Orden: pendientes primero; dentro de cada grupo, mayor prioridad primero
 * y, a igual prioridad, las más recientes arriba.
 */
export function sortTasks(tasks: readonly Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
    const byPriority = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (byPriority !== 0) return byPriority;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function countTasks(tasks: readonly Task[]): TaskCounts {
  const completed = tasks.filter((task) => task.status === "completed").length;
  return { total: tasks.length, pending: tasks.length - completed, completed };
}
