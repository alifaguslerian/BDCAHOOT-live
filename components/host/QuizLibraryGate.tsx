'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { connectQuizLibrary, disconnectQuizLibrary, getOperatorKey } from '@/lib/quizStore';

export function QuizLibraryGate({ children }: { children: React.ReactNode }) {
  const room = usePathname().startsWith('/host/room/');
  const [ready, setReady] = useState(false);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (room) return;
    let active = true;
    const savedKey = getOperatorKey();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(false);
    if (savedKey) {
      setBusy(true);
      connectQuizLibrary(savedKey).then(() => { if (active) setReady(true); })
        .catch(error => { if (active) setError(error.message); })
        .finally(() => { if (active) setBusy(false); });
    }
    return () => { active = false; disconnectQuizLibrary(); };
  }, [room]);
  if (room || ready) return children;
  return <main className="min-h-screen bg-[#0b0e14] text-[#e1e2eb] flex items-center justify-center p-6">
    <form className="w-full max-w-md space-y-4" onSubmit={async event => {
      event.preventDefault(); if (busy) return;
      setBusy(true); setError('');
      try { await connectQuizLibrary(key); setReady(true); }
      catch (error) { setError(error instanceof Error ? error.message : 'Koleksi kuis belum dapat dibuka.'); }
      finally { setBusy(false); }
    }}>
      <h1 className="font-anybody text-2xl font-bold">Koleksi kuis operator</h1>
      <p>Kuis tersimpan di laptop server. Masukkan kode operator dari terminal server untuk membuka koleksi.</p>
      <label className="block" htmlFor="library-operator-key">Kode operator</label>
      <input id="library-operator-key" type="password" autoComplete="current-password" required value={key}
        onChange={event => setKey(event.target.value)} className="w-full min-h-12 rounded border border-[#524534] bg-[#151a22] px-3" />
      {error && <p role="alert" className="text-[#ffb4ab]">{error}</p>}
      <button disabled={busy} className="min-h-12 px-5 rounded bg-[#f5a623] text-black font-bold disabled:opacity-50">
        {busy ? 'Memuat dan memindahkan kuis lama…' : 'Buka koleksi kuis'}
      </button>
    </form>
  </main>;
}
