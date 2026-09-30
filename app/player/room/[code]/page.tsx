import { PlayerControllerContainer } from '@/components/player/controller/PlayerControllerContainer';

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function PlayerRoomPage({ params }: PageProps) {
  const { code } = await params;

  return <PlayerControllerContainer roomCode={code.toUpperCase()} />;
}
