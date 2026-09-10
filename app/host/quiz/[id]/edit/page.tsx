import React from 'react';
import { QuizEditorView } from '@/components/host/QuizEditorView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function QuizEditorPage({ params }: PageProps) {
  const { id } = await params;

  return <QuizEditorView quizId={id} />;
}
