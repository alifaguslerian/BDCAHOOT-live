'use client';

import React, { useState } from 'react';
import {
  FolderPlus,
  Play,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shuffle,
  ArrowLeft,
  Plus,
  Save,
} from 'lucide-react';
import { sound } from '@/lib/soundFX';

export interface QuizItem {
  id: string;
  title: string;
  category: string;
  questionCount: number;
  isValid: boolean;
  incompleteCount: number;
  lastEdited: string;
  questions: {
    id: string;
    question: string;
    duration: 10 | 15 | 20 | 30;
    options: [string, string, string, string];
    correctIndex: number; // 0=A, 1=B, 2=C, 3=D (Single-select by design)
  }[];
}

const INITIAL_QUIZZES: QuizItem[] = [
  {
    id: 'quiz-1',
    title: 'Frontend Web & System Architecture Arena',
    category: 'Teknologi Web',
    questionCount: 3,
    isValid: true,
    incompleteCount: 0,
    lastEdited: 'Hari ini, 14:20',
    questions: [
      {
        id: 'q1',
        question: 'Manakah framework CSS yang mengutamakan pendekatan utility-first?',
        duration: 15,
        options: ['Tailwind CSS', 'Bootstrap', 'Bulma CSS', 'Foundation'],
        correctIndex: 0,
      },
      {
        id: 'q2',
        question: 'Protokol komunikasi real-time full-duplex dua arah melalui satu TCP adalah?',
        duration: 20,
        options: ['WebSockets', 'HTTP Long Polling', 'Server-Sent Events (SSE)', 'DNS Round Robin'],
        correctIndex: 0,
      },
      {
        id: 'q3',
        question: 'Library React state management yang menggunakan atomic store pattern adalah?',
        duration: 15,
        options: ['Jotai / Recoil', 'Redux Classic', 'Context API bawaan', 'jQuery Store'],
        correctIndex: 0,
      },
    ],
  },
  {
    id: 'quiz-2',
    title: 'Pengetahuan Umum & Pop Quiz Tech',
    category: 'Umum & Trivia',
    questionCount: 2,
    isValid: false,
    incompleteCount: 1,
    lastEdited: 'Kemarin',
    questions: [
      {
        id: 'q2-1',
        question: 'Bahasa pemrograman yang diciptakan oleh Brendan Eich dalam 10 hari adalah?',
        duration: 15,
        options: ['JavaScript', 'Python', 'Ruby', 'PHP'],
        correctIndex: 0,
      },
      {
        id: 'q2-2',
        question: '', // Belum lengkap
        duration: 20,
        options: ['', '', '', ''],
        correctIndex: 0,
      },
    ],
  },
];

export interface HostQuizManagementProps {
  onBackToLanding: () => void;
  onCreateRoomWithQuiz: (quiz: QuizItem, settings: { shuffle: boolean; roomCode: string }) => void;
}

export type ManagementSubView = 'library' | 'editor' | 'settings';

export const HostQuizManagement: React.FC<HostQuizManagementProps> = ({
  onBackToLanding,
  onCreateRoomWithQuiz,
}) => {
  const [view, setView] = useState<ManagementSubView>('library');
  const [quizzes, setQuizzes] = useState<QuizItem[]>(INITIAL_QUIZZES);
  const [selectedQuizId, setSelectedQuizId] = useState<string>('quiz-1');
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [isSavedBanner, setIsSavedBanner] = useState<boolean>(false);
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(true);

  const currentQuiz = quizzes.find((q) => q.id === selectedQuizId) || quizzes[0];
  const activeQuestion = currentQuiz?.questions[activeQuestionIndex];

  // Helper recalculates quiz completeness
  const recomputeQuizValidity = (quiz: QuizItem): QuizItem => {
    let incomplete = 0;
    for (const q of quiz.questions) {
      const hasQ = q.question.trim().length > 0;
      const hasAllOpts = q.options.every((opt) => opt.trim().length > 0);
      const hasValidKey = q.correctIndex >= 0 && q.correctIndex <= 3;
      if (!hasQ || !hasAllOpts || !hasValidKey) {
        incomplete++;
      }
    }
    const isValid = quiz.questions.length > 0 && incomplete === 0;
    return {
      ...quiz,
      questionCount: quiz.questions.length,
      isValid,
      incompleteCount: incomplete,
    };
  };

  const handleSelectQuiz = (quizId: string) => {
    sound.playTap();
    setSelectedQuizId(quizId);
  };

  const handleOpenEditor = (quizId: string) => {
    sound.playTap();
    setSelectedQuizId(quizId);
    setActiveQuestionIndex(0);
    setView('editor');
  };

  const handleOpenSettings = (quizId: string) => {
    sound.playTap();
    setSelectedQuizId(quizId);
    setView('settings');
  };

  const handleSaveQuestion = () => {
    sound.playTap();
    setIsSavedBanner(true);
    setTimeout(() => setIsSavedBanner(false), 2000);
  };

  const handleUpdateOptionText = (optIndex: number, text: string) => {
    if (!currentQuiz || !activeQuestion) return;
    const newOptions = [...activeQuestion.options] as [string, string, string, string];
    newOptions[optIndex] = text;

    setQuizzes((prev) =>
      prev.map((q) => {
        if (q.id !== currentQuiz.id) return q;
        const newQuestions = [...q.questions];
        newQuestions[activeQuestionIndex] = {
          ...activeQuestion,
          options: newOptions,
        };
        return recomputeQuizValidity({ ...q, questions: newQuestions });
      })
    );
  };

  const handleSetCorrectAnswer = (optIndex: number) => {
    sound.playTap();
    if (!currentQuiz || !activeQuestion) return;
    setQuizzes((prev) =>
      prev.map((q) => {
        if (q.id !== currentQuiz.id) return q;
        const newQuestions = [...q.questions];
        newQuestions[activeQuestionIndex] = {
          ...activeQuestion,
          correctIndex: optIndex,
        };
        return recomputeQuizValidity({ ...q, questions: newQuestions });
      })
    );
  };

  const handleUpdateQuestionText = (text: string) => {
    if (!currentQuiz || !activeQuestion) return;
    setQuizzes((prev) =>
      prev.map((q) => {
        if (q.id !== currentQuiz.id) return q;
        const newQuestions = [...q.questions];
        newQuestions[activeQuestionIndex] = {
          ...activeQuestion,
          question: text,
        };
        return recomputeQuizValidity({ ...q, questions: newQuestions });
      })
    );
  };

  const handleUpdateDuration = (duration: 10 | 15 | 20 | 30) => {
    sound.playTap();
    if (!currentQuiz || !activeQuestion) return;
    setQuizzes((prev) =>
      prev.map((q) => {
        if (q.id !== currentQuiz.id) return q;
        const newQuestions = [...q.questions];
        newQuestions[activeQuestionIndex] = {
          ...activeQuestion,
          duration,
        };
        return { ...q, questions: newQuestions };
      })
    );
  };

  const handleAddQuestion = () => {
    sound.playTap();
    if (!currentQuiz) return;
    const newQ = {
      id: `q-${Date.now()}`,
      question: 'Pertanyaan baru...',
      duration: 15 as const,
      options: ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'] as [string, string, string, string],
      correctIndex: 0,
    };
    setQuizzes((prev) =>
      prev.map((q) => {
        if (q.id !== currentQuiz.id) return q;
        const updated = {
          ...q,
          questions: [...q.questions, newQ],
        };
        return recomputeQuizValidity(updated);
      })
    );
    setActiveQuestionIndex(currentQuiz.questions.length);
  };

  const handleDeleteQuestion = (idx: number) => {
    if (!currentQuiz || currentQuiz.questions.length <= 1) {
      sound.playError();
      return;
    }
    sound.playTap();
    setQuizzes((prev) =>
      prev.map((q) => {
        if (q.id !== currentQuiz.id) return q;
        const filtered = q.questions.filter((_, i) => i !== idx);
        return recomputeQuizValidity({ ...q, questions: filtered });
      })
    );
    setActiveQuestionIndex((prevIdx) => Math.max(0, Math.min(prevIdx, currentQuiz.questions.length - 2)));
  };

  const handleDeleteQuiz = (quizId: string) => {
    if (quizzes.length <= 1) {
      sound.playError();
      return;
    }
    sound.playError();
    setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    if (selectedQuizId === quizId) {
      const remaining = quizzes.filter((q) => q.id !== quizId);
      if (remaining.length > 0) {
        setSelectedQuizId(remaining[0].id);
      }
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#0b0e14] text-[#e1e2eb] flex flex-col font-sans">
      {/* Top Bar Navigation */}
      <header className="h-16 px-6 lg:px-12 bg-[#151a22] border-b border-[#272a31] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sound.playTap();
              if (view === 'library') onBackToLanding();
              else setView('library');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1d2026] text-[#d7c3ae] hover:text-[#e1e2eb] hover:bg-[#272a31] transition-all text-xs font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            {view === 'library' ? 'KEMBALI KE ARENA' : 'KE DAFTAR KUIS'}
          </button>
          <span className="text-[#32353c]">|</span>
          <span className="font-anybody font-extrabold text-lg uppercase tracking-tight text-[#f5a623]">
            {view === 'library' && 'D2 • QUIZ LIBRARY'}
            {view === 'editor' && 'D3 & D4 • QUIZ & SOAL EDITOR'}
            {view === 'settings' && 'D5 • GAME SETTINGS & BUAT ROOM'}
          </span>
        </div>

        {view === 'editor' && (
          <div className="flex items-center gap-2">
            {isSavedBanner && (
              <span className="text-xs text-[#51df9c] font-bold flex items-center gap-1 animate-pulse">
                <CheckCircle2 className="w-4 h-4" /> Tersimpan Otomatis
              </span>
            )}
            <button
              onClick={handleSaveQuestion}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#51df9c] text-[#003920] font-bold text-xs hover:bg-[#68eab0] transition-colors shadow cursor-pointer"
            >
              <Save className="w-4 h-4" /> SIMPAN DRAFT
            </button>
          </div>
        )}
      </header>

      {/* VIEW: D2 QUIZ LIBRARY */}
      {view === 'library' && (
        <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 flex flex-col">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="font-anybody font-black text-3xl uppercase tracking-tight text-[#e1e2eb]">
                Koleksi Kuis Panggung
              </h1>
              <p className="text-sm text-[#d7c3ae] mt-1">
                Pilih kuis yang valid untuk membuat room panggung atau kelola daftar pertanyaan.
              </p>
            </div>
            <button
              onClick={() => {
                sound.playTap();
                const newQuiz: QuizItem = {
                  id: `quiz-${Date.now()}`,
                  title: 'Kuis Baru Tanpa Judul',
                  category: 'Umum',
                  questionCount: 1,
                  isValid: true,
                  incompleteCount: 0,
                  lastEdited: 'Baru saja',
                  questions: [
                    {
                      id: `q-${Date.now()}`,
                      question: 'Tulis pertanyaan pertama kamu di sini...',
                      duration: 15,
                      options: ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'],
                      correctIndex: 0,
                    },
                  ],
                };
                setQuizzes([newQuiz, ...quizzes]);
                setSelectedQuizId(newQuiz.id);
                setView('editor');
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f5a623] text-[#452b00] font-extrabold text-sm hover:bg-[#ffb4ab] transition-all shadow-md self-start md:self-auto cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" /> BUAT KUIS BARU
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                onClick={() => handleSelectQuiz(quiz.id)}
                className={`p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  selectedQuizId === quiz.id
                    ? 'bg-[#151a22] border-[#f5a623] shadow-lg shadow-[#f5a623]/5 ring-1 ring-[#f5a623]'
                    : 'bg-[#151a22]/70 border-[#272a31] hover:border-[#32353c]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold text-[#ffc880] uppercase tracking-wider bg-[#1d2026] px-2.5 py-1 rounded-full border border-[#32353c]/40">
                      {quiz.category}
                    </span>
                    {quiz.isValid ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#51df9c] bg-[#51df9c]/10 px-2.5 py-0.5 rounded-full border border-[#51df9c]/30">
                        <CheckCircle2 className="w-3.5 h-3.5" /> SIAP DIMAINKAN
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#f04438] bg-[#f04438]/10 px-2.5 py-0.5 rounded-full border border-[#f04438]/30">
                        <AlertCircle className="w-3.5 h-3.5" /> ⚠ {quiz.incompleteCount} Soal Belum Lengkap
                      </span>
                    )}
                  </div>

                  <h3 className="font-anybody font-extrabold text-xl text-[#e1e2eb] mb-2 leading-snug">
                    {quiz.title}
                  </h3>
                  <p className="text-xs text-[#9f8e7a]">
                    {quiz.questionCount} Soal Panggung • Diedit: {quiz.lastEdited}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#272a31] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditor(quiz.id);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#d7c3ae] hover:text-[#e1e2eb] transition-colors py-1 px-2.5 rounded hover:bg-[#1d2026] cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#ffc880]" /> Edit Soal
                    </button>
                    {quizzes.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteQuiz(quiz.id);
                        }}
                        className="inline-flex items-center gap-1 text-xs text-[#ff8080] hover:text-[#ffb4ab] py-1 px-2 rounded hover:bg-[#1d2026] cursor-pointer"
                        title="Hapus Kuis"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    disabled={!quiz.isValid}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenSettings(quiz.id);
                    }}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs tracking-wider uppercase transition-all ${
                      quiz.isValid
                        ? 'bg-[#f5a623] text-[#452b00] hover:bg-[#ffb4ab] shadow-md cursor-pointer'
                        : 'bg-[#272a31] text-[#9f8e7a] cursor-not-allowed opacity-60'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {quiz.isValid ? 'MAIN SEKARANG' : 'LENGKAPI DULU'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* VIEW: D3 & D4 QUIZ & SOAL EDITOR */}
      {view === 'editor' && currentQuiz && activeQuestion && (
        <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* D3 Left Sidebar: Question List */}
          <aside className="w-full md:w-80 bg-[#151a22] border-r border-[#272a31] p-4 flex flex-col justify-between">
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[70vh]">
              <div className="flex items-center justify-between pb-2 border-b border-[#272a31] mb-2">
                <span className="text-xs font-bold text-[#9f8e7a] uppercase tracking-wider">
                  DAFTAR SOAL ({currentQuiz.questions.length})
                </span>
                <span className="text-[10px] text-[#51df9c] font-bold bg-[#51df9c]/10 px-2 py-0.5 rounded">
                  Draft Autosave ON
                </span>
              </div>

              {currentQuiz.questions.map((q, idx) => (
                <div
                  key={q.id}
                  className={`w-full p-3 rounded-xl border text-xs transition-all flex items-center justify-between group ${
                    activeQuestionIndex === idx
                      ? 'bg-[#1d2026] border-[#f5a623] text-[#e1e2eb] font-bold'
                      : 'bg-[#0b0e14]/50 border-[#272a31] text-[#9f8e7a] hover:border-[#32353c]'
                  }`}
                >
                  <button
                    onClick={() => {
                      sound.playTap();
                      setActiveQuestionIndex(idx);
                    }}
                    className="flex-1 flex items-center gap-2 truncate text-left cursor-pointer"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#272a31] flex items-center justify-center font-bold text-[10px] shrink-0">
                      {idx + 1}
                    </span>
                    <span className="truncate">{q.question || 'Soal belum diisi'}</span>
                  </button>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <span className="text-[10px] text-[#ffc880]">{q.duration}s</span>
                    {currentQuiz.questions.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteQuestion(idx);
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:text-[#ff8080] p-1 transition-opacity cursor-pointer"
                        title="Hapus Soal"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleAddQuestion}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-[#ffc880]/50 text-[#ffc880] hover:bg-[#ffc880]/10 text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> TAMBAH SOAL BERIKUTNYA
            </button>
          </aside>

          {/* D4 Right Panel: Question Detail & Options Editor */}
          <section className="flex-1 p-6 md:p-10 overflow-y-auto bg-[#0b0e14]">
            <div className="max-w-3xl mx-auto flex flex-col gap-6">
              {/* Soal Header: Index + Duration selector */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#f5a623] text-[#452b00] font-extrabold text-xs">
                    SOAL #{activeQuestionIndex + 1}
                  </span>
                  <span className="text-xs text-[#9f8e7a]">Panggung Single-Select</span>
                </div>

                {/* Duration selector */}
                <div className="flex items-center gap-1.5 bg-[#151a22] p-1 rounded-xl border border-[#272a31]">
                  <Clock className="w-3.5 h-3.5 text-[#ffc880] ml-1.5" />
                  {[10, 15, 20, 30].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => handleUpdateDuration(sec as 10 | 15 | 20 | 30)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeQuestion.duration === sec
                          ? 'bg-[#f5a623] text-[#452b00]'
                          : 'text-[#9f8e7a] hover:text-[#e1e2eb]'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Pertanyaan */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#d7c3ae] uppercase tracking-wider">
                  Pertanyaan Kuis
                </label>
                <textarea
                  value={activeQuestion.question}
                  onChange={(e) => handleUpdateQuestionText(e.target.value)}
                  rows={3}
                  placeholder="Ketikkan teks soal panggung di sini..."
                  className="w-full p-4 rounded-xl bg-[#151a22] border border-[#272a31] focus:border-[#f5a623] focus:outline-none text-base text-[#e1e2eb] resize-none leading-relaxed"
                />
              </div>

              {/* 4 Opsi Jawaban (Stitch Quadrant Atoms) */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#d7c3ae] uppercase tracking-wider">
                    4 Opsi Jawaban (Pilih 1 Kunci Benar)
                  </label>
                  <span className="text-[11px] text-[#51df9c] font-medium">
                    ✓ Single-correct lock (Hanya 1 benar)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'OPSI A', symbol: '▲', color: '#f04438', bg: 'rgba(240,68,56,0.1)' },
                    { label: 'OPSI B', symbol: '◆', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
                    { label: 'OPSI C', symbol: '●', color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
                    { label: 'OPSI D', symbol: '■', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
                  ].map((atom, optIdx) => {
                    const isCorrect = activeQuestion.correctIndex === optIdx;
                    return (
                      <div
                        key={atom.label}
                        onClick={() => handleSetCorrectAnswer(optIdx)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2.5 relative ${
                          isCorrect
                            ? 'bg-[#151a22] border-[#51df9c] ring-2 ring-[#51df9c]/50'
                            : 'bg-[#151a22]/80 border-[#272a31] hover:border-[#32353c]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs"
                              style={{ backgroundColor: atom.bg, color: atom.color }}
                            >
                              {atom.symbol}
                            </span>
                            <span className="text-xs font-bold text-[#d7c3ae]">{atom.label}</span>
                          </div>

                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              isCorrect
                                ? 'bg-[#51df9c] text-[#003920]'
                                : 'bg-[#272a31] text-[#9f8e7a]'
                            }`}
                          >
                            {isCorrect ? '✓ KUNCI BENAR' : 'KLIK UNTUK KUNCI'}
                          </span>
                        </div>

                        <input
                          type="text"
                          value={activeQuestion.options[optIdx]}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleUpdateOptionText(optIdx, e.target.value)}
                          placeholder={`Jawaban ${atom.label}...`}
                          className="w-full px-3 py-2 rounded-lg bg-[#0b0e14] border border-[#272a31] focus:border-[#f5a623] focus:outline-none text-sm text-[#e1e2eb]"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* VIEW: D5 GAME SETTINGS & BUAT ROOM */}
      {view === 'settings' && currentQuiz && (
        <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10 flex flex-col justify-center">
          <div className="p-8 rounded-2xl bg-[#151a22] border border-[#272a31] shadow-2xl flex flex-col gap-6">
            <div className="border-b border-[#272a31] pb-4">
              <span className="text-xs font-bold text-[#ffc880] uppercase tracking-wider">
                RINGKASAN SESI KUIS
              </span>
              <h2 className="font-anybody font-extrabold text-2xl text-[#e1e2eb] mt-1">
                {currentQuiz.title}
              </h2>
              <p className="text-xs text-[#9f8e7a] mt-1">
                Kategori: {currentQuiz.category} • {currentQuiz.questions.length} Pertanyaan Panggung
              </p>
            </div>

            {/* Settings Toggles */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#0b0e14] border border-[#272a31]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#ffc880]/10 flex items-center justify-center text-[#ffc880]">
                    <Shuffle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#e1e2eb]">Acak Urutan Soal (Shuffle)</h4>
                    <p className="text-xs text-[#9f8e7a]">
                      Menampilkan soal secara acak agar kompetisi lebih adil.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    sound.playTap();
                    setShuffleQuestions(!shuffleQuestions);
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    shuffleQuestions ? 'bg-[#51df9c]' : 'bg-[#272a31]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      shuffleQuestions ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Action CTA: Generate Code & Start */}
            <div className="mt-4 pt-4 border-t border-[#272a31] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <span className="text-[11px] text-[#9f8e7a] font-medium block">
                  KODE ROOM GENERATED
                </span>
                <span className="font-anybody font-black text-2xl text-[#f5a623] tracking-widest">
                  BDA 729
                </span>
              </div>

              <button
                onClick={() => {
                  sound.playTap();
                  onCreateRoomWithQuiz(currentQuiz, {
                    shuffle: shuffleQuestions,
                    roomCode: 'BDA 729',
                  });
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-[#f5a623] text-[#452b00] font-anybody font-extrabold text-sm tracking-wide uppercase hover:bg-[#ffb4ab] transition-all shadow-lg hover:scale-[1.02] cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" /> BUAT ROOM & BUKA LOBBY
              </button>
            </div>
          </div>
        </main>
      )}
    </div>
  );
};
