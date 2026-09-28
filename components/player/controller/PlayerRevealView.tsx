'use client';

import React, { useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Sparkles,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useMockGame } from '@/context/MockGameContext';
import { sound, triggerHaptic } from '@/lib/soundFX';
import type { QuizQuestion, OptionId } from '@/types/quiz';
import type { Player, PlayerAnswer } from '@/types/game';

interface PlayerRevealViewProps {
  player: Player;
  question: QuizQuestion;
  questionIndex: number;
}

export function PlayerRevealView({
  player,
  question,
  questionIndex,
}: PlayerRevealViewProps) {
  const { getPlayerAnswer } = useMockGame();
  const answer = getPlayerAnswer(player.id, questionIndex);

  const isAnswered = Boolean(answer);
  const isCorrect = Boolean(answer?.isCorrect);
  const pointsEarned = answer?.pointsEarned ?? 0;
  const speedBonus = answer?.speedBonus ?? 0;
  const basePoints = isCorrect ? 1000 : 0;
  const responseSeconds = answer ? (answer.responseDurationMs / 1000).toFixed(2) : null;

  const playerOption = answer?.selectedOption;
  const correctOption = question.correctOption;

  useEffect(() => {
    if (isCorrect) {
      sound.playSuccess();
      triggerHaptic([30, 60, 30]);
    } else {
      sound.playError();
      triggerHaptic(50);
    }
  }, [isCorrect]);

  return (
    <div className="w-full max-w-md mx-auto min-h-screen flex flex-col justify-between p-4 sm:p-6 bg-[#0B0E14] text-[#E1E2EB] select-none">
      {/* Top Bar */}
      <header className="flex items-center justify-between text-xs font-space border-b border-[#1E2530] pb-2 text-[#8B93A1]">
        <span className="font-bold uppercase tracking-wider text-[#D7C3AE]">
          HASIL SOAL #{questionIndex + 1}
        </span>
        <span className="text-[10px] bg-[#151A22] px-2 py-0.5 rounded border border-[#272A31]">
          PRIVAT & RAHASIA
        </span>
      </header>

      {/* Main Feedback Hero Card */}
      <main className="flex-1 flex flex-col justify-center py-4 space-y-4">
        {/* Outcome Card */}
        {isCorrect ? (
          <div className="bg-[#10B981]/10 border-2 border-[#10B981] rounded-2xl p-6 text-center shadow-2xl shadow-[#10B981]/20 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-[#10B981]/20 border border-[#10B981] text-[#85E28A] flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full bg-[#10B981]/30 text-[#85E28A] font-anybody font-black text-xs uppercase tracking-wider mb-1">
              JAWABAN TEPAT
            </span>
            <h1 className="font-anybody font-black text-3xl sm:text-4xl text-[#85E28A] tracking-tight uppercase">
              BENAR! 🎉
            </h1>

            {/* Score Pill */}
            <div className="mt-4 pt-4 border-t border-[#10B981]/30 flex flex-col items-center">
              <span className="text-xs font-space text-[#8B93A1] uppercase tracking-wider">
                Total Poin Diperoleh
              </span>
              <span className="font-anybody font-black text-3xl text-[#FFC880] tracking-wide mt-1">
                +{pointsEarned.toLocaleString()} PTS
              </span>
            </div>
          </div>
        ) : isAnswered ? (
          <div className="bg-[#EF4444]/10 border-2 border-[#EF4444] rounded-2xl p-6 text-center shadow-2xl shadow-[#EF4444]/20 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-[#EF4444]/20 border border-[#EF4444] text-[#FFB4AB] flex items-center justify-center mx-auto mb-3">
              <XCircle className="w-10 h-10 stroke-[2.5]" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full bg-[#EF4444]/30 text-[#FFB4AB] font-anybody font-black text-xs uppercase tracking-wider mb-1">
              KURANG TEPAT
            </span>
            <h1 className="font-anybody font-black text-3xl sm:text-4xl text-[#FFB4AB] tracking-tight uppercase">
              SALAH ❌
            </h1>

            {/* Score Pill */}
            <div className="mt-4 pt-4 border-t border-[#EF4444]/30 flex flex-col items-center">
              <span className="text-xs font-space text-[#8B93A1] uppercase tracking-wider">
                Total Poin Diperoleh
              </span>
              <span className="font-anybody font-black text-3xl text-[#8B93A1] tracking-wide mt-1">
                +0 PTS
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-[#F59E0B]/10 border-2 border-[#F59E0B] rounded-2xl p-6 text-center shadow-2xl shadow-[#F59E0B]/20 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-[#F59E0B]/20 border border-[#F59E0B] text-[#FFC880] flex items-center justify-center mx-auto mb-3">
              <Clock className="w-10 h-10 stroke-[2.5]" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full bg-[#F59E0B]/30 text-[#FFC880] font-anybody font-black text-xs uppercase tracking-wider mb-1">
              WAKTU HABIS
            </span>
            <h1 className="font-anybody font-black text-2xl sm:text-3xl text-[#FFC880] tracking-tight uppercase">
              TIDAK MENJAWAB ⏳
            </h1>

            {/* Score Pill */}
            <div className="mt-4 pt-4 border-t border-[#F59E0B]/30 flex flex-col items-center">
              <span className="text-xs font-space text-[#8B93A1] uppercase tracking-wider">
                Total Poin Diperoleh
              </span>
              <span className="font-anybody font-black text-3xl text-[#8B93A1] tracking-wide mt-1">
                +0 PTS
              </span>
            </div>
          </div>
        )}

        {/* Detailed Breakdown Card */}
        <div className="bg-[#151A22] border border-[#272A31] rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-space font-bold uppercase tracking-wider text-[#8B93A1] border-b border-[#272A31] pb-2 flex items-center justify-between">
            <span>Rincian Nilai Soal</span>
            {responseSeconds && (
              <span className="text-[#FFC880] font-normal lowercase flex items-center gap-1">
                <Zap className="w-3 h-3 text-[#F5A623]" />
                {responseSeconds} detik
              </span>
            )}
          </h2>

          <div className="space-y-2 text-xs font-space">
            <div className="flex justify-between items-center text-[#D7C3AE]">
              <span>Poin Dasar (Jawaban Benar):</span>
              <span className="font-bold text-[#E1E2EB]">+{basePoints} pts</span>
            </div>

            <div className="flex justify-between items-center text-[#D7C3AE]">
              <span>Bonus Kecepatan:</span>
              <span className={`font-bold ${speedBonus > 0 ? 'text-[#85E28A]' : 'text-[#8B93A1]'}`}>
                +{speedBonus} pts
              </span>
            </div>

            <div className="pt-2 border-t border-[#272A31] flex justify-between items-center text-xs">
              <span className="text-[#8B93A1]">Pilihan Kamu:</span>
              <span className="font-anybody font-bold text-sm text-[#FFC880]">
                {playerOption ? `PILIHAN ${playerOption}` : 'TIDAK MEMILIH'}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-[#8B93A1]">Kunci Jawaban:</span>
              <span className="font-anybody font-bold text-sm text-[#85E28A]">
                PILIHAN {correctOption} ({question.options.find((o) => o.id === correctOption)?.text || ''})
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Status */}
      <footer className="py-2 text-center text-xs font-space text-[#8B93A1] flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#F5A623] animate-ping" />
        <span>Menuju papan klasemen sementara...</span>
      </footer>
    </div>
  );
}
