'use client';

import { questionTextSize, hasLongOptions } from '@/lib/questionLayout';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ProjectorHeader } from '@/components/common/ProjectorHeader';
import { OptionButton } from '@/components/common/OptionButton';
import { useGame } from '@/context/GameContext';
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
    serverOffsetMs,
  } = useGame();

  const totalPlayers = Object.keys(room.players).length;
  const totalQuestions = room.totalQuestions;
  const currentIdx = room.currentQuestionIndex;
  const totalTimerSec = currentQuestion?.timerSeconds ?? DEFAULT_TIMER_SECONDS;

  // Local tick countdown derived strictly from room.questionEndsAtMs
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (!room.questionEndsAtMs) return totalTimerSec;
    const diff = Math.max(0, Math.ceil((room.questionEndsAtMs - (Date.now() + serverOffsetMs)) / 1000));
    return diff;
  });

  const hasTriggeredRevealRef = useRef(false);
  const lastTickSecondRef = useRef<number | null>(null);

  // Auto transition to REVEAL when timer hits 0
  const triggerReveal = useCallback(() => {
    sound.playSuccess();
    setStage('REVEAL');
  }, [setStage]);

  // Real-time timer ticker
  useEffect(() => {
    hasTriggeredRevealRef.current = false;
    lastTickSecondRef.current = null;

    const interval = setInterval(() => {
      if (!room.questionEndsAtMs) return;
      const now = Date.now() + serverOffsetMs;
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

      }
    }, 100);

    return () => clearInterval(interval);
  }, [room.questionEndsAtMs, serverOffsetMs]);

  if (!currentQuestion) {
    return null;
  }


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
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-4 sm:px-8 lg:px-10 max-w-[1600px] mx-auto w-full">
        {/* Massive Prompt Text for Hall/Projector Visibility */}
        <div className="w-full text-center py-4">
          <div className="text-xs uppercase tracking-widest text-[#F5A623] font-anybody font-extrabold mb-3">
            PERTANYAAN {currentIdx + 1} DARI {totalQuestions}
          </div>
          <h2 className={`font-space font-bold ${questionTextSize(currentQuestion.question)} text-white leading-snug whitespace-pre-wrap [overflow-wrap:anywhere]`}>
            {currentQuestion.question}
          </h2>
        </div>

        {/* 4 Large Geometric Options in 2x2 Grid */}
        <div className={`w-full grid grid-cols-1 ${hasLongOptions(currentQuestion.options) ? '' : 'md:grid-cols-2'} gap-3 sm:gap-4 mt-4`}>
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
