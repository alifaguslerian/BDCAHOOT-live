interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function HostRoomPage({ params }: PageProps) {
  const { code } = await params;

  return (
    <div className="min-h-screen bg-[#0B0E14] text-[#F5F7FA] flex flex-col p-6">
      <header className="flex justify-between items-center text-xs text-[#8B93A1] border-b border-[#1E2530] pb-2">
        <span>ROOM: {code}</span>
        <span>HOST DISPLAY & CONTROL</span>
      </header>
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-2xl font-bold text-[#F5A623]">Kode Room: {code}</p>
          <p className="text-sm text-[#8B93A1]">
            State-driven Host Room: Lobby → Question → Reveal → Scoreboard → Final.
          </p>
        </div>
      </main>
    </div>
  );
}
