'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Settings,
  Shuffle,
  Clock,
  Play,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { Quiz } from '@/types/quiz';
import { getQuizById } from '@/lib/quizStore';
import { validateQuiz } from '@/lib/validation';
import { useMockGame } from '@/context/MockGameContext';
import { sound } from '@/lib/soundFX';
import { generateRoomCode } from '@/lib/constants';

interface GameSettingsViewProps {
  quizId: string;
}

export function GameSettingsView({ quizId }: GameSettingsViewProps) {
  const router = useRouter();
  const { createRoomFromQuiz } = useMockGame();
  const [quiz] = useState<Quiz | null>(() => getQuizById(quizId));

  // Settings State
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [revealDurationSec, setRevealDurationSec] = useState<3 | 4 | 5>(4);
  const [previewRoomCode] = useState(() => generateRoomCode());
  const [isCreating, setIsCreating] = useState(false);

  if (!quiz) {
    return (
      <div className="min-h-screen bg-[#0b0e14] text-[#e1e2eb] flex flex-col items-center justify-center p-6 text-center font-space">
        <h2 className="font-anybody text-xl font-bold uppercase mb-2">Kuis Tidak Ditemukan</h2>
        <p className="text-sm text-[#8b93a1] mb-6">
          Kuis dengan ID `{quizId}` tidak ada di penyimpanan lokal.
        </p>
        <Link
          href="/host/library"
          className="px-4 py-2 rounded bg-[#1d2026] text-[#e1e2eb] font-bold text-xs uppercase tracking-wider"
        >
          Kembali ke Library
        </Link>
      </div>
    );
  }

  const validation = validateQuiz(quiz);
  const totalQuestions = quiz.questions.length;
  const totalDurationSec = quiz.questions.reduce((acc, q) => acc + (q.timerSeconds || 20), 0);
  const isPlayable = validation.isValid && totalQuestions > 0;

  const handleLaunchRoom = () => {
    if (!isPlayable) {
      sound.playError();
      return;
    }
    sound.playSuccess();
    setIsCreating(true);

    const roomCode = createRoomFromQuiz(quiz, {
      shuffleQuestions,
      revealDurationMs: revealDurationSec * 1000,
      customRoomCode: previewRoomCode,
    });

    setTimeout(() => {
      router.push(`/host/room/${roomCode}`);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#e1e2eb] selection:bg-[#f5a623] selection:text-[#452b00] flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 w-full px-6 lg:px-12 bg-[#0b0e14]/90 backdrop-blur-md border-b border-[#1d2026] flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            id="btn-back-to-library-from-settings"
            href="/host/library"
            onClick={() => sound.playTap()}
            className="w-9 h-9 rounded-lg bg-[#151a22] border border-[#272a31] flex items-center justify-center text-[#d7c3ae] hover:text-white hover:border-[#ffc880] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-anybody font-extrabold text-xl tracking-tight uppercase text-[#e1e2eb]">
              BDCAHOOT
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#1d2026] text-[#ffc880] uppercase tracking-wider font-space">
              GAME SETTINGS
            </span>
          </div>
        </div>

        <Link
          href={`/host/quiz/${quiz.id}/edit`}
          onClick={() => sound.playTap()}
          className="h-9 px-3 rounded-lg bg-[#151a22] hover:bg-[#1d2026] border border-[#272a31] text-[#e1e2eb] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
        >
          <span>Edit Soal</span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-6 lg:px-12 py-10 flex flex-col gap-8">
        <div>
          <h1 className="font-anybody font-extrabold text-3xl text-[#e1e2eb] tracking-tight uppercase">
            Pengaturan Game
          </h1>
          <p className="text-sm text-[#d7c3ae] mt-1 font-space">
            Konfigurasi parameter panggung sebelum membuka room arena untuk peserta.
          </p>
        </div>

        {/* Quiz Overview Card */}
        <div className="p-6 rounded-xl bg-[#151a22] border border-[#272a31] shadow-md flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-[#8b93a1] uppercase tracking-wider font-space">
                Target Kuis
              </span>
              <h2 className="font-anybody font-extrabold text-2xl text-[#ffc880] tracking-tight uppercase mt-0.5">
                {quiz.title}
              </h2>
            </div>

            {isPlayable ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#51df9c]/15 text-[#51df9c] border border-[#51df9c]/30 text-xs font-bold uppercase tracking-wider font-space">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Siap Pentas</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffb4ab]/15 text-[#ffb4ab] border border-[#ffb4ab]/30 text-xs font-bold uppercase tracking-wider font-space">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Belum Lengkap</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-[#1d2026] text-xs font-space">
            <div className="p-3 rounded-lg bg-[#0b0e14] border border-[#272a31]">
              <span className="text-[#8b93a1] block">Total Soal</span>
              <span className="text-base font-bold text-[#e1e2eb]">{totalQuestions} Soal</span>
            </div>
            <div className="p-3 rounded-lg bg-[#0b0e14] border border-[#272a31]">
              <span className="text-[#8b93a1] block">Estimasi Waktu</span>
              <span className="text-base font-bold text-[#e1e2eb]">~{totalDurationSec} Detik</span>
            </div>
            <div className="p-3 rounded-lg bg-[#0b0e14] border border-[#272a31] col-span-2 sm:col-span-1">
              <span className="text-[#8b93a1] block">Mode Skor</span>
              <span className="text-base font-bold text-[#51df9c]">Exponential Speed</span>
            </div>
          </div>
        </div>

        {/* Configuration Toggles */}
        <div className="p-6 rounded-xl bg-[#151a22] border border-[#272a31] shadow-md flex flex-col gap-6">
          <div className="flex items-center gap-2 border-b border-[#1d2026] pb-3">
            <Settings className="w-4 h-4 text-[#ffc880]" />
            <h3 className="font-anybody text-base font-bold text-[#e1e2eb] uppercase tracking-tight">
              Parameter Pertandingan
            </h3>
          </div>

          {/* Toggle: Shuffle Questions */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#1d2026] flex items-center justify-center text-[#d7c3ae] shrink-0 mt-0.5">
                <Shuffle className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-[#e1e2eb]">Acak Urutan Soal (Shuffle)</span>
                <span className="text-xs text-[#8b93a1] font-space">
                  Urutan kemunculan soal akan diacak otomatis setiap kali room baru dibuka.
                </span>
              </div>
            </div>

            <button
              id="toggle-shuffle"
              type="button"
              onClick={() => {
                sound.playTap();
                setShuffleQuestions(!shuffleQuestions);
              }}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                shuffleQuestions ? 'bg-[#f5a623]' : 'bg-[#272a31]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-[#0b0e14] shadow-md transform transition-transform ${
                  shuffleQuestions ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Selector: Reveal Duration */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[#1d2026] pt-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#1d2026] flex items-center justify-center text-[#d7c3ae] shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-[#e1e2eb]">Durasi Jeda Hasil (Reveal)</span>
                <span className="text-xs text-[#8b93a1] font-space">
                  Waktu jeda saat proyektor menampilkan jawaban benar dan distribusi vote.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-[#0b0e14] p-1 rounded-lg border border-[#272a31] self-end sm:self-auto">
              {([3, 4, 5] as const).map((sec) => (
                <button
                  key={sec}
                  id={`btn-reveal-duration-${sec}s`}
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setRevealDurationSec(sec);
                  }}
                  className={`px-3 py-1 rounded text-xs font-bold font-space transition-colors ${
                    revealDurationSec === sec
                      ? 'bg-[#f5a623] text-[#452b00] shadow'
                      : 'text-[#8b93a1] hover:text-[#e1e2eb]'
                  }`}
                >
                  {sec} Detik
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Room Launch CTA Card */}
        <div className="p-6 rounded-xl bg-gradient-to-b from-[#1d2026] to-[#151a22] border border-[#ffc880]/30 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#ffc880]/15 border border-[#ffc880]/30 flex items-center justify-center text-[#ffc880] shrink-0">
              <Sparkles className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="flex flex-col text-center md:text-left">
              <span className="text-xs font-bold text-[#ffc880] uppercase tracking-wider font-space">
                PREVIEW KODE ROOM ARENA
              </span>
              <span className="font-anybody font-extrabold text-3xl tracking-[0.15em] text-[#e1e2eb]">
                {previewRoomCode.slice(0, 3)} {previewRoomCode.slice(3)}
              </span>
              <span className="text-xs text-[#8b93a1] font-space">
                Peserta dapat bergabung menggunakan PIN ini di HP mereka.
              </span>
            </div>
          </div>

          <div className="w-full md:w-auto">
            {isPlayable ? (
              <button
                id="btn-create-room"
                type="button"
                disabled={isCreating}
                onClick={handleLaunchRoom}
                className="w-full md:w-auto h-12 px-8 rounded-xl bg-[#f5a623] hover:bg-[#ffc880] text-[#452b00] font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-[#452b00]" />
                <span>{isCreating ? 'Membuka Room...' : 'Buka Room Arena'}</span>
              </button>
            ) : (
              <Link
                href={`/host/quiz/${quiz.id}/edit`}
                onClick={() => sound.playTap()}
                className="w-full md:w-auto h-12 px-6 rounded-xl bg-[#ba1a1a] hover:bg-[#ff5449] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Lengkapi Soal di Editor</span>
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
