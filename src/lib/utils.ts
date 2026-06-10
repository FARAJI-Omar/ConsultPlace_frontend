import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return value.slice(0, 10);
}

export function formatMonth(value: string | null | undefined): string {
  if (!value) return '—';
  const [year, month] = value.split('-');
  const date = new Date(+year, +month - 1);
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}
