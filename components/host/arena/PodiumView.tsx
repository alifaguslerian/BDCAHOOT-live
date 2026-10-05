'use client';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { sound } from '@/lib/soundFX';
import {
  Trophy,
  Crown,
  RotateCcw,
  BookOpen,
  Medal,
  Award,
  Sparkles,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

interface PodiumViewProps {
  roomCode: string;
}

export const PodiumView: React.FC<PodiumViewProps> = ({ roomCode }) => {
  const router = useRouter();
  const { room, rankings, resetRoom } = useGame();

  const totalPlayers = rankings.length;
  const first = rankings[0] ?? null;
  const second = rankings[1] ?? null;
  const third = rankings[2] ?? null;
  const runnersUp = rankings.slice(3, 10);

  const reduceMotion = useReducedMotion();
  const podiumSize = Math.min(totalPlayers, 3);
  const [revealedCount, setRevealedCount] = useState(0);
  const visibleCount = reduceMotion ? podiumSize : revealedCount;
  const isRevealed = (rank: number) => rank > podiumSize - visibleCount;

  useEffect(() => {
    if (podiumSize === 0) return;
    const timers = Array.from({ length: podiumSize }, (_, index) =>
      window.setTimeout(() => setRevealedCount(index + 1), index * 5000 + 100),
    );
    const fanfare = window.setTimeout(() => sound.playFanfare(), reduceMotion ? 0 : (podiumSize - 1) * 5000 + 100);
    return () => {
      timers.forEach(window.clearTimeout);
      window.clearTimeout(fanfare);
    };
  }, [podiumSize, reduceMotion]);

  const revealMotion = (rank: number) => ({
    initial: false as const,
    animate: {
      opacity: isRevealed(rank) ? 1 : 0,
      transform: isRevealed(rank) || reduceMotion ? 'translateY(0px)' : 'translateY(100%)',
    },
    transition: { duration: reduceMotion ? 0 : 0.65, ease: [0.23, 1, 0.32, 1] as const },
    'aria-hidden': !isRevealed(rank),
    'data-podium-rank': rank,
  });

  const handleReturnToLibrary = async () => {
    sound.playTap();
    if (await resetRoom()) router.push('/host/library');
  };

  const handlePlayAgain = () => {
    handleReturnToLibrary();
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
            <h1 className="font-anybody font-black text-lg text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#F5A623]" />
              <span>PODIUM JUARA BDCAHOOT</span>
            </h1>
            <p className="text-xs text-[#8B93A1] font-space">
              {room.quizTitle} • {totalPlayers} Total Peserta
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePlayAgain}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#181F2C] hover:bg-[#232C3E] text-[#8B93A1] hover:text-white border border-[#232C3E] text-xs font-space font-semibold transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Main Lagi</span>
          </button>

          <button
            id="btn-return-library"
            type="button"
            onClick={handleReturnToLibrary}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F5A623] to-[#FF8C00] text-black font-anybody font-extrabold text-sm hover:brightness-110 active:scale-95 transition-all shadow-md"
          >
            <BookOpen className="w-4 h-4" />
            <span>KEMBALI KE LIBRARY</span>
          </button>
        </div>
      </header>

      {/* Main Podium Presentation */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-5xl mx-auto w-full">
        {totalPlayers === 0 ? (
          <div className="text-center py-20 p-8 border border-dashed border-[#232C3E] rounded-3xl bg-[#0E121B]/40 max-w-md w-full">
            <Trophy className="w-12 h-12 text-[#8B93A1] mx-auto mb-3 opacity-50" />
            <h3 className="font-anybody font-bold text-lg text-white mb-1">
              Tidak Ada Pemain
            </h3>
            <p className="text-xs text-[#8B93A1] font-space mb-6">
              Tidak ada data skor yang terekam pada sesi permainan ini.
            </p>
            <button
              type="button"
              onClick={handleReturnToLibrary}
              className="px-6 py-2.5 rounded-xl bg-[#F5A623] text-black font-anybody font-bold text-sm"
            >
              Kembali ke Library
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            {/* Celebration Kicker */}
            <div className="text-center mb-8">
              <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#F5A623]/10 border border-[#F5A623]/30 text-[#F5A623] text-xs font-space font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                Selamat Kepada Para Pemenang!
              </span>
              <h2 className="font-anybody font-black text-3xl sm:text-4xl md:text-5xl text-white">
                JUARA ARENA
              </h2>
            </div>

            {/* Podium Graphic Layout with Graceful Degradation */}
            <div className="w-full max-w-3xl flex items-end justify-center gap-2 sm:gap-4 min-h-[420px] sm:min-h-[480px] overflow-hidden px-2 my-2">
              {/* 2nd Place: Left Pedestal (Shown if >= 2 players) */}
              {second && (
                <motion.div
                  {...revealMotion(2)}
                  className="flex-1 flex flex-col items-center justify-end min-w-0 max-w-[200px]"
                >
                  {/* Player Info Card */}
                  <div className="text-center mb-2">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#A0AAB8] text-black font-anybody font-black text-2xl flex items-center justify-center mx-auto shadow-lg mb-1">
                      <PlayerAvatar avatarId={second.avatarId} size={56} />
                    </div>
                    <div className="font-space font-black text-base sm:text-lg text-white truncate max-w-[120px] sm:max-w-[160px]">
                      {second.name}
                    </div>
                    <div className="font-anybody font-bold text-xs sm:text-sm text-[#A0AAB8] tabular-nums">
                      {second.score.toLocaleString('id-ID')} pts
                    </div>
                  </div>

                  {/* Pedestal Box */}
                  <div className="w-full shrink-0 h-40 sm:h-48 rounded-t-3xl bg-gradient-to-t from-[#131926] to-[#1E2530] border-t-4 border-l-2 border-r-2 border-[#A0AAB8] flex flex-col items-center justify-center shadow-xl">
                    <span className="font-anybody font-black text-4xl sm:text-5xl text-[#A0AAB8]/50">
                      2
                    </span>
                    <span className="text-[10px] font-space font-bold uppercase tracking-widest text-[#A0AAB8]/70">
                      JUARA 2
                    </span>
                  </div>
                </motion.div>
              )}

              {/* 1st Place: Center Pedestal (Always shown if >= 1 player, Tallest) */}
              {first && (
                <motion.div
                  {...revealMotion(1)}
                  className="flex-1 flex flex-col items-center justify-end min-w-0 max-w-[240px] z-10"
                >
                  {/* Crown + Winner Card */}
                  <div className="text-center mb-2">
                    <Crown className="w-8 h-8 text-[#F5A623] mx-auto fill-[#F5A623]/20" />
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-[#F5A623] to-[#FF8C00] text-black font-anybody font-black text-3xl flex items-center justify-center mx-auto shadow-2xl ring-4 ring-[#F5A623]/40 mb-1">
                      <PlayerAvatar avatarId={first.avatarId} size={56} />
                    </div>
                    <div className="font-space font-black text-lg sm:text-xl text-[#F5A623] truncate max-w-[140px] sm:max-w-[200px] drop-shadow">
                      {first.name}
                    </div>
                    <div className="font-anybody font-black text-sm sm:text-base text-white tabular-nums">
                      {first.score.toLocaleString('id-ID')} pts
                    </div>
                  </div>

                  {/* Pedestal Box (Tallest) */}
                  <div className="w-full shrink-0 h-60 sm:h-72 rounded-t-3xl bg-gradient-to-t from-[#181F2C] to-[#252E3E] border-t-4 border-l-2 border-r-2 border-[#F5A623] flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-[#F5A623]/5 pointer-events-none" />
                    <span className="font-anybody font-black text-5xl sm:text-6xl text-[#F5A623]">
                      1
                    </span>
                    <span className="text-xs font-space font-black uppercase tracking-widest text-[#F5A623]">
                      JUARA 1
                    </span>
                  </div>
                </motion.div>
              )}

              {/* 3rd Place: Right Pedestal (Shown if >= 3 players) */}
              {third && (
                <motion.div
                  {...revealMotion(3)}
                  className="flex-1 flex flex-col items-center justify-end min-w-0 max-w-[200px]"
                >
                  {/* Player Info Card */}
                  <div className="text-center mb-2">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#CD7F32] text-white font-anybody font-black text-2xl flex items-center justify-center mx-auto shadow-lg mb-1">
                      <PlayerAvatar avatarId={third.avatarId} size={56} />
                    </div>
                    <div className="font-space font-black text-base sm:text-lg text-white truncate max-w-[120px] sm:max-w-[160px]">
                      {third.name}
                    </div>
                    <div className="font-anybody font-bold text-xs sm:text-sm text-[#CD7F32] tabular-nums">
                      {third.score.toLocaleString('id-ID')} pts
                    </div>
                  </div>

                  {/* Pedestal Box */}
                  <div className="w-full shrink-0 h-28 sm:h-32 rounded-t-3xl bg-gradient-to-t from-[#131926] to-[#1E2530] border-t-4 border-l-2 border-r-2 border-[#CD7F32] flex flex-col items-center justify-center shadow-xl">
                    <span className="font-anybody font-black text-4xl sm:text-5xl text-[#CD7F32]/50">
                      3
                    </span>
                    <span className="text-[10px] font-space font-bold uppercase tracking-widest text-[#CD7F32]/70">
                      JUARA 3
                    </span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Runner-Ups (#4 to #10) List */}
            {runnersUp.length > 0 && (
              <div className="w-full max-w-2xl mt-8 pt-6 border-t border-[#1E2530]">
                <h4 className="text-xs uppercase font-space font-bold text-[#8B93A1] mb-3 text-center tracking-wider">
                  Peringkat Lainnya
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {runnersUp.map((runner) => (
                    <div
                      key={runner.playerId}
                      className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#0E121B] border border-[#1E2530] text-xs font-space"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-[#8B93A1]">
                          #{runner.rank}
                        </span>
                        <span className="font-bold text-white tracking-wide">
                          <PlayerAvatar avatarId={runner.avatarId} size={28} /> {runner.name}
                        </span>
                      </div>
                      <span className="font-anybody font-bold text-[#8B93A1] tabular-nums">
                        {runner.score.toLocaleString('id-ID')} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-4 border-t border-[#1E2530] bg-[#0E121B] text-center text-xs text-[#8B93A1] font-space">
        Pertandingan Selesai • Terima kasih kepada seluruh peserta yang telah bertanding.
      </footer>
    </div>
  );
};
