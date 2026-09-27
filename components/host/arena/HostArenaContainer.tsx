'use client';

import React from 'react';
import Link from 'next/link';
import { useMockGame } from '@/context/MockGameContext';
import { LobbyView } from './LobbyView';
import { QuestionView } from './QuestionView';
import { RevealView } from './RevealView';
import { ScoreboardView } from './ScoreboardView';
import { PodiumView } from './PodiumView';
import { AlertCircle, ArrowLeft } from 'lucide-react';

interface HostArenaContainerProps {
  roomCode: string;
}

export const HostArenaContainer: React.FC<HostArenaContainerProps> = ({ roomCode }) => {
  const { room } = useMockGame();
  const normalizedInputCode = roomCode.toUpperCase().trim();
  const activeRoomCode = room.code.toUpperCase().trim();

  // If host accessed a route code different from the active context room code
  const isCodeMismatch = normalizedInputCode !== activeRoomCode;

  if (isCodeMismatch) {
    return (
      <div className="min-h-screen bg-[#07090E] text-[#F5F7FA] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#0E121B] border border-[#232C3E] rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="font-anybody font-black text-2xl text-white">
            Room Berbeda Ditemukan
          </h2>
          <p className="text-xs sm:text-sm text-[#8B93A1] font-space leading-relaxed">
            Anda membuka URL untuk Room <strong>{normalizedInputCode}</strong>, namun sesi aktif saat ini adalah Room <strong>{activeRoomCode}</strong>.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href={`/host/room/${activeRoomCode}`}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#F5A623] to-[#FF8C00] text-black font-anybody font-extrabold text-sm hover:brightness-110 transition-all"
            >
              Masuk ke Sesi Aktif ({activeRoomCode})
            </Link>
            <Link
              href="/host/manage"
              className="w-full py-2.5 px-4 rounded-xl bg-[#181F2C] hover:bg-[#232C3E] text-[#8B93A1] hover:text-white border border-[#232C3E] text-xs font-space font-semibold transition-colors"
            >
              Kembali ke Manajemen Quiz
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Render view strictly by stage
  switch (room.stage) {
    case 'LOBBY':
      return <LobbyView roomCode={activeRoomCode} />;
    case 'QUESTION':
      return <QuestionView roomCode={activeRoomCode} />;
    case 'REVEAL':
      return <RevealView roomCode={activeRoomCode} />;
    case 'SCOREBOARD':
      return <ScoreboardView roomCode={activeRoomCode} />;
    case 'FINAL':
      return <PodiumView roomCode={activeRoomCode} />;
    default:
      return <LobbyView roomCode={activeRoomCode} />;
  }
};
