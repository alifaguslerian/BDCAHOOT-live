'use client';

import React from 'react';
import type { OptionId } from '@/types/quiz';
import { OPTION_CONFIGS } from '@/lib/constants';

export interface OptionButtonProps {
  id?: string;
  optionId: OptionId;
  text?: string;
  onClick?: () => void;
  disabled?: boolean;
  isSelected?: boolean;
  isCorrect?: boolean;
  isRevealed?: boolean;
  voteCount?: number;
  votePercentage?: number;
  showVoteStats?: boolean;
  className?: string;
  size?: 'md' | 'lg' | 'projector';
}

/**
 * OptionButton (Atom)
 * Accessible geometric + high-contrast card for quiz options (▲, ◆, ●, ■).
 * Meets WCAG AA > 4.5:1 contrast requirements and provides rich stage states.
 */
export const OptionButton: React.FC<OptionButtonProps> = ({
  id,
  optionId,
  text,
  onClick,
  disabled = false,
  isSelected = false,
  isCorrect = false,
  isRevealed = false,
  voteCount,
  votePercentage = 0,
  showVoteStats = false,
  className = '',
  size = 'lg',
}) => {
  const config = OPTION_CONFIGS[optionId];

  // Visual state computation using canonical constants
  let stateClasses = `${config.tailwindBg} text-white border-transparent`;
  let opacityClass = 'opacity-100';

  if (isRevealed) {
    if (isCorrect) {
      stateClasses = `${config.tailwindBg} text-white ring-4 ring-white shadow-2xl scale-[1.01] brightness-110`;
    } else {
      opacityClass = 'opacity-25 grayscale-[40%]';
    }
  } else if (isSelected) {
    stateClasses = `${config.tailwindBg} text-white ring-4 ring-[#ffc880] shadow-xl`;
  }

  const sizeClasses = {
    md: 'min-h-[68px] p-3 text-base rounded-xl',
    lg: 'min-h-[88px] p-4 sm:p-5 text-lg sm:text-xl rounded-2xl',
    projector: 'min-h-[110px] xl:min-h-[130px] p-5 sm:p-6 text-xl sm:text-2xl rounded-2xl',
  }[size];

  return (
    <button
      id={id ?? `option-button-${optionId.toLowerCase()}`}
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={`Pilihan ${optionId}: ${text || config.name}`}
      className={`relative w-full overflow-hidden text-left font-space font-bold transition-all duration-200 select-none cursor-pointer active:scale-[0.99] disabled:cursor-default ${sizeClasses} ${stateClasses} ${opacityClass} ${className}`}
    >
      {/* Background Vote Percentage Bar (during Reveal Stage) */}
      {showVoteStats && (
        <div
          className="absolute inset-0 bg-black/25 transition-all duration-700 pointer-events-none"
          style={{ width: `${Math.min(100, Math.max(0, votePercentage))}%` }}
        />
      )}

      <div className="relative z-10 flex items-center justify-between gap-3 h-full">
        {/* Left: Shape Icon + Option Letter + Text */}
        <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-black/25 flex items-center justify-center shrink-0 shadow-inner"
            aria-hidden="true"
          >
            <span className="font-anybody font-black text-xl sm:text-2xl leading-none">
              {config.symbol}
            </span>
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs uppercase tracking-wider opacity-85 font-anybody font-extrabold">
              OPSI {optionId} • {config.name}
            </span>
            {text && (
              <span className="font-space font-bold text-base sm:text-lg lg:text-xl leading-snug line-clamp-2 drop-shadow-sm">
                {text}
              </span>
            )}
          </div>
        </div>

        {/* Right: Reveal Checkmark / Vote Stat */}
        <div className="flex items-center gap-2 shrink-0">
          {showVoteStats && typeof voteCount === 'number' && (
            <div className="text-right">
              <div className="font-anybody font-black text-xl sm:text-2xl tabular-nums leading-none">
                {voteCount}
              </div>
              <div className="text-xs opacity-80 font-space font-semibold tabular-nums">
                {votePercentage.toFixed(0)}%
              </div>
            </div>
          )}

          {isRevealed && isCorrect && (
            <div
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white text-black flex items-center justify-center font-anybody font-black text-lg sm:text-xl shadow-md animate-bounce"
              title="Jawaban Benar"
            >
              ✓
            </div>
          )}
        </div>
      </div>
    </button>
  );
};
