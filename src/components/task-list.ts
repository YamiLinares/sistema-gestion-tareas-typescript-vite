/**
 * Lista de tareas con estados vacíos.
 * Usa delegación de eventos: un único listener en el contenedor atiende los
 * botones de todas las tarjetas, aunque la lista se vuelva a renderizar.
 */
import type { Task } from "../types/task";
import { createElement } from "../utils/dom";
import { createIcon } from "./icons";
import { createTaskCard } from "./task-card";

export interface TaskListHandlers {
  onToggle: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onCreate: () => void;
  onClearFilters: () => void;
  onLoadDemo: () => void;
}

export interface TaskListView {
  tasks: readonly Task[];
  /** Total de tareas guardadas, sin filtros. */
  totalCount: number;
}

type ListAction = "toggle" | "edit" | "delete" | "create" | "clear-filters" | "load-demo";

export class TaskList {
  private readonly list: HTMLUListElement;
  private readonly empty: HTMLElement;

  constructor(
    private readonly root: HTMLElement,
    private readonly summary: HTMLElement,
    private readonly handlers: TaskListHandlers,
  ) {
    this.list = createElement("ul", { className: "task-list", attrs: { "aria-label": "Tareas" } });
    this.empty = createElement("div");
    root.append(this.list, this.empty);
    root.addEventListener("click", this.handleClick);
  }

  render({ tasks, totalCount }: TaskListView): void {
    this.list.replaceChildren(...tasks.map(createTaskCard));
    this.list.hidden = tasks.length === 0;

    if (totalCount === 0) {
      this.empty.replaceChildren(this.createNoTasksState());
    } else if (tasks.length === 0) {
      this.empty.replaceChildren(this.createNoResultsState());
    } else {
      this.empty.replaceChildren();
    }

    this.summary.textContent =
      totalCount === 0
        ? "Sin tareas todavía"
        : tasks.length === totalCount
          ? `${totalCount} ${totalCount === 1 ? "tarea" : "tareas"}`
          : `Mostrando ${tasks.length} de ${totalCount} tareas`;
  }

  /** Devuelve el foco a una tarjeta tras re-renderizar (p. ej. después de completarla). */
  focusTask(taskId: string, selector: string): void {
    const item = this.list.querySelector(`li[data-task-id="${CSS.escape(taskId)}"]`);
    const target = item?.querySelector(selector);
    if (target instanceof HTMLElement) target.focus();
  }

  private readonly handleClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>("button[data-action]");
    if (!button || !this.root.contains(button)) return;

    const action = button.dataset.action as ListAction | undefined;
    const taskId = button.closest<HTMLElement>("li[data-task-id]")?.dataset.taskId;

    switch (action) {
      case "toggle":
        if (taskId) this.handlers.onToggle(taskId);
        break;
      case "edit":
        if (taskId) this.handlers.onEdit(taskId);
        break;
      case "delete":
        if (taskId) this.handlers.onDelete(taskId);
        break;
      case "create":
        this.handlers.onCreate();
        break;
      case "clear-filters":
        this.handlers.onClearFilters();
        break;
      case "load-demo":
        this.handlers.onLoadDemo();
        break;
      case undefined:
        break;
    }
  };

  private createNoTasksState(): HTMLElement {
    return createElement("div", { className: "empty-state" }, [
      createElement("span", { className: "empty-state__icon" }, [createIcon("inbox", 30)]),
      createElement("h3", { className: "empty-state__title", text: "Tu lista está lista para empezar" }),
      createElement("p", {
        className: "empty-state__text",
        text: "Todavía no tienes tareas. Crea la primera para organizar tus pendientes de estudio, trabajo o vida personal.",
      }),
      createElement("div", { className: "empty-state__actions" }, [
        createElement("button", { className: "button button--primary", attrs: { type: "button" }, dataset: { action: "create" } }, [
          createIcon("plus"),
          "Crear mi primera tarea",
        ]),
        createElement(
          "button",
          { className: "button button--secondary", attrs: { type: "button" }, dataset: { action: "load-demo" } },
          [createIcon("sparkles"), "Cargar tareas de ejemplo"],
        ),
      ]),
    ]);
  }

  private createNoResultsState(): HTMLElement {
    return createElement("div", { className: "empty-state" }, [
      createElement("span", { className: "empty-state__icon" }, [createIcon("searchX", 30)]),
      createElement("h3", { className: "empty-state__title", text: "No hay coincidencias" }),
      createElement("p", {
        className: "empty-state__text",
        text: "Ninguna tarea coincide con la búsqueda o los filtros actuales. Tus tareas siguen guardadas.",
      }),
      createElement("div", { className: "empty-state__actions" }, [
        createElement(
          "button",
          { className: "button button--secondary", attrs: { type: "button" }, dataset: { action: "clear-filters" } },
          [createIcon("x"), "Limpiar filtros"],
        ),
      ]),
    ]);
  }
}
