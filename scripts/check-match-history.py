"""Exercise history and CSV downloads in production Chrome with disposable SQLite data."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import urllib.request

sys.path.insert(0, os.path.abspath('reports/python'))
from playwright.sync_api import sync_playwright, expect

PORT = 3142
BASE = f'http://127.0.0.1:{PORT}'
KEY = 'history-browser-test-only'
SEED = r'''
const {GameEngine}=require('./server/gameEngine.ts');
const {SnapshotStore}=require('./server/persistence.ts');
const {serialize}=require('node:v8'); const {randomUUID}=require('node:crypto');
(async()=>{
 const store=await SnapshotStore.open(process.env.DATABASE_PATH);
 try {
  let now=Date.now()-3600000; const results=[];
  const engine=new GameEngine({now:()=>now,onComplete:r=>results.push(r)});
  const quiz={id:'history-browser-quiz',title:'Kuis BDCA: hasil pertandingan untuk dokumentasi acara dan seluruh peserta',createdAt:1,updatedAt:0,
   questions:[{id:'q',question:'Pilih B',timerSeconds:5,correctOption:'B',options:['A','B','C','D'].map(id=>({id,text:id}))}]};
  await store.library({action:'save',quiz});
  let host;
  for(let i=0;i<21;i++) {
   host=engine.createRoom(quiz,{customRoomCode:'BDCHIS'});
   const players=['ANA','BOB','CARA'].map(name=>engine.join(host.code,name,randomUUID()));
   const cmd=action=>engine.command(host,{sessionId:host.sessionId,revision:engine.view(host).revision,action});
   cmd('start'); now+=5000; engine.tick();
   engine.submit(players[0],{sessionId:host.sessionId,questionIndex:0,option:'B',submissionId:randomUUID()});
   engine.submit(players[1],{sessionId:host.sessionId,questionIndex:0,option:'C',submissionId:randomUUID()});
   cmd('reveal'); cmd('finish'); if(i<20)cmd('reset'); now+=1000;
  }
  await store.save(serialize({version:1,rooms:engine.snapshot(),creations:new Map()}),results);
  console.log(JSON.stringify({host,latest:results.at(-1).id}));
 } finally {await store.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
'''


def stop(server):
    if server and server.poll() is None:
        server.terminate()
        try:
            server.wait(timeout=10)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait(timeout=5)


def start(database, log):
    env = dict(os.environ, NODE_ENV='production', HOST_KEY=KEY, PORT=str(PORT), DATABASE_PATH=database)
    server = subprocess.Popen(['node', '--import', 'tsx', 'server/index.ts'], env=env,
                              stdout=log, stderr=log, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    try:
        for _ in range(80):
            if server.poll() is not None:
                raise RuntimeError('Test server stopped; see reports/match-history-browser.log')
            try:
                urllib.request.urlopen(BASE, timeout=1).close()
                return server
            except OSError:
                time.sleep(0.25)
        raise RuntimeError('Test server did not start')
    except BaseException:
        stop(server)
        raise


def login(page):
    page.goto(BASE + '/host/library', wait_until='networkidle')
    page.get_by_label('Kode operator', exact=True).fill(KEY)
    page.get_by_role('button', name='Buka koleksi kuis', exact=True).click()
    expect(page.get_by_role('heading', name='Koleksi Kuis Arena')).to_be_visible()


def download(page):
    with page.expect_download() as event:
        page.get_by_role('button', name='Download Hasil', exact=True).click()
    data = Path(event.value.path()).read_bytes()
    assert data.startswith(b'\xef\xbb\xbf')
    text = data.decode('utf-8-sig')
    assert '"1","ANA","2000","1","0","0"' in text
    assert '"2","BOB","0","0","1","0"' in text
    assert '"3","CARA","0","0","0","1"' in text
    return data


Path('reports').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='bdc-history-browser-') as directory, open('reports/match-history-browser.log', 'w') as log:
    database = str(Path(directory) / 'game.sqlite')
    seed = subprocess.run(['node', '--import', 'tsx', '-e', SEED], env=dict(os.environ, DATABASE_PATH=database),
                          capture_output=True, text=True, check=True, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    fixture = json.loads(seed.stdout)
    server = start(database, log)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel='chrome', headless=True)
            context = browser.new_context(viewport={'width': 1366, 'height': 900}, accept_downloads=True)
            errors = []
            context.on('page', lambda page: page.on('pageerror', lambda error: errors.append(str(error))))
            page = context.new_page()
            login(page)
            page.get_by_role('link', name='Riwayat Pertandingan', exact=True).click(timeout=5000)
            expect(page.get_by_role('heading', name='Riwayat Pertandingan', exact=True)).to_be_visible()
            rows = page.locator('[data-match-id]')
            expect(rows).to_have_count(20)
            page.get_by_role('button', name='Berikutnya', exact=True).click()
            expect(rows).to_have_count(1)
            page.get_by_role('button', name='Sebelumnya', exact=True).click()
            expect(rows).to_have_count(20)
            page.goto(BASE + '/host/history/00000000-0000-0000-0000-000000000000', wait_until='networkidle')
            expect(page.get_by_text('Arsip pertandingan tidak ditemukan di server ini.', exact=True)).to_be_visible()
            page.goto(BASE + '/host/history', wait_until='networkidle')
            page.locator(f'[data-match-id="{fixture["latest"]}"]').click()
            expect(page.get_by_role('heading', name='Hasil Pertandingan', exact=True)).to_be_visible()
            expect(page.locator('tbody tr')).to_have_count(3)
            detail_url = page.url
            detail_csv = download(page)
            page.reload(wait_until='networkidle')
            assert download(page) == detail_csv
            page.screenshot(path='reports/history-detail-desktop.png', full_page=True)
            page.set_viewport_size({'width': 390, 'height': 844})
            page.screenshot(path='reports/history-detail-mobile.png', full_page=True)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.goto(BASE + '/host/history', wait_until='networkidle')
            expect(rows).to_have_count(20)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.screenshot(path='reports/history-list-mobile.png', full_page=True)
            page.set_viewport_size({'width': 1366, 'height': 900})
            page.evaluate('(host)=>sessionStorage.setItem("bdcahoot_session", JSON.stringify(host))', fixture['host'])
            page.goto(BASE + '/host/room/' + fixture['host']['code'], wait_until='networkidle')
            expect(page.get_by_role('button', name='Download Hasil', exact=True)).to_have_count(0)
            expect(page.get_by_role('button', name='Download Hasil', exact=True)).to_be_visible(timeout=15000)
            context.set_offline(True)
            expect(page.locator('[role="status"]')).to_be_visible(timeout=10000)
            page.get_by_role('button', name='Download Hasil', exact=True).click()
            expect(page.locator('p[role="alert"]')).to_contain_text('terhubung', timeout=10000)
            context.set_offline(False)
            expect(page.locator('[role="status"]')).to_have_count(0, timeout=15000)
            assert download(page) == detail_csv
            page.locator('#btn-return-library').click()
            expect(page.get_by_role('heading', name='Koleksi Kuis Arena')).to_be_visible()
            page.locator('#btn-delete-quiz-history-browser-quiz').click()
            page.locator('#confirm-delete-btn').click()
            expect(page.locator('#quiz-card-history-browser-quiz')).to_have_count(0)
            page.goto(detail_url, wait_until='networkidle')
            assert download(page) == detail_csv
            context.close()
            stop(server)
            server = start(database, log)
            fresh = browser.new_context(viewport={'width': 390, 'height': 844}, accept_downloads=True)
            fresh.on('page', lambda page: page.on('pageerror', lambda error: errors.append(str(error))))
            restored = fresh.new_page()
            login(restored)
            restored.goto(detail_url, wait_until='networkidle')
            assert download(restored) == detail_csv
            fresh.close()
            browser.close()
            assert not errors, errors
            report = {'pagination': True, 'notFound': True, 'allRankings': True, 'csvMatchesPodiumAndHistory': True, 'offlineDownloadRetry': True,
                      'refresh': True, 'mobileLayout': True, 'closeRoomAndDeleteQuiz': True,
                      'restartAndFreshBrowser': True, 'pageErrors': errors}
            Path('reports/match-history-browser.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
            print(json.dumps(report))
    finally:
        stop(server)
