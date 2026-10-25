/** Validación de los datos del formulario y de las tareas recuperadas del almacenamiento. */
import {
  DESCRIPTION_MAX_LENGTH,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TITLE_MAX_LENGTH,
  type Task,
  type TaskCategory,
  type TaskDraft,
  type TaskPriority,
  type TaskStatus,
} from "../types/task";

export type FieldErrors = Partial<Record<keyof TaskDraft, string>>;

export type DraftValidation = { valid: true; draft: TaskDraft } | { valid: false; errors: FieldErrors };

function includes<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

export const isTaskPriority = (value: unknown): value is TaskPriority => includes(TASK_PRIORITIES, value);
export const isTaskCategory = (value: unknown): value is TaskCategory => includes(TASK_CATEGORIES, value);
export const isTaskStatus = (value: unknown): value is TaskStatus => includes(TASK_STATUSES, value);

/** Elimina espacios sobrantes y caracteres de control, conservando los saltos de línea. */
export function normalizeText(value: string): string {
  const withoutControlChars = Array.from(value.replace(/\r\n?/g, "\n"), (char) => {
    const code = char.codePointAt(0) ?? 0;
    return (code < 32 && char !== "\n" && char !== "\t") || code === 127 ? "" : char;
  }).join("");
  return withoutControlChars.replace(/[^\S\n]+/g, " ").trim();
}

export function validateTaskDraft(input: Record<keyof TaskDraft, unknown>): DraftValidation {
  const errors: FieldErrors = {};
  const title = typeof input.title === "string" ? normalizeText(input.title).replace(/\n+/g, " ") : "";
  const description = typeof input.description === "string" ? normalizeText(input.description) : "";
  const { category, priority } = input;

  if (title.length === 0) {
    errors.title = "Escribe un título para la tarea.";
  } else if (title.length > TITLE_MAX_LENGTH) {
    errors.title = `El título no puede superar ${TITLE_MAX_LENGTH} caracteres.`;
  }
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `La descripción no puede superar ${DESCRIPTION_MAX_LENGTH} caracteres.`;
  }
  if (!isTaskCategory(category)) errors.category = "Selecciona una categoría válida.";
  if (!isTaskPriority(priority)) errors.priority = "Selecciona una prioridad válida.";

  if (!isTaskCategory(category) || !isTaskPriority(priority) || Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }
  return { valid: true, draft: { title, description, category, priority } };
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && value.length >= 10 && !Number.isNaN(Date.parse(value));
}

/** Comprueba que un valor desconocido (p. ej. leído de localStorage) sea una tarea válida. */
export function isTask(value: unknown): value is Task {
  if (typeof value !== "object" || value === null) return false;
  const task = value as Record<string, unknown>;
  return (
    typeof task.id === "string" &&
    task.id.length > 0 &&
    typeof task.title === "string" &&
    task.title.trim().length > 0 &&
    task.title.length <= TITLE_MAX_LENGTH &&
    typeof task.description === "string" &&
    task.description.length <= DESCRIPTION_MAX_LENGTH &&
    isTaskCategory(task.category) &&
    isTaskPriority(task.priority) &&
    isTaskStatus(task.status) &&
    isIsoDate(task.createdAt) &&
    isIsoDate(task.updatedAt) &&
    (task.completedAt === null || isIsoDate(task.completedAt))
  );
}
