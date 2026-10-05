"""Drive production Host/player UI while the Node harness supplies the other players."""
import json
import math
import os
from pathlib import Path
import sys
import time
from playwright.sync_api import sync_playwright, expect

PROBE = """() => {
  window.__endurance = {longTasks: [], frameGaps: [], events: []};
  new PerformanceObserver(list => {
    for (const e of list.getEntries()) window.__endurance.longTasks.push(e.duration);
  }).observe({type: 'longtask'});
  new PerformanceObserver(list => {
    for (const e of list.getEntries()) if (e.interactionId) window.__endurance.events.push(e.duration);
  }).observe({type: 'event', durationThreshold: 16});
  let previous;
  const frame = t => {
    if (previous !== undefined && document.visibilityState === 'visible') window.__endurance.frameGaps.push(t - previous);
    previous = t; requestAnimationFrame(frame);
  }; requestAnimationFrame(frame);
}"""

def emit(message):
    print(json.dumps(message), flush=True)

def stats(values):
    ordered = sorted(values)
    return {"count": len(ordered), "p95": ordered[max(0, math.ceil(len(ordered) * .95) - 1)] if ordered else 0,
            "max": max(ordered, default=0), "total": sum(ordered)}

def main():
    config = json.loads(sys.stdin.readline())
    report_path = Path(config['report'])
    report_path.parent.mkdir(parents=True, exist_ok=True)
    errors, console_errors, measurements, clicks = [], [], [], []
    cpu_rate = float(os.environ.get('ENDURANCE_CPU_RATE', '4'))
    report = {"passed": False, "playerCpuThrottle": cpu_rate, "questions": config['questions']}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel='chrome', headless=True, args=[
                '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
                '--disable-backgrounding-occluded-windows'])
            try:
                host = browser.new_page(viewport={"width": 1440, "height": 900})
                player = browser.new_page(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
                pages = {"host": host, "player": player}
                sessions = {}
                for role, page in pages.items():
                    page.on('pageerror', lambda error, role=role: errors.append({"role": role, "error": str(error)}))
                    page.on('console', lambda msg, role=role: console_errors.append({"role": role, "error": msg.text}) if msg.type == 'error' else None)
                    session = page.context.new_cdp_session(page)
                    session.send('Performance.enable')
                    sessions[role] = session
                sessions['player'].send('Emulation.setCPUThrottlingRate', {"rate": cpu_rate})
                host.add_init_script('sessionStorage.setItem("bdcahoot_session", ' + json.dumps(json.dumps(config['owner'])) + ');')
                host.goto(config['url'] + '/host/room/' + config['owner']['code'])
                host.wait_for_load_state('networkidle')
                player.goto(config['url'] + '/player/join')
                player.wait_for_load_state('networkidle')
                player.locator('#room-code-input').fill(config['owner']['code'])
                player.locator('#btn-submit-code').click()
                player.locator('#player-name-input').fill('BROWSER')
                player.locator('#btn-join-room').click()
                player.wait_for_url('**/player/room/*')
                identity = player.evaluate('JSON.parse(sessionStorage.getItem("bdcahoot_session"))')
                expect(host.locator('#btn-start-game')).to_be_enabled()
                for page in pages.values():
                    page.evaluate(PROBE)
                emit({"type": "ready", "identity": identity})
                host.locator('#btn-start-game').click()
                for q in range(config['questions']):
                    answer = player.locator('#btn-player-opt-B')
                    expect(answer).to_be_enabled(timeout=(config['seconds'] + 20) * 1000)
                    before = time.perf_counter()
                    answer.click()
                    expect(player.get_by_text('Jawaban Tersimpan', exact=True)).to_be_visible()
                    clicks.append((time.perf_counter() - before) * 1000)
                    expect(host.locator('#btn-scoreboard-continue')).to_be_visible(timeout=(config['seconds'] + 15) * 1000)
                    expect(player.get_by_text('Klasemen', exact=False).first).to_be_visible()
                    for role, page in pages.items():
                        metrics = {item['name']: item['value'] for item in sessions[role].send('Performance.getMetrics')['metrics']}
                        measurements.append({"question": q + 1, "role": role, "heapBytes": metrics['JSHeapUsedSize'],
                                             "nodes": metrics['Nodes'], "listeners": metrics['JSEventListeners'],
                                             "taskDurationSeconds": metrics['TaskDuration'],
                                             "overflowPx": page.evaluate('document.documentElement.scrollWidth - innerWidth')})
                    player.wait_for_timeout(2000)
                    if q == 0:
                        for role, page in pages.items():
                            page.screenshot(path=str(report_path) + '.' + role + '-scoreboard.png', full_page=True)
                    host.locator('#btn-scoreboard-continue').click()
                expect(player.get_by_text('SESI SELESAI', exact=True)).to_be_visible()
                expect(host.locator('#btn-return-library')).to_be_visible()
                # Let podium entry animations finish before capturing visual evidence.
                expect(host.locator('[data-podium-rank="1"]')).to_have_attribute("aria-hidden", "false", timeout=15000)
                player.wait_for_timeout(800)
                for role, page in pages.items():
                    page.screenshot(path=str(report_path) + '.' + role + '-final.png', full_page=True)
                probes = {role: page.evaluate('window.__endurance') for role, page in pages.items()}
                post_gc = {}
                for role, session in sessions.items():
                    # Diagnostic after timing measurements only; never force GC during the match.
                    session.send('HeapProfiler.collectGarbage')
                    post_gc[role] = {item['name']: item['value'] for item in session.send('Performance.getMetrics')['metrics']
                                     if item['name'] in ('JSHeapUsedSize', 'Nodes', 'JSEventListeners')}
                report.update({"browser": browser.version, "pageErrors": errors, "consoleErrors": console_errors,
                               "postGameForcedGcDiagnostic": post_gc,
                               "clickToConfirmedDomMs": stats(clicks), "samples": measurements,
                               "probes": {role: {key: stats(value) for key, value in probe.items()} for role, probe in probes.items()}})
                assert not errors, 'Browser JavaScript errors'
                assert all(row['overflowPx'] <= 1 for row in measurements), 'Horizontal overflow'
                assert len(clicks) == config['questions'], 'Missing browser answers'
                report['passed'] = True
            finally:
                browser.close()
    except Exception as error:
        report['error'] = str(error)
        raise
    finally:
        report_path.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    emit({"type": "done", "report": report})

try:
    main()
except Exception as error:
    emit({"type": "error", "error": str(error)})
    sys.exit(1)
