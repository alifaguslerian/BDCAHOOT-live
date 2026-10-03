'use client';

import React, { Suspense, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowRight, LogIn, Monitor, Smartphone, User } from 'lucide-react';
import { sound } from '@/lib/soundFX';
const PlayerJoinForm = dynamic(() => import('@/components/player/PlayerJoinForm').then(module => module.PlayerJoinForm));

export const HostLanding = () => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [showJoinForm, setShowJoinForm] = useState(false);

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#0b0e14] text-[#e1e2eb] selection:bg-[#f5a623] selection:text-[#644000]">
      {/* Fixed Header */}
      <header className="fixed top-0 inset-x-0 z-40 bg-[#0b0e14]/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.35)]">
        <div className="h-16 w-full px-6 lg:px-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-anybody font-extrabold text-2xl tracking-tight uppercase text-[#e1e2eb]">
              BDCAHOOT
            </span>
            <span className="px-2 py-0.5 rounded bg-[#1d2026] text-xs font-bold text-[#ffc880] uppercase tracking-wider">
              LIVE ARENA
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8" aria-label="Navigasi Utama">
            <Link
              href="/host/library"
              className="text-[#ffc880] font-semibold hover:text-[#ffddb4] transition-colors"
            >
              Arena Stage
            </Link>
            <Link
              href="/player/join"
              className="text-[#d7c3ae] hover:text-[#e1e2eb] transition-colors"
            >
              Player Join
            </Link>
            <Link
              href="/host/library"
              className="text-[#d7c3ae] hover:text-[#e1e2eb] transition-colors"
            >
              Host Console
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#ffc880] flex items-center justify-center text-[#452b00]" aria-hidden="true">
              <User className="w-4 h-4" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full pt-20 pb-16 flex-1 flex flex-col justify-center items-center">
        <div className="relative w-full overflow-hidden px-6 lg:px-12 py-12 md:py-16 flex flex-col items-center justify-center">
          {/* Subtle Ambient Radial Glow (GPU Accelerated) */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30 transform-gpu will-change-transform">
            <div className="w-[600px] h-[300px] rounded-full bg-[#f5a623]/10 blur-[80px]"></div>
          </div>

          <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1d2026] shadow-sm mb-6 border border-[#32353c]/50">
              <span className="w-1.5 h-1.5 rounded-full bg-[#51df9c] animate-pulse" aria-hidden="true"></span>
              <span className="text-xs font-bold tracking-widest text-[#d7c3ae] uppercase font-space">
                ARENA MINIGAMES PLATFORM
              </span>
            </div>

            <h1 className="font-anybody font-extrabold text-4xl md:text-6xl text-[#e1e2eb] tracking-tight uppercase mb-4 select-none drop-shadow-md">
              BDCAHOOT
            </h1>

            <p className="text-base md:text-lg text-[#d7c3ae] max-w-xl mx-auto mb-12 font-normal leading-relaxed">
              Platform kuis panggung live interaktif untuk kompetisi dan presentasi seru.
            </p>

            {/* Two Action Cards Grid */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              {/* Card 1: START / HOST MODE */}
              <Link
                href="/host/library"
                id="card-host"
                onClick={() => sound.playTap()}
                aria-label="Mulai Host Mode - Buka Quiz Library"
                className="group relative flex flex-col justify-between p-8 rounded-xl bg-[#151a22] border border-[#272a31] hover:border-[#ffc880]/60 hover:bg-[#1d2026] transition-all duration-200 cursor-pointer shadow-lg hover:scale-[1.01]"
              >
                <div className="flex flex-col">
                  <div className="w-12 h-12 rounded-lg bg-[#32353c] flex items-center justify-center text-[#ffc880] mb-6 group-hover:bg-[#ffc880] group-hover:text-[#452b00] transition-colors duration-200" aria-hidden="true">
                    <Monitor className="w-6 h-6 stroke-[2]" />
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="font-anybody text-2xl text-[#e1e2eb] tracking-tight uppercase font-bold">
                      START
                    </span>
                    <span className="text-xs font-bold text-[#d7c3ae] uppercase tracking-wider font-space">
                      / Host Mode
                    </span>
                  </div>
                  <p className="text-sm md:text-base text-[#d7c3ae] leading-relaxed mb-6 font-normal">
                    Buat room baru, kelola soal kuis, dan pimpin kompetisi di layar proyektor panggung.
                  </p>
                </div>
                <div className="pt-2">
                  <div className="w-full py-3 px-5 rounded bg-[#f5a623] text-[#452b00] font-bold text-sm uppercase tracking-wider flex items-center justify-between group-hover:bg-[#ffc880] transition-colors shadow-md">
                    <span>Buka Quiz Library</span>
                    <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>

              {/* Card 2: MASUK / PLAYER DEVICE */}
              <div
                id="card-player"
                className="group relative flex flex-col justify-between p-8 rounded-xl bg-[#151a22] border border-[#272a31] shadow-lg"
              >
                <div className="flex flex-col">
                  <div className="w-12 h-12 rounded-lg bg-[#32353c] flex items-center justify-center text-[#e1e2eb] mb-6 group-hover:bg-[#363940] transition-colors duration-200" aria-hidden="true">
                    <Smartphone className="w-6 h-6 stroke-[2]" />
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="font-anybody text-2xl text-[#e1e2eb] tracking-tight uppercase font-bold">
                      MASUK
                    </span>
                    <span className="text-xs font-bold text-[#d7c3ae] uppercase tracking-wider font-space">
                      / Player Device
                    </span>
                  </div>
                  <p className="text-sm md:text-base text-[#d7c3ae] leading-relaxed mb-6 font-normal">
                    Masukkan PIN room 6 digit dari layar panggung untuk bergabung sebagai kontestan dari smartphone atau laptop.
                  </p>
                </div>
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => { sound.playTap(); setShowJoinForm(true); dialogRef.current?.showModal(); }}
                    className="w-full min-h-12 py-3 px-5 rounded bg-[#32353c] text-[#e1e2eb] font-bold text-sm uppercase tracking-wider flex items-center justify-between hover:bg-[#363940] hover:text-white transition-colors shadow-md cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffc880]"
                  >
                    <span>Masukkan Kode Room</span>
                    <LogIn className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            </div>

            {/* Version & Network Strip */}
            <div className="mt-12 pt-6 flex flex-wrap items-center justify-center gap-2 text-center text-xs font-bold text-[#d7c3ae] tracking-wider uppercase">
              <span>v0.3</span>
              <span className="text-[#524534]">•</span>
              <span>LAN Offline Engine Ready</span>
              <span className="text-[#524534]">•</span>
              <span>Tidak diperlukan akun untuk bergabung</span>
            </div>
          </div>
        </div>
      </main>


      {/* Global Bottom Status Bar */}
      <dialog ref={dialogRef} onClose={() => setShowJoinForm(false)} aria-label="Masukkan kode room" className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md max-h-[90dvh] overflow-y-auto rounded-xl border border-[#272a31] bg-[#0b0e14] p-6 text-[#e1e2eb] backdrop:bg-black/70">
        <form method="dialog" className="flex justify-end mb-2">
          <button className="min-h-12 min-w-12 px-3 rounded text-sm focus-visible:outline-2 focus-visible:outline-[#ffc880]">Tutup</button>
        </form>
        {showJoinForm && <Suspense fallback={<p>Memuat...</p>}><PlayerJoinForm /></Suspense>}
      </dialog>
      <footer className="w-full bg-[#0b0e14] border-t border-[#1d2026] shadow-[0_-1px_8px_rgba(0,0,0,0.25)]">
        <div className="h-14 w-full px-6 lg:px-12 flex items-center justify-between text-xs font-bold text-[#d7c3ae] tracking-wider">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00b173] animate-pulse"></span>
            <span className="uppercase text-[#e1e2eb]">ARENA LAN ENGINE READY</span>
            <span className="text-[#524534]">•</span>
            <span>LATENCY &lt; 5MS</span>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <span>NODE: VENUE-HOST-01</span>
            <span className="text-[#524534]">•</span>
            <span>© BDCAHOOT ARENA SYSTEMS</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
