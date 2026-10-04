"""Production browser check. Run after npm run build; uses an isolated temporary DB."""
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

KEY = 'library-browser-test-key'
PORT = '3127'
BASE = f'http://127.0.0.1:{PORT}'


def stop(server):
    server.terminate()
    try:
        server.wait(timeout=10)
    except subprocess.TimeoutExpired:
        server.kill()
        server.wait()


def start(database, log):
    env = dict(os.environ, PORT=PORT, NODE_ENV='production', HOST_KEY=KEY, DATABASE_PATH=database)
    server = subprocess.Popen(['node', '--import', 'tsx', 'server/index.ts'], env=env,
                              stdout=log, stderr=log,
                              creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
    try:
        for _ in range(60):
            if server.poll() is not None:
                raise RuntimeError('Test server stopped; see reports/quiz-library-browser.log')
            try:
                urllib.request.urlopen(BASE, timeout=1).close()
                return server
            except OSError:
                time.sleep(0.5)
        raise RuntimeError('Test server not ready')
    except BaseException:
        stop(server)
        raise


def login(page, origin=BASE):
    page.goto(origin + '/host/library', wait_until='networkidle')
    page.get_by_label('Kode operator', exact=True).fill(KEY)
    page.get_by_role('button', name='Buka koleksi kuis', exact=True).click()
    expect(page.get_by_role('heading', name='Koleksi Kuis Arena')).to_be_visible()


Path('reports').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='bdc-library-browser-') as directory, open('reports/quiz-library-browser.log', 'w') as log:
    database = str(Path(directory) / 'game.sqlite')
    server = start(database, log)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel='chrome', headless=True)
            context = browser.new_context()
            errors = []
            context.on('page', lambda page: page.on('pageerror', lambda error: errors.append(str(error))))
            page = context.new_page()
            login(page)
            page.locator('#btn-create-quiz-header').click()
            expect(page.locator('#quiz-title-input')).to_be_visible()
            editor_url = page.url
            page.locator('#quiz-title-input').fill('Quiz saved for event')
            # Navigate immediately, before the autosave debounce fires.
            page.locator('#btn-back-to-library').click()
            expect(page.get_by_role('heading', name='Quiz saved for event', exact=True)).to_be_visible()
            page.goto(editor_url, wait_until='networkidle')
            expect(page.locator('#quiz-title-input')).to_have_value('Quiz saved for event')

            other = context.new_page()
            login(other)
            other.goto(editor_url, wait_until='networkidle')
            expect(other.locator('#quiz-title-input')).to_have_value('Quiz saved for event')
            page.locator('#quiz-title-input').fill('Final event quiz')
            expect(page.get_by_text('Tersimpan otomatis', exact=True)).to_be_visible()
            other.locator('#quiz-title-input').fill('Stale overwrite')
            expect(other.locator('p[role=alert]')).to_contain_text('berubah di tab lain')
            other.on('dialog', lambda dialog: dialog.accept())
            other.close()

            # Offline edits must never claim successful persistence.
            context.set_offline(True)
            page.locator('#quiz-title-input').fill('Offline unsaved title')
            expect(page.locator('p[role=alert]')).to_be_visible(timeout=12000)
            expect(page.get_by_text('Tersimpan otomatis', exact=True)).to_have_count(0)
            context.set_offline(False)
            page.get_by_role('button', name='Belum tersimpan').click()
            expect(page.get_by_text('Tersimpan otomatis', exact=True)).to_be_visible(timeout=12000)
            context.close()
            stop(server)
            server = start(database, log)

            # Different browser storage and different origin, same server database.
            fresh = browser.new_context(viewport={'width': 390, 'height': 844})
            restored = fresh.new_page()
            login(restored, f'http://localhost:{PORT}')
            expect(restored.get_by_role('heading', name='Offline unsaved title', exact=True)).to_be_visible()
            restored.get_by_role('link', name='Mulai Room', exact=True).click()
            restored.locator('#btn-create-room').click()
            expect(restored).to_have_url(__import__('re').compile(r'/host/room/[A-Z0-9]{6}$'))
            expect(restored.locator('#btn-start-game')).to_be_visible()
            assert not errors, errors
            fresh.close()
            browser.close()
            result = {'createEditSave': True, 'saveBeforeNavigation': True, 'staleTabRejected': True,
                      'offlineErrorAndRetry': True, 'restartAndDifferentOrigin': True, 'createRoom': True, 'pageErrors': errors}
            Path('reports/quiz-library-browser.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
            print(json.dumps(result))
    finally:
        stop(server)
