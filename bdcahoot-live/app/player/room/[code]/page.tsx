interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function PlayerRoomPage({ params }: PageProps) {
  const { code } = await params;

  return (
    <div className="min-h-screen bg-[#0B0E14] text-[#F5F7FA] flex flex-col p-4">
      <header className="flex justify-between items-center text-xs text-[#8B93A1] border-b border-[#1E2530] pb-2">
        <span>KODE: {code}</span>
        <span>PLAYER SESSION</span>
      </header>
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-lg font-bold text-[#F5A623]">Menghubungkan ke Room {code}...</p>
          <p className="text-xs text-[#8B93A1]">
            State-driven Player Room: Lobby → Question → Answer Locked → Reveal → Personal Rank → Final.
          </p>
        </div>
      </main>
    </div>
  );
}
