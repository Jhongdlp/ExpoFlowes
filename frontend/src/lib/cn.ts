import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Une clases y deja ganar a la ultima: asi un componente se puede ajustar desde fuera. */
export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(classes))
}
