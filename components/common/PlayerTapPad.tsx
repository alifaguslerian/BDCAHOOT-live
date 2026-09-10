'use client';

import React, { useEffect, useCallback } from 'react';
import type { OptionId } from '@/types/quiz';
import { OPTION_CONFIGS } from '@/lib/constants';
import { sound } from '@/lib/soundFX';

export interface PlayerTapPadProps {
  id?: string;
  onSelectOption: (optionId: OptionId) => void;
  selectedOption: OptionId | null;
  disabled?: boolean;
  isLocked?: boolean;
  enableKeyboardShortcuts?: boolean;
  className?: string;
}

const ORDERED_OPTIONS: OptionId[] = ['A', 'B', 'C', 'D'];

/**
 * PlayerTapPad (Atom)
 * Large, ergonomic touch pad grid optimized for mobile player screens.
 * Exceeds the 44px WCAG touch target guideline (each pad > 90px height),
 * provides instant tactile feedback, supports keyboard inputs (1/2/3/4 or A/B/C/D),
 * and implements instant optimistic lock feedback.
 */
export const PlayerTapPad: React.FC<PlayerTapPadProps> = ({
  id = 'player-tap-pad',
  onSelectOption,
  selectedOption,
  disabled = false,
  isLocked = false,
  enableKeyboardShortcuts = true,
  className = '',
}) => {
  const handleTap = useCallback(
    (option: OptionId) => {
      if (disabled || isLocked) return;
      sound.playTap();
      onSelectOption(option);
    },
    [disabled, isLocked, onSelectOption]
  );

  // Keyboard shortcut listener (1, 2, 3, 4 or A, B, C, D)
  useEffect(() => {
    if (!enableKeyboardShortcuts || disabled || isLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const key = e.key.toUpperCase();
      let matchedOption: OptionId | null = null;

      if (key === '1' || key === 'A') matchedOption = 'A';
      else if (key === '2' || key === 'B') matchedOption = 'B';
      else if (key === '3' || key === 'C') matchedOption = 'C';
      else if (key === '4' || key === 'D') matchedOption = 'D';

      if (matchedOption) {
        e.preventDefault();
        handleTap(matchedOption);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, disabled, isLocked, handleTap]);

  return (
    <div
      id={id}
      role="group"
      aria-label="Pad Tombol Jawaban"
      className={`w-full h-full grid grid-cols-2 gap-3 sm:gap-4 p-2 sm:p-4 select-none ${className}`}
    >
      {ORDERED_OPTIONS.map((opt) => {
        const config = OPTION_CONFIGS[opt];
        const isChosen = selectedOption === opt;
        const isOtherDimmed = isLocked && !isChosen;

        let dynamicStyle = `${config.tailwindBg} text-white`;
        if (isChosen) {
          dynamicStyle += ' ring-4 ring-white shadow-2xl scale-[0.98] brightness-110';
        } else if (isOtherDimmed) {
          dynamicStyle += ' opacity-30 grayscale-[50%]';
        }

        return (
          <button
            key={opt}
            id={`player-tap-btn-${opt.toLowerCase()}`}
            type="button"
            disabled={disabled || isLocked}
            onClick={() => handleTap(opt)}
            aria-pressed={isChosen}
            aria-label={`Pilihan ${opt} - ${config.name} (${config.symbol})`}
            className={`relative flex flex-col items-center justify-center min-h-[96px] sm:min-h-[120px] rounded-2xl sm:rounded-3xl transition-all duration-150 transform cursor-pointer active:scale-95 disabled:cursor-not-allowed shadow-lg overflow-hidden ${dynamicStyle}`}
          >
            {/* Geometric Symbol */}
            <span
              className="font-anybody font-black text-4xl sm:text-5xl leading-none drop-shadow-md"
              aria-hidden="true"
            >
              {config.symbol}
            </span>

            {/* Label */}
            <span className="mt-1 font-anybody font-extrabold text-sm sm:text-base tracking-wider uppercase opacity-90">
              {opt} • {config.name}
            </span>

            {/* Locked checkmark indicator on the selected button */}
            {isChosen && (
              <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-white text-black flex items-center justify-center font-black text-xs shadow-md">
                ✓
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};
