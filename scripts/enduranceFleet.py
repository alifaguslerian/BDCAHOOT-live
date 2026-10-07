"""Full browser participants; run through scripts/endurance.ts --browser-players N."""
import asyncio
import json
import math
from pathlib import Path
import re
import sys
import time
import traceback
from playwright.async_api import async_playwright, expect

def emit(value):
    print(json.dumps(value), flush=True)

def stats(values):
    ordered = sorted(values)
    return {'count':len(ordered),'p50':ordered[math.ceil(len(ordered)*.5)-1] if ordered else None,
            'p95':ordered[math.ceil(len(ordered)*.95)-1] if ordered else None,'max':max(ordered,default=None)}

async def main(config):
    report = {'passed':False,'scope':'Independent browser contexts on one machine; loopback; no CPU emulation or RF simulation',
              'players':config['players'],'questions':config['questions'],'pageErrors':[], 'httpErrors':[],
              'disconnects':0,'disconnectEvents':[],'samples':[],'perQuestion':[]}
    acks, clicks, received, sent, pending = [], [], {}, {}, {}
    recording = True
    stages = {}
    heartbeat = {}
    started = time.perf_counter()
    async with async_playwright() as p:
        browsers = []
        try:
            for _ in range(min(4,config['players'])):
                browsers.append(await p.chromium.launch(channel='chrome',headless=True,args=['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']))
            host = await browsers[0].new_page(viewport={'width':1366,'height':768})
            await host.add_init_script('sessionStorage.setItem("bdcahoot_session",'+json.dumps(json.dumps(config['owner']))+');')
            await host.goto(config['url']+'/host/room/'+config['owner']['code'])
            pages, sessions = [], []
            def frame(index, direction, event):
                data = event['response']['payloadData']
                stamp = time.perf_counter()*1000
                if data in ['2','3']:
                    heartbeat.setdefault(index,{})[direction]=stamp
                if direction=='sent':
                    match = re.match(r'^42(\d+)(\[.*)$',data)
                    if match:
                        payload = json.loads(match[2])
                        if payload[0]=='answer:submit':
                            pending[(index,match[1])] = stamp
                            sent.setdefault(payload[1]['questionIndex'],{})[index] = stamp
                else:
                    match = re.match(r'^43(\d+)(\[.*)$',data)
                    if match and (index,match[1]) in pending:
                        result = json.loads(match[2])[0]
                        if not result.get('success'):report['pageErrors'].append(str(result))
                        else:acks.append(stamp-pending.pop((index,match[1])))
                    match = re.match(r'^42\["room:state",(.*)\]$',data)
                    if match:
                        room=json.loads(match[1])
                        stages[index]={'stage':room['stage'],'question':room['currentQuestionIndex']+1}
                        if room['stage']=='QUESTION' and room['questionStartedAtMs'] is not None:
                            received.setdefault(room['currentQuestionIndex'],{}).setdefault(index,stamp)
            def disconnected(index):
                if recording:
                    report['disconnects']+=1
                    report['disconnectEvents'].append({'player':index,'elapsedMs':(time.perf_counter()-started)*1000,'state':stages.get(index),'heartbeat':heartbeat.get(index)})
            async def prepare(i):
                ctx=await browsers[i%len(browsers)].new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
                page=await ctx.new_page()
                page.on('pageerror',lambda error:report['pageErrors'].append(str(error)))
                page.on('response',lambda response:report['httpErrors'].append({'status':response.status,'url':response.url}) if response.status>=400 else None)
                cdp=await ctx.new_cdp_session(page)
                await cdp.send('Network.enable');await cdp.send('Performance.enable')
                cdp.on('Network.webSocketFrameSent',lambda event:frame(i,'sent',event))
                cdp.on('Network.webSocketFrameReceived',lambda event:frame(i,'received',event))
                cdp.on('Network.webSocketClosed',lambda event:disconnected(i))
                await page.goto(config['url']+'/player/join',timeout=90000)
                return page,cdp
            prepared=await asyncio.gather(*(prepare(i) for i in range(config['players'])))
            pages=[item[0] for item in prepared];sessions=[item[1] for item in prepared]
            identities=[]
            async def join(i):
                page=pages[i]
                await page.locator('#room-code-input').fill(config['owner']['code'])
                await page.locator('#btn-submit-code').click()
                await page.locator('#player-name-input').fill('BROWSER'+chr(65+i//26)+chr(65+i%26))
                await page.locator('#btn-join-room').click()
                await page.wait_for_url('**/player/room/*')
                return await page.evaluate('JSON.parse(sessionStorage.getItem("bdcahoot_session"))')
            for start in range(0,len(pages),10):
                identities.extend(await asyncio.gather(*(join(i) for i in range(start,min(start+10,len(pages))))))
            await expect(host.locator('#btn-start-game')).to_be_enabled()
            emit({'type':'ready','identities':identities})
            await host.locator('#btn-start-game').click()
            for q in range(config['questions']):
                async def answer(page):
                    await expect(page.get_by_text(f'SOAL {q+1}/{config["questions"]}',exact=True)).to_be_visible(timeout=25000)
                    await expect(page.locator('#btn-player-opt-B')).to_be_enabled()
                    await asyncio.sleep(1)
                    before=time.perf_counter()
                    await page.locator('#btn-player-opt-B').click(timeout=10000)
                    await expect(page.get_by_text('Jawaban Tersimpan',exact=True)).to_be_visible(timeout=10000)
                    clicks.append((time.perf_counter()-before)*1000)
                await asyncio.gather(*(answer(page) for page in pages))
                await expect(host.locator('#btn-scoreboard-continue')).to_be_visible(timeout=(config['seconds']+15)*1000)
                assert len(received.get(q,{}))==len(pages),f'Missing question {q}'
                assert len(sent.get(q,{}))==len(pages),f'Missing answers {q}'
                report['perQuestion'].append({'question':q+1,'receiveSpreadMs':max(received[q].values())-min(received[q].values()),'sendSpreadMs':max(sent[q].values())-min(sent[q].values())})
                for i in [0,len(pages)-1]:
                    metrics={row['name']:row['value'] for row in (await sessions[i].send('Performance.getMetrics'))['metrics']}
                    report['samples'].append({'question':q+1,'player':i,'heapBytes':metrics['JSHeapUsedSize'],'nodes':metrics['Nodes'],'listeners':metrics['JSEventListeners'],'overflow':await pages[i].evaluate('document.documentElement.scrollWidth>innerWidth')})
                await asyncio.sleep(2)
                await host.locator('#btn-scoreboard-continue').click()
            await asyncio.gather(*(expect(page.get_by_text('SESI SELESAI',exact=True)).to_be_visible(timeout=15000) for page in pages))
            await expect(host.locator('[data-podium-rank="1"]')).to_have_attribute('aria-hidden','false',timeout=15000)
            await host.screenshot(path=config['report']+'.host.png',full_page=True)
            await pages[0].screenshot(path=config['report']+'.player.png',full_page=True)
            assert len(acks)==config['players']*config['questions'],len(acks)
            assert not pending,pending
            assert not report['pageErrors'],report['pageErrors']
            assert not report['httpErrors'],report['httpErrors']
            assert report['disconnects']==0,report['disconnectEvents']
            assert not any(row['overflow'] for row in report['samples']),'Horizontal overflow'
            report['passed']=True
        except Exception as error:
            report['error']=str(error)
            report['traceback']=traceback.format_exc()
            raise
        finally:
            recording=False
            report.update({'elapsedMs':(time.perf_counter()-started)*1000,'ackMs':stats(acks),'clickToConfirmedDomMs':stats(clicks)})
            await asyncio.gather(*(browser.close() for browser in browsers))
            Path(config['report']).write_text(json.dumps(report,indent=2),encoding='utf-8')
    emit({'type':'done','report':report})

try:
    asyncio.run(main(json.loads(sys.stdin.readline())))
except Exception as error:
    emit({'type':'error','error':str(error)})
    sys.exit(1)
