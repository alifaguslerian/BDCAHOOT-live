'use client';

import React from 'react';
import { GameProvider } from '@/context/GameContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <GameProvider>{children}</GameProvider>;
}
