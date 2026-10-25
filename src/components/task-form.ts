/**
 * Formulario de creación y edición en un <dialog> nativo (foco atrapado,
 * cierre con Escape y fondo inerte gestionados por el navegador).
 */
import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH, type Task, type TaskDraft } from "../types/task";
import { requireElement } from "../utils/dom";
import { validateTaskDraft, type FieldErrors } from "../utils/validation";

export type FormMode = "create" | "edit";

export type SubmitOutcome = { ok: true } | { ok: false; message: string };

export interface TaskFormSubmit {
  mode: FormMode;
  taskId: string | null;
  draft: TaskDraft;
}

type FieldName = keyof TaskDraft;
const FIELD_NAMES: FieldName[] = ["title", "description", "category", "priority"];

const MODE_TEXT: Record<FormMode, { badge: string; title: string; description: string; submit: string }> = {
  create: {
    badge: "Nueva",
    title: "Crear tarea",
    description: "Añade los detalles de la tarea. Solo el título es obligatorio.",
    submit: "Crear tarea",
  },
  edit: {
    badge: "Editando",
    title: "Editar tarea",
    description: "Modifica los datos y guarda los cambios.",
    submit: "Guardar cambios",
  },
};

export class TaskForm {
  private readonly form: HTMLFormElement;
  private readonly fields: {
    title: HTMLInputElement;
    description: HTMLTextAreaElement;
    category: HTMLSelectElement;
    priority: HTMLSelectElement;
  };
  private readonly alert: HTMLElement;
  private readonly submitButton: HTMLButtonElement;
  private readonly titleCounter: HTMLElement;
  private mode: FormMode = "create";
  private editingId: string | null = null;
  private returnFocus: HTMLElement | null = null;

  constructor(
    private readonly dialog: HTMLDialogElement,
    private readonly onSubmit: (data: TaskFormSubmit) => SubmitOutcome,
  ) {
    this.form = requireElement("form", HTMLFormElement, dialog);
    this.fields = {
      title: requireElement("#task-title", HTMLInputElement, dialog),
      description: requireElement("#task-description", HTMLTextAreaElement, dialog),
      category: requireElement("#task-category", HTMLSelectElement, dialog),
      priority: requireElement("#task-priority", HTMLSelectElement, dialog),
    };
    this.alert = requireElement("[data-form-alert]", HTMLElement, dialog);
    this.submitButton = requireElement("button[type='submit']", HTMLButtonElement, dialog);
    this.titleCounter = requireElement("[data-counter='title']", HTMLElement, dialog);
    this.fields.title.maxLength = TITLE_MAX_LENGTH;
    this.fields.description.maxLength = DESCRIPTION_MAX_LENGTH;

    this.form.addEventListener("submit", this.handleSubmit);
    this.form.addEventListener("input", this.handleInput);
    requireElement("[data-action='cancel']", HTMLButtonElement, dialog).addEventListener("click", () => {
      this.close();
    });
    dialog.addEventListener("close", this.handleClose);
  }

  openForCreate(): void {
    this.prepare("create", null);
    this.form.reset();
    this.open();
  }

  openForEdit(task: Task): void {
    this.prepare("edit", task.id);
    this.fields.title.value = task.title;
    this.fields.description.value = task.description;
    this.fields.category.value = task.category;
    this.fields.priority.value = task.priority;
    this.open();
  }

  close(): void {
    this.dialog.close();
  }

  private prepare(mode: FormMode, taskId: string | null): void {
    this.mode = mode;
    this.editingId = taskId;
    const text = MODE_TEXT[mode];
    this.dialog.classList.toggle("dialog--edit", mode === "edit");
    this.dialog.classList.toggle("dialog--create", mode === "create");
    requireElement("[data-mode-badge]", HTMLElement, this.dialog).textContent = text.badge;
    requireElement("#task-dialog-title", HTMLElement, this.dialog).textContent = text.title;
    requireElement("[data-mode-description]", HTMLElement, this.dialog).textContent = text.description;
    this.submitButton.textContent = text.submit;
    this.clearErrors();
  }

  private open(): void {
    this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.updateCounter();
    this.dialog.showModal();
    this.fields.title.focus();
  }

  private readValues(): Record<FieldName, string> {
    return {
      title: this.fields.title.value,
      description: this.fields.description.value,
      category: this.fields.category.value,
      priority: this.fields.priority.value,
    };
  }

  private readonly handleSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    this.clearErrors();

    const validation = validateTaskDraft(this.readValues());
    if (!validation.valid) {
      this.showErrors(validation.errors);
      return;
    }

    const outcome = this.onSubmit({ mode: this.mode, taskId: this.editingId, draft: validation.draft });
    if (outcome.ok) {
      this.close();
    } else {
      // Error recuperable (p. ej. no se pudo guardar): los datos del formulario se conservan.
      this.alert.textContent = outcome.message;
    }
  };

  private readonly handleInput = (event: Event): void => {
    const target = event.target;
    if (target instanceof HTMLElement && target.id) {
      const name = FIELD_NAMES.find((field) => this.fields[field] === target);
      if (name) this.setFieldError(name, "");
    }
    if (target === this.fields.title) this.updateCounter();
  };

  private readonly handleClose = (): void => {
    // El evento `close` llega de forma asíncrona: si el diálogo ya se volvió a
    // abrir (p. ej. para editar otra tarea), no hay que limpiar el formulario nuevo.
    if (this.dialog.open) return;
    this.form.reset();
    this.clearErrors();
    this.editingId = null;
    this.returnFocus?.focus();
    this.returnFocus = null;
  };

  private updateCounter(): void {
    this.titleCounter.textContent = `${this.fields.title.value.length}/${TITLE_MAX_LENGTH}`;
  }

  private showErrors(errors: FieldErrors): void {
    let firstInvalid: HTMLElement | null = null;
    for (const name of FIELD_NAMES) {
      const message = errors[name];
      if (message) {
        this.setFieldError(name, message);
        firstInvalid ??= this.fields[name];
      }
    }
    firstInvalid?.focus();
  }

  private setFieldError(name: FieldName, message: string): void {
    const field = this.fields[name];
    const error = this.dialog.querySelector(`[data-error-for="${name}"]`);
    if (error) error.textContent = message;
    if (message) field.setAttribute("aria-invalid", "true");
    else field.removeAttribute("aria-invalid");
  }

  private clearErrors(): void {
    for (const name of FIELD_NAMES) this.setFieldError(name, "");
    this.alert.textContent = "";
  }
}
