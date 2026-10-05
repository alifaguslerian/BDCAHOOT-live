'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';

export function PlayerRoomControls() {
  const { leaveRoom, isLeaving } = useGame();
  const router = useRouter();
  return <div className="flex justify-end bg-[#0B0E14] px-4 border-b border-[#272A31]">
    <button type="button" disabled={isLeaving} className="min-h-12 px-3 text-sm text-[#ffb4ab] disabled:opacity-50" onClick={async () => {
      if (!window.confirm('Keluar dari room? Kamu tidak dapat bergabung kembali ke permainan yang sudah dimulai.')) return;
      if (await leaveRoom()) router.replace('/player/join');
    }}>{isLeaving ? 'Mengeluarkan…' : 'Keluar room'}</button>
  </div>;
}
