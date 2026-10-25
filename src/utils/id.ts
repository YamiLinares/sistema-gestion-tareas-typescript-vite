/** Genera un identificador único con la API Web Crypto (con respaldo para navegadores antiguos). */
export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const random = new Uint32Array(4);
  crypto.getRandomValues(random);
  return `${Date.now().toString(36)}-${Array.from(random, (part) => part.toString(36)).join("")}`;
}
