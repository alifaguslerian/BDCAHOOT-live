'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  Lock,
  Zap,
  Radio,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useMockGame } from '@/context/MockGameContext';
import { sound, triggerHaptic } from '@/lib/soundFX';
import { computeAuthoritativeRemainingSeconds } from '@/lib/timeSync';
import type { OptionId, QuizQuestion } from '@/types/quiz';
import type { Player } from '@/types/game';

interface PlayerQuestionViewProps {
  player: Player;
  question: QuizQuestion;
  questionIndex: number;
  totalQuestions: number;
}

const OPTION_STYLES: Record<
  OptionId,
  {
    label: string;
    shape: string;
    shapeChar: string;
    bgColor: string;
    borderColor: string;
    activeBorderColor: string;
    textColor: string;
    glowColor: string;
    ringColor: string;
  }
> = {
  A: {
    label: 'A',
    shape: 'Segitiga',
    shapeChar: '▲',
    bgColor: 'bg-[#EF4444]',
    borderColor: 'border-[#DC2626]',
    activeBorderColor: 'border-red-400',
    textColor: 'text-white',
    glowColor: 'shadow-red-500/50',
    ringColor: 'ring-red-400',
  },
  B: {
    label: 'B',
    shape: 'Belah Ketupat',
    shapeChar: '◆',
    bgColor: 'bg-[#3B82F6]',
    borderColor: 'border-[#2563EB]',
    activeBorderColor: 'border-blue-400',
    textColor: 'text-white',
    glowColor: 'shadow-blue-500/50',
    ringColor: 'ring-blue-400',
  },
  C: {
    label: 'C',
    shape: 'Lingkaran',
    shapeChar: '●',
    bgColor: 'bg-[#F59E0B]',
    borderColor: 'border-[#D97706]',
    activeBorderColor: 'border-amber-400',
    textColor: 'text-black',
    glowColor: 'shadow-amber-500/50',
    ringColor: 'ring-amber-400',
  },
  D: {
    label: 'D',
    shape: 'Persegi',
    shapeChar: '■',
    bgColor: 'bg-[#10B981]',
    borderColor: 'border-[#059669]',
    activeBorderColor: 'border-emerald-400',
    textColor: 'text-white',
    glowColor: 'shadow-emerald-500/50',
    ringColor: 'ring-emerald-400',
  },
};

export function PlayerQuestionView({
  player,
  question,
  questionIndex,
  totalQuestions,
}: PlayerQuestionViewProps) {
  const { room, submitAnswer, getPlayerAnswer, hasPlayerAnswered, serverOffsetMs } = useMockGame();

  // Optimistic & transient submission state
  const serverAnswer = getPlayerAnswer(player.id, questionIndex);
  const [submissionStatus, setSubmissionStatus] = useState<
    'idle' | 'transmitting' | 'confirmed' | 'rejected'
  >('idle');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [optimisticOption, setOptimisticOption] = useState<OptionId | null>(null);

  const hasServerRecord = Boolean(serverAnswer || hasPlayerAnswered(player.id));
  const selectedOption = optimisticOption ?? serverAnswer?.selectedOption ?? null;
  const isLocked = Boolean(optimisticOption || hasServerRecord);

  const [showQuestionText, setShowQuestionText] = useState(true);

  // Synchronized countdown timer aligned with server-authoritative clock and NTP offset
  const timerTotalSeconds = question.timerSeconds ?? 10;
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
    computeAuthoritativeRemainingSeconds(room.questionEndsAtMs, serverOffsetMs, Date.now()) || timerTotalSeconds
  );

  useEffect(() => {
    if (!room.questionEndsAtMs) return;

    const updateTimer = () => {
      const secs = computeAuthoritativeRemainingSeconds(
        room.questionEndsAtMs,
        serverOffsetMs,
        Date.now()
      );
      setRemainingSeconds(secs);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 150);
    return () => clearInterval(interval);
  }, [room.questionEndsAtMs, serverOffsetMs]);

  const timerRatio = Math.max(0, Math.min(1, remainingSeconds / timerTotalSeconds));
  const isTimeCritical = remainingSeconds <= 3 && remainingSeconds > 0;
  const isTimeUp = remainingSeconds <= 0;
  const isCardDisabled = isLocked || isTimeUp;

  // Handle Option Tap with strict server confirmation and immediate rollback on rejection
  const handleSelectOption = useCallback(
    (option: OptionId) => {
      if (isCardDisabled) return; // Prevent tap if already locked or time is up

      // 1. Optimistic tactile feedback immediately
      setOptimisticOption(option);
      setSubmissionStatus('transmitting');
      setSubmissionError(null);
      sound.playTap();
      triggerHaptic(25);

      // 2. Transmit to server and validate authoritative response
      try {
        const res = submitAnswer(player.id, option);
        if (!res || !res.success) {
          // ROLLBACK: Server rejected answer (e.g. late packet, grace period expired, wrong stage)
          setOptimisticOption(null);
          setSubmissionStatus('rejected');
          setSubmissionError(res?.error || 'Gagal: Waktu sudah habis / Koneksi buruk');
          sound.playError();
          triggerHaptic([50, 50, 50]);
        } else {
          // Server accepted and confirmed the submission
          setSubmissionStatus('confirmed');
          setSubmissionError(null);
        }
      } catch (err: unknown) {
        // Network/runtime failure: rollback
        setOptimisticOption(null);
        setSubmissionStatus('rejected');
        const errMsg = err instanceof Error ? err.message : 'Koneksi ke server terputus';
        setSubmissionError(`Gagal: ${errMsg}`);
        sound.playError();
        triggerHaptic([50, 50, 50]);
      }
    },
    [isCardDisabled, player.id, submitAnswer]
  );

  return (
    <div className="w-full max-w-md mx-auto min-h-screen flex flex-col justify-between p-3 sm:p-5 bg-[#0B0E14] text-[#E1E2EB] select-none">
      {/* Top Header Bar */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-space border-b border-[#1E2530] pb-2 text-[#8B93A1]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#F5A623]" />
            <span className="font-bold text-[#E1E2EB] uppercase tracking-wider">
              SOAL {questionIndex + 1}/{totalQuestions}
            </span>
          </div>

          {/* Synchronized Countdown Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-anybody font-black text-sm tracking-wider transition-colors ${
              isTimeCritical
                ? 'bg-[#EF4444]/20 border border-[#EF4444] text-[#EF4444] animate-pulse'
                : 'bg-[#151A22] border border-[#272A31] text-[#FFC880]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{remainingSeconds}s</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-[#151A22] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-200 rounded-full ${
              isTimeCritical ? 'bg-[#EF4444]' : 'bg-[#F5A623]'
            }`}
            style={{ width: `${timerRatio * 100}%` }}
          />
        </div>

        {/* Question Text Accordion (Accessible preview on mobile) */}
        <div className="bg-[#151A22] border border-[#272A31] rounded-xl p-3 transition-all">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setShowQuestionText((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setShowQuestionText((prev) => !prev);
              }
            }}
            className="flex items-center justify-between text-[11px] font-space text-[#8B93A1] uppercase tracking-wider cursor-pointer"
          >
            <span className="font-bold text-[#D7C3AE]">Pertanyaan</span>
            <div className="flex items-center gap-1 text-[#8B93A1]">
              <span>{showQuestionText ? 'Sembunyikan' : 'Lihat Teks'}</span>
              {showQuestionText ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </div>

          {showQuestionText && (
            <p className="mt-2 text-xs sm:text-sm font-space font-medium text-[#F5F7FA] leading-relaxed line-clamp-3">
              {question.question}
            </p>
          )}
        </div>
      </header>

      {/* Dynamic Status / Submission Banner (D16) */}
      {submissionError ? (
        <div className="my-2 p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444] flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[#EF4444] shrink-0" />
            <div>
              <p className="font-anybody font-extrabold text-xs sm:text-sm text-[#FFB4AB] tracking-wide uppercase">
                Pengiriman Ditolak
              </p>
              <p className="text-[11px] text-[#FF897D] font-space font-medium">
                {submissionError}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSubmissionError(null)}
            className="text-[#FF897D] hover:text-white px-2 py-1 text-xs font-space font-bold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      ) : isLocked ? (
        <div className="my-2 p-3 rounded-xl bg-[#10B981]/10 border border-[#10B981]/40 flex items-center justify-between animate-in fade-in zoom-in-95 duration-200 shadow-lg shadow-[#10B981]/10">
          <div className="flex items-center gap-2">
            {submissionStatus === 'transmitting' ? (
              <Loader2 className="w-5 h-5 text-[#85E28A] animate-spin shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-[#85E28A] shrink-0" />
            )}
            <div>
              <p className="font-anybody font-extrabold text-xs sm:text-sm text-[#85E28A] tracking-wide uppercase">
                {submissionStatus === 'transmitting'
                  ? 'Mengirim ke server...'
                  : 'Jawaban Tersimpan'}
              </p>
              <p className="text-[10px] text-[#8B93A1] font-space">
                {submissionStatus === 'transmitting'
                  ? 'Menghubungi server host...'
                  : 'Terkonfirmasi & tersimpan di server'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#151A22] border border-[#272A31] text-[10px] font-space text-[#FFC880]">
            <Lock className="w-3 h-3" />
            <span>Terkunci</span>
          </div>
        </div>
      ) : isTimeUp ? (
        <div className="my-2 p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/40 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#EF4444] shrink-0" />
            <div>
              <p className="font-anybody font-extrabold text-xs sm:text-sm text-[#FFB4AB] tracking-wide uppercase">
                Waktu Habis
              </p>
              <p className="text-[10px] text-[#FF897D] font-space">
                Kesempatan menjawab soal ini telah berakhir
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-[#151A22] border border-[#EF4444]/40 text-[10px] font-space text-[#FFB4AB]">
            Ditutup
          </span>
        </div>
      ) : (
        <div className="my-1.5 text-center">
          <span className="text-[11px] font-space font-semibold uppercase tracking-wider text-[#8B93A1]">
            Ketuk 1 pilihan jawaban secepat mungkin
          </span>
        </div>
      )}

      {/* 4 Large Colored Tap Cards (D15 Mobile Grid) */}
      <main className="flex-1 flex flex-col justify-center py-2">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 h-full min-h-[320px] sm:min-h-[380px]">
          {(['A', 'B', 'C', 'D'] as OptionId[]).map((opt) => {
            const style = OPTION_STYLES[opt];
            const isSelected = selectedOption === opt;
            const isDimmed = isLocked && !isSelected;
            const optData = question.options.find((o) => o.id === opt);

            return (
              <button
                key={opt}
                id={`btn-player-opt-${opt}`}
                type="button"
                disabled={isCardDisabled}
                onClick={() => handleSelectOption(opt)}
                className={`group relative flex flex-col justify-between p-4 rounded-2xl border-2 transition-all duration-150 text-left cursor-pointer active:scale-95 ${
                  style.bgColor
                } ${
                  isSelected
                    ? `border-white ring-4 ${style.ringColor} shadow-2xl scale-[1.02] z-10 opacity-100`
                    : isDimmed
                    ? 'opacity-25 pointer-events-none border-transparent grayscale-[40%]'
                    : isCardDisabled
                    ? 'opacity-40 cursor-not-allowed border-transparent'
                    : `${style.borderColor} hover:brightness-110 shadow-lg`
                }`}
              >
                {/* Card Header (Shape & Letter) */}
                <div className="flex items-center justify-between w-full">
                  <span className="font-anybody font-black text-2xl sm:text-3xl text-white/90 drop-shadow-md">
                    {style.label}
                  </span>
                  <span className="text-xl sm:text-2xl text-white/80 font-bold drop-shadow">
                    {style.shapeChar}
                  </span>
                </div>

                {/* Option Text preview (Concise) */}
                <div className="my-auto py-2">
                  <p className="text-xs sm:text-sm font-space font-bold text-white drop-shadow leading-snug line-clamp-2">
                    {optData?.text || `Pilihan ${opt}`}
                  </p>
                </div>

                {/* Selection Indicator */}
                <div className="w-full flex items-center justify-between pt-1 border-t border-white/20">
                  <span className="text-[10px] font-space font-bold uppercase tracking-wider text-white/80">
                    {style.shape}
                  </span>
                  {isSelected && (
                    <span className="flex items-center gap-1 text-[10px] font-anybody font-extrabold uppercase bg-white text-black px-1.5 py-0.5 rounded-full shadow">
                      ✓ Dipilih
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {/* Footer Instructions / Locked Hint */}
      <footer className="py-2 text-center text-xs font-space text-[#8B93A1]">
        {isLocked ? (
          <p className="animate-pulse text-[#D7C3AE]">
            Perhatikan layar proyektor untuk pembahasan saat waktu habis...
          </p>
        ) : isTimeUp ? (
          <p className="text-[#FF897D]">
            Waktu telah habis. Menunggu host membuka pembahasan...
          </p>
        ) : (
          <p className="text-[#8B93A1]">
            Semakin cepat kamu menjawab dengan benar, semakin banyak bonus poin!
          </p>
        )}
      </footer>
    </div>
  );
}
