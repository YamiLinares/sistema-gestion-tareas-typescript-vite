/**
 * Diálogo de confirmación accesible basado en <dialog>.
 * El foco inicial va a «Cancelar» para evitar eliminaciones accidentales
 * (p. ej. al pulsar Enter dos veces). Escape también cancela.
 */
import { requireElement } from "../utils/dom";

export interface ConfirmOptions {
  title: string;
  message: string;
  subject: string;
  confirmLabel: string;
}

export class ConfirmationDialog {
  private readonly title: HTMLElement;
  private readonly message: HTMLElement;
  private readonly subject: HTMLElement;
  private readonly confirmButton: HTMLButtonElement;
  private readonly cancelButton: HTMLButtonElement;
  private resolve: ((confirmed: boolean) => void) | null = null;
  private returnFocus: HTMLElement | null = null;

  constructor(private readonly dialog: HTMLDialogElement) {
    this.title = requireElement("#confirm-dialog-title", HTMLElement, dialog);
    this.message = requireElement("[data-confirm-message]", HTMLElement, dialog);
    this.subject = requireElement("[data-confirm-subject]", HTMLElement, dialog);
    this.confirmButton = requireElement("[data-action='confirm']", HTMLButtonElement, dialog);
    this.cancelButton = requireElement("[data-action='cancel']", HTMLButtonElement, dialog);

    this.confirmButton.addEventListener("click", () => {
      this.dialog.close("confirm");
    });
    this.cancelButton.addEventListener("click", () => {
      this.dialog.close("cancel");
    });
    dialog.addEventListener("close", () => {
      // Ignora un cierre antiguo si el diálogo ya se abrió para otra confirmación.
      if (dialog.open) return;
      this.resolve?.(dialog.returnValue === "confirm");
      this.resolve = null;
      this.returnFocus?.focus();
      this.returnFocus = null;
    });
  }

  /** Abre el diálogo y resuelve `true` solo si el usuario confirma. */
  confirm(options: ConfirmOptions): Promise<boolean> {
    this.resolve?.(false);
    this.title.textContent = options.title;
    this.message.textContent = options.message;
    this.subject.textContent = options.subject;
    this.confirmButton.textContent = options.confirmLabel;
    this.dialog.returnValue = "";
    this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    return new Promise((resolve) => {
      this.resolve = resolve;
      this.dialog.showModal();
      this.cancelButton.focus();
    });
  }
}
