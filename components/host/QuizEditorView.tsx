'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Play,
  Save,
  Check,
} from 'lucide-react';
import { Quiz, OptionId, QuizQuestion } from '@/types/quiz';
import { getQuizById, saveQuiz, createNewQuestion, createNewDraftQuiz } from '@/lib/quizStore';
import { validateQuiz } from '@/lib/validation';
import { OPTION_CONFIGS, TIMER_PRESETS } from '@/lib/constants';
import { sound } from '@/lib/soundFX';

interface QuizEditorViewProps {
  quizId: string;
}

export function QuizEditorView({ quizId }: QuizEditorViewProps) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz>(() => {
    const loaded = getQuizById(quizId);
    if (loaded) return loaded;
    const draft = createNewDraftQuiz();
    draft.id = quizId;
    saveQuiz(draft);
    return draft;
  });
  const [activeIdx, setActiveIdx] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  // Persist helper
  const triggerAutoSave = useCallback((updated: Quiz) => {
    setSaveStatus('saving');
    saveQuiz(updated);
    setTimeout(() => {
      setSaveStatus('saved');
    }, 400);
  }, []);

  if (!quiz) {
    return (
      <div className="min-h-screen bg-[#0b0e14] text-[#e1e2eb] flex items-center justify-center font-space">
        Memuat editor kuis...
      </div>
    );
  }

  const currentQ = quiz.questions[activeIdx] || quiz.questions[0];
  const validation = validateQuiz(quiz);

  // Question validation check for sidebar badges
  const isQuestionComplete = (q: QuizQuestion): boolean => {
    if (!q.question.trim()) return false;
    if (!q.options || q.options.length !== 4) return false;
    for (const opt of q.options) {
      if (!opt.text.trim()) return false;
    }
    if (!['A', 'B', 'C', 'D'].includes(q.correctOption)) return false;
    return true;
  };

  // Title update
  const handleTitleChange = (newTitle: string) => {
    const updated: Quiz = { ...quiz, title: newTitle };
    setQuiz(updated);
    triggerAutoSave(updated);
  };

  // Active question updates
  const updateCurrentQuestion = (modifier: (q: QuizQuestion) => QuizQuestion) => {
    const updatedQuestions = [...quiz.questions];
    updatedQuestions[activeIdx] = modifier(currentQ);
    const updatedQuiz: Quiz = { ...quiz, questions: updatedQuestions };
    setQuiz(updatedQuiz);
    triggerAutoSave(updatedQuiz);
  };

  const handlePromptChange = (text: string) => {
    updateCurrentQuestion((q) => ({ ...q, question: text }));
  };

  const handleTimerChange = (seconds: number) => {
    sound.playTap();
    updateCurrentQuestion((q) => ({ ...q, timerSeconds: seconds }));
  };

  const handleOptionTextChange = (optionId: OptionId, text: string) => {
    updateCurrentQuestion((q) => {
      const newOptions = q.options.map((opt) =>
        opt.id === optionId ? { ...opt, text } : opt
      ) as QuizQuestion['options'];
      return { ...q, options: newOptions };
    });
  };

  const handleCorrectOptionChange = (optionId: OptionId) => {
    sound.playTap();
    updateCurrentQuestion((q) => ({ ...q, correctOption: optionId }));
  };

  // Add question
  const handleAddQuestion = () => {
    sound.playTap();
    const newQ = createNewQuestion(quiz.questions.length + 1);
    const updatedQuiz: Quiz = {
      ...quiz,
      questions: [...quiz.questions, newQ],
    };
    setQuiz(updatedQuiz);
    setActiveIdx(quiz.questions.length);
    triggerAutoSave(updatedQuiz);
  };

  // Delete question
  const handleDeleteQuestion = (idxToDelete: number) => {
    if (quiz.questions.length <= 1) {
      sound.playError();
      return;
    }
    sound.playTap();
    const updatedQuestions = quiz.questions.filter((_, i) => i !== idxToDelete);
    const updatedQuiz: Quiz = { ...quiz, questions: updatedQuestions };
    setQuiz(updatedQuiz);
    if (activeIdx >= updatedQuestions.length) {
      setActiveIdx(updatedQuestions.length - 1);
    }
    triggerAutoSave(updatedQuiz);
  };

  // Move question
  const handleMoveQuestion = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= quiz.questions.length) return;
    sound.playTap();
    const reordered = [...quiz.questions];
    const temp = reordered[idx];
    reordered[idx] = reordered[targetIdx];
    reordered[targetIdx] = temp;

    const updatedQuiz: Quiz = { ...quiz, questions: reordered };
    setQuiz(updatedQuiz);
    setActiveIdx(targetIdx);
    triggerAutoSave(updatedQuiz);
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#e1e2eb] selection:bg-[#f5a623] selection:text-[#452b00] flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 w-full px-6 lg:px-12 bg-[#0b0e14]/95 backdrop-blur-md border-b border-[#1d2026] flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            id="btn-back-to-library"
            href="/host/library"
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
              EDITOR
            </span>
          </div>
        </div>

        {/* Autosave Status Indicator & Action */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-space">
            {saveStatus === 'saving' ? (
              <span className="text-[#ffc880] flex items-center gap-1.5 animate-pulse">
                <Save className="w-3.5 h-3.5" />
                <span>Menyimpan...</span>
              </span>
            ) : (
              <span className="text-[#51df9c] flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Tersimpan otomatis</span>
              </span>
            )}
          </div>

          <button
            id="btn-go-to-settings"
            type="button"
            onClick={() => {
              sound.playTap();
              router.push(`/host/quiz/${quiz.id}/settings`);
            }}
            className="h-9 px-4 rounded-lg bg-[#f5a623] hover:bg-[#ffc880] text-[#452b00] font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors shadow-md"
          >
            <Play className="w-3.5 h-3.5 fill-[#452b00]" />
            <span>Lanjut ke Pengaturan Game</span>
          </button>
        </div>
      </header>

      {/* Main Content Layout: Sidebar Soal + Canvas Editor Soal */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">
        {/* Left Sidebar: List of Soal */}
        <aside className="w-full md:w-72 flex flex-col gap-3">
          <div className="p-4 rounded-xl bg-[#151a22] border border-[#272a31]">
            <label
              htmlFor="quiz-title-input"
              className="text-xs font-bold text-[#8b93a1] uppercase tracking-wider font-space block mb-1.5"
            >
              Judul Kuis
            </label>
            <input
              id="quiz-title-input"
              type="text"
              value={quiz.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Masukkan judul kuis..."
              className="w-full bg-[#0b0e14] border border-[#272a31] rounded-lg px-3 py-2 text-sm font-semibold text-[#e1e2eb] focus:outline-none focus:border-[#ffc880] transition-colors"
            />
          </div>

          {/* Questions Header & Add Button */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-[#d7c3ae] uppercase tracking-wider font-space">
              Daftar Soal ({quiz.questions.length})
            </span>
            <button
              id="btn-add-question"
              type="button"
              onClick={handleAddQuestion}
              className="h-7 px-2.5 rounded bg-[#1d2026] hover:bg-[#272a31] text-[#ffc880] text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-colors border border-[#272a31]"
            >
              <Plus className="w-3 h-3 stroke-[2.5]" />
              <span>Tambah</span>
            </button>
          </div>

          {/* Question Chips List */}
          <div className="flex flex-col gap-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {quiz.questions.map((q, idx) => {
              const isActive = idx === activeIdx;
              const complete = isQuestionComplete(q);

              return (
                <div
                  key={q.id || idx}
                  id={`question-tab-${idx}`}
                  onClick={() => {
                    sound.playTap();
                    setActiveIdx(idx);
                  }}
                  className={`group relative flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#1d2026] border-[#ffc880] shadow'
                      : 'bg-[#151a22] border-[#272a31] hover:border-[#32353c]'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span
                      className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold font-anybody shrink-0 ${
                        isActive ? 'bg-[#ffc880] text-[#452b00]' : 'bg-[#272a31] text-[#e1e2eb]'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="flex flex-col truncate">
                      <span className="text-xs font-medium text-[#e1e2eb] truncate max-w-[130px]">
                        {q.question.trim() || 'Pertanyaan Kosong...'}
                      </span>
                      <span className="text-[10px] text-[#8b93a1] font-space flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {q.timerSeconds || 20}s • Jawaban: {q.correctOption}
                      </span>
                    </div>
                  </div>

                  {/* Status icon + Move Controls */}
                  <div className="flex items-center gap-1">
                    {complete ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#51df9c] shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-[#ffb4ab] shrink-0" />
                    )}

                    <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveQuestion(idx, 'up');
                        }}
                        className="w-5 h-5 rounded hover:bg-[#32353c] text-[#8b93a1] hover:text-white disabled:opacity-30 flex items-center justify-center"
                        title="Geser Naik"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === quiz.questions.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveQuestion(idx, 'down');
                        }}
                        className="w-5 h-5 rounded hover:bg-[#32353c] text-[#8b93a1] hover:text-white disabled:opacity-30 flex items-center justify-center"
                        title="Geser Turun"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Right Canvas: Soal Editor Detail (D4 Soal Editor) */}
        <main className="flex-1 flex flex-col gap-6">
          <div className="p-6 rounded-xl bg-[#151a22] border border-[#272a31] shadow-lg flex flex-col gap-6">
            {/* Soal Header: Nomor, Timer Selector & Delete */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#272a31] pb-4">
              <div className="flex items-center gap-3">
                <span className="font-anybody font-extrabold text-2xl text-[#ffc880]">
                  Soal #{activeIdx + 1}
                </span>
                <span className="text-xs font-space text-[#8b93a1]">
                  dari {quiz.questions.length} total soal
                </span>
              </div>

              {/* Timer Presets */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#d7c3ae] uppercase tracking-wider font-space flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#ffc880]" />
                  <span>Batas Waktu:</span>
                </span>
                <div className="flex items-center gap-1 bg-[#0b0e14] p-1 rounded-lg border border-[#272a31]">
                  {TIMER_PRESETS.map((seconds) => (
                    <button
                      key={seconds}
                      id={`timer-preset-${seconds}s`}
                      type="button"
                      onClick={() => handleTimerChange(seconds)}
                      className={`px-3 py-1 rounded text-xs font-bold font-space transition-colors ${
                        currentQ.timerSeconds === seconds
                          ? 'bg-[#f5a623] text-[#452b00] shadow'
                          : 'text-[#8b93a1] hover:text-[#e1e2eb]'
                      }`}
                    >
                      {seconds}s
                    </button>
                  ))}
                </div>

                {/* Delete Question Button */}
                <button
                  id="btn-delete-active-question"
                  type="button"
                  onClick={() => handleDeleteQuestion(activeIdx)}
                  disabled={quiz.questions.length <= 1}
                  className="w-9 h-9 rounded-lg bg-[#1d2026] hover:bg-[#93000a]/30 text-[#8b93a1] hover:text-[#ffb4ab] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors border border-[#272a31]"
                  title={
                    quiz.questions.length <= 1
                      ? 'Minimal 1 soal harus dipertahankan'
                      : 'Hapus soal ini'
                  }
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Question Prompt Input */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="question-prompt-input"
                className="text-xs font-bold text-[#d7c3ae] uppercase tracking-wider font-space"
              >
                Teks Pertanyaan
              </label>
              <textarea
                id="question-prompt-input"
                rows={3}
                value={currentQ.question}
                onChange={(e) => handlePromptChange(e.target.value)}
                placeholder="Tuliskan pertanyaan panggung di sini (misal: 'Berapakah jumlah benua di dunia?')..."
                className="w-full bg-[#0b0e14] border border-[#272a31] rounded-xl p-4 text-base md:text-lg font-medium text-[#e1e2eb] placeholder:text-[#524534] focus:outline-none focus:border-[#ffc880] transition-colors resize-none shadow-inner"
              />
            </div>

            {/* 4 Options Grid (Geometric + Accessible High Contrast) */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#d7c3ae] uppercase tracking-wider font-space">
                  Pilihan Jawaban (Klik bentuk/lingkaran untuk menandai KUNCI JAWABAN BENAR)
                </span>
                <span className="text-xs font-space text-[#51df9c]">
                  Kunci Terpilih: <strong>Opsi {currentQ.correctOption}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['A', 'B', 'C', 'D'] as OptionId[]).map((optKey) => {
                  const cfg = OPTION_CONFIGS[optKey];
                  const opt = currentQ.options.find((o) => o.id === optKey) || {
                    id: optKey,
                    text: '',
                  };
                  const isCorrect = currentQ.correctOption === optKey;

                  return (
                    <div
                      key={optKey}
                      id={`option-card-editor-${optKey}`}
                      className={`relative flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                        isCorrect
                          ? 'bg-[#1d2026] border-[#51df9c] shadow-[0_0_12px_rgba(81,223,156,0.15)]'
                          : 'bg-[#0b0e14] border-[#272a31] hover:border-[#32353c]'
                      }`}
                    >
                      {/* Geometric Badge with Radio Functionality */}
                      <button
                        type="button"
                        id={`btn-select-correct-${optKey}`}
                        onClick={() => handleCorrectOptionChange(optKey)}
                        className={`w-11 h-11 rounded-lg flex items-center justify-center font-bold text-base transition-transform active:scale-95 shrink-0 text-white ${cfg.tailwindBg} shadow-md`}
                        title={`Pilih ${optKey} sebagai jawaban benar`}
                      >
                        <span className="text-lg">{cfg.symbol}</span>
                      </button>

                      {/* Text Input for Option */}
                      <div className="flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-[#8b93a1] font-space">
                            OPSI {optKey}
                          </span>
                          {isCorrect && (
                            <span className="text-[10px] font-bold text-[#51df9c] uppercase font-space flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Kunci Benar
                            </span>
                          )}
                        </div>
                        <input
                          id={`input-option-${optKey}`}
                          type="text"
                          value={opt.text}
                          onChange={(e) => handleOptionTextChange(optKey, e.target.value)}
                          placeholder={`Jawaban ${optKey}...`}
                          className="w-full bg-transparent text-sm font-medium text-[#e1e2eb] placeholder:text-[#524534] focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Validation Banner if Current Question or Entire Quiz Incomplete */}
            {!validation.isValid && (
              <div className="p-4 rounded-xl bg-[#93000a]/15 border border-[#ffb4ab]/30 flex items-start gap-3 text-xs text-[#ffb4ab]">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="font-bold">
                    Perhatian: Ada {validation.errors.length} masalah kelengkapan pada kuis ini:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90">
                    {validation.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
