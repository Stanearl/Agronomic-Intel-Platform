import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names safely, resolving conflicting utility
 * classes (e.g. padding overrides) in the order they are provided.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
