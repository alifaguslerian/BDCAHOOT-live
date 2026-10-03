'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { ClientEvents, ServerEvents, RoomView, SessionCredentials, SubmitRequest, AnswerReceipt, Reply, HostCommand } from '@/types/network';
import type { Quiz, OptionId } from '@/types/quiz';
import type { GameRoomSettings, GameStage } from '@/types/game';
import { fitsQuizPayload } from '@/lib/quizLimits';

const EMPTY_ROOM: RoomView = { code: '', sessionId: '', revision: -1, quizTitle: '', stage: 'LOBBY', currentQuestionIndex: 0, totalQuestions: 0, currentQuestion: null, settings: { shuffleQuestions: false, revealDurationMs: 4000 }, questionStartedAtMs: null, questionEndsAtMs: null, revealEndsAtMs: null, players: {}, rankings: [], distribution: { A: 0, B: 0, C: 0, D: 0 }, answeredCount: 0 };
const SESSION_KEY = 'bdcahoot_session';
const ANSWER_KEY = 'bdcahoot_submission';
const CREATE_KEY = 'bdcahoot_creation_request';
const JOIN_KEY = 'bdcahoot_join_request';
const PLAYER_RECOVERY_KEY = 'bdcahoot_player_recovery';
function recoveredPlayer(): SessionCredentials | null {
  try {
    const value = JSON.parse(localStorage.getItem(PLAYER_RECOVERY_KEY) || 'null');
    return value?.role === 'player' && typeof value.token === 'string' && typeof value.sessionId === 'string' && typeof value.code === 'string' && typeof value.playerId === 'string' ? value : null;
  } catch { return null; }
}
function requestId() { return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join(''); }
type Submission = { request: SubmitRequest; receipt?: AnswerReceipt };
function readSaved<T>(key: string): T | null { try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch { return null; } }
function save(key: string, value: unknown) { try { if (value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Private browsing may disable storage. */ } }
function request<T>(send: (ack: (error: Error | null, reply?: Reply<T>) => void) => void): Promise<Reply<T>> {
  return new Promise(resolve => {
    const unknown: Reply<T> = { success: false, error: 'Konfirmasi belum diterima. Periksa koneksi lalu coba lagi.', code: 'UNKNOWN' };
    try { send((error, reply) => resolve(error || !reply ? unknown : reply)); }
    catch { resolve(unknown); }
  });
}
function useGameState() {
  const socketRef = useRef<Socket<ServerEvents, ClientEvents> | null>(null);
  const authenticated = useRef(false);
  const hostInFlight = useRef(false);
  const credentials = useRef<SessionCredentials | null>(null);
  const roomRef = useRef(EMPTY_ROOM);
  const submissionRef = useRef<Submission | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [room, setRoom] = useState(EMPTY_ROOM);
  const [currentPlayerId, setPlayerId] = useState<string | null>(null);
  const [role, setRole] = useState<SessionCredentials['role'] | null>(null);
  const [connection, setConnection] = useState('Menghubungkan…');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverOffsetMs, setOffset] = useState(0);
  const [isHostActionLoading, setHostLoading] = useState(false);
  const joinRequest = useRef<{ code: string; name: string; requestId: string } | null>(null);
  const retryResume = useRef<(() => void) | null>(null);
  const leaving = useRef(false);
  const [isLeaving, setLeaving] = useState(false);
  function storeSubmission(value: Submission | null) { submissionRef.current = value; setSubmission(value); save(ANSWER_KEY, value); }
  function apply(view: RoomView) {
    if (view.sessionId !== credentials.current?.sessionId) return;
    if (roomRef.current.sessionId === view.sessionId && view.revision < roomRef.current.revision) return;
    roomRef.current = view; setRoom(view);
    if (view.ownReceipt) storeSubmission({ request: { sessionId: view.ownReceipt.sessionId, questionIndex: view.ownReceipt.questionIndex, submissionId: view.ownReceipt.submissionId, option: view.ownReceipt.selectedOption }, receipt: view.ownReceipt });
  }
  function remember(value: SessionCredentials) {
    leaving.current = false; setLeaving(false);
    credentials.current = value; save(SESSION_KEY, value); setPlayerId(value.playerId || null); setRole(value.role);
    if (value.role === 'player') { try { localStorage.setItem(PLAYER_RECOVERY_KEY, JSON.stringify(value)); } catch { /* Tab storage remains available when persistent storage is blocked. */ } }
    if (submissionRef.current?.request.sessionId !== value.sessionId) storeSubmission(null);
  }
  function clearSession() {
    authenticated.current = false;
    if (credentials.current?.role === 'player' && recoveredPlayer()?.token === credentials.current.token) {
      try { localStorage.removeItem(PLAYER_RECOVERY_KEY); } catch { /* Storage may be blocked. */ }
    }
    credentials.current = null; save(SESSION_KEY, null); storeSubmission(null); setPlayerId(null); setRole(null); roomRef.current = EMPTY_ROOM; setRoom(EMPTY_ROOM);
  }
  async function transmit(saved: Submission): Promise<Reply<AnswerReceipt>> {
    const socket = socketRef.current;
    if (!socket?.connected || !authenticated.current) return { success: false, error: 'Koneksi terputus. Jawaban belum terkonfirmasi; coba lagi.', code: 'UNKNOWN' };
    const result = await request<AnswerReceipt>(ack => socket.timeout(6000).emit('answer:submit', saved.request, ack));
    if (submissionRef.current?.request.submissionId !== saved.request.submissionId || credentials.current?.sessionId !== saved.request.sessionId) return result;
    if (result.success) storeSubmission({ request: saved.request, receipt: result.data });
    else if (result.code !== 'UNKNOWN' && result.code !== 'RATE_LIMIT') storeSubmission(null);
    return result;
  }
  useEffect(() => {
    const socket: Socket<ServerEvents, ClientEvents> = io({ autoConnect: false });
    socketRef.current = socket;
    const saved = readSaved<SessionCredentials>(SESSION_KEY) ?? recoveredPlayer();
    submissionRef.current = readSaved<Submission>(ANSWER_KEY); setSubmission(submissionRef.current);
    if (saved) remember(saved);
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let synchronizing = false;
    let syncAttempt = 0;
    const synchronize = async () => {
      if (synchronizing || !socket.connected || socketRef.current !== socket) return;
      synchronizing = true;
      const attempt = ++syncAttempt;
      clearTimeout(retryTimer);
      authenticated.current = false;
      setConnection('Memulihkan koneksi…'); setError(null);
      const sentAt = Date.now();
      socket.timeout(6000).emit('clock:ping', { sentAt }, (error, reply) => { if (!error && reply && socketRef.current === socket) setOffset(reply.receivedAt - (sentAt + Date.now()) / 2); });
      const session = credentials.current;
      if (session) {
        const result = await request<RoomView>(ack => socket.timeout(6000).emit('session:resume', session, ack));
        if (socketRef.current !== socket || attempt !== syncAttempt) return;
        if (credentials.current?.token !== session.token) { synchronizing = false; return; }
        if (result.success) { authenticated.current = true; apply(result.data); if (submissionRef.current && !submissionRef.current.receipt) void transmit(submissionRef.current); }
        else {
          setError(result.error);
          if (result.code === 'UNKNOWN' || result.code === 'RATE_LIMIT') {
            synchronizing = false;
            setConnection('Memulihkan sesi…');
            retryTimer = setTimeout(() => { void synchronize(); }, 2000);
            return;
          }
          clearSession();
        }
      }
      setConnection(socket.connected ? 'Terhubung' : 'Koneksi terputus');
      setReady(true);
      synchronizing = false;
    };
    retryResume.current = () => { void synchronize(); };
    socket.on('connect', synchronize);
    socket.on('disconnect', () => { syncAttempt++; synchronizing = false; clearTimeout(retryTimer); authenticated.current = false; setConnection('Koneksi terputus — menghubungkan kembali…'); });
    socket.on('connect_error', () => { setConnection('Server belum terhubung'); if (!credentials.current) setReady(true); });
    socket.on('room:state', apply);
    socket.on('room:count', count => { const current = roomRef.current; if (count.sessionId === current.sessionId && count.questionIndex === current.currentQuestionIndex) apply({ ...current, answeredCount: Math.max(current.answeredCount, count.count) }); });
    socket.on('session:ended', (message, sessionId, playerId) => {
      if (credentials.current?.sessionId !== sessionId || credentials.current?.playerId !== playerId) return;
      syncAttempt++; synchronizing = false; clearTimeout(retryTimer);
      clearSession(); setError(message); setReady(true);
    });
    const refresh = () => { if (socket.connected) void synchronize(); };
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    const clockInterval = setInterval(() => { if (socket.connected) { const sentAt = Date.now(); socket.timeout(6000).emit('clock:ping', { sentAt }, (error, reply) => { if (!error && reply && socketRef.current === socket) setOffset(reply.receivedAt - (sentAt + Date.now()) / 2); }); } }, 30000);
    socket.connect();
    return () => { clearTimeout(retryTimer); clearInterval(clockInterval); retryResume.current = null; document.removeEventListener('visibilitychange', onVisible); socket.removeAllListeners(); socket.disconnect(); socketRef.current = null; };
    // Socket listeners read current session and room through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function inspectRoom(code: string) {
    const socket = socketRef.current;
    if (!socket?.connected) return { success: false as const, error: 'Server belum terhubung.' };
    return request<{ code: string; stage: GameStage }>(ack => socket.timeout(6000).emit('room:inspect', { code }, ack));
  }
  async function resumeNow(session: SessionCredentials) {
    remember(session);
    authenticated.current = false;
    const socket = socketRef.current!;
    const connectionId = socket.id;
    const result = await request<RoomView>(ack => socket.timeout(6000).emit('session:resume', session, ack));
    if (socketRef.current !== socket || credentials.current?.token !== session.token || !socket.connected || socket.id !== connectionId) return;
    if (result.success) { authenticated.current = true; apply(result.data); }
    else { setError(result.error); if (result.code === 'UNKNOWN' || result.code === 'RATE_LIMIT') retryResume.current?.(); }
  }
  async function createRoomFromQuiz(quiz: Quiz, settings?: Partial<GameRoomSettings>, hostKey = '') {
    const socket = socketRef.current;
    if (!socket?.connected) { setError('Server belum terhubung.'); return null; }
    if (!fitsQuizPayload(quiz, settings)) { setError('Kuis terlalu besar. Kurangi teks hingga maksimal 200 KiB.'); return null; }
    const signature = JSON.stringify([quiz, settings]);
    let creation = readSaved<{ signature: string; requestId: string }>(CREATE_KEY);
    if (creation?.signature !== signature) { creation = { signature, requestId: requestId() }; save(CREATE_KEY, creation); }
    const result = await request<SessionCredentials>(ack => socket.timeout(6000).emit('room:create', { quiz, settings, hostKey, requestId: creation!.requestId }, ack));
    if (!result.success) { setError(result.error); return null; }
    save(CREATE_KEY, null); setError(null); await resumeNow(result.data); return result.data.code;
  }
  async function joinRoomAsPlayer(name: string, code: string) {
    const socket = socketRef.current;
    if (!socket?.connected) return { success: false, error: 'Server belum terhubung.' };
    if (!joinRequest.current) joinRequest.current = readSaved(JOIN_KEY);
    if (joinRequest.current?.code !== code || joinRequest.current?.name !== name) joinRequest.current = { code, name, requestId: requestId() };
    const attempt = joinRequest.current;
    save(JOIN_KEY, attempt);
    const result = await request<SessionCredentials>(ack => socket.timeout(6000).emit('room:join', attempt, ack));
    if (!result.success) {
      if (result.code !== 'UNKNOWN' && result.code !== 'RATE_LIMIT' && joinRequest.current === attempt) { joinRequest.current = null; save(JOIN_KEY, null); }
      return result;
    }
    await resumeNow(result.data);
    if (joinRequest.current === attempt) { joinRequest.current = null; save(JOIN_KEY, null); }
    return { success: true, playerId: result.data.playerId };
  }
  async function leaveRoom() {
    const socket = socketRef.current;
    if (leaving.current) return false;
    if (!socket?.connected || !authenticated.current) { setError('Tunggu koneksi pulih sebelum keluar agar sesi tidak hilang.'); return false; }
    leaving.current = true; setLeaving(true);
    const result = await request(ack => socket.timeout(6000).emit('room:leave', {}, ack));
    if (!result.success) { leaving.current = false; setLeaving(false); setError(result.error); return false; }
    clearSession(); setError(null);
    return true;
  }
  async function command(action: HostCommand['action'], playerId?: string) {
    const socket = socketRef.current, current = roomRef.current;
    if (!socket?.connected || !credentials.current || !authenticated.current || hostInFlight.current) { setError('Server belum terhubung atau aksi masih diproses.'); return false; }
    hostInFlight.current = true;
    setHostLoading(true);
    const result = await request<SessionCredentials | undefined>(ack => socket.timeout(6000).emit('host:command', { sessionId: current.sessionId, revision: current.revision, action, playerId }, ack));
    hostInFlight.current = false;
    setHostLoading(false);
    if (!result.success) setError(result.error); else { setError(null); if (result.data) await resumeNow(result.data); }
    if (result.success && action === 'reset') clearSession();
    return result.success;
  }
  async function submitAnswer(playerId: string, option: OptionId) {
    if (playerId !== credentials.current?.playerId) return { success: false as const, error: 'Sesi pemain tidak valid.' };
    let saved = submissionRef.current;
    if (!saved || saved.request.sessionId !== room.sessionId || saved.request.questionIndex !== room.currentQuestionIndex) {
      saved = { request: { sessionId: room.sessionId, questionIndex: room.currentQuestionIndex, submissionId: requestId(), option } }; storeSubmission(saved);
    }
    if (saved.receipt) return { success: true as const, data: saved.receipt };
    return transmit(saved);
  }
  const activeSubmission = submission?.request.sessionId === room.sessionId && submission.request.questionIndex === room.currentQuestionIndex ? submission : null;
  return { room, hasRoom: Boolean(room.sessionId), currentPlayerId, role, ready, connection, error, serverOffsetMs, isHostActionLoading,
    createRoomFromQuiz, inspectRoom, joinRoomAsPlayer, submitAnswer, leaveRoom, isLeaving,
    pendingOption: activeSubmission?.request.option ?? null,
    answerConfirmed: Boolean(activeSubmission?.receipt),
    hasPlayerAnswered: (id: string) => Boolean(room.players[id]?.answers[room.currentQuestionIndex] || (id === currentPlayerId && activeSubmission?.receipt)),
    getPlayerAnswer: (id: string, index = room.currentQuestionIndex) => room.players[id]?.answers[index] ?? null,
    setCurrentPlayerId: (id: string | null) => { if (id === null) { clearSession(); socketRef.current?.disconnect().connect(); } },
    currentQuestion: room.currentQuestion, distribution: room.distribution, rankings: room.rankings, answeredCount: room.answeredCount,
    startQuiz: () => command('start'), nextQuestion: () => command('next'), finishQuiz: () => command('finish'), resetRoom: () => command('reset'), kickPlayer: (id: string) => command('kick', id),
    setStage: (stage: GameStage) => { if (stage === 'REVEAL') void command('reveal'); if (stage === 'SCOREBOARD') void command('scoreboard'); },
  };
}
const GameContext = createContext<ReturnType<typeof useGameState> | null>(null);
export function GameProvider({ children }: { children: React.ReactNode }) {
  const value = useGameState();
  return <GameContext.Provider value={value}>{(value.connection !== 'Terhubung' || value.error) && <div role="status" className="fixed bottom-0 inset-x-0 z-50 bg-[#272A31] p-3 text-center text-sm text-[#FFC880]">{value.error || value.connection}</div>}{children}</GameContext.Provider>;
}
export function useGame() { const value = useContext(GameContext); if (!value) throw new Error('GameProvider is required'); return value; }
