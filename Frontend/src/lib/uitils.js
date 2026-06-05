import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
 
/**
 * Merges Tailwind CSS classes safely using clsx + tailwind-merge.
 * Resolves class conflicts (e.g. `p-2` + `p-4` → `p-4`).
 * @param {...(string|undefined|null|boolean|object)} inputs
 * @returns {string}
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
 