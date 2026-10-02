import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { calculateQuestionPoints, calculateRankings } from '../lib/scoring';
import { fitsQuizPayload } from '../lib/quizLimits';
import type { GameRoomSettings, GameStage, Player, ScoreboardRankItem } from '../types/game';
import type { QuizQuestion, OptionId } from '../types/quiz';
import type { AnswerReceipt, HostCommand, RoomView, SessionCredentials, SubmitRequest } from '../types/network';

const OPTIONS = ['A', 'B', 'C', 'D'];
const TTL = 6 * 60 * 60 * 1000;
type Identity = { role: 'host' | 'player'; playerId?: string };
type Room = {
  code: string; sessionId: string; title: string; questions: QuizQuestion[];
  settings: GameRoomSettings; revision: number; stage: GameStage; index: number;
  start: number | null; end: number | null; revealEnd: number | null;
  players: Record<string, Player>; tokens: Map<string, Identity>;
  joins: Map<string, { name: string; credentials: SessionCredentials }>;
  receipts: Map<string, AnswerReceipt>; sequence: number; touched: number;
  rankings: ScoreboardRankItem[];
};
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Data tidak valid.');
  return value as Record<string, unknown>;
}
function string(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('Teks tidak valid atau terlalu panjang.');
  return value.trim();
}
function identifier(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(value)) throw new Error('ID permintaan tidak valid.');
  return value;
}
function parseQuiz(value: unknown): {title: string; questions: QuizQuestion[]} {
  const q=object(value);
  const title=string(q.title,200);
  if (!Array.isArray(q.questions) || q.questions.length<1 || q.questions.length>200) throw new Error('Kuis harus memiliki 1 sampai 200 soal.');
  const ids=new Set<string>();
  const questions=q.questions.map(item => {
    const row=object(item); const id=string(row.id,100);
    if (ids.has(id)) throw new Error('ID soal harus unik.'); ids.add(id);
    if (!Number.isInteger(row.timerSeconds) || (row.timerSeconds as number)<5 || (row.timerSeconds as number)>120) throw new Error('Timer harus 5 sampai 120 detik.');
    if (!OPTIONS.includes(row.correctOption as string) || !Array.isArray(row.options) || row.options.length!==4) throw new Error('Pilihan jawaban tidak valid.');
    const options=row.options.map((item,index) => {
      const option=object(item);
      if (option.id!==OPTIONS[index]) throw new Error('Pilihan harus berurutan A, B, C, D.');
      return {id: option.id as OptionId, text: string(option.text,1000)};
    }) as QuizQuestion['options'];
    return {id, question:string(row.question,4000), options, correctOption:row.correctOption as OptionId, timerSeconds:row.timerSeconds as number};
  });
  return {title,questions};
}

export class GameEngine {
  private rooms = new Map<string, Room>();
  private now: () => number;
  private onChange?: (code: string) => void;
  private onAnswer?: (code: string) => void;
  private maxPlayers: number;

  constructor(options: {now?: () => number; onChange?: (code: string) => void; onAnswer?: (code: string) => void; maxPlayers?: number} = {}) {
    const epoch=Date.now(), anchor=performance.now();
    this.now=options.now ?? (() => epoch+performance.now()-anchor);
    this.onChange=options.onChange; this.onAnswer=options.onAnswer;
    this.maxPlayers=options.maxPlayers ?? 150;
    if (!Number.isInteger(this.maxPlayers) || this.maxPlayers<1 || this.maxPlayers>150) throw new Error('Batas pemain harus 1 sampai 150.');
  }

  createRoom(quiz: unknown, settings?: unknown): SessionCredentials {
    if (!fitsQuizPayload(quiz, settings)) throw new Error('Kuis terlalu besar. Kurangi teks hingga maksimal 200 KiB.');
    this.tick();
    if (this.rooms.size>=100) throw new Error('Server penuh. Tutup ruang lama terlebih dahulu.');
    const parsed=parseQuiz(quiz), raw=settings===undefined ? {} : object(settings);
    if (Object.keys(raw).some(key=>!['shuffleQuestions','revealDurationMs','customRoomCode'].includes(key))) throw new Error('Pengaturan tidak dikenal.');
    if (raw.shuffleQuestions!==undefined && typeof raw.shuffleQuestions!=='boolean') throw new Error('Pengaturan acak tidak valid.');
    const duration=raw.revealDurationMs ?? 4000;
    if (!Number.isInteger(duration) || (duration as number)<3000 || (duration as number)>5000) throw new Error('Durasi pembahasan harus 3000 sampai 5000 ms.');
    let code: string;
    if (raw.customRoomCode!==undefined) {
      code=string(raw.customRoomCode,6).toUpperCase();
      if (!/^[A-Z0-9]{6}$/.test(code) || this.rooms.has(code)) throw new Error('Kode ruang tidak tersedia.');
    } else {
      do { code=randomBytes(4).toString('hex').slice(0,6).toUpperCase(); } while(this.rooms.has(code));
    }
    if(raw.shuffleQuestions) {
      for(let i=parsed.questions.length-1;i>0;i--) { const j=randomInt(i+1); [parsed.questions[i],parsed.questions[j]]=[parsed.questions[j],parsed.questions[i]]; }
    }
    const room: Room={code, sessionId:randomUUID(), title:parsed.title, questions:parsed.questions,
      settings:{shuffleQuestions:raw.shuffleQuestions===true,revealDurationMs:duration as number}, revision:1,
      stage:'LOBBY', index:-1, start:null, end:null, revealEnd:null, players:{}, tokens:new Map(), joins:new Map(), receipts:new Map(), sequence:0, touched:this.now(), rankings:[]};
    this.rooms.set(code,room);
    const credentials=this.credentials(room,{role:'host'});
    this.onChange?.(code);
    return credentials;
  }

  private credentials(room: Room, identity: Identity): SessionCredentials {
    const token=randomBytes(32).toString('hex'); room.tokens.set(token,identity);
    return {code:room.code,sessionId:room.sessionId,token,...identity};
  }
  private room(code: unknown): Room {
    if(typeof code!=='string') throw new Error('Kode ruang tidak valid.');
    const room=this.rooms.get(code.trim().toUpperCase());
    if(!room || this.now()-room.touched>TTL) {
      if(room) {this.rooms.delete(room.code); this.onChange?.(room.code);}
      throw new Error('Ruang tidak ditemukan atau sudah kedaluwarsa.');
    }
    return room;
  }
  private authenticate(credentials: SessionCredentials): {room: Room; identity: Identity} {
    const input=object(credentials), room=this.room(input.code);
    const identity=typeof input.token==='string' ? room.tokens.get(input.token) : undefined;
    if(!identity || input.sessionId!==room.sessionId) throw new Error('Sesi tidak valid. Silakan bergabung kembali.');
    room.touched=this.now();
    return {room,identity};
  }
  inspect(code: string): {code: string; stage: GameStage} { const room=this.room(code); return {code:room.code,stage:room.stage}; }
  join(code: string, name: string, requestId: string): SessionCredentials {
    const room=this.room(code); identifier(requestId);
    const normalized=string(name,15).toUpperCase();
    if(!/^[A-Z]{1,15}$/.test(normalized)) throw new Error('Nama harus 1 sampai 15 huruf A-Z.');
    const retry=room.joins.get(requestId);
    if(retry) {
      if(retry.name!==normalized || !room.tokens.has(retry.credentials.token)) throw new Error('Permintaan bergabung sudah digunakan.');
      room.touched=this.now(); return {...retry.credentials};
    }
    if(room.stage!=='LOBBY') throw new Error('Permainan sudah dimulai.');
    if(Object.values(room.players).some(player => player.name === normalized)) throw new Error('Nama sudah digunakan di room ini.');
    if(Object.keys(room.players).length>=this.maxPlayers || room.joins.size>=1000) throw new Error('Ruang sudah penuh.');
    const id=randomUUID();
    room.players[id]={id,name:normalized,joinedAt:this.now(),joinSequence:++room.sequence,connected:true,score:0,totalResponseTimeMs:0,answers:{}};
    const credentials=this.credentials(room,{role:'player',playerId:id});
    room.joins.set(requestId,{name:normalized,credentials});
    room.rankings=calculateRankings(room.players); this.changed(room);
    return {...credentials};
  }
  resume(credentials: SessionCredentials): SessionCredentials {
    const {room,identity}=this.authenticate(credentials);
    return {code:room.code,sessionId:room.sessionId,token:credentials.token,...identity};
  }
  leave(credentials: SessionCredentials): void {
    const {room,identity} = this.authenticate(credentials);
    if (identity.role !== 'player' || !identity.playerId) throw new Error('Host harus menutup room melalui kontrol Host.');
    if (room.stage !== 'LOBBY' && room.stage !== 'FINAL') throw new Error('Permainan sedang berlangsung. Sesi tetap disimpan untuk reconnect.');
    for (const [token, value] of room.tokens) if (value.playerId === identity.playerId) room.tokens.delete(token);
    if (room.stage === 'LOBBY') {
      delete room.players[identity.playerId];
      room.rankings = calculateRankings(room.players);
    }
    this.changed(room);
  }
  view(credentials: SessionCredentials): RoomView {
    const {room,identity}=this.authenticate(credentials);
    const current=room.questions[room.index];
    const closed=room.stage!=='QUESTION';
    const players: Record<string,Player>={};
    for(const player of Object.values(room.players)) {
      const answer=player.answers[room.index];
      players[player.id]={...player,score:player.score-(!closed ? answer?.pointsEarned ?? 0 : 0),
        totalResponseTimeMs:player.totalResponseTimeMs-(!closed ? answer?.responseDurationMs ?? 0 : 0),answers:{}};
      if(identity.playerId===player.id) {
        for(const [index,value] of Object.entries(player.answers)) if(closed || Number(index)!==room.index) players[player.id].answers[Number(index)]={...value};
      }
    }
    const distribution={A:0,B:0,C:0,D:0}; let answeredCount=0;
    for(const player of Object.values(room.players)) {const answer=player.answers[room.index]; if(answer) {answeredCount++; if(closed) distribution[answer.selectedOption]++;}}
    let question: RoomView['currentQuestion']=null;
    if(current) {
      question={id:current.id,question:current.question,timerSeconds:current.timerSeconds,options:current.options.map(o=>({...o})) as QuizQuestion['options']};
      if(closed) question.correctOption=current.correctOption;
    }
    return {code:room.code,sessionId:room.sessionId,revision:room.revision,quizTitle:room.title,stage:room.stage,currentQuestionIndex:room.index,
      totalQuestions:room.questions.length,currentQuestion:question,settings:{...room.settings},questionStartedAtMs:room.start,questionEndsAtMs:room.end,revealEndsAtMs:room.revealEnd,
      players,rankings:room.rankings.map(r=>({...r})),distribution,answeredCount,
      ownReceipt: identity.playerId && room.receipts.has(identity.playerId+':'+room.index) ? {...room.receipts.get(identity.playerId+':'+room.index)!} : null};
  }
  submit(credentials: SessionCredentials, request: SubmitRequest): AnswerReceipt {
    const {room,identity}=this.authenticate(credentials); object(request);
    if(identity.role!=='player' || !identity.playerId) throw new Error('Hanya pemain dapat menjawab.');
    identifier(request.submissionId);
    if(request.sessionId!==room.sessionId || !Number.isInteger(request.questionIndex) || request.questionIndex<0 || request.questionIndex>=room.questions.length || !OPTIONS.includes(request.option)) throw new Error('Jawaban tidak valid.');
    const key=identity.playerId+':'+request.questionIndex;
    const existing=room.receipts.get(key);
    if(existing) {
      if(existing.submissionId!==request.submissionId || existing.selectedOption!==request.option) throw new Error('Jawaban pertama sudah terkunci.');
      return {...existing};
    }
    if(room.stage!=='QUESTION' || room.index!==request.questionIndex || this.now()>room.end!+200) throw new Error('Waktu menjawab sudah berakhir atau soal tidak aktif.');
    const question=room.questions[room.index], player=room.players[identity.playerId];
    const received=this.now(), duration=Math.max(0,Math.min(received-room.start!,question.timerSeconds*1000));
    const correct=request.option===question.correctOption;
    const score=calculateQuestionPoints(correct,duration,question.timerSeconds);
    player.answers[room.index]={questionIndex:room.index,selectedOption:request.option,serverReceivedAtMs:received,responseDurationMs:duration,isCorrect:correct,speedBonus:score.speedBonus,pointsEarned:score.points};
    player.score+=score.points; player.totalResponseTimeMs+=duration;
    const receipt: AnswerReceipt={sessionId:room.sessionId,questionIndex:room.index,submissionId:request.submissionId,selectedOption:request.option};
    room.receipts.set(key,receipt); this.onAnswer?.(room.code);
    return {...receipt};
  }
  private changed(room: Room): void { room.revision++; room.touched=this.now(); this.onChange?.(room.code); }
  private reveal(room: Room, at: number): void {
    for(const player of Object.values(room.players)) if(!player.answers[room.index]) player.totalResponseTimeMs+=room.questions[room.index].timerSeconds*1000;
    const previous=Object.fromEntries(room.rankings.map(r=>[r.playerId,r.rank]));
    room.rankings=calculateRankings(room.players,previous);
    room.stage='REVEAL'; room.revealEnd=at+room.settings.revealDurationMs; this.changed(room);
  }
  private openQuestion(room: Room): void {
    room.index++; room.stage='QUESTION'; room.start=this.now(); room.end=room.start+room.questions[room.index].timerSeconds*1000; room.revealEnd=null; this.changed(room);
  }
  command(credentials: SessionCredentials, request: HostCommand): SessionCredentials | undefined {
    const {room,identity}=this.authenticate(credentials); object(request);
    if(identity.role!=='host') throw new Error('Perintah hanya untuk host.');
    if(request.sessionId!==room.sessionId || request.revision!==room.revision) throw new Error('Status ruang berubah. Silakan coba lagi.');
    switch(request.action) {
      case 'reset': this.rooms.delete(room.code); this.onChange?.(room.code); return;
      case 'kick': {
        if(room.stage!=='LOBBY' || typeof request.playerId!=='string' || !room.players[request.playerId]) throw new Error('Pemain hanya dapat dikeluarkan dari lobi.');
        delete room.players[request.playerId];
        for(const [token,identity] of room.tokens) if(identity.playerId===request.playerId) room.tokens.delete(token);
        room.rankings=calculateRankings(room.players); this.changed(room); return;
      }
      case 'start': if(room.stage==='LOBBY' && Object.keys(room.players).length > 0) {this.openQuestion(room); return;} break;
      case 'next': if(room.stage==='SCOREBOARD') {
        if(room.index+1<room.questions.length) this.openQuestion(room); else {room.stage='FINAL'; this.changed(room);} return;
      } break;
      case 'reveal': if(room.stage==='QUESTION') {this.reveal(room,this.now()); return;} break;
      case 'scoreboard': if(room.stage==='REVEAL') {room.stage='SCOREBOARD';this.changed(room);return;} break;
      case 'finish':
        if(room.stage==='QUESTION') this.reveal(room,this.now());
        room.stage='FINAL';this.changed(room);return;
    }
    throw new Error('Perintah tidak sesuai tahap permainan.');
  }
  tick(): void {
    const now=this.now();
    for(const room of this.rooms.values()) {
      if(now-room.touched>TTL) {this.rooms.delete(room.code);this.onChange?.(room.code);continue;}
      if(room.stage==='QUESTION' && now>room.end!+200) this.reveal(room,room.end!+200);
      if(room.stage==='REVEAL' && now>=room.revealEnd!) {room.stage='SCOREBOARD';this.changed(room);}
    }
  }
  roomCodes(): string[] {return [...this.rooms.keys()];}
  serverTime(): number {return this.now();}
  snapshot(): Map<string, Room> { return structuredClone(this.rooms); }
  restore(snapshot: unknown): void {
    if (!(snapshot instanceof Map) || snapshot.size > 100) throw Error('Snapshot room tidak valid.');
    const rooms = structuredClone(snapshot) as Map<string, Room>;
    for (const [code, room] of rooms) {
      if (!/^[A-Z0-9]{6}$/.test(code) || code !== room.code || typeof room.sessionId !== 'string'
        || !Number.isFinite(room.touched) || !Number.isInteger(room.revision)
        || !['LOBBY', 'QUESTION', 'REVEAL', 'SCOREBOARD', 'FINAL'].includes(room.stage)
        || !(room.tokens instanceof Map) || !(room.receipts instanceof Map) || !(room.joins instanceof Map)
        || !room.players || Object.keys(room.players).length > 150 || !Array.isArray(room.rankings)) throw Error('Snapshot room tidak valid.');
      parseQuiz({ title: room.title, questions: room.questions });
      if (!Number.isInteger(room.index) || room.index < -1 || room.index >= room.questions.length
        || (!['LOBBY', 'FINAL'].includes(room.stage) && room.index < 0)) throw Error('Posisi soal snapshot tidak valid.');
      if (this.now() - room.touched > TTL) { rooms.delete(code); continue; }
      if (room.stage === 'QUESTION') this.reveal(room, this.now());
      if (room.stage === 'REVEAL') { room.stage = 'SCOREBOARD'; this.changed(room); }
    }
    this.rooms = rooms;
  }
  close(): void {this.rooms.clear();}
}
