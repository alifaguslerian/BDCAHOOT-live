'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';
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
    ready,
    hasRoom,
    currentQuestion,
    isLeaving,
  } = useGame();

  // Check if room code matches
  const isRoomMatching = room.code.toUpperCase() === roomCode.toUpperCase();

  // Retrieve current active player
  const player = currentPlayerId ? room.players[currentPlayerId] : null;

  useEffect(() => {
    if (ready && !isLeaving && (!hasRoom || !isRoomMatching || !currentPlayerId)) router.replace(`/player/name?room=${encodeURIComponent(roomCode)}`);
  }, [ready, isLeaving, hasRoom, isRoomMatching, currentPlayerId, roomCode, router]);
  if (!ready || !player || !isRoomMatching) return <div className="min-h-screen bg-[#0B0E14] text-white p-12 text-center">Memulihkan sesi pemain…</div>;

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
          key={`${room.sessionId}-q-${room.currentQuestionIndex}`}
          player={player}
          question={currentQuestion}
          questionIndex={room.currentQuestionIndex}
          totalQuestions={room.totalQuestions}
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
          key={`${room.sessionId}-reveal-${room.currentQuestionIndex}`}
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
