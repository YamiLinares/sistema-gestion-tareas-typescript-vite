/**
 * Creación segura de elementos del DOM.
 * El texto siempre se asigna con `textContent`, nunca con `innerHTML`,
 * para que el contenido del usuario se muestre como texto y no como HTML.
 */
type Child = Node | string | null | undefined | false;

interface ElementOptions {
  className?: string;
  text?: string;
  attrs?: Record<string, string>;
  dataset?: Record<string, string>;
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = options.text;
  for (const [name, value] of Object.entries(options.attrs ?? {})) element.setAttribute(name, value);
  for (const [name, value] of Object.entries(options.dataset ?? {})) element.dataset[name] = value;
  for (const child of children) {
    if (child) element.append(child);
  }
  return element;
}

/** Busca un elemento obligatorio; falla pronto si falta en el HTML. */
export function requireElement<T extends Element>(selector: string, type: new () => T, root: ParentNode = document): T {
  const element = root.querySelector(selector);
  if (!(element instanceof type)) {
    throw new Error(`No se encontró el elemento requerido: ${selector}`);
  }
  return element;
}
