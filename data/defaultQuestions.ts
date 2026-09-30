import type { QuizQuestion } from '@/types/quiz';

export const DEFAULT_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'Berapa jumlah pilar utama dalam sistem kemahasiswaan BDC?',
    options: [
      { id: 'A', text: '3 Pilar Utama' },
      { id: 'B', text: '4 Pilar Utama' },
      { id: 'C', text: '5 Pilar Utama' },
      { id: 'D', text: '6 Pilar Utama' },
    ],
    correctOption: 'B',
    timerSeconds: 15,
  },
  {
    id: 'q2',
    question: 'Tahun berapakah kampus pertama kali mengadakan Minigames Arena?',
    options: [
      { id: 'A', text: '2021' },
      { id: 'B', text: '2022' },
      { id: 'C', text: '2023' },
      { id: 'D', text: '2024' },
    ],
    correctOption: 'C',
    timerSeconds: 20,
  },
  {
    id: 'q3',
    question: 'Simbol bentuk geometri untuk pilihan opsi D pada sistem ini adalah?',
    options: [
      { id: 'A', text: 'Segitiga Merah' },
      { id: 'B', text: 'Diamond Biru' },
      { id: 'C', text: 'Lingkaran Kuning' },
      { id: 'D', text: 'Kotak Hijau' },
    ],
    correctOption: 'D',
    timerSeconds: 10,
  },
];

