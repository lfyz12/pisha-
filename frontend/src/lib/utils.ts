import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number | null | undefined, fallback = "—"): string {
  if (value == null || isNaN(value)) return fallback;
  const rounded = Number(value.toFixed(2));
  if (rounded === Math.floor(rounded)) return rounded.toString();
  return rounded.toString();
}
