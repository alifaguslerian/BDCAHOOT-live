'use client';

import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { matchCsv, matchFilename } from '@/lib/matchCsv';
import type { MatchResult } from '@/types/matchHistory';

export function DownloadMatchButton({ loadResult }: { loadResult: () => Promise<MatchResult | null> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(true);
  const inFlight = useRef(false);
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; cleanup.current?.(); };
  }, []);

  async function download() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      const result = await loadResult();
      if (!active.current) return;
      if (!result) throw Error('Arsip hasil belum tersedia. Coba lagi setelah server terhubung.');
      cleanup.current?.();
      const url = URL.createObjectURL(new Blob([matchCsv(result)], { type: 'text/csv;charset=utf-8' }));
      const timer = window.setTimeout(() => { URL.revokeObjectURL(url); cleanup.current = null; }, 1000);
      cleanup.current = () => { window.clearTimeout(timer); URL.revokeObjectURL(url); };
      const link = document.createElement('a');
      link.href = url; link.download = matchFilename(result);
      document.body.appendChild(link);
      try { link.click(); } finally { link.remove(); }
    } catch (error) {
      if (active.current) setError(error instanceof Error ? error.message : 'Hasil belum dapat diunduh. Coba lagi.');
    } finally {
      inFlight.current = false;
      if (active.current) setBusy(false);
    }
  }

  return <div className="flex flex-col items-start gap-2">
    <button type="button" disabled={busy} onClick={download}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#524534] bg-[#f5a623] px-5 py-3 text-sm font-bold text-[#302000] hover:bg-[#ffc880] disabled:opacity-60">
      <Download className="h-4 w-4" aria-hidden="true" />
      {busy ? 'Menyiapkan CSV…' : 'Download Hasil'}
    </button>
    {error && <p role="alert" className="max-w-md text-sm text-[#ffb4ab]">{error}</p>}
  </div>;
}
