'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Smartphone,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Home,
  User,
} from 'lucide-react';
import { useMockGame } from '@/context/MockGameContext';
import { sound, triggerHaptic } from '@/lib/soundFX';
import { validatePlayerName } from '@/lib/validation';
import { BlockedGameState } from '@/components/player/BlockedGameState';
import { PlayerLobbyView } from './PlayerLobbyView';
import { PlayerQuestionView } from './PlayerQuestionView';
import { PlayerRevealView } from './PlayerRevealView';
import { PlayerScoreboardView } from './PlayerScoreboardView';
import { PlayerFinalView } from './PlayerFinalView';

interface PlayerControllerContainerProps {
  roomCode: string;
}

export function PlayerControllerContainer({ roomCode }: PlayerControllerContainerProps) {
  const router = useRouter();
  const {
    room,
    currentPlayerId,
    setCurrentPlayerId,
    joinRoomAsPlayer,
    currentQuestion,
  } = useMockGame();

  const [guestName, setGuestName] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  // Check if room code matches
  const isRoomMatching = room.code.toUpperCase() === roomCode.toUpperCase();

  // Retrieve current active player
  const player = currentPlayerId ? room.players[currentPlayerId] : null;

  // Existing player names for duplicate validation
  const existingNames = useMemo(() => {
    return Object.values(room.players).map((p) => p.name);
  }, [room.players]);

  // Validation state for inline join
  const validation = useMemo(() => {
    if (!guestName.trim()) {
      return { isValid: false, message: 'Masukkan nama panggilan (1-15 huruf)' };
    }
    const res = validatePlayerName(guestName, existingNames);
    return {
      isValid: res.isValid,
      message: res.isValid ? 'Nama tersedia & valid' : (res.error || 'Nama tidak valid'),
    };
  }, [guestName, existingNames]);

  // Handle direct inline join
  const handleInlineJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);

    if (room.stage !== 'LOBBY') {
      sound.playError();
      setJoinError('Game sudah dimulai. Tidak dapat bergabung.');
      return;
    }

    const clean = guestName.trim().toUpperCase();
    const res = joinRoomAsPlayer(clean);

    if (!res.success) {
      sound.playError();
      setJoinError(res.error || 'Gagal bergabung ke room.');
      return;
    }

    sound.playSuccess();
    triggerHaptic(25);
    if (res.playerId) {
      setCurrentPlayerId(res.playerId);
    }
  };

  // 1. Room Code Mismatch Warning
  if (!isRoomMatching) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-[#E1E2EB] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-sm w-full bg-[#151A22] border border-[#272A31] rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-[#EF4444]/20 border border-[#EF4444] text-[#FFB4AB] flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 stroke-[2]" />
          </div>

          <h1 className="font-anybody font-extrabold text-xl text-[#F5F7FA] uppercase tracking-wide">
            Room Tidak Ditemukan
          </h1>

          <p className="text-xs font-space text-[#8B93A1] leading-relaxed">
            Kode <strong className="text-[#FFC880]">{roomCode}</strong> tidak aktif. Sesi arena yang sedang berjalan adalah <strong className="text-[#85E28A]">{room.code}</strong>.
          </p>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                router.push(`/player/room/${room.code}`);
              }}
              className="w-full h-11 bg-[#F5A623] hover:bg-[#FFC880] text-[#452B00] font-bold text-xs uppercase tracking-wider rounded-lg transition-colors font-space flex items-center justify-center gap-2"
            >
              <span>Gabung ke Room {room.code}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <Link
              href="/player/join"
              onClick={() => sound.playTap()}
              className="w-full h-11 bg-[#272A31] hover:bg-[#353942] text-[#E1E2EB] font-bold text-xs uppercase tracking-wider rounded-lg transition-colors font-space flex items-center justify-center gap-2"
            >
              <span>Masukkan Kode Lain</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Late Join Blocked (if player not joined and stage is not LOBBY)
  if (!player && room.stage !== 'LOBBY') {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-[#E1E2EB] flex flex-col items-center justify-center p-6">
        <BlockedGameState roomCode={room.code} stage={room.stage} />
      </div>
    );
  }

  // 3. Unregistered Player in LOBBY -> Inline Join Form
  if (!player) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-[#E1E2EB] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm flex flex-col gap-6">
          <div className="text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-[#1D2026] border border-[#272A31] flex items-center justify-center text-[#FFC880] mb-3 shadow-md">
              <User className="w-6 h-6 stroke-[2]" />
            </div>
            <h1 className="font-anybody font-extrabold text-2xl text-[#E1E2EB] tracking-tight uppercase">
              Gabung Arena
            </h1>
            <p className="text-xs text-[#D7C3AE] mt-1 font-space">
              Room <strong className="text-[#FFC880] tracking-wider">{room.code}</strong> • Masukkan nama kamu
            </p>
          </div>

          <form
            onSubmit={handleInlineJoin}
            className="bg-[#151A22] border border-[#272A31] p-6 rounded-2xl shadow-xl flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label
                  htmlFor="inline-player-name"
                  className="text-xs font-bold text-[#8B93A1] uppercase tracking-wider font-space"
                >
                  NAMA PANGGILAN
                </label>
                <span className="text-[10px] text-[#8B93A1] font-space font-medium">
                  {guestName.length}/15
                </span>
              </div>

              <input
                id="inline-player-name"
                type="text"
                value={guestName}
                onChange={(e) => {
                  const sanitized = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 15);
                  setGuestName(sanitized);
                  setJoinError(null);
                }}
                placeholder="NAMA KAMU"
                maxLength={15}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                className="w-full h-14 uppercase text-center font-anybody font-extrabold text-2xl tracking-[0.1em] bg-[#0B0E14] border border-[#272A31] rounded-xl text-[#E1E2EB] placeholder:text-[#524534] focus:outline-none focus:border-[#FFC880] transition-colors"
              />

              {joinError ? (
                <div className="flex items-center gap-1.5 justify-center text-[#FFB4AB] text-xs font-space mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{joinError}</span>
                </div>
              ) : guestName.length > 0 ? (
                <div
                  className={`flex items-center gap-1.5 justify-center text-xs font-space mt-1 ${
                    validation.isValid ? 'text-[#85E28A]' : 'text-[#FFB4AB]'
                  }`}
                >
                  {validation.isValid ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{validation.message}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{validation.message}</span>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-[#8B93A1] text-center font-space">
                  Hanya huruf A-Z, tanpa angka atau spasi.
                </p>
              )}
            </div>

            <button
              id="btn-inline-join"
              type="submit"
              disabled={!validation.isValid}
              className="w-full h-12 bg-[#F5A623] hover:bg-[#FFC880] disabled:bg-[#272A31] disabled:text-[#8B93A1] text-[#452B00] font-bold text-xs uppercase tracking-wider rounded-xl transition-colors shadow flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed font-space"
            >
              <span>Masuk Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 4. Authenticated Player -> Route By Game Stage
  switch (room.stage) {
    case 'LOBBY':
      return <PlayerLobbyView player={player} roomCode={room.code} />;

    case 'QUESTION':
      if (!currentQuestion) {
        return (
          <div className="min-h-screen bg-[#0B0E14] text-[#E1E2EB] flex items-center justify-center p-6 text-center text-xs font-space text-[#8B93A1]">
            Memuat soal pertanyaan...
          </div>
        );
      }
      return (
        <PlayerQuestionView
          key={`q-${room.currentQuestionIndex}`}
          player={player}
          question={currentQuestion}
          questionIndex={room.currentQuestionIndex}
          totalQuestions={room.questions.length}
        />
      );

    case 'REVEAL':
      if (!currentQuestion) {
        return (
          <div className="min-h-screen bg-[#0B0E14] text-[#E1E2EB] flex items-center justify-center p-6 text-center text-xs font-space text-[#8B93A1]">
            Memuat pembahasan...
          </div>
        );
      }
      return (
        <PlayerRevealView
          key={`reveal-${room.currentQuestionIndex}`}
          player={player}
          question={currentQuestion}
          questionIndex={room.currentQuestionIndex}
        />
      );

    case 'SCOREBOARD':
      return <PlayerScoreboardView player={player} />;

    case 'FINAL':
      return <PlayerFinalView player={player} />;

    default:
      return <PlayerLobbyView player={player} roomCode={room.code} />;
  }
}
