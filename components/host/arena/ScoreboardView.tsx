'use client';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';

import React, { useEffect, useState } from 'react';
import { useGame } from '@/context/GameContext';
import { sound } from '@/lib/soundFX';
import {
  Trophy,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Loader2,
  Crown,
  Medal,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

interface ScoreboardViewProps {
  roomCode: string;
}

export const ScoreboardView: React.FC<ScoreboardViewProps> = ({ roomCode }) => {
  const {
    room,
    rankings,
    nextQuestion,
    finishQuiz,
    isHostActionLoading,
  } = useGame();

  const currentIdx = room.currentQuestionIndex;
  const totalQuestions = room.totalQuestions;
  const isLastQuestion = currentIdx >= totalQuestions - 1;

  const reduceMotion = useReducedMotion();
  const [settledQuestion, setSettledQuestion] = useState<number | null>(null);
  const settled = reduceMotion || settledQuestion === currentIdx;
  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setTimeout(() => setSettledQuestion(currentIdx), 650);
    return () => window.clearTimeout(timer);
  }, [currentIdx, reduceMotion]);

  // This view remounts each round, so start in the previous relative order.
  const topTen = rankings.slice(0, 10);
  if (!settled) topTen.sort((a, b) => a.previousRank - b.previousRank || a.rank - b.rank);

  const handleNextAction = () => {
    if (isHostActionLoading) return;
    sound.playTap();
    if (isLastQuestion) {
      finishQuiz();
    } else {
      nextQuestion();
    }
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-[#F5F7FA] flex flex-col justify-between selection:bg-[#F5A623] selection:text-black">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-[#1E2530] bg-[#0E121B]/90 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-[#181F2C] border border-[#232C3E] text-xs font-anybody font-extrabold text-[#F5A623]">
            PIN: {roomCode}
          </div>
          <div>
            <h1 className="font-anybody font-black text-lg text-white">
              KLASEMEN SEMENTARA
            </h1>
            <p className="text-xs text-[#8B93A1] font-space">
              Setelah Soal {currentIdx + 1} dari {totalQuestions}
            </p>
          </div>
        </div>

        {/* Debounced Continue Button */}
        <button
          id="btn-scoreboard-continue"
          type="button"
          disabled={isHostActionLoading}
          onClick={handleNextAction}
          className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl font-anybody font-extrabold text-base transition-all shadow-xl active:scale-95 ${
            isHostActionLoading
              ? 'bg-[#181F2C] text-[#8B93A1] border border-[#232C3E] cursor-not-allowed'
              : 'bg-gradient-to-r from-[#F5A623] to-[#FF8C00] text-black hover:brightness-110 cursor-pointer ring-4 ring-[#F5A623]/20'
          }`}
        >
          {isHostActionLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Memproses...</span>
            </>
          ) : isLastQuestion ? (
            <>
              <Trophy className="w-5 h-5 fill-current" />
              <span>LIHAT PODIUM JUARA</span>
              <ArrowRight className="w-5 h-5" />
            </>
          ) : (
            <>
              <span>LANJUT KE SOAL {currentIdx + 2}</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </header>

      {/* Main Content: Top 10 Leaderboard Table */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full">
        <div className="w-full bg-[#0E121B] border border-[#1E2530] rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-[#1E2530] mb-4 text-xs font-space text-[#8B93A1]">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#F5A623]" />
              <span className="font-bold text-white uppercase tracking-wider">
                TOP 10 PERINGKAT
              </span>
            </div>
            <span>{rankings.length} Total Peserta</span>
          </div>

          {topTen.length === 0 ? (
            <div className="text-center py-12 text-[#8B93A1] font-space text-sm">
              Belum ada data nilai peserta.
            </div>
          ) : (
            <div className="space-y-2.5">
              {topTen.map((item) => {
                const displayedRank = settled ? item.rank : item.previousRank;
                const isFirst = displayedRank === 1;
                const isSecond = displayedRank === 2;
                const isThird = displayedRank === 3;

                // Rank delta badge logic
                let deltaBadge = null;
                if (item.rankDelta > 0) {
                  deltaBadge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 text-xs font-space font-bold">
                      <TrendingUp className="w-3 h-3" />
                      <span>↑{item.rankDelta} NAIK</span>
                    </span>
                  );
                } else if (item.rankDelta < 0) {
                  deltaBadge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/50 text-rose-400 text-xs font-space font-bold">
                      <TrendingDown className="w-3 h-3" />
                      <span>↓{Math.abs(item.rankDelta)} TURUN</span>
                    </span>
                  );
                } else {
                  deltaBadge = (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#181F2C] border border-[#232C3E] text-[#8B93A1] text-xs font-space font-semibold">
                      <Minus className="w-3 h-3" />
                      <span>TETAP</span>
                    </span>
                  );
                }

                return (
                  <motion.div
                    key={item.playerId}
                    layout={reduceMotion ? false : 'position'}
                    initial={false}
                    data-player-id={item.playerId}
                    transition={{ layout: { duration: 0.5, ease: [0.23, 1, 0.32, 1] } }}
                    className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-colors ${
                      isFirst
                        ? 'bg-gradient-to-r from-[#F5A623]/15 to-[#FF8C00]/5 border-[#F5A623]/60 shadow-lg'
                        : isSecond
                        ? 'bg-[#181F2C]/90 border-[#A0AAB8]/40'
                        : isThird
                        ? 'bg-[#181F2C]/80 border-[#CD7F32]/40'
                        : 'bg-[#131926]/70 border-[#1E2530] hover:border-[#2A3446]'
                    }`}
                  >
                    {/* Left: Rank Number + Name + Delta Badge */}
                    <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-anybody font-black text-base sm:text-lg shrink-0 ${
                          isFirst
                            ? 'bg-gradient-to-tr from-[#F5A623] to-[#FF8C00] text-black shadow-md'
                            : isSecond
                            ? 'bg-[#A0AAB8] text-black'
                            : isThird
                            ? 'bg-[#CD7F32] text-white'
                            : 'bg-[#1E2530] text-[#8B93A1]'
                        }`}
                      >
                        {isFirst ? (
                          <Crown className="w-5 h-5 fill-current" />
                        ) : (
                          <span>#{displayedRank}</span>
                        )}
                      </div>

                      <PlayerAvatar avatarId={item.avatarId} size={40} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-space font-bold text-base sm:text-lg truncate tracking-wide ${
                              isFirst ? 'text-[#F5A623]' : 'text-white'
                            }`}
                          >
                            {item.name}
                          </span>
                          {isFirst && (
                            <span className="text-[10px] font-anybody font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#F5A623]/20 text-[#F5A623]">
                              LEADER
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Delta Badge + Score */}
                    <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                      <div className="hidden sm:block">{settled && deltaBadge}</div>
                      <div className="text-right">
                        <div className="font-anybody font-black text-lg sm:text-xl text-white tabular-nums">
                          {item.score.toLocaleString('id-ID')}
                        </div>
                        <div className="text-[10px] text-[#8B93A1] font-space font-medium -mt-1">
                          pts
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Footer Instructions */}
      <footer className="p-4 border-t border-[#1E2530] bg-[#0E121B] text-center text-xs text-[#8B93A1] font-space">
        Klik tombol di atas untuk melanjutkan babak permainan.
      </footer>
    </div>
  );
};
