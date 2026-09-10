'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { HostQuizManagement, QuizItem } from '@/components/host/HostQuizManagement';
import { useMockGame } from '@/context/MockGameContext';
import { Quiz, OptionId } from '@/types/quiz';
import { saveQuiz } from '@/lib/quizStore';

export default function HostManagePage() {
  const router = useRouter();
  const { createRoomFromQuiz } = useMockGame();

  const handleBackToLanding = () => {
    router.push('/');
  };

  const handleCreateRoomWithQuiz = (
    quizItem: QuizItem,
    settings: { shuffle: boolean; roomCode: string }
  ) => {
    // Map QuizItem to standard Quiz contract
    const quizToSave: Quiz = {
      id: quizItem.id,
      title: quizItem.title,
      category: quizItem.category,
      questions: quizItem.questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: [
          { id: 'A', text: q.options[0] },
          { id: 'B', text: q.options[1] },
          { id: 'C', text: q.options[2] },
          { id: 'D', text: q.options[3] },
        ],
        correctOption: (['A', 'B', 'C', 'D'][q.correctIndex] || 'A') as OptionId,
        timerSeconds: q.duration,
      })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Persist to store so it is recognized across the app
    saveQuiz(quizToSave);

    // Initialize room in engine
    const sanitizedCode = settings.roomCode.replace(/\s+/g, '').toUpperCase();
    const roomCode = createRoomFromQuiz(quizToSave, {
      shuffleQuestions: settings.shuffle,
      customRoomCode: sanitizedCode,
    });

    router.push(`/host/room/${roomCode}`);
  };

  return (
    <HostQuizManagement
      onBackToLanding={handleBackToLanding}
      onCreateRoomWithQuiz={handleCreateRoomWithQuiz}
    />
  );
}
