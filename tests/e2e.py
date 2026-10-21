"""Run locally with `python tests/e2e.py` after `npm run dev` (Playwright and Chromium required)."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = os.environ.get('SITE_URL', 'http://127.0.0.1:4173/LUMEN-VEIL/')
OUT = Path(os.environ.get('SCREENSHOT_DIR', str(Path.cwd() / 'screenshots')))
OUT.mkdir(exist_ok=True, parents=True)

def explore(page, id):
    page.locator(f'[data-hotspot="{id}"]').click()

def finish_fight(page):
    for _ in range(45):
        if page.locator('#battle-panel').is_hidden():
            return
        expect(page.locator('[data-command="attack"]')).to_be_enabled(timeout=10000)
        if page.locator('[data-command="echo"]').is_enabled():
            page.locator('[data-command="echo"]').click()
        elif page.locator('[data-command="arts"]').is_enabled():
            page.locator('[data-command="arts"]').click()
        else:
            page.locator('[data-command="attack"]').click()
    raise AssertionError('Battle did not finish')

with sync_playwright() as p:
    chromium = os.environ.get('CHROMIUM_EXECUTABLE')
    launch = {'executable_path': chromium} if chromium else {}
    browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'], **launch)
    page = browser.new_page(viewport={'width': 1440, 'height': 900}, device_scale_factor=1, accept_downloads=True)
    failures = []
    page.on('pageerror', lambda exc: failures.append(str(exc)))
    page.goto(ROOT, wait_until='domcontentloaded')
    page.wait_for_function("document.documentElement.dataset.lumenReady === 'true'", timeout=15000)
    expect(page.locator('#hero-title')).to_be_visible()
    page.screenshot(path=str(OUT / 'title-desktop.png'), full_page=True)
    page.locator('#btn-start').click()
    expect(page.locator('#area-title')).to_have_text('浮遊港オルテ')
    expect(page.locator('#phaser-stage canvas')).to_be_visible(timeout=12000)
    # A genuine Phaser Canvas is running under the DOM-accessible controls.
    assert page.locator('#phaser-stage canvas').count() == 1
    # Optional exploration, multi-line NPC conversations, equipment and XP sidecar.
    page.locator('#btn-quests').click()
    expect(page.locator('#modal-title')).to_have_text('依頼の記録')
    page.locator('[data-quest-action="letter"]').click()
    expect(page.locator('[data-quest-action="letter"]')).to_have_text('進行中')
    page.locator('#btn-close').click()
    explore(page, 'to-market')
    expect(page.locator('#area-title')).to_have_text('白帆の市場')
    page.locator('#btn-shop').click()
    expect(page.locator('#modal-title')).to_have_text('白帆の市場 — 装備店')
    page.locator('[data-buy-item="sunsteel"]').click()
    expect(page.locator('[data-buy-item="sunsteel"]')).to_have_text('購入済み')
    page.locator('#btn-close').click()
    explore(page, 'merchant')
    expect(page.locator('#modal-title')).to_have_text('会話')
    expect(page.locator('.conversation h3')).to_have_text('商人ユイ')
    page.locator('.conversation button').click()
    expect(page.locator('.conversation h3')).to_have_text('ノエル')
    page.locator('.conversation button').click()
    page.locator('.conversation button').click()
    explore(page, 'market-cache')
    page.locator('#btn-gear').click()
    expect(page.locator('#modal-title')).to_have_text('装備・育成')
    page.locator('[data-gear-hero="noel"][data-gear-slot="weapon"]').select_option('skyblade')
    expect(page.locator('[data-gear-hero="noel"][data-gear-slot="weapon"]')).to_have_value('skyblade')
    page.locator('#btn-close').click()
    explore(page, 'to-harbor')
    explore(page, 'to-observatory')
    expect(page.locator('#area-title')).to_have_text('星環の観測塔')
    explore(page, 'scholar')
    expect(page.locator('.conversation h3')).to_have_text('星見のエル')
    page.locator('#btn-close').click()
    explore(page, 'observatory-cache')
    explore(page, 'to-harbor')
    expect(page.locator('#area-title')).to_have_text('浮遊港オルテ')
    explore(page, 'sena')
    explore(page, 'sign')
    explore(page, 'letter')
    page.locator('#btn-quests').click()
    expect(page.locator('[data-quest-action="letter"]')).to_have_text('報酬を受け取る')
    page.locator('[data-quest-action="letter"]').click()
    expect(page.locator('[data-quest-action="letter"]')).to_have_text('達成済み')
    page.locator('#btn-close').click()
    explore(page, 'to-corridor')
    expect(page.locator('#area-title')).to_have_text('回廊の整備区画')
    # Prevent a stale Phaser walk callback from undoing a fast DOM area transition.
    page.wait_for_timeout(400)
    expect(page.locator('#area-title')).to_have_text('回廊の整備区画')
    # Reload to verify IndexedDB writes and resume work.
    expect(page.locator('#notice')).to_contain_text('記憶を保存しました。')
    page.reload(wait_until='domcontentloaded')
    expect(page.locator('#title-screen')).to_be_visible()
    page.locator('#btn-title-continue').click()
    expect(page.locator('#area-title')).to_have_text('回廊の整備区画')
    page.locator('#btn-gear').click()
    expect(page.locator('[data-gear-hero="noel"][data-gear-slot="weapon"]')).to_have_value('skyblade')
    page.locator('#btn-close').click()
    explore(page, 'ritz')
    expect(page.locator('#battle-panel')).to_be_visible()
    expect(page.locator('#atb-fill')).to_be_visible()
    expect(page.locator('#atb-status')).to_have_text('WAIT / READY',timeout=10000)
    page.screenshot(path=str(OUT / 'battle-desktop.png'), full_page=True)
    finish_fight(page)
    explore(page, 'lamp')
    explore(page, 'badge')
    explore(page, 'key')
    explore(page, 'to-vault')
    explore(page, 'boss')
    expect(page.locator('#phaser-stage canvas')).to_have_attribute('data-battle-art', 'illustrated')
    expect(page.locator('#phaser-stage canvas')).to_have_attribute('data-enemy-art', 'illustrated')
    page.screenshot(path=str(OUT / 'boss-illustrated-desktop.png'), full_page=True)
    finish_fight(page)
    explore(page, 'to-dock')
    explore(page, 'escape')
    expect(page.locator('#ending-title')).to_have_text('名前は、まだここに。')
    assert page.locator('#ending-copy').inner_text().startswith('消えた手紙と航海士ミラ')
    page.locator('#btn-journal').click()
    expect(page.locator('#modal-title')).to_have_text('冒険の記録')
    with page.expect_download() as transfer:
        page.get_by_role('button', name='セーブJSONを書き出す').click()
    assert transfer.value.suggested_filename.endswith('.json')
    page.locator('#btn-close').click()
    # Narrow screen and touch-style button presses.
    mobile = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    mobile.on('pageerror', lambda exc: failures.append(str(exc)))
    mobile.goto(ROOT)
    mobile.wait_for_function("document.documentElement.dataset.lumenReady === 'true'", timeout=15000)
    expect(mobile.locator('#hero-title')).to_be_visible()
    assert mobile.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')
    mobile.screenshot(path=str(OUT / 'title-mobile.png'), full_page=True)
    mobile.locator('#btn-start').tap()
    expect(mobile.locator('[data-hotspot="sena"]')).to_be_visible()
    assert mobile.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')
    expect(mobile.locator('#phaser-stage canvas')).to_be_visible(timeout=12000)
    mobile.screenshot(path=str(OUT / 'explore-mobile.png'), full_page=True)
    explore(mobile, 'sena')
    explore(mobile, 'sign')
    explore(mobile, 'to-corridor')
    explore(mobile, 'ritz')
    expect(mobile.locator('#phaser-stage canvas')).to_have_attribute('data-battle-art', 'illustrated')
    mobile.screenshot(path=str(OUT / 'battle-illustrated-mobile.png'), full_page=True)
    assert mobile.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')
    # Legacy production IndexedDB save must survive the TypeScript/Vite upgrade.
    fixture = {
        'version': 1, 'phase':'explore', 'area':'corridor',
        'flags': {'sena': True, 'sign': True, 'ritz': True, 'lamp': True, 'key': False, 'boss': False, 'escaped': False},
        'records':['letter','badge'],
        'party': [
            {'id':'noel','hp':149,'mp':30},
            {'id':'sena','hp':120,'mp':53},
            {'id':'ritz','hp':210,'mp':42},
        ],
        'difficulty':'normal','resonance':64,'battle':None,
        'narrative':'リッツが記憶灯を修復した。',
    }
    legacy = browser.new_page()
    legacy.on('pageerror', lambda exc: failures.append(str(exc)))
    legacy.goto(ROOT, wait_until='domcontentloaded')
    legacy.wait_for_function("document.documentElement.dataset.lumenReady === 'true'", timeout=15000)
    legacy.evaluate("""async data => {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('lumen-veil-save-v1', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('slots');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      await new Promise((resolve, reject) => {
        const tx = db.transaction('slots', 'readwrite');
        tx.objectStore('slots').put(JSON.stringify(data), 'chapter-zero');
        tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
      });
      db.close();
    }""", fixture)
    legacy.reload()
    legacy.locator('#btn-title-continue').click()
    expect(legacy.locator('#area-title')).to_have_text('回廊の整備区画')
    assert '64%' in legacy.locator('#resonance-number').inner_text()
    assert legacy.locator('#party').inner_text().find('149/180') >= 0
    assert legacy.locator('#party').inner_text().find('120/145') >= 0
    # JSON import of a corrupted file must not erase the IndexedDB save.
    legacy.locator('#import-file').set_input_files({'name':'bad.json', 'mimeType':'application/json', 'buffer':b'{broken'})
    expect(legacy.locator('#notice')).to_contain_text('インポートに失敗')
    legacy.reload()
    legacy.locator('#btn-title-continue').click()
    expect(legacy.locator('#area-title')).to_have_text('回廊の整備区画')
    assert not failures, f'Uncaught page exceptions: {failures}' 
    print('PASS: desktop title, journey, battle, IndexedDB resume, ending, JSON export, mobile viewport and taps')
    browser.close()

