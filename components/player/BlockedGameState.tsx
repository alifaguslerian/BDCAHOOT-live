'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import { sound } from '@/lib/soundFX';
import type { GameStage } from '@/types/game';

interface BlockedGameStateProps {
  roomCode: string;
  stage: GameStage;
  onRetry?: () => void;
}

export function BlockedGameState({ roomCode, stage, onRetry }: BlockedGameStateProps) {
  const router = useRouter();

  const getStageLabel = (st: GameStage): string => {
    switch (st) {
      case 'QUESTION':
        return 'Pertanyaan Sedang Berlangsung';
      case 'REVEAL':
        return 'Pembahasan Jawaban';
      case 'SCOREBOARD':
        return 'Papan Peringkat';
      case 'FINAL':
        return 'Game Telah Selesai';
      default:
        return 'Game Telah Dimulai';
    }
  };

  return (
    <div className="w-full max-w-sm flex flex-col gap-6 items-center text-center animate-in fade-in zoom-in-95 duration-200">
      {/* Icon Badge */}
      <div className="w-16 h-16 rounded-2xl bg-[#3b1219] border border-[#ff5449]/30 flex items-center justify-center text-[#ffb4ab] shadow-lg shadow-[#ba1a1a]/10">
        <AlertTriangle className="w-8 h-8 stroke-[2.2]" />
      </div>

      {/* Heading */}
      <div className="flex flex-col gap-1.5">
        <span className="inline-block px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#ffb4ab] bg-[#53161a] border border-[#8c1d18]/40 rounded-full mx-auto font-space">
          AKSES DITOLAK • {stage}
        </span>
        <h1 className="font-anybody font-extrabold text-2xl text-[#e1e2eb] tracking-tight uppercase mt-2">
          Game Sedang Berjalan
        </h1>
        <p className="text-xs text-[#d7c3ae] font-space max-w-xs mx-auto leading-relaxed">
          Room <strong className="text-[#ffc880] tracking-wider">{roomCode}</strong> saat ini sedang di tahap{' '}
          <span className="text-[#ffb4ab] font-bold">{getStageLabel(stage)}</span>. Peserta baru hanya dapat bergabung sebelum game dimulai.
        </p>
      </div>

      {/* Info Card */}
      <div className="w-full bg-[#151a22] border border-[#272a31] rounded-xl p-4 flex flex-col gap-2.5 text-left">
        <div className="flex justify-between items-center text-xs font-space border-b border-[#272a31] pb-2">
          <span className="text-[#8b93a1]">Kode Room:</span>
          <span className="font-anybody font-bold text-[#ffc880] tracking-wider">{roomCode}</span>
        </div>
        <div className="flex justify-between items-center text-xs font-space border-b border-[#272a31] pb-2">
          <span className="text-[#8b93a1]">Status Arena:</span>
          <span className="text-[#ffb4ab] font-bold">{stage}</span>
        </div>
        <p className="text-[11px] text-[#8b93a1] font-space pt-1 leading-normal">
          Silakan tunggu hingga ronde permainan ini selesai atau minta Host membuka room baru di lobi.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="w-full flex flex-col gap-3">
        {onRetry ? (
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              onRetry();
            }}
            className="w-full h-12 bg-[#272a31] hover:bg-[#353942] text-[#e1e2eb] font-bold text-xs uppercase tracking-wider rounded-lg transition-colors border border-[#3f434d] flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Cek Status Room Lagi</span>
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => {
            sound.playTap();
            router.push('/player/join');
          }}
          className="w-full h-12 bg-[#f5a623] hover:bg-[#ffc880] text-[#452b00] font-bold text-xs uppercase tracking-wider rounded-lg transition-colors shadow flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Ganti Kode Room</span>
        </button>

        <Link
          href="/"
          onClick={() => sound.playTap()}
          className="inline-flex items-center justify-center gap-1.5 text-xs text-[#8b93a1] hover:text-[#e1e2eb] font-space transition-colors py-2"
        >
          <span>Kembali ke Halaman Utama</span>
        </Link>
      </div>
    </div>
  );
}
