'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  Play,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  ArrowLeft,
  UserPlus,
  Trash2,
  Volume2,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { useMockGame } from '@/context/MockGameContext';
import { sound } from '@/lib/soundFX';
import { motion, AnimatePresence } from 'motion/react';

interface LobbyViewProps {
  roomCode: string;
}

export const LobbyView: React.FC<LobbyViewProps> = ({ roomCode }) => {
  const router = useRouter();
  const {
    room,
    startQuiz,
    addMockPlayer,
    kickPlayer,
    resetRoom,
  } = useMockGame();

  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const playersList = Object.values(room.players);
  const playerCount = playersList.length;
  const canStart = playerCount > 0;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      sound.playSuccess();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleStartGame = () => {
    if (!canStart) {
      sound.playError();
      return;
    }
    sound.playSuccess();
    startQuiz();
  };

  const handleAddBot = () => {
    sound.playTap();
    addMockPlayer();
  };

  const handleKick = (playerId: string) => {
    sound.playTap();
    kickPlayer(playerId);
  };

  const handleExitRoom = () => {
    resetRoom();
    router.push('/host/manage');
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-[#F5F7FA] flex flex-col justify-between selection:bg-[#F5A623] selection:text-black">
      {/* Top Bar: Quiz Info + Controls */}
      <header className="px-6 py-4 border-b border-[#1E2530] bg-[#0E121B]/80 backdrop-blur-md flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setShowExitConfirm(true)}
            className="p-2 rounded-lg bg-[#181F2C] hover:bg-[#232C3E] text-[#8B93A1] hover:text-white transition-colors border border-[#232C3E]"
            title="Keluar dari Room"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-anybody font-extrabold text-base sm:text-lg text-white truncate">
              {room.quizTitle}
            </h1>
            <p className="text-xs text-[#8B93A1] font-space">
              {room.questions.length} Soal • Tahap: Lobi Menunggu
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleAddBot}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181F2C] hover:bg-[#232C3E] text-[#8B93A1] hover:text-white text-xs font-space font-medium border border-[#232C3E] transition-colors"
            title="Tambah dummy player untuk uji coba solo"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#F5A623]" />
            <span>+ Tambah Bot</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-[#181F2C] hover:bg-[#232C3E] text-[#8B93A1] hover:text-white transition-colors border border-[#232C3E]"
            title="Layar Penuh (Projector Mode)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Center Area: Giant Room Code & Join Instructions */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-5xl mx-auto w-full">
        {/* Instructions Kicker */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#181F2C] border border-[#232C3E] text-[#8B93A1] text-xs sm:text-sm font-space mb-4 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Buka di browser peserta: <strong>/player/join</strong></span>
        </div>

        {/* Giant PIN Box */}
        <div className="relative group my-2">
          <div className="text-xs sm:text-sm uppercase tracking-widest text-[#8B93A1] font-anybody font-extrabold mb-1">
            KODE PIN ROOM
          </div>
          <div
            onClick={handleCopyCode}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleCopyCode()}
            className="cursor-pointer bg-[#0E121B] hover:bg-[#131926] border-2 border-[#F5A623]/60 hover:border-[#F5A623] rounded-3xl px-8 py-5 sm:px-14 sm:py-8 shadow-2xl transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-4"
            title="Klik untuk menyalin kode"
          >
            <span className="font-anybody font-black text-6xl sm:text-8xl md:text-9xl tracking-[0.2em] text-[#F5A623] drop-shadow-[0_0_35px_rgba(245,166,35,0.35)] select-all tabular-nums">
              {roomCode}
            </span>
            <div className="p-3 rounded-xl bg-[#1E2530] text-[#8B93A1] group-hover:text-white transition-colors">
              {copied ? <Check className="w-6 h-6 text-emerald-400" /> : <Copy className="w-6 h-6" />}
            </div>
          </div>
          {copied && (
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-space text-emerald-400 font-bold">
              ✓ Kode Berhasil Disalin!
            </div>
          )}
        </div>

        {/* Live Connected Player Counter */}
        <div className="mt-8 mb-4 flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#131926] border border-[#232C3E]">
            <Users className="w-5 h-5 text-[#F5A623]" />
            <span className="font-anybody font-bold text-lg sm:text-xl text-white">
              {playerCount}
            </span>
            <span className="text-xs sm:text-sm text-[#8B93A1] font-space">
              Peserta Terhubung
            </span>
          </div>
          {playerCount === 0 && (
            <button
              type="button"
              onClick={handleAddBot}
              className="text-xs text-[#F5A623] underline font-space hover:text-[#ffc880] transition-colors"
            >
              + Tambah Peserta Uji Coba
            </button>
          )}
        </div>

        {/* Dynamic Participants Roster (Animated) */}
        <div className="w-full mt-2">
          {playerCount === 0 ? (
            <div className="p-8 border border-dashed border-[#232C3E] rounded-2xl bg-[#0E121B]/40 text-[#8B93A1] text-sm font-space">
              Menunggu peserta masuk... Peserta dapat memasukkan 6 digit PIN di atas.
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-2.5 max-h-56 overflow-y-auto p-3 rounded-2xl bg-[#0E121B]/60 border border-[#1E2530]">
              <AnimatePresence>
                {playersList.map((player) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="group flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#181F2C] border border-[#2A3446] hover:border-[#F5A623]/50 transition-all text-sm font-space font-semibold shadow-sm"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#F5A623] to-[#FF8C00] text-black font-anybody font-black text-xs flex items-center justify-center">
                      {player.name.charAt(0)}
                    </div>
                    <span className="text-white tracking-wide">{player.name}</span>
                    <button
                      type="button"
                      onClick={() => handleKick(player.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[#8B93A1] hover:text-rose-400 p-0.5 rounded"
                      title="Keluarkan peserta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Floating Bar: Start Game CTA */}
      <footer className="p-6 border-t border-[#1E2530] bg-[#0E121B]/90 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 max-w-5xl mx-auto w-full">
        <div className="text-left text-xs text-[#8B93A1] font-space hidden sm:block">
          {canStart ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Siap Dimulai! Klik Mulai Game saat seluruh peserta siap.
            </span>
          ) : (
            <span className="text-amber-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Minimal 1 peserta diperlukan untuk memulai arena.
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleAddBot}
            className="sm:hidden flex-1 py-3.5 px-4 rounded-xl bg-[#181F2C] border border-[#232C3E] text-xs font-space font-bold text-white flex items-center justify-center gap-1.5"
          >
            <UserPlus className="w-4 h-4 text-[#F5A623]" />
            <span>+ Bot</span>
          </button>

          <button
            id="btn-start-game"
            type="button"
            disabled={!canStart}
            onClick={handleStartGame}
            className={`w-full sm:w-auto min-w-[240px] py-4 px-8 rounded-2xl font-anybody font-black text-xl flex items-center justify-center gap-3 shadow-xl transition-all duration-200 ${
              canStart
                ? 'bg-gradient-to-r from-[#F5A623] to-[#FF8C00] text-black hover:brightness-110 active:scale-95 cursor-pointer ring-4 ring-[#F5A623]/25'
                : 'bg-[#181F2C] text-[#555E6D] border border-[#232C3E] cursor-not-allowed'
            }`}
          >
            <Play className={`w-6 h-6 fill-current ${canStart ? 'text-black' : 'text-[#555E6D]'}`} />
            <span>MULAI GAME</span>
          </button>
        </div>
      </footer>

      {/* Confirmation Modal to Exit */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111622] border border-[#2A3446] rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-anybody font-bold text-lg text-white">
              Tutup Room Ini?
            </h3>
            <p className="text-sm text-[#8B93A1] font-space leading-relaxed">
              Jika ditutup, seluruh data peserta di room ini akan direset dan Anda akan kembali ke dashboard host.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 rounded-xl bg-[#181F2C] text-[#8B93A1] hover:text-white text-sm font-space font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExitRoom}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-space font-bold transition-colors"
              >
                Ya, Tutup Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
