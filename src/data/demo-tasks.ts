import type { TaskDraft } from "../types/task";

/** Tareas de ejemplo: solo se cargan si el usuario lo pide con la lista vacía. */
export const DEMO_TASKS: readonly TaskDraft[] = [
  {
    title: "Preparar la exposición de TypeScript",
    description: "Repasar tipos, interfaces y genéricos.\nIncluir un ejemplo práctico con Vite.",
    category: "study",
    priority: "high",
  },
  {
    title: "Enviar el informe semanal",
    description: "Resumir avances y bloqueos del equipo.",
    category: "work",
    priority: "medium",
  },
  {
    title: "Comprar víveres",
    description: "Frutas, verduras y café.",
    category: "personal",
    priority: "low",
  },
  {
    title: "Renovar la suscripción del dominio",
    description: "",
    category: "other",
    priority: "medium",
  },
];
