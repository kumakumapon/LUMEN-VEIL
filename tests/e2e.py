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
    expect(page.locator('#hero-title')).to_be_visible()
    page.screenshot(path=str(OUT / 'title-desktop.png'), full_page=True)
    page.locator('#btn-start').click()
    expect(page.locator('#area-title')).to_have_text('浮遊港オルテ')
    explore(page, 'sena')
    explore(page, 'sign')
    explore(page, 'letter')
    explore(page, 'to-corridor')
    expect(page.locator('#area-title')).to_have_text('回廊の整備区画')
    # Reload to verify IndexedDB writes and resume work.
    expect(page.locator('#notice')).to_contain_text('記憶を保存しました。')
    page.reload(wait_until='domcontentloaded')
    expect(page.locator('#title-screen')).to_be_visible()
    page.locator('#btn-title-continue').click()
    expect(page.locator('#area-title')).to_have_text('回廊の整備区画')
    explore(page, 'ritz')
    expect(page.locator('#battle-panel')).to_be_visible()
    page.screenshot(path=str(OUT / 'battle-desktop.png'), full_page=True)
    finish_fight(page)
    explore(page, 'lamp')
    explore(page, 'badge')
    explore(page, 'key')
    explore(page, 'to-vault')
    explore(page, 'boss')
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
    expect(mobile.locator('#hero-title')).to_be_visible()
    assert mobile.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')
    mobile.screenshot(path=str(OUT / 'title-mobile.png'), full_page=True)
    mobile.locator('#btn-start').tap()
    expect(mobile.locator('[data-hotspot="sena"]')).to_be_visible()
    assert mobile.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')
    mobile.screenshot(path=str(OUT / 'explore-mobile.png'), full_page=True)
    assert not failures, f'Uncaught page exceptions: {failures}'
    print('PASS: desktop title, journey, battle, IndexedDB resume, ending, JSON export, mobile viewport and taps')
    browser.close()
