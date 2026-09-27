import { HostArenaContainer } from '@/components/host/arena/HostArenaContainer';

export default async function HostRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = await params;
  const roomCode = resolvedParams.code.toUpperCase();
  return <HostArenaContainer roomCode={roomCode} />;
}