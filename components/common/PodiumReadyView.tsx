'use client';

import { Trophy } from 'lucide-react';
import { useGame } from '@/context/GameContext';
import { sound } from '@/lib/soundFX';

export function PodiumReadyView() {
  const { role, finishQuiz, isHostActionLoading } = useGame();

  return (
    <main className="min-h-[calc(100svh-49px)] flex flex-col items-center justify-center gap-6 bg-[#07090E] px-6 py-10 text-center text-[#F5F7FA]">
      <p className="font-space text-base text-[#A0AAB8]">Semua soal selesai</p>
      {role === 'host' ? (
        <button
          id="btn-scoreboard-continue"
          type="button"
          disabled={isHostActionLoading}
          aria-busy={isHostActionLoading}
          onClick={() => {
            if (isHostActionLoading) return;
            sound.playTap();
            void finishQuiz();
          }}
          className="inline-flex min-h-16 max-w-full items-center justify-center gap-3 rounded-2xl bg-[#F5A623] px-6 py-5 font-anybody text-xl font-extrabold text-black transition-colors hover:bg-[#FFC880] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFC880] disabled:cursor-wait disabled:bg-[#232C3E] disabled:text-[#A0AAB8] sm:px-10 sm:text-3xl"
        >
          <Trophy aria-hidden="true" className="h-7 w-7 shrink-0" />
          <span>{isHostActionLoading ? 'Memproses...' : 'Lihat Podium Juara'}</span>
        </button>
      ) : (
        <h1 className="font-anybody text-2xl font-extrabold sm:text-3xl">Menunggu podium juara</h1>
      )}
      <p className="max-w-md font-space text-sm text-[#A0AAB8]">
        {role === 'host' ? 'Buka podium saat siap mengumumkan pemenang.' : 'Lihat layar utama. Operator akan membuka podium.'}
      </p>
    </main>
  );
}
