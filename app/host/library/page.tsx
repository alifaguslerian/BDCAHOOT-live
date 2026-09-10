'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Play,
  Edit3,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  ArrowLeft,
  Search,
} from 'lucide-react';
import { Quiz } from '@/types/quiz';
import { getStoredQuizzes, deleteQuiz, createNewDraftQuiz } from '@/lib/quizStore';
import { validateQuiz } from '@/lib/validation';
import { sound } from '@/lib/soundFX';

export default function HostLibraryPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>(() => getStoredQuizzes());
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const refreshQuizzes = () => {
    setQuizzes(getStoredQuizzes());
  };

  useEffect(() => {
    const handleStorageChange = () => {
      setQuizzes(getStoredQuizzes());
    };
    window.addEventListener('bdcahoot:quizzes-changed', handleStorageChange);
    return () => window.removeEventListener('bdcahoot:quizzes-changed', handleStorageChange);
  }, []);

  const handleCreateNew = () => {
    sound.playTap();
    const draft = createNewDraftQuiz();
    router.push(`/host/quiz/${draft.id}/edit`);
  };

  const handleDelete = (id: string) => {
    sound.playError();
    deleteQuiz(id);
    setDeleteConfirmId(null);
    refreshQuizzes();
  };

  const filteredQuizzes = quizzes.filter((q) =>
    q.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#e1e2eb] selection:bg-[#f5a623] selection:text-[#452b00] flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 w-full px-6 lg:px-12 bg-[#0b0e14]/90 backdrop-blur-md border-b border-[#1d2026] flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            id="btn-back-to-landing"
            href="/"
            onClick={() => sound.playTap()}
            className="w-9 h-9 rounded-lg bg-[#151a22] border border-[#272a31] flex items-center justify-center text-[#d7c3ae] hover:text-white hover:border-[#ffc880] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-anybody font-extrabold text-xl tracking-tight uppercase text-[#e1e2eb]">
              BDCAHOOT
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#1d2026] text-[#ffc880] uppercase tracking-wider font-space">
              HOST LIBRARY
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            id="btn-studio-console"
            href="/host/manage"
            onClick={() => sound.playTap()}
            className="h-10 px-3.5 rounded-lg bg-[#1d2026] hover:bg-[#272a31] border border-[#272a31] text-[#ffc880] hover:text-[#ffddb4] font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors"
          >
            <Layers className="w-4 h-4" />
            <span>Studio Console</span>
          </Link>
          <button
            id="btn-create-quiz-header"
            type="button"
            onClick={handleCreateNew}
            className="h-10 px-4 rounded-lg bg-[#f5a623] hover:bg-[#ffc880] text-[#452b00] font-bold text-sm uppercase tracking-wider flex items-center gap-2 transition-colors shadow-md"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Buat Quiz Baru</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 lg:px-12 py-8 flex flex-col">
        {/* Page Title & Search Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-anybody font-extrabold text-3xl text-[#e1e2eb] tracking-tight uppercase">
              Koleksi Kuis Arena
            </h1>
            <p className="text-sm text-[#d7c3ae] mt-1 font-space">
              Pilih kuis yang sudah siap untuk dipentaskan atau edit draf pertanyaan.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8b93a1]" />
            <input
              id="quiz-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul kuis..."
              className="w-full h-10 pl-10 pr-4 bg-[#151a22] border border-[#272a31] rounded-lg text-sm text-[#e1e2eb] placeholder:text-[#8b93a1] focus:outline-none focus:border-[#ffc880] transition-colors"
            />
          </div>
        </div>

        {/* Quiz Cards Grid */}
        {filteredQuizzes.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 rounded-xl border border-dashed border-[#272a31] bg-[#151a22]/40 text-center">
            <Layers className="w-12 h-12 text-[#524534] mb-3" />
            <h3 className="font-anybody text-lg text-[#e1e2eb] font-bold uppercase tracking-tight">
              Belum Ada Kuis Ditemukan
            </h3>
            <p className="text-sm text-[#d7c3ae] max-w-sm mt-1 mb-6">
              {searchQuery
                ? `Tidak ada kuis dengan kata kunci "${searchQuery}".`
                : 'Mulai buat set pertanyaan kuis pertamamu untuk kompetisi panggung.'}
            </p>
            <button
              onClick={handleCreateNew}
              className="py-2.5 px-5 rounded-lg bg-[#f5a623] hover:bg-[#ffc880] text-[#452b00] font-bold text-sm uppercase tracking-wider flex items-center gap-2 transition-colors shadow-md"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Buat Kuis Sekarang</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuizzes.map((quiz) => {
              const validation = validateQuiz(quiz);
              const totalSec = quiz.questions.reduce((acc, q) => acc + (q.timerSeconds || 20), 0);
              const isPlayable = validation.isValid && quiz.questions.length > 0;

              return (
                <div
                  key={quiz.id}
                  id={`quiz-card-${quiz.id}`}
                  className="flex flex-col justify-between rounded-xl bg-[#151a22] border border-[#272a31] hover:border-[#32353c] p-6 transition-all duration-200 shadow-md group"
                >
                  <div className="flex flex-col">
                    {/* Status Badges */}
                    <div className="flex items-center justify-between gap-2 mb-4">
                      {isPlayable ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#51df9c]/15 text-[#51df9c] border border-[#51df9c]/30 text-xs font-bold uppercase tracking-wider font-space">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Siap Pentas</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ffb4ab]/15 text-[#ffb4ab] border border-[#ffb4ab]/30 text-xs font-bold uppercase tracking-wider font-space">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Draft (Belum Lengkap)</span>
                        </span>
                      )}

                      <span className="text-xs text-[#8b93a1] font-space">
                        {quiz.questions.length} Soal
                      </span>
                    </div>

                    {/* Title */}
                    <h2 className="font-anybody text-xl font-bold text-[#e1e2eb] tracking-tight uppercase group-hover:text-[#ffc880] transition-colors line-clamp-2 mb-3">
                      {quiz.title}
                    </h2>

                    {/* Metrics Bar */}
                    <div className="flex items-center gap-4 text-xs text-[#d7c3ae] mb-6 font-space">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#8b93a1]" />
                        <span>~{totalSec} dtk total</span>
                      </span>
                      <span>•</span>
                      <span>
                        Update:{' '}
                        {new Date(quiz.updatedAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>

                    {/* Incomplete Warning Message if any */}
                    {!isPlayable && (
                      <div className="mb-4 p-3 rounded-lg bg-[#93000a]/15 border border-[#ffb4ab]/20 text-xs text-[#ffb4ab] space-y-1">
                        <div className="font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Syarat Belum Terpenuhi:</span>
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-[#ffb4ab]/90">
                          {validation.errors.slice(0, 2).map((err, idx) => (
                            <li key={idx}>{err}</li>
                          ))}
                          {validation.errors.length > 2 && (
                            <li>dan {validation.errors.length - 2} masalah lainnya...</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Card Action Buttons */}
                  <div className="pt-4 border-t border-[#1d2026] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Link
                        id={`btn-edit-quiz-${quiz.id}`}
                        href={`/host/quiz/${quiz.id}/edit`}
                        onClick={() => sound.playTap()}
                        className="h-9 px-3 rounded bg-[#1d2026] hover:bg-[#272a31] text-[#e1e2eb] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#d7c3ae]" />
                        <span>Edit</span>
                      </Link>

                      <button
                        id={`btn-delete-quiz-${quiz.id}`}
                        type="button"
                        onClick={() => setDeleteConfirmId(quiz.id)}
                        className="h-9 w-9 rounded bg-[#1d2026] hover:bg-[#93000a]/30 text-[#8b93a1] hover:text-[#ffb4ab] flex items-center justify-center transition-colors"
                        title="Hapus Kuis"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {isPlayable ? (
                      <Link
                        id={`btn-play-quiz-${quiz.id}`}
                        href={`/host/quiz/${quiz.id}/settings`}
                        onClick={() => sound.playTap()}
                        className="h-9 px-4 rounded bg-[#f5a623] hover:bg-[#ffc880] text-[#452b00] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow"
                      >
                        <Play className="w-3.5 h-3.5 fill-[#452b00]" />
                        <span>Mulai Room</span>
                      </Link>
                    ) : (
                      <button
                        id={`btn-play-disabled-${quiz.id}`}
                        disabled
                        className="h-9 px-3 rounded bg-[#1d2026] text-[#8b93a1] text-xs font-bold uppercase tracking-wider cursor-not-allowed opacity-60 flex items-center gap-1.5"
                        title="Lengkapi soal sebelum memulai game"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Belum Siap</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-[#0b0e14]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#1d2026] border border-[#272a31] rounded-xl p-6 shadow-2xl flex flex-col">
            <h3 className="font-anybody text-lg text-[#e1e2eb] font-bold uppercase mb-2">
              Hapus Kuis Ini?
            </h3>
            <p className="text-xs text-[#d7c3ae] mb-6 leading-relaxed">
              Tindakan ini tidak dapat dibatalkan. Kuis dan semua soal di dalamnya akan dihapus dari
              penyimpanan lokal host.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="h-9 px-4 rounded bg-[#151a22] hover:bg-[#272a31] text-xs font-bold text-[#e1e2eb] uppercase tracking-wider"
              >
                Batal
              </button>
              <button
                id="confirm-delete-btn"
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="h-9 px-4 rounded bg-[#ba1a1a] hover:bg-[#ff5449] text-white text-xs font-bold uppercase tracking-wider shadow"
              >
                Hapus Kuis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
