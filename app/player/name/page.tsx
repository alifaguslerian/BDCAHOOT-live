'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, ArrowRight, ArrowLeft } from 'lucide-react';
import { useMockGame } from '@/context/MockGameContext';
import { sound } from '@/lib/soundFX';

function PlayerNameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomCode = searchParams?.get('room') || 'BDA729';

  const { joinRoomAsPlayer, setCurrentPlayerId } = useMockGame();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim().toUpperCase();

    const res = joinRoomAsPlayer(cleanName);
    if (!res.success) {
      sound.playError();
      setError(res.error || 'Nama tidak valid');
      return;
    }

    sound.playSuccess();
    if (res.playerId) {
      setCurrentPlayerId(res.playerId);
    }
    router.push(`/player/room/${roomCode}`);
  };

  return (
    <div className="w-full max-w-sm flex flex-col gap-6">
      {/* Header */}
      <div className="text-center flex flex-col items-center">
        <div className="w-12 h-12 rounded-xl bg-[#1d2026] border border-[#272a31] flex items-center justify-center text-[#ffc880] mb-4">
          <User className="w-6 h-6 stroke-[2]" />
        </div>
        <h1 className="font-anybody font-extrabold text-2xl text-[#e1e2eb] tracking-tight uppercase">
          Tentukan Nama
        </h1>
        <p className="text-xs text-[#d7c3ae] mt-1 font-space">
          Nama arena untuk room <strong className="text-[#ffc880]">{roomCode}</strong> (A-Z saja,
          tanpa spasi/angka).
        </p>
      </div>

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-[#151a22] border border-[#272a31] p-6 rounded-xl shadow-xl flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="player-name-input"
            className="text-xs font-bold text-[#8b93a1] uppercase tracking-wider font-space"
          >
            NAMA PANGGILAN
          </label>
          <input
            id="player-name-input"
            type="text"
            value={name}
            onChange={(e) => {
              // Auto-sanitize to alphabets only
              const val = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
              setName(val);
              setError(null);
            }}
            placeholder="ALDI"
            maxLength={15}
            autoFocus
            className="w-full h-14 uppercase text-center font-anybody font-extrabold text-2xl tracking-[0.1em] bg-[#0b0e14] border border-[#272a31] rounded-lg text-[#e1e2eb] placeholder:text-[#524534] focus:outline-none focus:border-[#ffc880] transition-colors"
          />
          {error ? (
            <span className="text-xs text-[#ffb4ab] font-space text-center">{error}</span>
          ) : (
            <p className="text-[11px] text-[#8b93a1] text-center font-space">
              Hanya huruf A-Z, maksimal 15 karakter.
            </p>
          )}
        </div>

        <button
          id="btn-join-room"
          type="submit"
          className="w-full h-12 bg-[#f5a623] hover:bg-[#ffc880] text-[#452b00] font-bold text-sm uppercase tracking-wider rounded-lg transition-colors shadow flex items-center justify-center gap-2"
        >
          <span>Masuk Arena</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="text-center">
        <Link
          href="/player/join"
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
