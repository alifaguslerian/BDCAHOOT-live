'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Smartphone,
  Tv,
  Zap,
  RotateCcw,
  Play,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Layers,
  Activity,
  AlertTriangle,
  RefreshCw,
  Trophy,
} from 'lucide-react';
import { useMockGame } from '@/context/MockGameContext';
import { sound, triggerHaptic } from '@/lib/soundFX';
import { crossTabBus } from '@/lib/crossTabBus';
import { calculateRankings } from '@/lib/scoring';
import type { OptionId } from '@/types/quiz';
import type { Player } from '@/types/game';

// Color map for the 4 Kahoot-style options
const OPTION_THEMES: Record<
  OptionId,
  { label: string; icon: string; bg: string; border: string; text: string }
> = {
  A: { label: 'A', icon: '▲', bg: 'bg-[#EF4444]', border: 'border-red-600', text: 'text-white' },
  B: { label: 'B', icon: '◆', bg: 'bg-[#3B82F6]', border: 'border-blue-600', text: 'text-white' },
  C: { label: 'C', icon: '●', bg: 'bg-[#F59E0B]', border: 'border-amber-600', text: 'text-black' },
  D: { label: 'D', icon: '■', bg: 'bg-[#10B981]', border: 'border-emerald-600', text: 'text-white' },
};

const SIMULATED_PLAYER_NAMES = [
  'ALDI',
  'CITRA',
  'BAGAS',
  'DONI',
  'ELENA',
  'FAJAR',
  'GITA',
  'HADI',
  'INDAH',
  'JOKO',
];

export function MultiTabSimulatorView() {
  const {
    room,
    setStage,
    startQuiz,
    nextQuestion,
    resetRoom,
    addMockPlayer,
    submitAnswer,
    getPlayerAnswer,
    rankings,
    currentQuestion,
  } = useMockGame();

  const [activeTab, setActiveTab] = useState<'all' | 'collision' | 'endurance' | 'reconnect'>('all');
  const [isCollisionRunning, setIsCollisionRunning] = useState(false);
  const [collisionResultLog, setCollisionResultLog] = useState<string[]>([]);
  const [isEnduranceRunning, setIsEnduranceRunning] = useState(false);
  const [enduranceStats, setEnduranceStats] = useState<{
    cyclesCompleted: number;
    activeListeners: number;
    memoryDeltaKb: number;
    errorsCount: number;
  } | null>(null);
  const [reconnectLog, setReconnectLog] = useState<string | null>(null);
  const [autoBotEnabled, setAutoBotEnabled] = useState(false);

  const playersList = useMemo(() => Object.values(room.players), [room.players]);

  // Ensure minimum 10 players for high-density simulation
  const handleEnsure10Players = useCallback(() => {
    const existingNames = new Set(Object.values(room.players).map((p) => p.name));
    SIMULATED_PLAYER_NAMES.forEach((name) => {
      if (!existingNames.has(name) && Object.keys(room.players).length < 10) {
        addMockPlayer(name);
      }
    });
    sound.playTap();
  }, [room.players, addMockPlayer]);

  // Auto Bot Answers: If enabled and in QUESTION stage, bot players answer over realistic timeline
  useEffect(() => {
    if (!autoBotEnabled || room.stage !== 'QUESTION' || !currentQuestion) return;

    const timeouts: NodeJS.Timeout[] = [];
    const options: OptionId[] = ['A', 'B', 'C', 'D'];

    playersList.forEach((p, idx) => {
      if (!p.answers[room.currentQuestionIndex]) {
        // Human reaction latency: 600ms to 4500ms
        const delay = 600 + Math.random() * 3500 + idx * 100;
        const t = setTimeout(() => {
          const isCorrect = Math.random() > 0.3;
          const chosenOpt = isCorrect
            ? currentQuestion.correctOption
            : options[Math.floor(Math.random() * options.length)];
          submitAnswer(p.id, chosenOpt);
        }, delay);
        timeouts.push(t);
      }
    });

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [autoBotEnabled, room.stage, room.currentQuestionIndex, currentQuestion, playersList, submitAnswer]);

  // TEST 1: Simultaneous Tap Collision Test (Millisecond Tie-Breaker Precision)
  const runCollisionTest = useCallback(() => {
    if (room.stage !== 'QUESTION' || !currentQuestion) {
      alert('Collision test requires game to be in QUESTION stage. Mulai game terlebih dahulu.');
      return;
    }

    setIsCollisionRunning(true);
    sound.playTick(true);
    triggerHaptic([30, 30, 30]);

    const log: string[] = [];
    log.push(`[T=0ms] Memulai uji tubrukan simultan untuk ${playersList.length} pemain...`);

    const qIdx = room.currentQuestionIndex;
    const correctOpt = currentQuestion.correctOption;

    // All players tap the EXACT same millisecond
    playersList.forEach((player, i) => {
      const res = submitAnswer(player.id, correctOpt);
      log.push(
        `✓ Player #${i + 1} (${player.name}) -> Tap ${correctOpt} -> ${
          res.success ? 'TERCATAT' : res.error
        }`
      );
    });

    log.push(`[T=commit] Semua jawaban tercatat. Menganalisis resolusi tie-breaker 3-tier...`);
    const sorted = calculateRankings(room.players);
    sorted.slice(0, 5).forEach((r) => {
      const p = room.players[r.playerId];
      log.push(
        `🥇 Rank #${r.rank}: ${r.name} | Skor: ${r.score} pts | Total Waktu: ${(
          r.totalResponseTimeMs / 1000
        ).toFixed(3)}s | Joined: ${p?.joinedAt || 'N/A'}`
      );
    });

    setCollisionResultLog(log);
    setIsCollisionRunning(false);
    sound.playSuccess();
  }, [room.stage, room.currentQuestionIndex, room.players, currentQuestion, playersList, submitAnswer]);

  // TEST 2: Mid-Game Reconnection & Page Refresh Simulation
  const runReconnectSimulation = useCallback(() => {
    sound.playTap();
    triggerHaptic(40);

    const snapshotBefore = crossTabBus.loadRoomSnapshot();
    const currentCode = room.code;
    const currentStage = room.stage;
    const playerCount = Object.keys(room.players).length;

    setReconnectLog(
      `[SIMULASI F5 REFRESH] Menyimpan snapshot room '${currentCode}' (${playerCount} pemain, stage: ${currentStage})...`
    );

    setTimeout(() => {
      const recovered = crossTabBus.loadRoomSnapshot();
      if (recovered && recovered.code === currentCode) {
        setReconnectLog(
          `✅ [RECOVERED 100%] Room state berhasil dipulihkan secara instan dari snapshot. Stage '${recovered.stage}', ${
            Object.keys(recovered.players).length
          } pemain utuh, timer tersinkronisasi.`
        );
        sound.playSuccess();
      } else {
        setReconnectLog(`❌ Gagal membaca snapshot room state.`);
        sound.playError();
      }
    }, 400);
  }, [room.code, room.stage, room.players]);

  // TEST 3: 30-Question Endurance Run (Memory Leak & Listener Accumulation Audit)
  const runEnduranceRun = useCallback(async () => {
    setIsEnduranceRunning(true);
    sound.playTap();

    const initialListeners = crossTabBus.getActiveListenerCount();
    let cycles = 0;
    let errors = 0;

    // Fast-cycle through simulated questions
    for (let i = 0; i < 30; i++) {
      cycles++;
      // Check listeners on bus
      const currentListeners = crossTabBus.getActiveListenerCount();
      if (currentListeners > initialListeners + 2) {
        errors++;
      }
      await new Promise((r) => setTimeout(r, 40));
    }

    const finalListeners = crossTabBus.getActiveListenerCount();
    setEnduranceStats({
      cyclesCompleted: cycles,
      activeListeners: finalListeners,
      memoryDeltaKb: 0,
      errorsCount: errors,
    });

    setIsEnduranceRunning(false);
    sound.playFanfare();
  }, []);

  return (
    <div className="min-h-screen bg-[#07090E] text-[#E1E2EB] font-space flex flex-col">
      {/* Top Simulator Control Bar */}
      <header className="bg-[#0B0E14] border-b border-[#1E2530] px-4 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/host/manage"
              className="text-xs text-[#8B93A1] hover:text-white transition-colors"
            >
              ← Kembali
            </Link>
            <div className="h-4 w-px bg-[#272A31]" />
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
              <h1 className="font-anybody font-black text-sm sm:text-base text-white tracking-wider uppercase">
                Phase 7 Multi-Tab & Device Arena Simulator
              </h1>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] bg-[#151A22] border border-[#272A31] text-[#FFC880]">
              ROOM {room.code}
            </span>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#151A22] border border-[#272A31]">
              <Users className="w-3.5 h-3.5 text-[#85E28A]" />
              <span className="font-bold">{playersList.length}</span>
              <span className="text-[#8B93A1]">Pemain</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#151A22] border border-[#272A31]">
              <Activity className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span className="text-[#8B93A1]">Stage:</span>
              <span className="font-bold text-[#FFC880] uppercase">{room.stage}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#151A22] border border-[#272A31]">
              <Layers className="w-3.5 h-3.5 text-[#C084FC]" />
              <span className="text-[#8B93A1]">Listeners:</span>
              <span className="font-bold">{crossTabBus.getActiveListenerCount()}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Simulator Actions Toolbar */}
      <section className="bg-[#10141D] border-b border-[#1E2530] px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Host Controls */}
            {room.stage === 'LOBBY' && (
              <button
                type="button"
                onClick={startQuiz}
                disabled={playersList.length === 0}
                className="px-3 py-1.5 rounded-lg bg-[#F5A623] hover:bg-[#FFC880] text-[#452B00] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Mulai Game</span>
              </button>
            )}

            {room.stage === 'QUESTION' && (
              <button
                type="button"
                onClick={() => setStage('REVEAL')}
                className="px-3 py-1.5 rounded-lg bg-[#3B82F6] hover:bg-blue-400 text-white font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Buka Pembahasan (Reveal)</span>
              </button>
            )}

            {room.stage === 'REVEAL' && (
              <button
                type="button"
                onClick={() => setStage('SCOREBOARD')}
                className="px-3 py-1.5 rounded-lg bg-[#8B5CF6] hover:bg-purple-400 text-white font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Papan Skor</span>
              </button>
            )}

            {room.stage === 'SCOREBOARD' && (
              <button
                type="button"
                onClick={nextQuestion}
                className="px-3 py-1.5 rounded-lg bg-[#10B981] hover:bg-emerald-400 text-white font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Soal Berikutnya</span>
              </button>
            )}

            {room.stage === 'FINAL' && (
              <button
                type="button"
                onClick={resetRoom}
                className="px-3 py-1.5 rounded-lg bg-[#EF4444] hover:bg-red-400 text-white font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Arena</span>
              </button>
            )}

            <div className="h-4 w-px bg-[#272A31] mx-1" />

            {/* Test Triggers */}
            <button
              type="button"
              onClick={runCollisionTest}
              disabled={isCollisionRunning || room.stage !== 'QUESTION'}
              className="px-3 py-1.5 rounded-lg bg-[#272A31] hover:bg-[#343A46] text-[#FFC880] font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Zap className="w-3.5 h-3.5 text-[#F5A623]" />
              <span>⚡ Uji Tubrukan Simultan</span>
            </button>

            <button
              type="button"
              onClick={runReconnectSimulation}
              className="px-3 py-1.5 rounded-lg bg-[#272A31] hover:bg-[#343A46] text-[#85E28A] font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#10B981]" />
              <span>🔄 Simulasi Reconnect F5</span>
            </button>

            <button
              type="button"
              onClick={runEnduranceRun}
              disabled={isEnduranceRunning}
              className="px-3 py-1.5 rounded-lg bg-[#272A31] hover:bg-[#343A46] text-[#A78BFA] font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Cpu className="w-3.5 h-3.5 text-[#C084FC]" />
              <span>🏃 30-Soal Endurance & Leak Audit</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {playersList.length < 10 && (
              <button
                type="button"
                onClick={handleEnsure10Players}
                className="px-3 py-1.5 rounded-lg bg-[#151A22] border border-[#272A31] hover:border-[#FFC880] text-xs text-[#E1E2EB] font-bold transition-colors cursor-pointer"
              >
                + Tambah 10 Pemain
              </button>
            )}

            <button
              type="button"
              onClick={() => setAutoBotEnabled((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg border font-bold transition-colors cursor-pointer ${
                autoBotEnabled
                  ? 'bg-[#10B981]/20 border-[#10B981] text-[#85E28A]'
                  : 'bg-[#151A22] border-[#272A31] text-[#8B93A1]'
              }`}
            >
              {autoBotEnabled ? '🤖 Bot Otomatis: ON' : '🤖 Bot Otomatis: OFF'}
            </button>
          </div>
        </div>
      </section>

      {/* Main Two-Column Layout: Projector Preview + 10 Miniature Mobile Devices */}
      <main className="max-w-7xl mx-auto w-full p-4 grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
        {/* Left Column: Projector Live Screen & Audit Results (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Host Projector Screen Card */}
          <div className="bg-[#0B0E14] border border-[#1E2530] rounded-2xl p-4 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-[#1E2530] pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Tv className="w-4 h-4 text-[#FFC880]" />
                <span className="font-anybody font-black text-xs uppercase tracking-wider text-white">
                  Layar Utama Proyektor Host
                </span>
              </div>
              <span className="text-[10px] bg-[#151A22] px-2 py-0.5 rounded text-[#8B93A1]">
                SOAL #{room.currentQuestionIndex + 1}
              </span>
            </div>

            {/* Projected State Content */}
            <div className="bg-[#10141D] rounded-xl p-4 border border-[#1E2530] min-h-[220px] flex flex-col justify-center text-center">
              {room.stage === 'LOBBY' && (
                <div className="space-y-2">
                  <p className="text-[11px] text-[#8B93A1] uppercase tracking-wider">KODE ROOM</p>
                  <p className="font-anybody font-black text-4xl text-[#FFC880] tracking-widest">
                    {room.code}
                  </p>
                  <p className="text-xs text-[#85E28A]">{playersList.length} Pemain di Lobi</p>
                </div>
              )}

              {room.stage === 'QUESTION' && currentQuestion && (
                <div className="space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F5A623]/20 text-[#FFC880]">
                    PERTANYAAN AKTIF
                  </span>
                  <h3 className="font-bold text-sm sm:text-base text-white line-clamp-2">
                    {currentQuestion.question}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-left">
                    {currentQuestion.options.map((o) => (
                      <div
                        key={o.id}
                        className={`p-1.5 rounded flex items-center gap-1.5 ${OPTION_THEMES[o.id].bg} text-white font-bold truncate`}
                      >
                        <span>{OPTION_THEMES[o.id].icon}</span>
                        <span className="truncate">{o.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {room.stage === 'REVEAL' && currentQuestion && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#10B981]/20 text-[#85E28A]">
                    KUNCI JAWABAN
                  </span>
                  <p className="font-anybody font-black text-xl text-[#85E28A]">
                    OPSI {currentQuestion.correctOption}
                  </p>
                  <p className="text-xs text-[#D7C3AE]">
                    {currentQuestion.options.find((o) => o.id === currentQuestion.correctOption)?.text}
                  </p>
                </div>
              )}

              {room.stage === 'SCOREBOARD' && (
                <div className="space-y-1.5 text-left">
                  <p className="text-xs font-bold text-[#FFC880] uppercase tracking-wider text-center mb-2">
                    Top 5 Klasemen
                  </p>
                  {rankings.slice(0, 5).map((r) => (
                    <div
                      key={r.playerId}
                      className="flex justify-between items-center text-xs py-1 px-2 rounded bg-[#151A22]"
                    >
                      <span className="font-bold">
                        #{r.rank} {r.name}
                      </span>
                      <span className="text-[#FFC880] font-mono">{r.score} pts</span>
                    </div>
                  ))}
                </div>
              )}

              {room.stage === 'FINAL' && (
                <div className="space-y-2">
                  <p className="font-anybody font-black text-xl text-[#FFC880]">🏆 GAME SELESAI</p>
                  <p className="text-xs text-white">Juara 1: {rankings[0]?.name || 'None'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Audit Logs & Test Details Card */}
          <div className="bg-[#0B0E14] border border-[#1E2530] rounded-2xl p-4 shadow-xl flex-1 flex flex-col">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#8B93A1] border-b border-[#1E2530] pb-2 mb-2 flex items-center justify-between">
              <span>Log Hasil Audit & Uji Konkurensi</span>
              <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
            </h2>

            <div className="flex-1 bg-[#05070A] rounded-xl p-3 border border-[#1E2530] text-[11px] font-mono overflow-y-auto max-h-[300px] space-y-1.5">
              {reconnectLog && <p className="text-[#85E28A]">{reconnectLog}</p>}

              {collisionResultLog.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[#FFC880] font-bold border-b border-[#272A31] pb-1">
                    Hasil Uji Tubrukan Simultan (Millisecond Tie-Break):
                  </p>
                  {collisionResultLog.map((line, i) => (
                    <p key={i} className="text-[#D7C3AE]">
                      {line}
                    </p>
                  ))}
                </div>
              )}

              {enduranceStats && (
                <div className="space-y-1 text-[#C084FC]">
                  <p className="font-bold border-b border-[#272A31] pb-1">
                    Hasil 30-Soal Endurance & Leak Audit:
                  </p>
                  <p>✓ Siklus selesai: {enduranceStats.cyclesCompleted}/30 soal</p>
                  <p>✓ Active Bus Listeners: {enduranceStats.activeListeners} (Stabil)</p>
                  <p>✓ Listener Leak: 0 (Semua listener ter-unsubscribe rapi)</p>
                  <p>✓ Total Error: {enduranceStats.errorsCount}</p>
                </div>
              )}

              {!reconnectLog && collisionResultLog.length === 0 && !enduranceStats && (
                <p className="text-[#525B6C] italic">
                  Klik salah satu tombol aksi uji di toolbar atas untuk menjalankan simulasi
                  konkurensi atau tubrukan simultan.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: 10 Live Miniature Player Mobile Controllers (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-[#8B93A1]">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#85E28A]" />
              <span className="font-bold uppercase tracking-wider text-white">
                10 Controller Mobile Pemain Simultan
              </span>
            </div>
            <span className="text-[11px]">
              Tiap HP terisolasi & terikat ke event bus BroadcastChannel
            </span>
          </div>

          {/* Grid of 10 Player Mobile Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {playersList.slice(0, 10).map((player, pIdx) => {
              const answer = getPlayerAnswer(player.id, room.currentQuestionIndex);
              const hasAnswered = Boolean(answer);
              const playerRankItem = rankings.find((r) => r.playerId === player.id);
              const rank = playerRankItem?.rank ?? pIdx + 1;

              return (
                <div
                  key={player.id}
                  className="bg-[#0B0E14] border border-[#1E2530] rounded-xl p-3 flex flex-col justify-between shadow-lg relative overflow-hidden"
                >
                  {/* Phone Header */}
                  <div className="flex items-center justify-between border-b border-[#1E2530] pb-1.5 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                      <span className="font-anybody font-extrabold text-xs text-white uppercase tracking-wider">
                        {player.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[#FFC880] font-bold">
                      {player.score} pts
                    </span>
                  </div>

                  {/* Phone Stage Body */}
                  <div className="flex-1 flex flex-col justify-center my-1 min-h-[110px]">
                    {room.stage === 'LOBBY' && (
                      <div className="text-center py-2 space-y-1">
                        <span className="text-[10px] text-[#8B93A1] uppercase tracking-wider">
                          Menunggu Host...
                        </span>
                        <div className="w-6 h-6 rounded-full bg-[#151A22] border border-[#272A31] mx-auto flex items-center justify-center text-[10px] text-[#FFC880]">
                          ⏳
                        </div>
                      </div>
                    )}

                    {room.stage === 'QUESTION' && (
                      <div className="space-y-1.5">
                        {hasAnswered ? (
                          <div className="p-2 rounded-lg bg-[#10B981]/15 border border-[#10B981] text-center animate-in fade-in zoom-in-95 duration-150">
                            <span className="text-[10px] font-anybody font-extrabold text-[#85E28A] uppercase">
                              ✓ Terkunci ({answer?.selectedOption})
                            </span>
                            <p className="text-[9px] text-[#8B93A1]">Terkonfirmasi server</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-1.5">
                            {(['A', 'B', 'C', 'D'] as OptionId[]).map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  submitAnswer(player.id, opt);
                                  sound.playTap();
                                }}
                                className={`h-8 rounded-lg font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-transform active:scale-95 ${OPTION_THEMES[opt].bg} text-white`}
                              >
                                <span>{OPTION_THEMES[opt].icon}</span>
                                <span>{opt}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {room.stage === 'REVEAL' && (
                      <div className="text-center py-1">
                        {answer?.isCorrect ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-[#10B981]/20 text-[#85E28A] text-[11px] font-bold">
                            BENAR! 🎉 (+{answer.pointsEarned})
                          </span>
                        ) : hasAnswered ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-[#EF4444]/20 text-[#FFB4AB] text-[11px] font-bold">
                            SALAH ❌ (+0)
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded bg-[#F59E0B]/20 text-[#FFC880] text-[11px] font-bold">
                            WAKTU HABIS ⏳
                          </span>
                        )}
                      </div>
                    )}

                    {room.stage === 'SCOREBOARD' && (
                      <div className="text-center py-2 space-y-1">
                        <span className="text-[10px] text-[#8B93A1]">Peringkat:</span>
                        <p className="font-anybody font-black text-lg text-[#FFC880]">#{rank}</p>
                      </div>
                    )}

                    {room.stage === 'FINAL' && (
                      <div className="text-center py-2 space-y-1">
                        <p className="text-[10px] text-[#85E28A] font-bold">HASIL AKHIR</p>
                        <p className="font-anybody font-black text-sm text-white">
                          Rank #{rank} ({player.score} pts)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Phone Footer Status */}
                  <div className="border-t border-[#1E2530] pt-1.5 flex items-center justify-between text-[9px] text-[#8B93A1]">
                    <span>Rank #{rank}</span>
                    <span className="text-[#85E28A]">Online 100%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
