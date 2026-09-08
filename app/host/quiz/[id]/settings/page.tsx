interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GameSettingsPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-[#0B0E14] text-[#F5F7FA] p-6 max-w-xl mx-auto flex flex-col justify-center">
      <div className="bg-[#151A22] border border-[#1E2530] rounded-lg p-6 space-y-6">
        <h1 className="text-xl font-bold">Game Settings (Quiz: {id})</h1>
        <p className="text-sm text-[#8B93A1]">
          Konfigurasi sebelum membuat room kuis (misal acak urutan soal).
        </p>
      </div>
    </div>
  );
}
