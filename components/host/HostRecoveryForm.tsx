'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { getOperatorKey } from '@/lib/quizStore';

export function HostRecoveryForm({ roomCode = '' }: { roomCode?: string }) {
  const router = useRouter();
  const { recoverHostRoom } = useGame();
  const [code, setCode] = useState(roomCode);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKey(getOperatorKey());
  }, []);
  return <form className="mx-auto w-full max-w-md space-y-3 text-left" onSubmit={async event => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await recoverHostRoom(code.toUpperCase().trim(), key);
      if (!result.success) setError(result.error);
      else router.replace(`/host/room/${result.code}`);
    } finally { setBusy(false); }
  }}>
    <p className="text-sm text-[#d7c3ae]">Ambil kembali kendali room tanpa mengulang permainan. Gunakan kode operator dari terminal server.</p>
    <label className="block text-sm">Kode room
      <input aria-label="Kode room untuk dipulihkan" value={code} readOnly={Boolean(roomCode)} required maxLength={6}
        onChange={event => setCode(event.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase())}
        className="mt-1 block w-full min-h-12 rounded border border-[#524534] bg-[#151a22] px-3 uppercase" />
    </label>
    <label className="block text-sm">Kode operator
      <input aria-label="Kode operator untuk pemulihan" value={key} onChange={event => setKey(event.target.value)} required type="password" autoComplete="current-password"
        className="mt-1 block w-full min-h-12 rounded border border-[#524534] bg-[#151a22] px-3" />
    </label>
    {error && <p role="alert" className="text-sm text-[#ffb4ab]">{error}</p>}
    <button disabled={busy} className="min-h-12 rounded bg-[#f5a623] px-4 font-bold text-black disabled:opacity-50">{busy ? 'Memulihkan…' : 'Pulihkan kendali room'}</button>
  </form>;
}
