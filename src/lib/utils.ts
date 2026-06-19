import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return value.slice(0, 10);
}

export function cleanFilename(name: string): string {
  return name.replace(/^[a-f0-9]{8}-/i, '');
}

export function truncateFilename(name: string, max = 20): string {
  const cleaned = name.replace(/^[a-f0-9]{8}-/i, '');
  const dot = cleaned.lastIndexOf('.');
  if (dot === -1) return cleaned.length <= max + 3 ? cleaned : cleaned.slice(0, max) + '...';
  const ext = cleaned.slice(dot);
  const base = cleaned.slice(0, dot);
  if (base.length <= max) return cleaned;
  return base.slice(0, max) + '...' + ext;
}

export function formatMonth(value: string | null | undefined): string {
  if (!value) return '—';
  const [year, month] = value.split('-');
  const date = new Date(+year, +month - 1);
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}
