'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Smartphone, ArrowLeft } from 'lucide-react';
import { sound } from '@/lib/soundFX';

function PlayerJoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = searchParams?.get('code') || '';

  const [code, setCode] = useState(() => (searchParams?.get('code') || '').toUpperCase().slice(0, 6));
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (clean.length !== 6) {
      sound.playError();
      setError('Kode room harus terdiri dari 6 karakter (misal: BDA729)');
      return;
    }

    sound.playSuccess();
    setError(null);
    router.push(`/player/name?room=${clean}`);
  };

  return (
    <div className="w-full max-w-sm flex flex-col gap-6">
      {/* Header */}
      <div className="text-center flex flex-col items-center">
        <div className="w-12 h-12 rounded-xl bg-[#1d2026] border border-[#272a31] flex items-center justify-center text-[#ffc880] mb-4">
          <Smartphone className="w-6 h-6 stroke-[2]" />
        </div>
        <h1 className="font-anybody font-extrabold text-2xl text-[#e1e2eb] tracking-tight uppercase">
          Masuk ke Room
        </h1>
        <p className="text-xs text-[#d7c3ae] mt-1 font-space">
          Masukkan 6 digit kode PIN yang tampil di layar arena panggung.
        </p>
      </div>

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-[#151a22] border border-[#272a31] p-6 rounded-xl shadow-xl flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="room-code-input"
            className="text-xs font-bold text-[#8b93a1] uppercase tracking-wider font-space"
          >
            KODE ROOM (PIN)
          </label>
          <input
            id="room-code-input"
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase().slice(0, 6));
              setError(null);
            }}
            placeholder="BDA729"
            maxLength={6}
            autoFocus
            className="w-full h-14 uppercase text-center font-anybody font-extrabold text-2xl tracking-[0.2em] bg-[#0b0e14] border border-[#272a31] rounded-lg text-[#ffc880] placeholder:text-[#524534] focus:outline-none focus:border-[#ffc880] transition-colors"
          />
          {error && (
            <span className="text-xs text-[#ffb4ab] font-space text-center">{error}</span>
          )}
        </div>

        <button
          id="btn-submit-code"
          type="submit"
          className="w-full h-12 bg-[#f5a623] hover:bg-[#ffc880] text-[#452b00] font-bold text-sm uppercase tracking-wider rounded-lg transition-colors shadow flex items-center justify-center gap-2"
        >
          <span>Lanjut ke Nama</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-[11px] text-[#8b93a1] text-center font-space">
          Demo Room Default: <strong className="text-[#ffc880]">BDA729</strong>
        </p>
      </form>

      <div className="text-center">
        <Link
          href="/"
          onClick={() => sound.playTap()}
          className="inline-flex items-center gap-1.5 text-xs text-[#8b93a1] hover:text-[#e1e2eb] font-space transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Halaman Utama</span>
        </Link>
      </div>
    </div>
  );
}

export default function PlayerJoinPage() {
  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#e1e2eb] flex flex-col justify-center items-center p-6 selection:bg-[#f5a623] selection:text-[#452b00]">
      <Suspense fallback={<div className="text-xs text-[#8b93a1]">Memuat...</div>}>
        <PlayerJoinContent />
      </Suspense>
    </div>
  );
}
