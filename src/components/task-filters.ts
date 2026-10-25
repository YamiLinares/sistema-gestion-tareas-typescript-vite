/** Barra de búsqueda y filtros. Notifica cada cambio con el estado completo. */
import { DEFAULT_FILTERS, type TaskFilters } from "../types/task";
import { requireElement } from "../utils/dom";
import { hasActiveFilters } from "../utils/task-query";
import { isTaskPriority, isTaskStatus } from "../utils/validation";

export class TaskFiltersBar {
  private readonly search: HTMLInputElement;
  private readonly priority: HTMLSelectElement;
  private readonly clearButton: HTMLButtonElement;

  constructor(
    private readonly root: HTMLElement,
    private readonly onChange: (filters: TaskFilters) => void,
  ) {
    this.search = requireElement("#filter-search", HTMLInputElement, root);
    this.priority = requireElement("#filter-priority", HTMLSelectElement, root);
    this.clearButton = requireElement("[data-action='clear-filters']", HTMLButtonElement, root);

    root.addEventListener("input", this.emit);
    root.addEventListener("change", this.emit);
    root.addEventListener("submit", (event) => {
      event.preventDefault();
    });
    this.clearButton.addEventListener("click", () => {
      this.clear();
    });
  }

  /** Restablece la vista completa y devuelve el foco a la búsqueda. */
  clear(): void {
    this.reset();
    this.emit();
    this.search.focus();
  }

  getValue(): TaskFilters {
    const status = this.root.querySelector<HTMLInputElement>("input[name='status']:checked")?.value;
    const priority = this.priority.value;
    return {
      search: this.search.value,
      status: isTaskStatus(status) ? status : "all",
      priority: isTaskPriority(priority) ? priority : "all",
    };
  }

  private reset(): void {
    this.search.value = DEFAULT_FILTERS.search;
    this.priority.value = DEFAULT_FILTERS.priority;
    const allStatus = this.root.querySelector<HTMLInputElement>(`input[name='status'][value='${DEFAULT_FILTERS.status}']`);
    if (allStatus) allStatus.checked = true;
  }

  private readonly emit = (): void => {
    const filters = this.getValue();
    this.clearButton.disabled = !hasActiveFilters(filters);
    this.onChange(filters);
  };
}
