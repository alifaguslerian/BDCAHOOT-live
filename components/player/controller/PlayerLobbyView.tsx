'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Smartphone,
  Radio,
  Users,
  LogOut,
  Volume2,
  VolumeX,
  BatteryCharging,
  Sparkles,
  Wifi,
} from 'lucide-react';
import { useGame } from '@/context/GameContext';
import { sound, triggerHaptic } from '@/lib/soundFX';
import type { Player } from '@/types/game';

interface PlayerLobbyViewProps {
  player: Player;
  roomCode: string;
}

export function PlayerLobbyView({ player, roomCode }: PlayerLobbyViewProps) {
  const router = useRouter();
  const { room, setCurrentPlayerId } = useGame();
  const [isMuted, setIsMuted] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const totalPlayers = Object.keys(room.players).length;

  const handleSoundTest = () => {
    if (!isMuted) {
      sound.playTap();
      triggerHaptic(15);
    }
  };

  const handleLeaveRoom = () => {
    sound.playTap();
    triggerHaptic(20);
    setCurrentPlayerId(null);
    router.push('/player/join');
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen flex flex-col justify-between p-4 sm:p-6 bg-[#0B0E14] text-[#E1E2EB] select-none">
      {/* Top Status Bar (Low Power OLED style) */}
      <header className="flex items-center justify-between py-2 border-b border-[#1E2530] text-xs font-space text-[#8B93A1]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
          <span className="flex items-center gap-1 text-[#85E28A] font-medium tracking-wide">
            <Wifi className="w-3.5 h-3.5" />
            TERKONEKSI
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const next = !isMuted;
              setIsMuted(next);
              if (!next) {
                sound.playTap();
                triggerHaptic(15);
              }
            }}
            className="p-1.5 rounded-lg bg-[#151A22] border border-[#272A31] text-[#8B93A1] hover:text-[#E1E2EB] active:scale-95 transition-all"
            title={isMuted ? 'Nyalakan Suara' : 'Bisukan Suara'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#FFC880]" />}
          </button>

          <button
            type="button"
            onClick={() => setShowExitConfirm(true)}
            className="p-1.5 rounded-lg bg-[#151A22] border border-[#272A31] text-[#8B93A1] hover:text-[#FFB4AB] active:scale-95 transition-all"
            title="Keluar dari Room"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Waiting Canvas */}
      <main className="flex-1 flex flex-col items-center justify-center py-6 text-center">
        {/* Pulsing Avatar Halo */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-[#F5A623]/10 blur-xl animate-pulse" />
          <div className="relative w-28 h-28 rounded-3xl bg-[#151A22] border-2 border-[#F5A623]/40 flex flex-col items-center justify-center shadow-2xl shadow-[#F5A623]/10">
            <span className="font-anybody font-black text-4xl text-[#FFC880] tracking-wider">
              {player.name.slice(0, 2)}
            </span>
            <span className="text-[10px] font-space text-[#8B93A1] uppercase tracking-widest mt-1">
              PESERTA
            </span>
          </div>
        </div>

        {/* Player Name & Room Code */}
        <div className="space-y-1 mb-6">
          <span className="text-xs font-space font-bold uppercase tracking-widest text-[#8B93A1]">
            KAMU BERGABUNG SEBAGAI
          </span>
          <h1 className="font-anybody font-black text-3xl sm:text-4xl text-[#F5F7FA] tracking-wide uppercase">
            {player.name}
          </h1>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#151A22] border border-[#272A31] mt-2">
            <span className="text-xs font-space text-[#8B93A1]">ROOM PIN:</span>
            <span className="font-anybody font-extrabold text-sm text-[#FFC880] tracking-widest">
              {roomCode}
            </span>
          </div>
        </div>

        {/* Waiting Card (Low Power Breathing Animation) */}
        <div className="w-full bg-[#151A22] border border-[#272A31] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-center gap-2 text-[#FFC880]">
            <Radio className="w-5 h-5 animate-pulse text-[#F5A623]" />
            <h2 className="font-anybody font-bold text-base sm:text-lg tracking-wide uppercase">
              Menunggu Host Memulai Game...
            </h2>
          </div>

          <p className="text-xs text-[#8B93A1] font-space leading-relaxed max-w-xs mx-auto">
            Perhatikan layar proyektor panggung. Pertanyaan pertama akan muncul begitu host menekan tombol mulai.
          </p>

          <div className="pt-3 border-t border-[#272A31] flex items-center justify-between text-xs font-space">
            <div className="flex items-center gap-2 text-[#D7C3AE]">
              <Users className="w-4 h-4 text-[#FFC880]" />
              <span>{totalPlayers} Peserta di Lobi</span>
            </div>

            <button
              type="button"
              onClick={handleSoundTest}
              className="text-[11px] text-[#8B93A1] hover:text-[#FFC880] underline font-medium cursor-pointer"
            >
              Tes Tombol
            </button>
          </div>
        </div>
      </main>

      {/* Footer Info (OLED Saver) */}
      <footer className="py-2 text-center text-[10px] text-[#525965] font-space flex items-center justify-center gap-1.5">
        <BatteryCharging className="w-3.5 h-3.5 text-[#85E28A]" />
        <span>Mode hemat daya aktif. Layar ponsel siap digunakan saat game dimulai.</span>
      </footer>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151A22] border border-[#272A31] rounded-2xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl">
            <h3 className="font-anybody font-bold text-lg text-[#E1E2EB]">
              Keluar dari Room?
            </h3>
            <p className="text-xs font-space text-[#8B93A1]">
              Jika kamu keluar, kamu harus memasukkan nama kembali untuk bergabung.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2.5 rounded-lg bg-[#272A31] text-xs font-bold text-[#E1E2EB] uppercase tracking-wider font-space"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleLeaveRoom}
                className="flex-1 py-2.5 rounded-lg bg-[#EF4444] text-xs font-bold text-white uppercase tracking-wider font-space"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
