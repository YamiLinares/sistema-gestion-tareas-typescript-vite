const dateFormatter = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Fecha legible en español, p. ej. «25 oct 2026, 10:30». */
export function formatDateTime(iso: string): string {
  return dateFormatter.format(new Date(iso));
}
