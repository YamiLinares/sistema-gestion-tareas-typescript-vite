/** Tarjeta de una tarea. Todo el texto del usuario se asigna con textContent. */
import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS, type Task } from "../types/task";
import { formatDateTime } from "../utils/date";
import { createElement } from "../utils/dom";
import { createIcon } from "./icons";

export type TaskAction = "toggle" | "edit" | "delete";

function actionButton(action: TaskAction, label: string, icon: Parameters<typeof createIcon>[0], extraClass = "") {
  return createElement(
    "button",
    {
      className: `icon-button ${extraClass}`.trim(),
      attrs: { type: "button", "aria-label": label, title: label },
      dataset: { action },
    },
    [createIcon(icon)],
  );
}

export function createTaskCard(task: Task): HTMLLIElement {
  const isCompleted = task.status === "completed";
  const titleId = `task-title-${task.id}`;

  const toggle = createElement(
    "button",
    {
      className: "check-button",
      attrs: {
        type: "button",
        "aria-pressed": String(isCompleted),
        "aria-label": isCompleted ? `Reabrir «${task.title}»` : `Marcar «${task.title}» como completada`,
        title: isCompleted ? "Reabrir tarea" : "Marcar como completada",
      },
      dataset: { action: "toggle" },
    },
    [createIcon("check", 16)],
  );

  const body = createElement("div", { className: "task-card__body" }, [
    createElement("h3", { className: "task-card__title", text: task.title, attrs: { id: titleId } }),
    task.description ? createElement("p", { className: "task-card__description", text: task.description }) : null,
  ]);

  const meta = createElement("div", { className: "task-card__meta" }, [
    createElement("span", { className: `badge badge--${task.priority}` }, [
      createElement("span", { className: "badge__dot" }),
      `Prioridad ${PRIORITY_LABELS[task.priority].toLowerCase()}`,
    ]),
    createElement("span", { className: "badge" }, [createIcon("tag", 12), CATEGORY_LABELS[task.category]]),
    createElement("span", { className: `badge badge--${task.status}`, text: STATUS_LABELS[task.status] }),
  ]);

  const wasEdited = task.updatedAt !== task.createdAt;
  const dateLabel = wasEdited ? `Editada ${formatDateTime(task.updatedAt)}` : `Creada ${formatDateTime(task.createdAt)}`;

  const footer = createElement("div", { className: "task-card__footer" }, [
    createElement("time", { className: "task-card__date", text: dateLabel, attrs: { datetime: wasEdited ? task.updatedAt : task.createdAt } }),
    createElement("div", { className: "task-card__actions" }, [
      actionButton("edit", `Editar «${task.title}»`, "pencil"),
      actionButton("delete", `Eliminar «${task.title}»`, "trash", "icon-button--danger"),
    ]),
  ]);

  const article = createElement(
    "article",
    {
      className: `task-card task-card--${task.priority}${isCompleted ? " task-card--completed" : ""}`,
      attrs: { "aria-labelledby": titleId },
    },
    [createElement("div", { className: "task-card__top" }, [toggle, body]), meta, footer],
  );

  return createElement("li", { dataset: { taskId: task.id } }, [article]);
}
