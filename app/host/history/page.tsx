'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, History } from 'lucide-react';
import { loadMatchHistory } from '@/lib/quizStore';
import type { MatchCursor, MatchPage } from '@/types/matchHistory';

export default function MatchHistoryPage() {
  const [page, setPage] = useState<MatchPage | null>(null);
  const [cursors, setCursors] = useState<MatchCursor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const before = cursors.at(-1);
  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true); setError('');
    loadMatchHistory(before).then(result => { if (active) setPage(result); })
      .catch(error => { if (active) setError(error instanceof Error ? error.message : 'Riwayat belum dapat dimuat.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [before, retry]);

  return <main className="min-h-screen bg-[#0b0e14] px-4 py-6 text-[#e1e2eb] sm:px-8 sm:py-10">
    <div className="mx-auto max-w-5xl">
      <Link href="/host/library" className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm text-[#d7c3ae] hover:text-[#ffc880]">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Kembali ke Library
      </Link>
      <div className="mb-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#ffc880]">Arsip operator</p>
        <h1 className="font-anybody text-2xl font-extrabold sm:text-3xl">Riwayat Pertandingan</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#d7c3ae]">Setiap permainan yang selesai punya hasil sendiri. Buka pertandingan untuk melihat ranking seluruh peserta atau mengunduh CSV.</p>
      </div>
      {loading ? <p role="status" className="py-10 text-[#d7c3ae]">Memuat riwayat…</p> : error ?
        <div className="rounded-xl border border-[#524534] p-6">
          <p role="alert" className="text-[#ffb4ab]">{error}</p>
          <button type="button" onClick={() => setRetry(value => value + 1)} className="mt-4 min-h-12 rounded-lg bg-[#f5a623] px-5 font-bold text-black">Coba lagi</button>
        </div> : page?.items.length === 0 ?
          <div className="rounded-xl border border-dashed border-[#272a31] bg-[#151a22] px-6 py-12 text-center">
            <History className="mx-auto mb-4 h-8 w-8 text-[#ffc880]" aria-hidden="true" />
            <h2 className="font-anybody text-lg font-bold">Belum ada pertandingan selesai</h2>
            <p className="mt-3 text-sm text-[#d7c3ae]">Hasil otomatis tersimpan setelah soal terakhir. Pertandingan dari sebelum fitur ini tersedia tidak ditambahkan kembali.</p>
          </div> : <ul className="space-y-3">
            {page?.items.map(match => <li key={match.id}>
              <Link href={`/host/history/${match.id}`} data-match-id={match.id}
                className="group flex min-w-0 items-center gap-4 rounded-xl border border-[#272a31] bg-[#151a22] p-5 transition-colors hover:border-[#ffc880] sm:p-6">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[#8b93a1]">{new Date(match.finishedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  <h2 className="mt-2 break-words font-anybody text-base font-bold leading-relaxed sm:text-lg">{match.quizTitle}</h2>
                  <p className="mt-3 text-sm text-[#d7c3ae]">{match.participantCount} peserta <span aria-hidden="true">·</span> {match.questionCount} soal <span aria-hidden="true">·</span> Selesai</p>
                  <p className="mt-2 text-xs text-[#8b93a1]">ID: {match.id.slice(0, 8)}</p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-[#ffc880]" aria-hidden="true" />
              </Link>
            </li>)}
          </ul>}
      <nav aria-label="Halaman riwayat" className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button type="button" disabled={loading || cursors.length === 0} onClick={() => setCursors(value => value.slice(0, -1))}
          className="min-h-12 rounded-lg border border-[#272a31] px-4 text-sm disabled:opacity-40">Sebelumnya</button>
        <span className="text-sm text-[#8b93a1]">Halaman {cursors.length + 1}</span>
        <button type="button" disabled={loading || !!error || !page?.nextCursor} onClick={() => { if (page?.nextCursor) setCursors(value => [...value, page.nextCursor!]); }}
          className="min-h-12 rounded-lg border border-[#524534] px-4 text-sm text-[#ffc880] disabled:opacity-40">Berikutnya</button>
      </nav>
    </div>
  </main>;
}
