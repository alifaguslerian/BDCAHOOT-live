"""Check the final-question handoff in Chrome with an isolated SQLite database."""
import asyncio
import json
import os
import re
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import urllib.request

sys.path.insert(0, os.path.abspath('reports/python'))
from playwright.async_api import Error as PlaywrightError, async_playwright, expect

BASE = 'http://127.0.0.1:3138'
FIXTURE = r'''
const {io}=require('socket.io-client'); const {randomUUID}=require('crypto');
(async()=>{
  const sockets=[];
  async function connect(){const s=io('http://127.0.0.1:3138',{transports:['websocket']});sockets.push(s);await new Promise(r=>s.once('connect',r));return s;}
  async function req(s,event,payload){const r=await s.timeout(5000).emitWithAck(event,payload);if(!r.success)throw Error(r.error);return r.data;}
  try {
    const rooms=[];
    for(const count of [1,2]){
      const h=await connect();
      const quiz={title:'Podium transition test',questions:Array.from({length:count},(_,i)=>({id:'q'+i,question:'Pertanyaan '+(i+1),options:['A','B','C','D'].map(id=>({id,text:'Pilihan '+id})),correctOption:'B',timerSeconds:5}))};
      const host=await req(h,'room:create',{quiz,hostKey:'podium-test-key',requestId:randomUUID()});
      const p=await connect();
      const player=await req(p,'room:join',{code:host.code,name:'PESERTAUJI',requestId:randomUUID()});
      if(count===2)for(const name of ['BOB','CARA']){const extra=await connect();await req(extra,'room:join',{code:host.code,name,requestId:randomUUID()});}
      rooms.push({count,host,player});
    }
    console.log(JSON.stringify(rooms));
  } finally {sockets.forEach(s=>s.disconnect());}
})().catch(e=>{console.error(e);process.exit(1)});
'''


async def check(rooms, faults=False):
    report = {'cases': [], 'pageErrors': [], 'faultInjection': faults, 'unreadPollingResponses': 0}
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel='chrome', headless=True)
        try:
            for room in rooms:
                pages = []
                states = {}
                contexts = []
                fault = {'mode': 'pass', 'commands': 0, 'droppedAcks': 0, 'held': [], 'hostRoutes': [], 'playerRoutes': []}
                dropped_ack_ids = set()

                async def route_host(ws):
                    server = ws.connect_to_server()
                    fault['hostRoutes'].append(ws)

                    def outgoing(message):
                        match = re.match(r'^42(\d+)(\[.*)$', message) if isinstance(message, str) else None
                        if match:
                            event = json.loads(match[2])
                            if event[0] == 'host:command' and event[1]['action'] == 'finish':
                                fault['commands'] += 1
                                if fault['mode'] == 'drop-request':
                                    return
                                if fault['mode'] == 'drop-ack':
                                    dropped_ack_ids.add(match[1])
                                if fault['mode'] == 'hold':
                                    fault['held'].append((server, message))
                                    return
                        server.send(message)

                    def incoming(message):
                        match = re.match(r'^43(\d+)(\[.*)$', message) if isinstance(message, str) else None
                        if match and match[1] in dropped_ack_ids:
                            dropped_ack_ids.remove(match[1])
                            fault['droppedAcks'] += 1
                            return
                        ws.send(message)

                    ws.on_message(outgoing)
                    server.on_message(incoming)

                async def route_player(ws):
                    ws.connect_to_server()
                    fault['playerRoutes'].append(ws)

                for role, width, height in [('host', 1366, 768), ('player', 390, 844)]:
                    context = await browser.new_context(viewport={'width': width, 'height': height})
                    contexts.append(context)
                    if faults:
                        await context.route_web_socket('**/socket.io/**', route_host if role == 'host' else route_player)
                    await context.add_init_script('sessionStorage.setItem("bdcahoot_session",'+json.dumps(json.dumps(room[role]))+');')
                    page = await context.new_page()
                    page.on('pageerror', lambda error: report['pageErrors'].append(str(error)))

                    def frame(payload, role=role):
                        if isinstance(payload, str) and payload.startswith('42'):
                            event = json.loads(payload[2:])
                            if event[0] == 'room:state':
                                states[role] = event[1]
                        match = re.match(r'^43\d+(\[.*)$', payload) if isinstance(payload, str) else None
                        if match:
                            reply = json.loads(match[1])[0]
                            data = reply.get('data') if isinstance(reply, dict) else None
                            if isinstance(data, dict) and 'stage' in data and data.get('sessionId') == room['host']['sessionId']:
                                states[role] = data

                    page.on('websocket', lambda socket, frame=frame: socket.on('framereceived', frame))

                    async def polling_response(response, frame=frame):
                        if '/socket.io/' not in response.url or 'transport=polling' not in response.url or response.request.method != 'GET':
                            return
                        try:
                            for packet in (await response.text()).split('\x1e'):
                                frame(packet)
                        except PlaywrightError:
                            # A deliberately interrupted request may have no readable body.
                            report['unreadPollingResponses'] += 1

                    page.on('response', polling_response)
                    await page.goto(f'{BASE}/{role}/room/{room["host"]["code"]}')
                    await page.wait_for_load_state('networkidle')
                    pages.append(page)
                host, player = pages
                await host.locator('#btn-start-game').click()
                for index in range(room['count']):
                    await expect(player.locator('#btn-player-opt-B')).to_be_enabled(timeout=12000)
                    await player.locator('#btn-player-opt-B').click()
                    await expect(player.get_by_text('Jawaban Tersimpan', exact=True)).to_be_visible()
                    await expect(host.get_by_text('Jawaban Benar:', exact=False)).to_be_visible(timeout=8000)
                    assert states['host']['stage'] == 'REVEAL'
                    await expect(host.locator('#btn-scoreboard-continue')).to_have_count(0)
                    # Let the real reveal timer expire; do not use the skip button.
                    await expect(host.locator('#btn-scoreboard-continue')).to_be_enabled(timeout=7000)
                    if index < room['count'] - 1:
                        await expect(host.get_by_text('TOP 10 PERINGKAT', exact=True)).to_be_visible()
                        await expect(player.get_by_text('KLASEMEN SEMENTARA', exact=True)).to_be_visible()
                        await host.locator('#btn-scoreboard-continue').click()

                await expect(host.get_by_text('TOP 10 PERINGKAT', exact=True)).to_have_count(0)
                await expect(host.get_by_text('KLASEMEN SEMENTARA', exact=True)).to_have_count(0)
                await expect(host.get_by_text('PESERTAUJI', exact=True)).to_have_count(0)
                await expect(player.get_by_text('KLASEMEN SEMENTARA', exact=True)).to_have_count(0)
                await expect(player.get_by_role('heading', name='Menunggu podium juara')).to_be_visible()
                await expect(player.locator('#btn-scoreboard-continue')).to_have_count(0)
                await expect(player.get_by_role('button', name='Keluar room')).to_be_visible()
                scores = [(r['playerId'], r['score'], r['rank']) for r in states['host']['rankings']]
                assert scores[0][1] > 0

                for page in pages:
                    await page.reload()
                    await page.wait_for_load_state('networkidle')
                button = host.get_by_role('button', name='Lihat Podium Juara', exact=True)
                await expect(button).to_be_enabled()
                await expect(player.get_by_role('heading', name='Menunggu podium juara')).to_be_visible()
                await host.wait_for_timeout(1200)
                await expect(host.locator('[data-podium-rank]')).to_have_count(0)
                measurements = []
                for width, height in [(1366, 768), (390, 844)]:
                    await host.set_viewport_size({'width': width, 'height': height})
                    bounds = await button.bounding_box()
                    main = await host.locator('main').bounding_box()
                    assert bounds and main
                    assert abs(bounds['x'] + bounds['width']/2 - width/2) < 2
                    assert abs(bounds['y'] + bounds['height']/2 - (main['y'] + main['height']/2)) < 48
                    assert not await host.evaluate('document.documentElement.scrollWidth > innerWidth')
                    await host.screenshot(path=f'reports/podium-ready-{width}.png', full_page=True)
                    measurements.append({'width': width, 'button': bounds})
                assert not await player.evaluate('document.documentElement.scrollWidth > innerWidth')
                await player.screenshot(path='reports/podium-waiting-player.png', full_page=True)
                await host.set_viewport_size({'width': 1366, 'height': 768})
                async def check_podium_order():
                    order = list(range(min(len(scores), 3), 0, -1))
                    for rank in order:
                        await expect(host.locator(f'[data-podium-rank="{rank}"]')).to_have_attribute('aria-hidden', 'false', timeout=7500)
                        if rank > 1:
                            await expect(host.locator(f'[data-podium-rank="{rank - 1}"]')).to_have_attribute('aria-hidden', 'true')
                    return order

                reveal_order = []
                if faults and room['count'] == 1:
                    fault['mode'] = 'drop-ack'
                elif faults:
                    await contexts[0].set_offline(True)
                    await fault['hostRoutes'][-1].close()
                    await expect(host.get_by_role('status')).to_contain_text('Koneksi terputus')
                    await button.click()
                    await expect(button).to_be_enabled()
                    await expect(player.get_by_role('heading', name='Menunggu podium juara')).to_be_visible()
                    await contexts[0].set_offline(False)
                    await expect(host.get_by_role('status')).to_have_count(0, timeout=15000)
                    fault['mode'] = 'drop-request'
                    await button.click()
                    await expect(host.get_by_role('status')).to_contain_text('Konfirmasi belum diterima', timeout=9000)
                    await expect(button).to_be_enabled()
                    assert fault['commands'] == 1
                    await expect(host.locator('[data-podium-rank]')).to_have_count(0)
                    fault['mode'] = 'hold'
                    await button.evaluate('(button) => { for (let i = 0; i < 25; i++) button.click(); }')
                    await expect(host.locator('#btn-scoreboard-continue')).to_be_disabled()
                    await host.wait_for_timeout(200)
                    assert fault['commands'] == 2 and len(fault['held']) == 1, fault['commands']
                    await contexts[1].set_offline(True)
                    await fault['playerRoutes'][-1].close()
                    server, message = fault['held'].pop()
                    server.send(message)
                    reveal_order = await check_podium_order()
                    await contexts[1].set_offline(False)
                    await expect(player.get_by_role('status')).to_have_count(0, timeout=15000)
                    assert await player.evaluate('JSON.parse(sessionStorage.getItem("bdcahoot_session")).playerId') == room['player']['playerId']
                if not faults or room['count'] == 1:
                    await button.focus()
                    await host.keyboard.press('Enter')
                    reveal_order = await check_podium_order()
                await expect(player.get_by_text('Menunggu podium juara', exact=True)).to_have_count(0)
                await expect(player.get_by_text('HASIL AKHIR TURNAMEN', exact=True)).to_be_visible(timeout=15000)
                deadline = time.monotonic() + 3
                while states['player']['stage'] != 'FINAL' and time.monotonic() < deadline:
                    await asyncio.sleep(.05)
                assert states['host']['stage'] == states['player']['stage'] == 'FINAL', {role: value['stage'] for role, value in states.items()}
                assert [(r['playerId'], r['score'], r['rank']) for r in states['host']['rankings']] == scores
                if faults and room['count'] == 1:
                    await host.wait_for_timeout(6500)
                    assert fault['droppedAcks'] == 1
                    await expect(host.get_by_role('status')).to_have_count(0)
                report['cases'].append({'questions': room['count'], 'passed': True, 'layout': measurements,
                    'finishCommands': fault['commands'], 'droppedFinishAcks': fault['droppedAcks'], 'podiumOrder': reveal_order})
                print(f"PASS: {room['count']} questions; podium order {reveal_order}; faults={faults}", flush=True)
                for context in contexts:
                    await context.close()
            assert not report['pageErrors'], report['pageErrors']
        except Exception as error:
            report['failure'] = str(error)
            raise
        finally:
            await browser.close()
            output = 'reports/podium-faults.json' if faults else 'reports/podium-transition.json'
            Path(output).write_text(json.dumps(report, indent=2), encoding='utf-8')
    return report


if __name__ == '__main__':
    Path('reports').mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='bdc-podium-') as directory:
        with open(Path(directory)/'server.log', 'w') as log:
            server = subprocess.Popen(['node', '--import', 'tsx', 'server/index.ts'],
                env=dict(os.environ, PORT='3138', HOST_KEY='podium-test-key', DATABASE_PATH=str(Path(directory)/'game.sqlite'), NODE_ENV='production'),
                stdout=log, stderr=log, creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
            try:
                for _ in range(100):
                    if server.poll() is not None:
                        raise RuntimeError(Path(directory, 'server.log').read_text())
                    try:
                        urllib.request.urlopen(BASE, timeout=1).close()
                        break
                    except OSError:
                        time.sleep(.3)
                rooms = json.loads(subprocess.check_output(['node', '-e', FIXTURE], text=True, timeout=20))
                faults = '--faults' in sys.argv[1:]
                report = asyncio.run(check(rooms, faults=faults))
                print(json.dumps(report, indent=2))
            finally:
                server.terminate()
                try:
                    server.wait(timeout=15)
                except subprocess.TimeoutExpired:
                    server.kill()
                    server.wait()
