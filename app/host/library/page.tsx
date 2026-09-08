import Link from 'next/link';

export default function HostLibraryPage() {
  return (
    <div className="min-h-screen bg-[#0B0E14] text-[#F5F7FA] p-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between border-b border-[#1E2530] pb-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F7FA]">Quiz Library</h1>
          <p className="text-sm text-[#8B93A1]">Kelola koleksi soal dan mulai sesi kuis arena</p>
        </div>
        <Link
          id="btn-create-quiz"
          href="/host/quiz/new/edit"
          className="bg-[#F5A623] text-[#0B0E14] px-4 py-2 rounded font-semibold hover:bg-[#d98f16] transition"
        >
          + Buat Quiz
        </Link>
      </header>

      {/* Structure Placeholder for Quiz List */}
      <div id="quiz-list-container" className="space-y-4">
        <div className="bg-[#151A22] border border-[#1E2530] rounded-lg p-6 text-center text-[#8B93A1]">
          Struktur Quiz Library siap diimplementasikan.
        </div>
      </div>
    </div>
  );
}
