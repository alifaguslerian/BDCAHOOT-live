import React from 'react';
import { GameSettingsView } from '@/components/host/GameSettingsView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GameSettingsPage({ params }: PageProps) {
  const { id } = await params;

  return <GameSettingsView quizId={id} />;
}
