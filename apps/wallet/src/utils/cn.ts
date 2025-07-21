/**
 * Utility function for conditional className merging
 * Similar to clsx but simpler
 */

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}