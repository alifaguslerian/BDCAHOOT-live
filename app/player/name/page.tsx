'use client';

import React, { useState, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useGame } from '@/context/GameContext';
import { sound } from '@/lib/soundFX';
import { validatePlayerName } from '@/lib/validation';
import { ResumePlayerSession } from '@/components/player/ResumePlayerSession';

function PlayerNameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomCode = (searchParams?.get('room') || '').toUpperCase();

  const { room, joinRoomAsPlayer } = useGame();
  const [name, setName] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Live duplicate check against existing room players
  const existingNames = useMemo(() => {
    return room.code === roomCode ? Object.values(room.players).map((p) => p.name) : [];
  }, [room.players, room.code, roomCode]);

  // Live validation computation
  const validationState = useMemo(() => {
    if (!name.trim()) {
      return { isValid: false, message: 'Masukkan nama (1-15 huruf)' };
    }
    const res = validatePlayerName(name, existingNames);
    return {
      isValid: res.isValid,
      message: res.isValid ? 'Nama tersedia & valid' : (res.error || 'Nama tidak valid'),
    };
  }, [name, existingNames]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const cleanName = name.trim().toUpperCase();
    const res = await joinRoomAsPlayer(cleanName, roomCode);

    if (!res.success) {
      sound.playError();
      setSubmitError(res.error || 'Nama tidak valid');
      return;
    }

    sound.playSuccess();
    router.push(`/player/room/${roomCode}`);
  };

  return (
    <div className="w-full max-w-sm flex flex-col gap-6">
      <ResumePlayerSession requestedCode={roomCode} />
      {/* Header */}
      <div className="text-center flex flex-col items-center">
        <div className="w-12 h-12 rounded-xl bg-[#1d2026] border border-[#272a31] flex items-center justify-center text-[#ffc880] mb-4 shadow-md">
          <User className="w-6 h-6 stroke-[2]" />
        </div>
        <h1 className="font-anybody font-extrabold text-2xl text-[#e1e2eb] tracking-tight uppercase">
          Tentukan Nama
        </h1>
        <p className="text-xs text-[#d7c3ae] mt-1 font-space">
          Nama arena untuk room <strong className="text-[#ffc880] tracking-wider">{roomCode}</strong> (A-Z saja,
          tanpa spasi/angka).
        </p>
      </div>

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-[#151a22] border border-[#272a31] p-6 rounded-xl shadow-xl flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label
              htmlFor="player-name-input"
              className="text-xs font-bold text-[#8b93a1] uppercase tracking-wider font-space"
            >
              NAMA PANGGILAN
            </label>
            <span className="text-[10px] text-[#8b93a1] font-space font-medium">
              {name.length}/15
            </span>
          </div>

          <input
            id="player-name-input"
            type="text"
            value={name}
            onChange={(e) => {
              // Auto-sanitize to alphabets only and uppercase
              const val = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 15);
              setName(val);
              setSubmitError(null);
            }}
            placeholder="ALDI"
            maxLength={15}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            className="w-full h-14 uppercase text-center font-anybody font-extrabold text-2xl tracking-[0.1em] bg-[#0b0e14] border border-[#272a31] rounded-lg text-[#e1e2eb] placeholder:text-[#524534] focus:outline-none focus:border-[#ffc880] transition-colors"
          />

          {/* Validation Feedback */}
          {submitError ? (
            <div className="flex items-center gap-1.5 justify-center text-[#ffb4ab] text-xs font-space mt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{submitError}</span>
            </div>
          ) : name.length > 0 ? (
            <div
              className={`flex items-center gap-1.5 justify-center text-xs font-space mt-1 ${
                validationState.isValid ? 'text-[#85e28a]' : 'text-[#ffb4ab]'
              }`}
            >
              {validationState.isValid ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{validationState.message}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{validationState.message}</span>
                </>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-[#8b93a1] text-center font-space">
              Hanya huruf A-Z, maksimal 15 karakter.
            </p>
          )}
        </div>

        <button
          id="btn-join-room"
          type="submit"
          disabled={!validationState.isValid}
          className="w-full h-12 bg-[#f5a623] hover:bg-[#ffc880] disabled:bg-[#272a31] disabled:text-[#8b93a1] text-[#452b00] font-bold text-sm uppercase tracking-wider rounded-lg transition-colors shadow flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          <span>Masuk Arena</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {existingNames.length > 0 && (
          <div className="border-t border-[#272a31] pt-3 mt-1">
            <p className="text-[10px] text-[#8b93a1] text-center font-space">
              Peserta di room ini ({existingNames.length}):{' '}
              <span className="text-[#d7c3ae]">{existingNames.slice(0, 5).join(', ')}{existingNames.length > 5 ? '...' : ''}</span>
            </p>
          </div>
        )}
      </form>

      <div className="text-center">
        <Link
          href={`/player/join?code=${roomCode}`}
          onClick={() => sound.playTap()}
          className="inline-flex items-center gap-1.5 text-xs text-[#8b93a1] hover:text-[#e1e2eb] font-space transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Ganti Kode Room</span>
        </Link>
      </div>
    </div>
  );
}

export default function PlayerNamePage() {
  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#e1e2eb] flex flex-col justify-center items-center p-6 selection:bg-[#f5a623] selection:text-[#452b00]">
      <Suspense fallback={<div className="text-xs text-[#8b93a1]">Memuat...</div>}>
        <PlayerNameContent />
      </Suspense>
    </div>
  );
}
