'use client';

import React, { Suspense } from 'react';
import { PlayerJoinForm } from '@/components/player/PlayerJoinForm';

export default function PlayerJoinPage() {
  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#e1e2eb] flex flex-col justify-center items-center p-6 selection:bg-[#f5a623] selection:text-[#452b00]">
      <Suspense fallback={<div className="text-xs text-[#8b93a1]">Memuat...</div>}>
        <PlayerJoinForm />
      </Suspense>
    </div>
  );
}
