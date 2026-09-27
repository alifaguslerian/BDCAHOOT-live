'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ProjectorHeader } from '@/components/common/ProjectorHeader';
import { OptionButton } from '@/components/common/OptionButton';
import { useMockGame } from '@/context/MockGameContext';
import { sound } from '@/lib/soundFX';
import { DEFAULT_TIMER_SECONDS } from '@/lib/constants';
import { FastForward, Zap } from 'lucide-react';
import type { OptionId } from '@/types/quiz';

interface QuestionViewProps {
  roomCode: string;
}

export const QuestionView: React.FC<QuestionViewProps> = ({ roomCode }) => {
  const {
    room,
    currentQuestion,
    answeredCount,
    setStage,
    simulateMockAnswers,
  } = useMockGame();

  const totalPlayers = Object.keys(room.players).length;
  const totalQuestions = room.questions.length;
  const currentIdx = room.currentQuestionIndex;
  const totalTimerSec = currentQuestion?.timerSeconds ?? DEFAULT_TIMER_SECONDS;

  // Local tick countdown derived strictly from room.questionEndsAtMs
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (!room.questionEndsAtMs) return totalTimerSec;
    const diff = Math.max(0, Math.ceil((room.questionEndsAtMs - Date.now()) / 1000));
    return diff;
  });

  const hasTriggeredRevealRef = useRef(false);
  const lastTickSecondRef = useRef<number | null>(null);

  // Auto transition to REVEAL when timer hits 0
  const triggerReveal = useCallback(() => {
    if (hasTriggeredRevealRef.current) return;
    hasTriggeredRevealRef.current = true;
    sound.playSuccess();
    setStage('REVEAL');
  }, [setStage]);

  // Real-time timer ticker
  useEffect(() => {
    hasTriggeredRevealRef.current = false;
    lastTickSecondRef.current = null;

    const interval = setInterval(() => {
      if (!room.questionEndsAtMs) return;
      const now = Date.now();
      const remainingMs = room.questionEndsAtMs - now;
      const remSec = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsRemaining(remSec);

      // Play tick sound on each integer second transition when <= 5 seconds
      if (remSec <= 5 && remSec > 0 && remSec !== lastTickSecondRef.current) {
        lastTickSecondRef.current = remSec;
        sound.playTick(true);
      }

      if (remainingMs <= 0) {
        clearInterval(interval);
        triggerReveal();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [room.questionEndsAtMs, triggerReveal]);

  // Fast auto-advance when 100% of participants have responded
  useEffect(() => {
    if (totalPlayers > 0 && answeredCount >= totalPlayers && !hasTriggeredRevealRef.current) {
      const timeout = setTimeout(() => {
        triggerReveal();
      }, 700);
      return () => clearTimeout(timeout);
    }
  }, [answeredCount, totalPlayers, triggerReveal]);

  if (!currentQuestion) {
    return null;
  }

  const isUrgent = secondsRemaining <= 5;

  return (
    <div className="min-h-screen bg-[#07090E] text-[#F5F7FA] flex flex-col justify-between selection:bg-[#F5A623] selection:text-black">
      {/* Projector Header */}
      <ProjectorHeader
        roomCode={roomCode}
        questionIndex={currentIdx}
        totalQuestions={totalQuestions}
        timerRemainingSec={secondsRemaining}
        timerTotalSec={totalTimerSec}
        answeredCount={answeredCount}
        totalPlayers={totalPlayers}
      />

      {/* Main Question Display Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-6xl mx-auto w-full">
        {/* Massive Prompt Text for Hall/Projector Visibility */}
        <div className="w-full text-center py-6 px-4">
          <div className="text-xs uppercase tracking-widest text-[#F5A623] font-anybody font-extrabold mb-3">
            PERTANYAAN {currentIdx + 1} DARI {totalQuestions}
          </div>
          <h2 className="font-anybody font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white leading-tight drop-shadow-md">
            {currentQuestion.question}
          </h2>
        </div>

        {/* Big Central Countdown Badge */}
        <div className="my-4 flex items-center justify-center">
          <div
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 flex flex-col items-center justify-center font-anybody font-black text-3xl sm:text-4xl shadow-2xl transition-all duration-300 tabular-nums ${
              isUrgent
                ? 'border-rose-500 bg-rose-500/20 text-rose-300 animate-pulse scale-105'
                : 'border-[#F5A623] bg-[#F5A623]/10 text-[#F5A623]'
            }`}
          >
            <span>{secondsRemaining}</span>
            <span className="text-[10px] font-space font-semibold uppercase tracking-wider text-[#8B93A1] -mt-1">
              DETIK
            </span>
          </div>
        </div>

        {/* 4 Large Geometric Options in 2x2 Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-4">
          {currentQuestion.options.map((opt) => {
            const optId = opt.id as OptionId;
            return (
              <OptionButton
                key={opt.id}
                optionId={optId}
                text={opt.text}
                size="projector"
                disabled={true}
              />
            );
          })}
        </div>
      </main>

      {/* Host Status & Bypass Controls Bar */}
      <footer className="px-6 py-3 border-t border-[#1E2530] bg-[#0E121B]/90 backdrop-blur-md flex items-center justify-between text-xs text-[#8B93A1] font-space">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white font-semibold">
              {answeredCount} / {totalPlayers}
            </span>
            <span>Peserta Menjawab</span>
          </div>
        </div>

        {/* Fast dev test simulation / emergency bypass */}
        <div className="flex items-center gap-2">
          {answeredCount < totalPlayers && (
            <button
              type="button"
              onClick={simulateMockAnswers}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181F2C] hover:bg-[#232C3E] text-[#8B93A1] hover:text-white transition-colors border border-[#232C3E]"
              title="Simulasikan jawaban seluruh peserta untuk pengujian"
            >
              <Zap className="w-3.5 h-3.5 text-[#F5A623]" />
              <span>Simulasi Jawaban</span>
            </button>
          )}

          <button
            type="button"
            onClick={triggerReveal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#181F2C] hover:bg-[#232C3E] text-white hover:text-[#F5A623] transition-colors border border-[#232C3E] font-medium"
            title="Lewati waktu timer dan buka jawaban benar"
          >
            <span>Buka Jawaban</span>
            <FastForward className="w-3.5 h-3.5" />
          </button>
        </div>
      </footer>
    </div>
  );
};
