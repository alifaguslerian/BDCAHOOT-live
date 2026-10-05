"""Production browser recovery and protocol-delay checks; isolated temporary SQLite."""
import asyncio
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time
import urllib.request

sys.path.insert(0, os.path.abspath('reports/python'))
from playwright.async_api import async_playwright, expect

BASE = 'http://127.0.0.1:3133'
FIXTURE = r'''
const {io}=require('socket.io-client'); const {randomUUID}=require('crypto');
(async()=>{const sockets=[]; async function connect(){const s=io('http://127.0.0.1:3133',{transports:['websocket']});sockets.push(s);await new Promise(r=>s.once('connect',r));return s;}
async function req(s,e,p){const r=await s.timeout(5000).emitWithAck(e,p);if(!r.success)throw Error(r.error);return r.data;}
const h=await connect();const quiz={title:'Network audit',questions:[0,1,2].map(i=>({id:'q'+i,question:'AUDIT QUESTION '+i,options:['A','B','C','D'].map(id=>({id,text:id})),correctOption:'B',timerSeconds:15}))};
const host=await req(h,'room:create',{quiz,hostKey:'isolated-audit-key',requestId:randomUUID()});const p=await connect();const player=await req(p,'room:join',{code:host.code,name:'AUDIT',requestId:randomUUID()});console.log(JSON.stringify({host,player}));sockets.forEach(s=>s.disconnect());})().catch(e=>{console.error(e);process.exit(1)});
'''

async def check(ids):
    report = {'passed': False, 'scope': 'Chrome host/player; production server + temporary SQLite; WebSocket message-delay injection, not RF or TCP packet loss', 'checks': [], 'clockSamples': [], 'errors': []}
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel='chrome', headless=True)
        try:
            hc = await browser.new_context()
            pc = await browser.new_context(viewport={'width':390,'height':844})
            for role, context in [('host',hc),('player',pc)]:
                await context.add_init_script('sessionStorage.setItem("bdcahoot_session",'+json.dumps(json.dumps(ids[role]))+');')
            profile = {'up':200, 'down':20, 'jitter':0, 'late':False}
            clock_requests = {}
            routes = []
            answer_acks = []
            latest = {}
            async def route(ws):
                server = ws.connect_to_server()
                routes.append(ws)
                async def outgoing(message):
                    delay = 0
                    if isinstance(message,str):
                        match = re.match(r'^42(\d+)(\[.*)$',message)
                        if match:
                            event = json.loads(match[2])
                            if event[0]=='clock:ping':
                                clock_requests[match[1]]={'sent':event[1]['sentAt'], **profile}
                                delay=(profile['up']+profile['jitter'])/1000
                            if event[0]=='answer:submit':
                                delay=profile['up']/1000
                                if profile['late']:
                                    delay=max(0,(latest['questionEndsAtMs']+400-time.time()*1000)/1000)
                    await asyncio.sleep(delay)
                    server.send(message)
                async def incoming(message):
                    if isinstance(message,str):
                        state=re.match(r'^42\["room:state",(.*)\]$',message)
                        if state:latest.update(json.loads(state[1]))
                        match=re.match(r'^43(\d+)(\[.*)$',message)
                        if match:
                            data=json.loads(match[2])[0]
                            if match[1] in clock_requests and 'receivedAt' in data:
                                sample=clock_requests.pop(match[1]);await asyncio.sleep(sample['down']/1000)
                                received=time.time()*1000
                                report['clockSamples'].append({**sample,'rttMs':received-sample['sent'],'estimatedOffsetMs':data['receivedAt']-(sample['sent']+received)/2})
                            elif isinstance(data,dict) and ('success' in data):answer_acks.append(data)
                    ws.send(message)
                ws.on_message(lambda message: asyncio.create_task(outgoing(message)))
                server.on_message(lambda message: asyncio.create_task(incoming(message)))
            await pc.route_web_socket('**/socket.io/**',route)
            host=await hc.new_page();player=await pc.new_page()
            for page in [host,player]:page.on('pageerror',lambda e:report['errors'].append(str(e)))
            await host.goto(BASE+'/host/room/'+ids['host']['code'])
            await player.goto(BASE+'/player/room/'+ids['player']['code'])
            await host.locator('#btn-start-game').click()
            await expect(host.get_by_role('timer')).to_be_visible()
            await host.wait_for_timeout(1100)
            await host.reload()
            await expect(host.get_by_role('timer')).to_be_visible()
            assert int(await host.get_by_role('timer').inner_text())<5
            report['checks'].append('host refresh during countdown retains remaining time')
            await expect(player.locator('#btn-player-opt-B')).to_be_enabled(timeout=10000)
            deadline=latest['questionEndsAtMs']
            await host.reload()
            await expect(host.get_by_text('AUDIT QUESTION 0',exact=True)).to_be_visible()
            assert latest['questionEndsAtMs']==deadline
            await player.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
            await player.wait_for_timeout(700)
            await player.locator('#btn-player-opt-B').click()
            await expect(player.get_by_text('Jawaban Tersimpan',exact=True)).to_be_visible()
            await player.reload()
            await expect(player.get_by_text('Jawaban Tersimpan',exact=True)).to_be_visible()
            report['checks'].append('host refresh preserves question; player refresh preserves confirmed answer')
            await host.get_by_role('button',name='Buka Jawaban',exact=True).click()
            await host.get_by_role('button',name='Klasemen',exact=True).click()
            await host.locator('#btn-scoreboard-continue').click()
            await expect(player.locator('#btn-player-opt-B')).to_be_enabled()
            profile.update(up=20,down=200)
            await pc.set_offline(True)
            for ws in routes:await ws.close()
            await player.wait_for_timeout(500)
            await pc.set_offline(False)
            await expect(player.locator('#btn-player-opt-B')).to_be_enabled(timeout=15000)
            await player.wait_for_timeout(1000)
            for jitter in [0,40,100,20]:
                profile['jitter']=jitter
                await player.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
                await player.wait_for_timeout(700)
            await player.locator('#btn-player-opt-B').click()
            await expect(player.get_by_text('Jawaban Tersimpan',exact=True)).to_be_visible()
            assert await player.evaluate('JSON.parse(sessionStorage.getItem("bdcahoot_session")).playerId')==ids['player']['playerId']
            report['checks'].append('offline/reconnect retains identity and accepts answer under asymmetric delay + jitter')
            await host.get_by_role('button',name='Buka Jawaban',exact=True).click()
            await host.get_by_role('button',name='Klasemen',exact=True).click()
            await host.locator('#btn-scoreboard-continue').click()
            await expect(player.locator('#btn-player-opt-B')).to_be_enabled()
            profile['late']=True
            answer_acks.clear()
            await player.locator('#btn-player-opt-B').click()
            await player.wait_for_timeout(16500)
            assert any(a.get('success') is False and 'Waktu menjawab' in a.get('error','') for a in answer_acks),answer_acks
            assert latest.get('ownReceipt') is None
            report['checks'].append('answer held until deadline +400ms rejected, no answer receipt')
            assert len(report['clockSamples'])>=4,report['clockSamples']
            assert not report['errors'],report['errors']
            report['passed']=True
        except Exception as e:
            report['error']=str(e)
            raise
        finally:
            await browser.close()
            Path('reports/audit-browser-network.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report,indent=2))

with tempfile.TemporaryDirectory(prefix='bdc-network-') as directory:
    with open(Path(directory)/'server.log','w') as log:
        server=subprocess.Popen(['node','--import','tsx','server/index.ts'],env=dict(os.environ,PORT='3133',HOST_KEY='isolated-audit-key',DATABASE_PATH=str(Path(directory)/'game.sqlite'),NODE_ENV='production'),stdout=log,stderr=log,creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
        try:
            for _ in range(60):
                if server.poll() is not None:raise RuntimeError('Test server stopped')
                try:urllib.request.urlopen(BASE,timeout=1).close();break
                except OSError:time.sleep(.5)
            ids=json.loads(subprocess.check_output(['node','-e',FIXTURE],text=True,timeout=20))
            asyncio.run(check(ids))
        finally:
            server.terminate()
            try:server.wait(timeout=15)
            except subprocess.TimeoutExpired:server.kill();server.wait()
