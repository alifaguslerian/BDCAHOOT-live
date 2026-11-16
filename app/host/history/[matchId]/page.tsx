'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { loadMatchResult } from '@/lib/quizStore';
import { DownloadMatchButton } from '@/components/host/DownloadMatchButton';
import type { MatchResult } from '@/types/matchHistory';

export default function MatchResultPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const [result, setResult] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true); setError(''); setResult(null);
    loadMatchResult(matchId).then(value => { if (active) setResult(value); })
      .catch(error => { if (active) setError(error instanceof Error ? error.message : 'Hasil belum dapat dimuat.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [matchId, retry]);

  return <main className="min-h-screen bg-[#0b0e14] px-4 py-6 text-[#e1e2eb] sm:px-8 sm:py-10">
    <div className="mx-auto max-w-5xl">
      <Link href="/host/history" className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm text-[#d7c3ae] hover:text-[#ffc880]">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Riwayat Pertandingan
      </Link>
      <h1 className="font-anybody text-2xl font-extrabold sm:text-3xl">Hasil Pertandingan</h1>
      {loading ? <p role="status" className="py-10 text-[#d7c3ae]">Memuat hasil…</p> : error ?
        <div className="mt-6 rounded-xl border border-[#524534] p-6">
          <p role="alert" className="text-[#ffb4ab]">{error}</p>
          <button type="button" onClick={() => setRetry(value => value + 1)} className="mt-4 min-h-12 rounded-lg bg-[#f5a623] px-5 font-bold text-black">Coba lagi</button>
        </div> : !result ? <p className="mt-6 text-[#d7c3ae]">Arsip pertandingan tidak ditemukan di server ini.</p> : <>
          <section className="my-6 rounded-xl border border-[#272a31] bg-[#151a22] p-5 sm:p-6" aria-label="Ringkasan pertandingan">
            <h2 className="break-words font-anybody text-lg font-bold leading-relaxed sm:text-xl">{result.quizTitle}</h2>
            <dl className="my-5 grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-[#8b93a1]">Mulai</dt><dd className="mt-1">{new Date(result.startedAt).toLocaleString('id-ID')}</dd></div>
              <div><dt className="text-[#8b93a1]">Selesai</dt><dd className="mt-1">{new Date(result.finishedAt).toLocaleString('id-ID')}</dd></div>
              <div><dt className="text-[#8b93a1]">Peserta</dt><dd className="mt-1">{result.participantCount} peserta</dd></div>
              <div><dt className="text-[#8b93a1]">Soal</dt><dd className="mt-1">{result.questionCount} soal</dd></div>
            </dl>
            <DownloadMatchButton loadResult={async () => result} />
            <p className="mt-3 text-xs leading-relaxed text-[#8b93a1]">CSV memuat seluruh peserta dan bisa dibuka di Excel. Waktu pada file menggunakan UTC.</p>
          </section>
          <h2 className="mb-3 font-anybody text-lg font-bold">Ranking seluruh peserta</h2>
          <p className="mb-4 text-sm leading-relaxed text-[#d7c3ae]">Urutan dan poin mengikuti hasil resmi server. Peserta yang keluar setelah game dimulai tetap tercatat.</p>
          <div className="overflow-x-auto rounded-xl border border-[#272a31]" role="region" aria-label="Ranking peserta, geser untuk melihat seluruh kolom" tabIndex={0}>
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-[#1d2026] text-[#d7c3ae]"><tr>
                {['Peringkat', 'Nama', 'Poin', 'Benar', 'Salah', 'Tidak dijawab'].map(label => <th key={label} scope="col" className="px-4 py-4 font-semibold">{label}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-[#272a31] bg-[#151a22]">
                {result.rankings.map(row => <tr key={row.playerId}>
                  <td className="px-4 py-4 font-bold text-[#ffc880]">#{row.rank}</td>
                  <th scope="row" className="max-w-56 break-words px-4 py-4 font-semibold">{row.name}</th>
                  <td className="px-4 py-4 font-bold tabular-nums">{row.score.toLocaleString('id-ID')}</td>
                  <td className="px-4 py-4 tabular-nums">{row.correct}</td><td className="px-4 py-4 tabular-nums">{row.wrong}</td><td className="px-4 py-4 tabular-nums">{row.unanswered}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
          <p className="mt-4 break-all text-xs text-[#8b93a1]">ID pertandingan: {result.id}</p>
        </>}
    </div>
  </main>;
}
