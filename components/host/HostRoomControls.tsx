'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';

export function HostRoomControls() {
  const { resetRoom, isHostActionLoading } = useGame();
  const router = useRouter();
  return <div className="flex justify-end bg-[#0E121B] border-b border-[#232C3E] px-4 text-white">
    <button type="button" disabled={isHostActionLoading} className="min-h-12 px-4 text-sm text-[#ffb4ab] disabled:opacity-50" onClick={async () => {
      if (!window.confirm('Tutup room ini? Permainan dihentikan dan semua pemain dikeluarkan.')) return;
      if (await resetRoom()) router.push('/host/library');
    }}>Tutup room</button>
  </div>;
}
