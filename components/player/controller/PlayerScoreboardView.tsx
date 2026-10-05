'use client';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';

import React from 'react';
import {
  Trophy,
  Crown,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Zap,
  Target,
  Clock,
  Radio,
} from 'lucide-react';
import { useGame } from '@/context/GameContext';
import type { Player } from '@/types/game';

interface PlayerScoreboardViewProps {
  player: Player;
}

export function PlayerScoreboardView({ player }: PlayerScoreboardViewProps) {
  const { room, rankings } = useGame();

  const totalPlayers = Object.keys(room.players).length;
  const currentRankItem = rankings.find((r) => r.playerId === player.id);
  const myRank = currentRankItem?.rank ?? 1;
  const rankDelta = currentRankItem?.rankDelta ?? 0;
  const totalScore = player.score;

  // Leader comparison
  const leader = rankings[0];
  const isLeader = myRank === 1;
  const gapToLeader = leader ? Math.max(0, leader.score - totalScore) : 0;

  // Stats so far
  const totalQuestionsDone = room.currentQuestionIndex + 1;
  const answersList = Object.values(player.answers);
  const correctCount = answersList.filter((a) => a.isCorrect).length;
  const isLastQuestion = room.currentQuestionIndex >= room.totalQuestions - 1;

  return (
    <div className="w-full max-w-md mx-auto min-h-screen flex flex-col justify-between p-4 sm:p-6 bg-[#0B0E14] text-[#E1E2EB] select-none">
      {/* Header */}
      <header className="flex items-center justify-between text-xs font-space border-b border-[#1E2530] pb-2 text-[#8B93A1]">
        <div className="flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-[#FFC880]" />
          <span className="font-bold uppercase tracking-wider text-[#E1E2EB]">
            KLASEMEN SEMENTARA
          </span>
        </div>
        <span className="text-[10px] bg-[#151A22] px-2 py-0.5 rounded border border-[#272A31]">
          SOAL {totalQuestionsDone} DARI {room.totalQuestions}
        </span>
      </header>

      {/* Main Rank Hero */}
      <main className="flex-1 flex flex-col justify-center py-4 space-y-4">
        <PlayerAvatar avatarId={player.avatarId} size={64} className="mx-auto mb-4" />
        {/* Giant Rank Card */}
        <div className="bg-[#151A22] border-2 border-[#272A31] rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden">
          {/* Subtle background glow */}
          {isLeader ? (
            <div className="absolute inset-0 bg-[#F5A623]/10 blur-2xl pointer-events-none" />
          ) : (
            <div className="absolute inset-0 bg-[#3B82F6]/5 blur-2xl pointer-events-none" />
          )}

          <div className="relative z-10 flex flex-col items-center">
            {/* Crown for leader or trophy for others */}
            {isLeader ? (
              <div className="w-14 h-14 rounded-2xl bg-[#F5A623]/20 border border-[#F5A623] text-[#FFC880] flex items-center justify-center mb-2 shadow-lg shadow-[#F5A623]/20 animate-bounce">
                <Crown className="w-8 h-8 stroke-[2.2]" />
              </div>
            ) : myRank <= 3 ? (
              <div className="w-14 h-14 rounded-2xl bg-[#E1E2EB]/10 border border-[#8B93A1] text-[#E1E2EB] flex items-center justify-center mb-2 shadow">
                <Trophy className="w-8 h-8 stroke-[2]" />
              </div>
            ) : (
              <span className="text-xs font-space font-bold uppercase tracking-widest text-[#8B93A1] mb-1">
                PERINGKAT SEMENTARA
              </span>
            )}

            {/* Huge Rank Number */}
            <div className="flex items-baseline gap-2 my-1">
              <span className="font-anybody font-black text-6xl sm:text-7xl text-[#F5F7FA] tracking-tight">
                #{myRank}
              </span>
              <span className="font-space font-bold text-sm text-[#8B93A1]">
                / {totalPlayers} PEMAIN
              </span>
            </div>

            {/* Rank Delta Badge */}
            <div className="mt-2">
              {rankDelta > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10B981]/20 border border-[#10B981] text-[#85E28A] font-anybody font-extrabold text-xs tracking-wider">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>NAIK {rankDelta} PERINGKAT ↑</span>
                </span>
              ) : rankDelta < 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EF4444]/20 border border-[#EF4444] text-[#FFB4AB] font-anybody font-extrabold text-xs tracking-wider">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>TURUN {Math.abs(rankDelta)} PERINGKAT ↓</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#272A31] border border-[#3F434D] text-[#8B93A1] font-anybody font-bold text-xs tracking-wider">
                  <Minus className="w-3 h-3" />
                  <span>PERINGKAT TETAP</span>
                </span>
              )}
            </div>

            {/* Total Points Pill */}
            <div className="mt-5 pt-4 border-t border-[#272A31] w-full flex flex-col items-center">
              <span className="text-xs font-space text-[#8B93A1] uppercase tracking-wider">
                Total Akumulasi Poin
              </span>
              <span className="font-anybody font-black text-3xl sm:text-4xl text-[#FFC880] tracking-wider mt-1">
                {totalScore.toLocaleString()} PTS
              </span>
            </div>
          </div>
        </div>

        {/* Standing Context Card */}
        <div className="bg-[#151A22] border border-[#272A31] rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-space">
            <span className="text-[#8B93A1]">Status Papan Atas:</span>
            {isLeader ? (
              <span className="font-bold text-[#FFC880] flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-[#F5A623]" />
                Memimpin Klasemen!
              </span>
            ) : (
              <span className="text-[#D7C3AE]">
                Selisih <strong className="text-[#FFC880]">+{gapToLeader.toLocaleString()} pts</strong> dari #{leader?.rank} ({leader?.name})
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-xs font-space border-t border-[#272A31] pt-2">
            <span className="text-[#8B93A1]">Ketepatan Jawaban:</span>
            <span className="font-bold text-[#85E28A]">
              {correctCount} / {totalQuestionsDone} Soal Benar ({totalQuestionsDone > 0 ? Math.round((correctCount / totalQuestionsDone) * 100) : 0}%)
            </span>
          </div>
        </div>
      </main>

      {/* Waiting Footer */}
      <footer className="py-2 text-center text-xs font-space text-[#8B93A1] flex items-center justify-center gap-2">
        <Radio className="w-4 h-4 text-[#F5A623] animate-pulse" />
        <span>
          {isLastQuestion
            ? 'Menunggu host menampilkan podium juara...'
            : 'Menunggu host melanjutkan ke soal berikutnya...'}
        </span>
      </footer>
    </div>
  );
}
