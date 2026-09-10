import type { OptionId } from '@/types/quiz';

export const COLOR_TOKENS = {
  bgBase: '#0B0E14',
  bgSurface: '#151A22',
  accentPrimary: '#F5A623',
  textPrimary: '#F5F7FA',
  textMuted: '#8B93A1',
  stateCorrect: '#3ECF8E',
  stateDisconnected: '#8B93A1',
} as const;

export interface OptionVisualConfig {
  id: OptionId;
  name: string;
  color: string;
  shape: 'triangle' | 'diamond' | 'circle' | 'square';
  symbol: string;
  tailwindBg: string;
  tailwindBorder: string;
}

export const OPTION_CONFIGS: Record<OptionId, OptionVisualConfig> = {
  A: {
    id: 'A',
    name: 'Merah',
    color: '#F04438',
    shape: 'triangle',
    symbol: '▲',
    tailwindBg: 'bg-[#F04438]',
    tailwindBorder: 'border-[#F04438]',
  },
  B: {
    id: 'B',
    name: 'Biru',
    color: '#3B82F6',
    shape: 'diamond',
    symbol: '◆',
    tailwindBg: 'bg-[#3B82F6]',
    tailwindBorder: 'border-[#3B82F6]',
  },
  C: {
    id: 'C',
    name: 'Kuning',
    color: '#EAB308',
    shape: 'circle',
    symbol: '●',
    tailwindBg: 'bg-[#EAB308]',
    tailwindBorder: 'border-[#EAB308]',
  },
  D: {
    id: 'D',
    name: 'Hijau',
    color: '#22C55E',
    shape: 'square',
    symbol: '■',
    tailwindBg: 'bg-[#22C55E]',
    tailwindBorder: 'border-[#22C55E]',
  },
};

export const TIMER_PRESETS = [10, 15, 20, 30] as const;
export const DEFAULT_TIMER_SECONDS = 20;
export const REVEAL_DURATION_MS = 4000; // 3-5 seconds auto-transition to scoreboard
export const MIN_PLAYERS_TO_START = 1;

/** Anti-cheat & Network Late Packet Grace Period */
export const ANSWER_GRACE_PERIOD_MS = 200;

/** High-concurrency state update batch throttle window */
export const BATCH_FLUSH_INTERVAL_MS = 300;

/** Default fallback room code for dev/test */
export const DEFAULT_ROOM_CODE = 'BDA729';

/**
 * Generate a randomized 6-character room PIN.
 * Prefix: BDA (Bandung Digital Campus / BDCAHOOT brand)
 * Suffix: 3 unambiguous alphanumeric characters (no 0, O, 1, I)
 */
export function generateRoomCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let suffix = '';
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(Math.random() * chars.length);
    suffix += chars[idx];
  }
  return `BDA${suffix}`;
}
