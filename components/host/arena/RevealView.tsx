'use client';

import React, { useEffect, useState, useRef } from 'react';
import { OptionButton } from '@/components/common/OptionButton';
import { useMockGame } from '@/context/MockGameContext';
import { sound } from '@/lib/soundFX';
import { CheckCircle2, ArrowRight, BarChart3, Clock } from 'lucide-react';
import { OPTION_CONFIGS, REVEAL_DURATION_MS } from '@/lib/constants';
import type { OptionId } from '@/types/quiz';

interface RevealViewProps {
  roomCode: string;
}

export const RevealView: React.FC<RevealViewProps> = ({ roomCode }) => {
  const {
    room,
    currentQuestion,
    distribution,
    setStage,
  } = useMockGame();

  const totalPlayers = Object.keys(room.players).length;
  const currentIdx = room.currentQuestionIndex;
  const totalQuestions = room.questions.length;
  const revealDurationMs = room.settings.revealDurationMs || REVEAL_DURATION_MS;

  const [remainingSec, setRemainingSec] = useState<number>(Math.ceil(revealDurationMs / 1000));
  const hasAdvancedRef = useRef(false);

  const handleAdvance = React.useCallback(() => {
    if (hasAdvancedRef.current) return;
    hasAdvancedRef.current = true;
    sound.playTap();
    setStage('SCOREBOARD');
  }, [setStage]);

  useEffect(() => {
    sound.playSuccess();
    hasAdvancedRef.current = false;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rem = Math.max(0, Math.ceil((revealDurationMs - elapsed) / 1000));
      setRemainingSec(rem);

      if (elapsed >= revealDurationMs) {
        clearInterval(interval);
        handleAdvance();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [revealDurationMs, handleAdvance]);

  if (!currentQuestion) return null;

  const correctOptId = currentQuestion.correctOption;
  const correctConfig = OPTION_CONFIGS[correctOptId];

  // Total answers submitted across options
  const totalResponses = distribution.A + distribution.B + distribution.C + distribution.D;

  const options: OptionId[] = ['A', 'B', 'C', 'D'];

  return (
    <div className="min-h-screen bg-[#07090E] text-[#F5F7FA] flex flex-col justify-between selection:bg-[#F5A623] selection:text-black">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-[#1E2530] bg-[#0E121B]/90 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-[#181F2C] border border-[#232C3E] text-xs font-anybody font-extrabold text-[#F5A623]">
            PIN: {roomCode}
          </div>
          <span className="text-xs text-[#8B93A1] font-space">
            Hasil Soal {currentIdx + 1} dari {totalQuestions}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181F2C] border border-[#232C3E] text-xs font-space text-[#8B93A1]">
            <Clock className="w-3.5 h-3.5 text-[#F5A623]" />
            <span>Menuju Klasemen: <strong>{remainingSec}s</strong></span>
          </div>

          <button
            type="button"
            onClick={handleAdvance}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#F5A623] to-[#FF8C00] text-black font-anybody font-extrabold text-sm hover:brightness-110 active:scale-95 transition-all shadow-md"
          >
            <span>Klasemen</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content: Question prompt + Correct Highlight + Distribution Chart */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-6xl mx-auto w-full">
        {/* Question Title Recap */}
        <div className="text-center py-2 px-4 max-w-4xl">
          <h2 className="font-anybody font-bold text-2xl sm:text-3xl text-white/90 line-clamp-2">
            {currentQuestion.question}
          </h2>
        </div>

        {/* Answer Announcement Banner */}
        <div className="my-4 inline-flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 shadow-lg text-emerald-300 font-anybody font-black text-lg sm:text-xl">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          <span>Jawaban Benar: OPSI {correctOptId} ({correctConfig.symbol} {correctConfig.name})</span>
        </div>

        {/* Aggregate Option Distribution Bar Chart */}
        <div className="w-full max-w-2xl bg-[#0E121B] border border-[#1E2530] rounded-2xl p-5 my-4 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#1E2530] text-xs font-space text-[#8B93A1]">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-white">
              <BarChart3 className="w-4 h-4 text-[#F5A623]" />
              Distribusi Jawaban Peserta
            </span>
            <span>
              {totalResponses} / {totalPlayers} Menjawab
            </span>
          </div>

          {/* 4 Distribution Bars */}
          <div className="grid grid-cols-4 gap-3 sm:gap-6 items-end h-40 pt-4 px-2">
            {options.map((optId) => {
              const count = distribution[optId] || 0;
              const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
              const isCorrect = optId === correctOptId;
              const cfg = OPTION_CONFIGS[optId];

              return (
                <div key={optId} className="flex flex-col items-center h-full justify-end gap-2 group">
                  {/* Count & Percentage label */}
                  <div className="text-center">
                    <div className="font-anybody font-black text-lg sm:text-xl text-white tabular-nums">
                      {count}
                    </div>
                    <div className="text-[10px] sm:text-xs text-[#8B93A1] font-space font-semibold tabular-nums">
                      {percentage.toFixed(0)}%
                    </div>
                  </div>

                  {/* Colored Vertical Bar */}
                  <div className="w-full bg-[#181F2C] rounded-t-xl h-24 relative overflow-hidden flex flex-col justify-end">
                    <div
                      className={`w-full rounded-t-xl transition-all duration-700 ${
                        isCorrect
                          ? `${cfg.tailwindBg} shadow-[0_0_15px_rgba(255,255,255,0.4)]`
                          : `${cfg.tailwindBg} opacity-60`
                      }`}
                      style={{ height: `${Math.max(8, percentage)}%` }}
                    />
                  </div>

                  {/* Option Symbol Tag */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-anybody font-black text-sm shadow-sm transition-transform ${
                      isCorrect
                        ? 'bg-white text-black ring-2 ring-emerald-400 scale-110'
                        : `${cfg.tailwindBg} text-white opacity-70`
                    }`}
                  >
                    {cfg.symbol}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4 Option Buttons (with Winning Highlight & Losers Dimmed) */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-2">
          {currentQuestion.options.map((opt) => {
            const optId = opt.id as OptionId;
            const isCorrect = optId === correctOptId;
            const voteCount = distribution[optId] || 0;
            const votePercentage = totalResponses > 0 ? (voteCount / totalResponses) * 100 : 0;

            return (
              <OptionButton
                key={opt.id}
                optionId={optId}
                text={opt.text}
                isRevealed={true}
                isCorrect={isCorrect}
                voteCount={voteCount}
                votePercentage={votePercentage}
                showVoteStats={true}
                size="lg"
                disabled={true}
              />
            );
          })}
        </div>
      </main>

      {/* Auto-Advance Bottom Progress Bar */}
      <footer className="w-full bg-[#0E121B] border-t border-[#1E2530] p-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-[#8B93A1] font-space px-4">
          <span>Otomatis berpindah dalam {remainingSec} detik...</span>
          <button
            type="button"
            onClick={handleAdvance}
            className="text-[#F5A623] hover:underline font-bold"
          >
            Lewati Timer ➔
          </button>
        </div>
      </footer>
    </div>
  );
};
