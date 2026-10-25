/** Resumen de tareas totales, pendientes y completadas. */
import type { TaskCounts } from "../utils/task-query";
import { requireElement } from "../utils/dom";

export class TaskStats {
  private readonly total: HTMLElement;
  private readonly pending: HTMLElement;
  private readonly completed: HTMLElement;
  private readonly progressBar: HTMLElement;
  private readonly progressLabel: HTMLElement;
  private readonly progressTrack: HTMLElement;

  constructor(root: HTMLElement) {
    this.total = requireElement("[data-stat='total']", HTMLElement, root);
    this.pending = requireElement("[data-stat='pending']", HTMLElement, root);
    this.completed = requireElement("[data-stat='completed']", HTMLElement, root);
    this.progressBar = requireElement(".progress__bar", HTMLElement, root);
    this.progressLabel = requireElement("[data-stat='progress']", HTMLElement, root);
    this.progressTrack = requireElement(".progress__track", HTMLElement, root);
  }

  render(counts: TaskCounts): void {
    const percent = counts.total === 0 ? 0 : Math.round((counts.completed / counts.total) * 100);
    this.total.textContent = String(counts.total);
    this.pending.textContent = String(counts.pending);
    this.completed.textContent = String(counts.completed);
    this.progressBar.style.width = `${percent}%`;
    this.progressTrack.setAttribute("aria-valuenow", String(percent));
    this.progressLabel.textContent = `${percent}% completado`;
  }
}
