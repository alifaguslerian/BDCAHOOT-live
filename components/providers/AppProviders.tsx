'use client';

import React from 'react';
import { MockGameProvider } from '@/context/MockGameContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <MockGameProvider>{children}</MockGameProvider>;
}
