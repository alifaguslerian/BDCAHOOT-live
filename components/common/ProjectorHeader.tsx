'use client';

import React from 'react';
import { Users, Hash } from 'lucide-react';

export interface ProjectorHeaderProps {
  id?: string;
  roomCode: string;
  questionIndex: number;
  totalQuestions: number;
  timerRemainingSec: number;
  timerTotalSec: number;
  answeredCount: number;
  totalPlayers: number;
  isPaused?: boolean;
  className?: string;
}

/**
 * ProjectorHeader (Atom)
 * Large-scale header and countdown display for the arena projector display.
 * Includes tabular timer typography, proportional countdown progress bar,
 * live answer progress counter, and active room code.
 */
export const ProjectorHeader: React.FC<ProjectorHeaderProps> = ({
  id = 'projector-header',
  roomCode,
  questionIndex,
  totalQuestions,
  timerRemainingSec,
  timerTotalSec,
  answeredCount,
  totalPlayers,
  isPaused = false,
  className = '',
}) => {
  const progressRatio = Math.max(0, Math.min(1, timerRemainingSec / (timerTotalSec || 1)));
  const percentage = progressRatio * 100;

  // Warning colors when timer <= 5s
  const isUrgent = timerRemainingSec <= 5;
  const timerTextColor = isUrgent ? 'text-[#ffb4ab] animate-pulse' : 'text-[#e1e2eb]';
  const progressColor = isUrgent
    ? 'bg-gradient-to-r from-[#ba1a1a] to-[#ff5449]'
    : 'bg-gradient-to-r from-[#f5a623] to-[#ffc880]';

  return (
    <header
      id={id}
      className={`w-full bg-[#111318]/90 border-b border-[#2d3038] backdrop-blur-md px-6 py-4 flex flex-col gap-3 ${className}`}
    >
      {/* Top Row: Room Code, Question Counter, Live Answered Count */}
      <div className="flex items-center justify-between gap-4">
        {/* Left: Room PIN Badge */}
        <div className="flex items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-lg bg-[#282a30] border border-[#3c4049] flex items-center gap-2">
            <span className="text-[10px] sm:text-xs font-anybody font-extrabold uppercase tracking-widest text-[#8b93a1]">
              PIN
            </span>
            <span className="font-anybody font-black text-lg sm:text-xl text-[#f5a623] tracking-widest tabular-nums">
              {roomCode}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1 text-xs font-space text-[#8b93a1]">
            <Hash className="w-3.5 h-3.5 text-[#5e6573]" />
            <span>BDCAHOOT ARENA</span>
          </div>
        </div>

        {/* Center: Question Progress */}
        <div className="text-center">
          <span className="text-xs sm:text-sm font-anybody font-extrabold uppercase tracking-wider text-[#8b93a1]">
            SOAL
          </span>
          <div className="font-anybody font-black text-xl sm:text-2xl text-[#e1e2eb] tabular-nums">
            {questionIndex + 1}{' '}
            <span className="text-sm sm:text-base font-normal text-[#5e6573]">
              / {totalQuestions}
            </span>
          </div>
        </div>

        {/* Right: Live Answered Counter */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-[#1a1c22] border border-[#2d3038] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#8b93a1]" />
            <div className="flex items-baseline gap-1">
              <span className="font-anybody font-black text-base sm:text-lg text-[#3b82f6] tabular-nums">
                {answeredCount}
              </span>
              <span className="text-xs text-[#8b93a1] font-space">
                /{totalPlayers}
              </span>
            </div>
            <span className="hidden sm:inline text-[11px] font-space text-[#8b93a1] uppercase font-semibold">
              Menjawab
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Giant Timer Display & Progress Bar */}
      <div className="w-full flex items-center gap-4 pt-1">
        {/* Large Seconds Clock */}
        <div className="shrink-0 flex items-baseline gap-1 min-w-[70px] sm:min-w-[85px]">
          <span
            className={`font-anybody font-black text-3xl sm:text-4xl tabular-nums leading-none tracking-tight ${timerTextColor}`}
          >
            {Math.max(0, Math.ceil(timerRemainingSec))}
          </span>
          <span className="text-xs uppercase font-anybody font-bold text-[#8b93a1]">
            DETIK
          </span>
        </div>

        {/* Dynamic Countdown Bar */}
        <div className="flex-1 h-3 sm:h-4 bg-[#1e2025] rounded-full overflow-hidden p-0.5 border border-[#2d3038]/80 shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-300 ease-linear shadow-sm ${progressColor}`}
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={timerRemainingSec}
            aria-valuemin={0}
            aria-valuemax={timerTotalSec}
          />
        </div>

        {isPaused && (
          <span className="text-xs font-anybody font-bold text-[#ffc880] uppercase bg-[#3f2e00] px-2 py-0.5 rounded">
            PAUSED
          </span>
        )}
      </div>
    </header>
  );
};
