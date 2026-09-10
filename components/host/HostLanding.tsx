'use client';

import React, { useState } from 'react';
import { ArrowRight, LogIn, Monitor, Smartphone, X, User } from 'lucide-react';
import { sound } from '@/lib/soundFX';

interface HostLandingProps {
  onStartHost: () => void;
  onEnterPlayer: (pin?: string) => void;
}

export const HostLanding: React.FC<HostLandingProps> = ({ onStartHost, onEnterPlayer }) => {
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const handleOpenPin = () => {
    sound.playTap();
    setShowPinModal(true);
    setPinError(false);
  };

  const handlePinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPin = pinInput.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (cleanPin.length === 6) {
      sound.playSuccess();
      setShowPinModal(false);
      onEnterPlayer(cleanPin);
    } else {
      sound.playError();
      setPinError(true);
      setTimeout(() => setPinError(false), 800);
    }
  };

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

          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={onStartHost}
              className="text-[#ffc880] font-semibold hover:text-[#ffddb4] transition-colors"
            >
              Arena Stage
            </button>
            <button
              onClick={handleOpenPin}
              className="text-[#d7c3ae] hover:text-[#e1e2eb] transition-colors"
            >
              Game Modes
            </button>
            <button
              onClick={onStartHost}
              className="text-[#d7c3ae] hover:text-[#e1e2eb] transition-colors"
            >
              Host Console
            </button>
            <button
              onClick={onStartHost}
              className="text-[#d7c3ae] hover:text-[#e1e2eb] transition-colors"
            >
              Spectate
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#ffc880] flex items-center justify-center text-[#452b00]">
              <User className="w-4 h-4" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full pt-20 pb-16 flex-1 flex flex-col justify-center items-center">
        <div className="relative w-full overflow-hidden px-6 lg:px-12 py-12 md:py-16 flex flex-col items-center justify-center">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40">
            <div className="w-[720px] h-[360px] rounded-full bg-[#f5a623]/10 blur-[120px]"></div>
          </div>

          <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1d2026] shadow-sm mb-6 border border-[#32353c]/50">
              <span className="w-1.5 h-1.5 rounded-full bg-[#51df9c] animate-pulse"></span>
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
              <div
                id="card-host"
                onClick={() => {
                  sound.playTap();
                  onStartHost();
                }}
                className="group relative flex flex-col justify-between p-8 rounded-xl bg-[#151a22] border border-[#272a31] hover:border-[#ffc880]/60 hover:bg-[#1d2026] transition-all duration-200 cursor-pointer shadow-lg hover:scale-[1.01]"
              >
                <div className="flex flex-col">
                  <div className="w-12 h-12 rounded-lg bg-[#32353c] flex items-center justify-center text-[#ffc880] mb-6 group-hover:bg-[#ffc880] group-hover:text-[#452b00] transition-colors duration-200">
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
                  <button
                    type="button"
                    className="w-full py-3 px-5 rounded bg-[#f5a623] text-[#452b00] font-bold text-sm uppercase tracking-wider flex items-center justify-between group-hover:bg-[#ffc880] transition-colors shadow-md"
                  >
                    <span>Buka Quiz Library</span>
                    <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
                  </button>
                </div>
              </div>

              {/* Card 2: MASUK / PLAYER DEVICE */}
              <div
                id="card-player"
                onClick={handleOpenPin}
                className="group relative flex flex-col justify-between p-8 rounded-xl bg-[#151a22] border border-[#272a31] hover:border-[#3b82f6]/60 hover:bg-[#1d2026] transition-all duration-200 cursor-pointer shadow-lg hover:scale-[1.01]"
              >
                <div className="flex flex-col">
                  <div className="w-12 h-12 rounded-lg bg-[#32353c] flex items-center justify-center text-[#e1e2eb] mb-6 group-hover:bg-[#363940] transition-colors duration-200">
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
                <div className="pt-2">
                  <button
                    type="button"
                    className="w-full py-3 px-5 rounded bg-[#32353c] text-[#e1e2eb] font-bold text-sm uppercase tracking-wider flex items-center justify-between group-hover:bg-[#363940] hover:text-white transition-colors shadow-md"
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

      {/* PIN Modal Popup */}
      {showPinModal && (
        <div
          id="pin-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPinModal(false);
          }}
          className="fixed inset-0 z-50 bg-[#0b0e14]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-[#1d2026] border border-[#272a31] rounded-xl p-6 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex flex-col">
                <span className="font-anybody text-lg text-[#e1e2eb] font-bold uppercase tracking-tight">
                  KONTES PEMAIN
                </span>
                <span className="text-xs font-bold text-[#d7c3ae] uppercase tracking-wider">
                  Sambungkan ke layar arena
                </span>
              </div>
              <button
                id="modal-close"
                onClick={() => setShowPinModal(false)}
                className="w-8 h-8 rounded-lg bg-[#32353c] flex items-center justify-center text-[#d7c3ae] hover:text-white transition-colors"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePinSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="room-pin-input"
                  className="text-xs font-bold text-[#d7c3ae] uppercase tracking-wider"
                >
                  PIN RUANG (6 DIGIT)
                </label>
                <input
                  id="room-pin-input"
                  type="text"
                  maxLength={7}
                  value={pinInput}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                    if (val.length > 3) {
                      val = val.slice(0, 3) + ' ' + val.slice(3, 6);
                    }
                    setPinInput(val);
                  }}
                  placeholder="BDA 729"
                  autoFocus
                  className={`w-full h-14 bg-[#0b0e14] text-center font-anybody font-extrabold text-2xl tracking-[0.2em] text-[#ffc880] placeholder:text-[#524534] rounded-lg border ${
                    pinError ? 'border-[#ffb4ab] bg-[#93000a]/20' : 'border-[#272a31]'
                  } focus:outline-none focus:border-[#ffc880] transition-colors`}
                />
                <p className="text-xs text-[#d7c3ae] text-center">
                  Coba PIN demo default: <strong className="text-[#ffc880]">BDA 729</strong>
                </p>
              </div>

              <button
                type="submit"
                id="submit-pin-btn"
                className="mt-2 w-full py-3 px-4 rounded bg-[#f5a623] hover:bg-[#ffc880] text-[#452b00] font-bold text-sm uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-2"
              >
                <span>Masuk Pertandingan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Global Bottom Status Bar */}
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
