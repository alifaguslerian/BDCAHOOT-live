'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { HostLanding } from '@/components/host/HostLanding';

export default function LandingPage() {
  const router = useRouter();

  const handleStartHost = () => {
    router.push('/host/library');
  };

  const handleEnterPlayer = (pin?: string) => {
    if (pin) {
      router.push(`/player/join?code=${encodeURIComponent(pin.trim().toUpperCase())}`);
    } else {
      router.push('/player/join');
    }
  };

  return (
    <HostLanding
      onStartHost={handleStartHost}
      onEnterPlayer={handleEnterPlayer}
    />
  );
}
