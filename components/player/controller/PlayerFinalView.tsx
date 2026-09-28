'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Trophy,
  Crown,
  Medal,
  Award,
  Sparkles,
  RotateCcw,
  Home,
  CheckCircle2,
  Clock,
  Zap,
} from 'lucide-react';
import { useMockGame } from '@/context/MockGameContext';
import { sound, triggerHaptic } from '@/lib/soundFX';
import type { Player } from '@/types/game';

interface PlayerFinalViewProps {
  player: Player;
}

export function PlayerFinalView({ player }: PlayerFinalViewProps) {
  const router = useRouter();
  const { room, rankings, setCurrentPlayerId } = useMockGame();

  const totalPlayers = Object.keys(room.players).length;
  const currentRankItem = rankings.find((r) => r.playerId === player.id);
  const finalRank = currentRankItem?.rank ?? 1;
  const totalScore = player.score;

  const totalQuestions = room.questions.length;
  const answersList = Object.values(player.answers);
  const correctCount = answersList.filter((a) => a.isCorrect).length;
  const accuracyPct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  
  const avgResponseSeconds =
    answersList.length > 0
      ? (
          answersList.reduce((acc, a) => acc + a.responseDurationMs, 0) /
          answersList.length /
          1000
        ).toFixed(2)
      : '0.00';

  useEffect(() => {
    sound.playFanfare();
    triggerHaptic([50, 100, 50, 150]);
  }, []);

  const handlePlayAgain = () => {
    sound.playTap();
    triggerHaptic(20);
    setCurrentPlayerId(null);
    router.push('/player/join');
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen flex flex-col justify-between p-4 sm:p-6 bg-[#0B0E14] text-[#E1E2EB] select-none">
      {/* Top Bar */}
      <header className="flex items-center justify-between text-xs font-space border-b border-[#1E2530] pb-2 text-[#8B93A1]">
        <span className="font-bold uppercase tracking-wider text-[#FFC880]">
          HASIL AKHIR TURNAMEN
        </span>
        <span className="text-[10px] bg-[#151A22] px-2 py-0.5 rounded border border-[#272A31]">
          SESI SELESAI
        </span>
      </header>

      {/* Main Final Hero */}
      <main className="flex-1 flex flex-col justify-center py-4 space-y-4">
        {/* Podium Standing Card */}
        <div className="bg-[#151A22] border-2 border-[#272A31] rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden">
          {/* Champion Background Glow */}
          {finalRank === 1 && (
            <div className="absolute inset-0 bg-[#F5A623]/15 blur-2xl pointer-events-none" />
          )}

          <div className="relative z-10 flex flex-col items-center">
            {/* Rank Visual Badge */}
            {finalRank === 1 ? (
              <div className="w-20 h-20 rounded-3xl bg-[#F5A623]/20 border-2 border-[#F5A623] text-[#FFC880] flex items-center justify-center mb-3 shadow-xl shadow-[#F5A623]/25 animate-bounce">
                <Crown className="w-12 h-12 stroke-[2.2]" />
              </div>
            ) : finalRank === 2 ? (
              <div className="w-16 h-16 rounded-2xl bg-[#C0C0C0]/20 border-2 border-[#C0C0C0] text-[#E1E2EB] flex items-center justify-center mb-3 shadow-lg">
                <Medal className="w-9 h-9 stroke-[2]" />
              </div>
            ) : finalRank === 3 ? (
              <div className="w-16 h-16 rounded-2xl bg-[#CD7F32]/20 border-2 border-[#CD7F32] text-[#FFB4AB] flex items-center justify-center mb-3 shadow-lg">
                <Award className="w-9 h-9 stroke-[2]" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-[#272A31] border border-[#3F434D] text-[#8B93A1] flex items-center justify-center mb-3">
                <Trophy className="w-8 h-8 stroke-[1.8]" />
              </div>
            )}

            {/* Title Greeting */}
            <span className="text-xs font-space font-bold uppercase tracking-widest text-[#8B93A1] mb-1">
              PERINGKAT AKHIR KAMU
            </span>

            <h1 className="font-anybody font-black text-5xl sm:text-6xl text-[#F5F7FA] tracking-tight mb-2">
              #{finalRank}
            </h1>

            <p className="font-anybody font-bold text-sm uppercase tracking-wider text-[#FFC880]">
              {finalRank === 1
                ? '🏆 JUARA 1! SELAMAT!'
                : finalRank === 2
                ? '🥈 JUARA 2! LUAR BIASA!'
                : finalRank === 3
                ? '🥉 JUARA 3! HEBAT!'
                : `FINISHER DI ANTARA ${totalPlayers} PEMAIN`}
            </p>

            {/* Total Points Pill */}
            <div className="mt-5 pt-4 border-t border-[#272A31] w-full flex flex-col items-center">
              <span className="text-xs font-space text-[#8B93A1] uppercase tracking-wider">
                Total Poin Akhir
              </span>
              <span className="font-anybody font-black text-3xl sm:text-4xl text-[#FFC880] tracking-wider mt-1">
                {totalScore.toLocaleString()} PTS
              </span>
            </div>
          </div>
        </div>

        {/* Statistics Breakdown */}
        <div className="bg-[#151A22] border border-[#272A31] rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-space font-bold uppercase tracking-wider text-[#8B93A1] border-b border-[#272A31] pb-2">
            Statistik Performa
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0B0E14] border border-[#272A31] rounded-xl p-3 flex flex-col">
              <span className="text-[10px] text-[#8B93A1] uppercase font-space">Akurasi Soal</span>
              <span className="font-anybody font-extrabold text-lg text-[#85E28A] mt-0.5">
                {correctCount} / {totalQuestions}
              </span>
              <span className="text-[10px] text-[#8B93A1] font-space">({accuracyPct}% benar)</span>
            </div>

            <div className="bg-[#0B0E14] border border-[#272A31] rounded-xl p-3 flex flex-col">
              <span className="text-[10px] text-[#8B93A1] uppercase font-space">Rata-rata Waktu</span>
              <span className="font-anybody font-extrabold text-lg text-[#FFC880] mt-0.5">
                {avgResponseSeconds}s
              </span>
              <span className="text-[10px] text-[#8B93A1] font-space">per soal</span>
            </div>
          </div>
        </div>
      </main>

      {/* Action Footer Buttons */}
      <footer className="py-2 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={handlePlayAgain}
          className="w-full h-12 bg-[#F5A623] hover:bg-[#FFC880] active:scale-98 text-[#452B00] font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer font-space"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Main Game Baru</span>
        </button>

        <Link
          href="/"
          onClick={() => sound.playTap()}
          className="w-full h-11 bg-[#151A22] hover:bg-[#272A31] active:scale-98 text-[#8B93A1] hover:text-[#E1E2EB] font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-[#272A31] flex items-center justify-center gap-2 font-space"
        >
          <Home className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>
      </footer>
    </div>
  );
}
