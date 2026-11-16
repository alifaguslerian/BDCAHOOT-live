import type { MatchResult } from '@/types/matchHistory';

function cell(value: string | number): string {
  let text = String(value);
  if (typeof value === 'string' && /^\s*[=+\-@]/u.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function matchCsv(result: MatchResult): string {
  const rows: (string | number)[][] = [
    ['BDCAHOOT Live - Hasil Pertandingan'],
    ['ID pertandingan', result.id], ['Kuis', result.quizTitle],
    ['Mulai (UTC)', new Date(result.startedAt).toISOString()],
    ['Selesai (UTC)', new Date(result.finishedAt).toISOString()],
    ['Jumlah soal', result.questionCount], ['Jumlah peserta', result.participantCount], [],
    ['Peringkat', 'Nama', 'Poin', 'Benar', 'Salah', 'Tidak dijawab', 'Total waktu respons (ms)'],
    ...result.rankings.map(row => [row.rank, row.name, row.score, row.correct, row.wrong, row.unanswered, row.totalResponseTimeMs]),
  ];
  return '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n') + '\r\n';
}

export function matchFilename(result: MatchResult): string {
  const title = result.quizTitle.replace(/[^\p{L}\p{N}_ -]/gu, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'kuis';
  const date = new Date(result.finishedAt).toISOString().replace(/[:.]/g, '-');
  return `hasil-${title}-${date}-${result.id.slice(0, 8)}.csv`;
}
