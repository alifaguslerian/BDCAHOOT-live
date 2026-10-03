'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';

export function ResumePlayerSession({ requestedCode = '' }: { requestedCode?: string }) {
  const router = useRouter();
  const { ready, hasRoom, room, role, currentPlayerId, isLeaving } = useGame();
  useEffect(() => {
    if (ready && hasRoom && role === 'player' && currentPlayerId && !isLeaving
      && (!requestedCode || requestedCode.toUpperCase() === room.code)) {
      router.replace(`/player/room/${encodeURIComponent(room.code)}`);
    }
  }, [ready, hasRoom, role, currentPlayerId, isLeaving, requestedCode, room.code, router]);
  return null;
}
