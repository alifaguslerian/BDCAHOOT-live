import type { PublicQuestion } from '@/types/network';

export function questionTextSize(text: string): string {
  if (text.length > 200) return 'text-xl sm:text-2xl';
  if (text.length > 120) return 'text-2xl sm:text-[28px] lg:text-[32px]';
  return 'text-3xl sm:text-4xl lg:text-5xl';
}

export function hasLongOptions(options: PublicQuestion['options'], limit = 180): boolean {
  return options.some(option => option.text.length > limit || option.text.includes('\n'));
}
