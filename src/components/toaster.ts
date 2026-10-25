/** Notificaciones discretas y accesibles (sustituyen a `alert()`). */
import { createElement } from "../utils/dom";
import { createIcon, type IconName } from "./icons";

export type ToastVariant = "success" | "error" | "warning";

const VARIANT_ICONS: Record<ToastVariant, IconName> = {
  success: "checkCircle",
  error: "alert",
  warning: "info",
};

const DURATION_MS: Record<ToastVariant, number> = {
  success: 3500,
  warning: 6000,
  error: 8000,
};

export class Toaster {
  constructor(private readonly container: HTMLElement) {}

  show(message: string, variant: ToastVariant = "success"): void {
    const close = createElement("button", {
      className: "icon-button toast__close",
      attrs: { type: "button", "aria-label": "Cerrar notificación" },
    }, [createIcon("x", 16)]);

    const toast = createElement(
      "div",
      // Los errores se anuncian de inmediato; el resto, de forma educada.
      { className: `toast toast--${variant}`, attrs: { role: variant === "error" ? "alert" : "status" } },
      [
        createElement("span", { className: "toast__icon" }, [createIcon(VARIANT_ICONS[variant])]),
        createElement("p", { className: "toast__message", text: message }),
        close,
      ],
    );

    const remove = () => {
      toast.remove();
    };
    close.addEventListener("click", remove);
    window.setTimeout(remove, DURATION_MS[variant]);
    this.container.append(toast);
  }
}
