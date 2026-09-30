import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { GameEngine } from '../server/gameEngine';
import { fitsQuizPayload, MAX_QUIZ_BYTES } from '../lib/quizLimits';
import type { SessionCredentials, HostCommand } from '../types/network';

const quiz = (count = 2) => ({ id: 'quiz', title: 'Test', createdAt: 0, updatedAt: 0, questions: Array.from({length: count}, (_, i) => ({id: `q${i}`, question: `Question ${i}`, options: ['A','B','C','D'].map(id => ({id, text: id})), correctOption: 'A', timerSeconds: 5})) });
test('aggregate quiz limit counts UTF-8 bytes and rejects before allocating a room', () => {
  assert.equal(fitsQuizPayload('a'.repeat(MAX_QUIZ_BYTES)), false);
  assert.equal(fitsQuizPayload('字'.repeat(Math.floor(MAX_QUIZ_BYTES / 2))), false);
  assert.equal(fitsQuizPayload(quiz(40)), true);
  const large = quiz(100);
  for (const question of large.questions) question.question = '字'.repeat(1000);
  const engine = new GameEngine();
  assert.throws(() => engine.createRoom(large), /terlalu besar/);
  assert.deepEqual(engine.roomCodes(), []);
});
function setup(count = 2) {
  let time = 10000;
  const engine = new GameEngine({now: () => time});
  const host = engine.createRoom(quiz(count));
  const join = (name = 'ANA') => engine.join(host.code, name, randomUUID());
  const command = (action: HostCommand['action'], playerId?: string) => engine.command(host, {action, playerId, sessionId: host.sessionId, revision: engine.view(host).revision});
  const submit = (player: SessionCredentials, questionIndex = 0) => engine.submit(player, {sessionId: host.sessionId, questionIndex, option: 'A', submissionId: randomUUID()});
  return {engine, host, join, command, submit, advance: (ms: number) => {time += ms; engine.tick();}};
}

test('server identity, private snapshots and idempotent answers', () => {
  const s = setup(); const a = s.join(); const b = s.join('BOB'); s.command('start');
  const request = {sessionId: s.host.sessionId, questionIndex: 0, option: 'A' as const, submissionId: randomUUID()};
  const receipt = s.engine.submit(a, request);
  assert.deepEqual(s.engine.submit(a, request), receipt);
  assert.throws(() => s.engine.submit(a, {...request, option:'B'}));
  assert.throws(() => s.submit(b, 1));
  assert.throws(() => s.engine.submit(b, {...request, sessionId:randomUUID()}));
  assert.throws(() => s.engine.command({...a, role:'host'}, {action:'finish', sessionId:a.sessionId, revision:s.engine.view(a).revision}));
  assert.equal(s.engine.resume({...a, role:'host', playerId:b.playerId}).playerId, a.playerId);
  const hidden = s.engine.view(a);
  assert.equal(hidden.currentQuestion?.correctOption, undefined);
  assert.equal(hidden.players[a.playerId!].score, 0);
  assert.deepEqual(hidden.players[a.playerId!].answers, {});
  assert.deepEqual(hidden.distribution, {A:0,B:0,C:0,D:0});
  assert.equal(JSON.stringify(hidden).includes('Question 1'), false);
  s.advance(5201);
  assert.equal(s.engine.view(a).stage, 'REVEAL');
  assert.equal(s.engine.view(a).currentQuestion?.correctOption, 'A');
  assert.equal(s.engine.view(a).players[a.playerId!].answers[0].pointsEarned, 2000);
  assert.deepEqual(s.engine.view(b).players[a.playerId!].answers, {});
  assert.deepEqual(s.engine.submit(a, request), receipt);
  s.advance(5000); assert.equal(s.engine.view(a).stage, 'SCOREBOARD');
  s.command('next'); assert.throws(() => s.submit(b, 0));
});

test('deadline grace boundary and automatic transitions use fake clock', () => {
  const s = setup(); const a=s.join(); s.command('start'); s.advance(5200);
  assert.equal(s.engine.view(a).stage,'QUESTION'); s.submit(a);
  s.advance(1); assert.equal(s.engine.view(a).stage,'REVEAL');
  const t=setup(); const b=t.join(); t.command('start'); t.advance(5201); assert.throws(() => t.submit(b));
});

test('join retry, validation, kick, stale command, reset and expiry', () => {
  const s=setup(); const id=randomUUID(); const p=s.engine.join(s.host.code,'ANA',id);
  assert.deepEqual(s.engine.join(s.host.code,'ANA',id),p);
  assert.throws(()=>s.engine.join(s.host.code,'BOB',id));
  assert.throws(()=>s.engine.join(s.host.code,'A1',randomUUID()));
  assert.throws(()=>s.engine.join(s.host.code,'BOB','short'));
  assert.throws(()=>s.engine.createRoom({...quiz(), questions: []}));
  assert.throws(()=>s.engine.createRoom(quiz(),{customRoomCode:s.host.code}));
  assert.throws(()=>s.engine.command(s.host,{action:'start',sessionId:s.host.sessionId,revision:0}));
  s.command('kick',p.playerId); assert.throws(()=>s.engine.resume(p));
  assert.throws(()=>s.engine.join(s.host.code,'ANA',id));
  s.command('reset'); assert.throws(()=>s.engine.resume(s.host));
  const t=setup(); t.advance(6*60*60*1000+1); assert.deepEqual(t.engine.roomCodes(),[]);
});

test('100 players complete 40 questions with stable order and exact scoring', () => {
  const s=setup(40);
  const players=Array.from({length:100},(_,i)=>s.join('P'+String.fromCharCode(65+Math.floor(i/26),65+i%26)));
  s.command('start');
  for(let q=0;q<40;q++) {
    for(const p of players) s.submit(p,q);
    s.advance(5201); s.advance(5000);
    const view=s.engine.view(s.host);
    assert.equal(view.rankings[0].playerId,players[0].playerId);
    assert.equal(view.rankings[99].score,(q+1)*2000);
    s.command('next');
  }
  assert.equal(s.engine.view(s.host).stage,'FINAL');
  assert.equal(s.engine.view(s.host).currentQuestionIndex,39);
  s.engine.close(); assert.deepEqual(s.engine.roomCodes(),[]);
});

test('runtime validation rejects malformed quizzes and settings before room creation', () => {
  const engine=new GameEngine();
  const invalid: unknown[]=[null,[],{}, {...quiz(),title:'x'.repeat(201)}, {...quiz(),questions:Array(201).fill(quiz().questions[0])}];
  for(const timerSeconds of [0,4,121,5.5,'5',NaN]) invalid.push({...quiz(),questions:[{...quiz().questions[0],timerSeconds}]});
  invalid.push({...quiz(),questions:[{...quiz().questions[0],options:[{id:'A',text:'x'},{id:'A',text:'x'},{id:'C',text:'x'},{id:'D',text:'x'}]}]});
  for(const value of invalid) {assert.throws(()=>engine.createRoom(value));assert.equal(engine.roomCodes().length,0);}
  for(const settings of [null,[],{unknown:true},{shuffleQuestions:1},{revealDurationMs:2999},{customRoomCode:'ABCDE'},{customRoomCode:'ABCDEFG'}]) {
    assert.throws(()=>engine.createRoom(quiz(),settings)); assert.equal(engine.roomCodes().length,0);
  }
  const host=engine.createRoom(quiz(),{customRoomCode:'ABC123'});assert.equal(host.code,'ABC123');
});

test('rejected answers and stale commands do not mutate game state', () => {
  const s=setup(); const a=s.join(); s.command('start'); const before=s.engine.view(s.host);
  const request={sessionId:s.host.sessionId,questionIndex:0,submissionId:randomUUID(),option:'A' as const};
  for(const value of [null,{}, {...request,option:'E'}, {...request,questionIndex:0.1},{...request,questionIndex:-1},{...request,submissionId:'tiny'}, {...request,sessionId:'foreign'}]) {
    assert.throws(()=>s.engine.submit(a,value as never));assert.deepEqual(s.engine.view(s.host),before);
  }
  assert.throws(()=>s.engine.submit(s.host,request));
  const other=setup();assert.throws(()=>s.engine.submit({...a,code:other.host.code},request));
  assert.throws(()=>s.engine.command(s.host,{action:'next',sessionId:s.host.sessionId,revision:before.revision-1}));
  assert.deepEqual(s.engine.view(s.host),before);
});

test('synchronous joins are unique, limited, and use join order for same-clock ties', () => {
  const engine=new GameEngine({now:()=>1000,maxPlayers:3});const host=engine.createRoom(quiz());
  const players=Array.from({length:3},(_,i)=>engine.join(host.code,String.fromCharCode(65+i),randomUUID()));
  assert.equal(new Set(players.map(p=>p.playerId)).size,3);
  assert.equal(new Set(players.map(p=>p.token)).size,3);
  assert.deepEqual(engine.view(host).rankings.map(r=>r.playerId),players.map(p=>p.playerId));
  assert.throws(()=>engine.join(host.code,'BOB',randomUUID()));
  assert.equal(Object.keys(engine.view(host).players).length,3);
  assert.throws(()=>new GameEngine({maxPlayers:151}));
});

test('server clock determines score and unanswered tie-break penalty', () => {
  const s=setup(1);const a=s.join();const b=s.join('BOB');s.command('start');
  s.advance(2500);
  s.engine.submit(a,{sessionId:s.host.sessionId,questionIndex:0,submissionId:randomUUID(),option:'A',clientTime:0} as never);
  s.advance(2701);
  const view=s.engine.view(a);
  assert.equal(view.players[a.playerId!].score,1135);
  assert.equal(view.players[a.playerId!].totalResponseTimeMs,2500);
  assert.equal(view.players[b.playerId!].totalResponseTimeMs,5000);
});

test('snapshots are copies and never disclose tokens or other players history', () => {
  const s=setup();const a=s.join();s.command('start');s.submit(a);
  const first=s.engine.view(a);first.currentQuestion!.options[0].text='tampered';first.players[a.playerId!].score=99999;first.settings.revealDurationMs=0;
  assert.equal(s.engine.view(a).currentQuestion!.options[0].text,'A');
  assert.equal(s.engine.view(a).players[a.playerId!].score,0);
  assert.equal(JSON.stringify(s.engine.view(a)).includes(a.token),false);
  s.advance(5201);const own=s.engine.view(a);own.players[a.playerId!].answers[0].pointsEarned=99;
  assert.equal(s.engine.view(a).players[a.playerId!].answers[0].pointsEarned,2000);
  assert.deepEqual(s.engine.view(s.host).players[a.playerId!].answers,{});
});

test('authenticated activity refreshes bounded room lifetime', () => {
  const s=setup();s.advance(5*60*60*1000);s.engine.resume(s.host);s.advance(5*60*60*1000);
  assert.equal(s.engine.roomCodes().length,1);
  s.advance(60*60*1000+1);assert.equal(s.engine.roomCodes().length,0);
});

test('lobby rejects duplicate names and cannot start without players', () => {
  const s=setup();assert.throws(()=>s.command('start'));s.join('ANA');
  assert.throws(()=>s.join('ana'));assert.equal(Object.keys(s.engine.view(s.host).players).length,1);
});
