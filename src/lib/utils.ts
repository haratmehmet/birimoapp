import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPhoneNumber(val: string | null | undefined): string {
  if (!val) return '';
  let cleaned = val.replace(/\D/g, ''); // Sadece rakamlar
  if (cleaned.length > 11) cleaned = cleaned.slice(0, 11);
  
  let formatted = cleaned;
  if (cleaned.length > 1) {
    formatted = cleaned.slice(0, 1) + ' ' + cleaned.slice(1);
  }
  if (cleaned.length > 4) {
    formatted = cleaned.slice(0, 1) + ' ' + cleaned.slice(1, 4) + ' ' + cleaned.slice(4);
  }
  if (cleaned.length > 7) {
    formatted = cleaned.slice(0, 1) + ' ' + cleaned.slice(1, 4) + ' ' + cleaned.slice(4, 7) + ' ' + cleaned.slice(7);
  }
  if (cleaned.length > 9) {
    formatted = cleaned.slice(0, 1) + ' ' + cleaned.slice(1, 4) + ' ' + cleaned.slice(4, 7) + ' ' + cleaned.slice(7, 9) + ' ' + cleaned.slice(9, 11);
  }
  return formatted;
}
