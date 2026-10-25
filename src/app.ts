/**
 * Orquestador de la aplicación: conecta los datos con los componentes de la
 * interfaz. En esta etapa las tareas viven en memoria.
 */
import { ConfirmationDialog } from "./components/confirmation-dialog";
import { TaskForm, type SubmitOutcome, type TaskFormSubmit } from "./components/task-form";
import { TaskList } from "./components/task-list";
import { TaskStats } from "./components/task-stats";
import { Toaster } from "./components/toaster";
import { DEMO_TASKS } from "./data/demo-tasks";
import type { Task, TaskDraft } from "./types/task";
import { requireElement } from "./utils/dom";
import { createId } from "./utils/id";
import { countTasks, sortTasks } from "./utils/task-query";

function newTask(draft: TaskDraft, timestamp: string): Task {
  return { id: createId(), ...draft, status: "pending", createdAt: timestamp, updatedAt: timestamp, completedAt: null };
}

export class TaskApp {
  private tasks: Task[] = [];
  private readonly toaster: Toaster;
  private readonly stats: TaskStats;
  private readonly list: TaskList;
  private readonly form: TaskForm;
  private readonly confirmDialog: ConfirmationDialog;
  private readonly newTaskButton: HTMLButtonElement;

  constructor(root: ParentNode = document) {
    this.toaster = new Toaster(requireElement("#toaster", HTMLElement, root));
    this.stats = new TaskStats(requireElement("#task-stats", HTMLElement, root));
    this.newTaskButton = requireElement("#new-task-button", HTMLButtonElement, root);
    this.form = new TaskForm(requireElement("#task-dialog", HTMLDialogElement, root), this.handleFormSubmit);
    this.confirmDialog = new ConfirmationDialog(requireElement("#confirm-dialog", HTMLDialogElement, root));
    this.list = new TaskList(requireElement("#task-results", HTMLElement, root), requireElement("#task-summary", HTMLElement, root), {
      onToggle: this.handleToggle,
      onEdit: this.handleEdit,
      onDelete: (taskId) => {
        void this.handleDelete(taskId);
      },
      onCreate: () => {
        this.form.openForCreate();
      },
      onClearFilters: () => {
        this.render();
      },
      onLoadDemo: this.loadDemo,
    });

    this.newTaskButton.addEventListener("click", () => {
      this.form.openForCreate();
    });
  }

  start(): void {
    this.render();
  }

  private render(): void {
    this.stats.render(countTasks(this.tasks));
    this.list.render({ tasks: sortTasks(this.tasks), totalCount: this.tasks.length });
  }

  private readonly handleFormSubmit = ({ mode, taskId, draft }: TaskFormSubmit): SubmitOutcome => {
    const timestamp = new Date().toISOString();
    if (mode === "edit" && taskId) {
      this.tasks = this.tasks.map((task) => (task.id === taskId ? { ...task, ...draft, updatedAt: timestamp } : task));
      this.toaster.show("Cambios guardados.");
    } else {
      this.tasks = [...this.tasks, newTask(draft, timestamp)];
      this.toaster.show("Tarea creada correctamente.");
    }
    this.render();
    return { ok: true };
  };

  private readonly handleToggle = (taskId: string): void => {
    const timestamp = new Date().toISOString();
    this.tasks = this.tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            status: task.status === "pending" ? "completed" : "pending",
            completedAt: task.status === "pending" ? timestamp : null,
            updatedAt: timestamp,
          }
        : task,
    );
    this.render();
    this.list.focusTask(taskId, "[data-action='toggle']");
  };

  private readonly handleEdit = (taskId: string): void => {
    const task = this.tasks.find((item) => item.id === taskId);
    if (task) this.form.openForEdit(task);
  };

  private readonly handleDelete = async (taskId: string): Promise<void> => {
    const task = this.tasks.find((item) => item.id === taskId);
    if (!task) return;
    const confirmed = await this.confirmDialog.confirm({
      title: "¿Eliminar esta tarea?",
      message: "Esta acción no se puede deshacer.",
      subject: task.title,
      confirmLabel: "Eliminar tarea",
    });
    if (!confirmed) return;
    this.tasks = this.tasks.filter((item) => item.id !== taskId);
    this.render();
    this.newTaskButton.focus();
    this.toaster.show("Tarea eliminada.");
  };

  private readonly loadDemo = (): void => {
    const timestamp = new Date().toISOString();
    this.tasks = DEMO_TASKS.map((draft) => newTask(draft, timestamp));
    this.render();
    this.toaster.show(`Se cargaron ${this.tasks.length} tareas de ejemplo.`);
  };
}
