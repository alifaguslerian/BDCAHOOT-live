interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function QuizEditorPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-[#0B0E14] text-[#F5F7FA] p-6 max-w-4xl mx-auto">
      <header className="border-b border-[#1E2530] pb-4 mb-6">
        <h1 className="text-xl font-bold">Quiz Editor (ID: {id})</h1>
        <p className="text-sm text-[#8B93A1]">Autosave draft, reorder soal, dan konfigurasi pertanyaan</p>
      </header>
      <div className="bg-[#151A22] border border-[#1E2530] rounded-lg p-6 text-center text-[#8B93A1]">
        Struktur Quiz Editor siap dihubungkan.
      </div>
    </div>
  );
}
