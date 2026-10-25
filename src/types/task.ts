/** Modelo de datos de las tareas. */

export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export const TASK_CATEGORIES = ["personal", "study", "work", "other"] as const;
export const TASK_STATUSES = ["pending", "completed"] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskCategory = (typeof TASK_CATEGORIES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Task {
  /** Identificador único e inmutable. */
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  /** Fechas en formato ISO 8601. */
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

/** Datos que el usuario introduce en el formulario. */
export interface TaskDraft {
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
}

export type StatusFilter = "all" | TaskStatus;
export type PriorityFilter = "all" | TaskPriority;

export interface TaskFilters {
  search: string;
  status: StatusFilter;
  priority: PriorityFilter;
}

export const DEFAULT_FILTERS: Readonly<TaskFilters> = {
  search: "",
  status: "all",
  priority: "all",
};

export const TITLE_MAX_LENGTH = 100;
export const DESCRIPTION_MAX_LENGTH = 500;

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  personal: "Personal",
  study: "Estudio",
  work: "Trabajo",
  other: "Otros",
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pendiente",
  completed: "Completada",
};
