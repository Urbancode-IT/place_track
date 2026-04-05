import { twMerge } from 'tailwind-merge';

export function cn(...classes) {
  return twMerge(classes.filter(Boolean));
}

export function getInitials(name) {
  return name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';
}
