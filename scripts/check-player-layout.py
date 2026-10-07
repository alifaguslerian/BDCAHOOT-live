"""Measure player layout shifts on a production build using an isolated database."""
import asyncio
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import urllib.request
import re

sys.path.insert(0, os.path.abspath('reports/python'))
from playwright.async_api import async_playwright, expect

BASE = 'http://127.0.0.1:3137'
FIXTURE = r'''
const {io}=require('socket.io-client'); const {randomUUID}=require('crypto');
(async()=>{const sockets=[]; async function connect(){const s=io('http://127.0.0.1:3137',{transports:['websocket']});sockets.push(s);await new Promise(r=>s.once('connect',r));return s;}
async function req(s,e,p){const r=await s.timeout(5000).emitWithAck(e,p);if(!r.success)throw Error(r.error);return r.data;}
const h=await connect();const quiz={title:'Layout audit',questions:[0,1].map(i=>({id:'q'+i,question:'Pertanyaan pengujian layout dengan pilihan jawaban yang terbaca lengkap.',options:['A','B','C','D'].map(id=>({id,text:'Pilihan '+id+' dengan teks jawaban.'})),correctOption:'B',timerSeconds:15}))};
const host=await req(h,'room:create',{quiz,hostKey:'layout-audit-key',requestId:randomUUID()});const players=[];for(const name of ['DESKTOP','MOBILE']){const p=await connect();players.push(await req(p,'room:join',{code:host.code,name,requestId:randomUUID()}));}console.log(JSON.stringify({host,players}));sockets.forEach(s=>s.disconnect());})().catch(e=>{console.error(e);process.exit(1)});
'''
OBSERVER = r'''
window.auditShifts=[];window.auditPhase='load';
new PerformanceObserver(list=>{for(const e of list.getEntries())window.auditShifts.push({phase:window.auditPhase,value:e.value,recentInput:e.hadRecentInput,sources:e.sources.map(s=>({tag:s.node?.tagName,text:s.node?.textContent?.slice(0,70),before:s.previousRect.toJSON(),after:s.currentRect.toJSON()}))});}).observe({type:'layout-shift',buffered:true});
'''

def contrast(background, foreground):
    def luminance(color):
        values=[int(x)/255 for x in re.findall(r'\d+',color)[:3]]
        linear=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in values]
        return sum(x*w for x,w in zip(linear,[.2126,.7152,.0722]))
    a,b=sorted([luminance(background),luminance(foreground)])
    return (b+.05)/(a+.05)

async def check(ids):
    report = {'viewports': [], 'errors': []}
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel='chrome', headless=True)
        try:
            hc = await browser.new_context()
            await hc.add_init_script('sessionStorage.setItem("bdcahoot_session",'+json.dumps(json.dumps(ids['host']))+');')
            host = await hc.new_page()
            await host.goto(BASE+'/host/room/'+ids['host']['code'])
            await expect(host.locator('#btn-start-game')).to_be_enabled()
            pages = []
            for width,height in [(1366,768),(390,844)]:
                ctx = await browser.new_context(viewport={'width':width,'height':height})
                await ctx.add_init_script('sessionStorage.setItem("bdcahoot_session",'+json.dumps(json.dumps(ids['players'][len(pages)]))+');')
                await ctx.add_init_script(OBSERVER)
                page = await ctx.new_page()
                page.on('pageerror',lambda e:report['errors'].append(str(e)))
                await page.goto(BASE+'/player/room/'+ids['host']['code'])
                await page.wait_for_timeout(1800)
                pages.append(page)
            await host.locator('#btn-start-game').click()
            for page in pages:
                await expect(page.locator('#btn-player-opt-B')).to_be_enabled(timeout=10000)
                await page.evaluate("window.auditPhase='question'")
            await pages[0].wait_for_timeout(1000)
            host_colors=await host.locator('[id^="option-button-"]').evaluate_all('(els)=>els.map(e=>({background:getComputedStyle(e).backgroundColor,text:getComputedStyle(e).color}))')
            assert len(host_colors)==4
            report['hostContrast']=[contrast(c['background'],c['text']) for c in host_colors]
            assert min(report['hostContrast'])>=4.5,report['hostContrast']
            await host.screenshot(path='reports/host-question-contrast.png',full_page=True)
            # Refresh during an active question, like a Lighthouse initial navigation.
            for page in pages:
                initial = await page.evaluate('window.auditShifts')
                await page.reload()
                await expect(page.locator('#btn-player-opt-B')).to_be_enabled()
                await page.wait_for_timeout(1200)
                colors=await page.locator('[id^="btn-player-opt-"]').evaluate_all('(els)=>els.map(e=>({background:getComputedStyle(e).backgroundColor,text:getComputedStyle(e.querySelector("p")).color}))')
                report['viewports'].append({'viewport':page.viewport_size,'initialShifts':initial,'reloadShifts':await page.evaluate('window.auditShifts'),
                    'mainBefore':await page.locator('main').bounding_box(),'contrast':[contrast(c['background'],c['text']) for c in colors]})
            for page in pages:
                await page.locator('#btn-player-opt-B').click()
                await expect(page.get_by_text('Jawaban Tersimpan',exact=True)).to_be_visible(timeout=6000)
            for page,row in zip(pages,report['viewports']):
                await page.wait_for_timeout(300)
                row['mainAfter']=await page.locator('main').bounding_box()
                row['afterAnswerShifts']=await page.evaluate('window.auditShifts')
                row['overflow']=await page.evaluate('document.documentElement.scrollWidth>innerWidth')
                row['optionColors']=await page.locator('[id^="btn-player-opt-"]').evaluate_all('(els)=>els.map(e=>({background:getComputedStyle(e).backgroundColor,text:getComputedStyle(e.querySelector("p")).color}))')
                await page.screenshot(path=f'reports/layout-{page.viewport_size["width"]}.png',full_page=True)
                assert min(row['contrast'])>=4.5,row['contrast']
                assert abs(row['mainBefore']['y']-row['mainAfter']['y'])<1,(row['mainBefore'],row['mainAfter'])
                assert not row['overflow']
            assert not report['errors'],report['errors']
        finally:
            await browser.close()
    return report

if __name__ == '__main__':
    output = sys.argv[1] if len(sys.argv)>1 else 'reports/player-layout.json'
    with tempfile.TemporaryDirectory(prefix='bdc-layout-') as directory:
        with open(Path(directory)/'server.log','w') as log:
            server=subprocess.Popen(['node','--import','tsx','server/index.ts'],env=dict(os.environ,PORT='3137',HOST_KEY='layout-audit-key',DATABASE_PATH=str(Path(directory)/'game.sqlite'),NODE_ENV='production'),stdout=log,stderr=log,creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
            try:
                for _ in range(100):
                    if server.poll() is not None:raise RuntimeError(Path(directory,'server.log').read_text())
                    try:urllib.request.urlopen(BASE,timeout=1).close();break
                    except OSError:time.sleep(.3)
                ids=json.loads(subprocess.check_output(['node','-e',FIXTURE],text=True,timeout=20))
                report=asyncio.run(check(ids))
                Path(output).write_text(json.dumps(report,indent=2),encoding='utf-8')
                print(json.dumps(report,indent=2))
            finally:
                server.terminate()
                try:server.wait(timeout=15)
                except subprocess.TimeoutExpired:server.kill();server.wait()
