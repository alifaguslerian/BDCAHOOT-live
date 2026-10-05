'use client';

import { useEffect, useState } from 'react';
import { useGame } from '@/context/GameContext';

export function CountdownView() {
  const { room, serverOffsetMs } = useGame();
  const end = room.countdownEndsAtMs;
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = end == null ? 5 : Math.max(0, Math.min(5, Math.ceil((end - now - serverOffsetMs) / 1000)));
  return (
    <main className="min-h-[85vh] bg-[#07090E] text-white flex flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="font-anybody font-black text-2xl sm:text-4xl">BERSIAP!</h1>
      <div role="timer" aria-label={remaining ? `Mulai dalam ${remaining} detik` : 'Menyiapkan soal'} className="font-anybody font-black text-8xl sm:text-9xl text-[#F5A623] tabular-nums">
        {remaining || '…'}
      </div>
      <p className="font-space text-[#8B93A1]">Soal pertama segera dimulai.</p>
    </main>
  );
}
