/**
 * Orquestador de la aplicación: conecta el store (datos y persistencia) con
 * los componentes de la interfaz y traduce los resultados en mensajes.
 */
import { ConfirmationDialog } from "./components/confirmation-dialog";
import { TaskFiltersBar } from "./components/task-filters";
import { TaskForm, type SubmitOutcome, type TaskFormSubmit } from "./components/task-form";
import { TaskList } from "./components/task-list";
import { TaskStats } from "./components/task-stats";
import { Toaster } from "./components/toaster";
import { DEMO_TASKS } from "./data/demo-tasks";
import type { StoreError, TaskStore } from "./services/task-store";
import { DEFAULT_FILTERS, type TaskFilters } from "./types/task";
import { requireElement } from "./utils/dom";
import { countTasks, filterTasks, sortTasks } from "./utils/task-query";

const ERROR_MESSAGES: Record<StoreError, string> = {
  quota: "No hay espacio suficiente en el almacenamiento del navegador. El cambio no se guardó.",
  unavailable: "El navegador no permite guardar datos. El cambio no se guardó.",
  unknown: "No se pudo guardar en el almacenamiento del navegador. El cambio no se aplicó; inténtalo de nuevo.",
  "not-found": "La tarea ya no existe. Es posible que se haya eliminado.",
};

const UNSAVED_SUFFIX = " (solo en esta sesión: el navegador no permite guardarla)";

export class TaskApp {
  private filters: TaskFilters = { ...DEFAULT_FILTERS };
  private readonly toaster: Toaster;
  private readonly stats: TaskStats;
  private readonly list: TaskList;
  private readonly form: TaskForm;
  private readonly confirmDialog: ConfirmationDialog;
  private readonly filtersBar: TaskFiltersBar;
  private readonly newTaskButton: HTMLButtonElement;
  private readonly storageWarning: HTMLElement;

  constructor(
    private readonly store: TaskStore,
    root: ParentNode = document,
  ) {
    this.toaster = new Toaster(requireElement("#toaster", HTMLElement, root));
    this.stats = new TaskStats(requireElement("#task-stats", HTMLElement, root));
    this.storageWarning = requireElement("#storage-warning", HTMLElement, root);
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
      onClearFilters: this.clearFilters,
      onLoadDemo: this.loadDemo,
    });
    this.filtersBar = new TaskFiltersBar(requireElement("#task-filters", HTMLFormElement, root), (filters) => {
      this.filters = filters;
      this.render();
    });

    this.newTaskButton.addEventListener("click", () => {
      this.form.openForCreate();
    });
  }

  start(): void {
    const result = this.store.load();
    switch (result.status) {
      case "corrupt":
        this.toaster.show(
          result.backupSaved
            ? "Los datos guardados estaban dañados y no se pudieron leer. Se guardó una copia de respaldo y se empezó con una lista vacía."
            : "Los datos guardados estaban dañados y no se pudieron leer. Se empezó con una lista vacía.",
          "warning",
        );
        break;
      case "recovered":
        this.toaster.show(
          `Se recuperaron tus tareas, pero ${result.discarded} ${result.discarded === 1 ? "registro dañado se omitió" : "registros dañados se omitieron"}.`,
          "warning",
        );
        break;
      case "unavailable":
        this.storageWarning.hidden = false;
        break;
      case "ok":
      case "empty":
        break;
    }
    this.render();
  }

  private render(): void {
    const all = this.store.getAll();
    this.stats.render(countTasks(all));
    this.list.render({ tasks: sortTasks(filterTasks(all, this.filters)), totalCount: all.length });
  }

  private notifySaved(message: string, persisted: boolean): void {
    this.toaster.show(persisted ? message : `${message}${UNSAVED_SUFFIX}`, persisted ? "success" : "warning");
  }

  private readonly handleFormSubmit = ({ mode, taskId, draft }: TaskFormSubmit): SubmitOutcome => {
    const result = mode === "edit" && taskId ? this.store.update(taskId, draft) : this.store.create(draft);
    if (!result.ok) return { ok: false, message: ERROR_MESSAGES[result.error] };

    this.render();
    this.notifySaved(mode === "edit" ? "Cambios guardados." : "Tarea creada correctamente.", result.persisted);
    return { ok: true };
  };

  private readonly handleToggle = (taskId: string): void => {
    const result = this.store.toggle(taskId);
    if (!result.ok) {
      this.toaster.show(ERROR_MESSAGES[result.error], "error");
      return;
    }
    this.render();
    this.list.focusTask(taskId, "[data-action='toggle']");
    this.notifySaved(result.value.status === "completed" ? "Tarea completada." : "Tarea reabierta.", result.persisted);
  };

  private readonly handleEdit = (taskId: string): void => {
    const task = this.store.getById(taskId);
    if (task) this.form.openForEdit(task);
    else this.toaster.show(ERROR_MESSAGES["not-found"], "error");
  };

  private readonly handleDelete = async (taskId: string): Promise<void> => {
    const task = this.store.getById(taskId);
    if (!task) return;

    const confirmed = await this.confirmDialog.confirm({
      title: "¿Eliminar esta tarea?",
      message: "Esta acción no se puede deshacer.",
      subject: task.title,
      confirmLabel: "Eliminar tarea",
    });
    if (!confirmed) return;

    const result = this.store.remove(taskId);
    if (!result.ok) {
      this.toaster.show(ERROR_MESSAGES[result.error], "error");
      return;
    }
    this.render();
    // La tarjeta eliminada tenía el foco: se lleva a un lugar estable.
    this.newTaskButton.focus();
    this.notifySaved("Tarea eliminada.", result.persisted);
  };

  private readonly clearFilters = (): void => {
    this.filtersBar.clear();
  };

  private readonly loadDemo = (): void => {
    if (this.store.getAll().length > 0) return;
    const result = this.store.createMany(DEMO_TASKS);
    if (!result.ok) {
      this.toaster.show(ERROR_MESSAGES[result.error], "error");
      return;
    }
    this.render();
    this.notifySaved(`Se cargaron ${result.value.length} tareas de ejemplo.`, result.persisted);
  };
}
