"""Journey redesign: viewport layout, actual approach/confirm, story, saves, battles."""
import os
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=os.environ.get('SITE_URL','http://127.0.0.1:4173/LUMEN-VEIL/')
OUT=Path(os.environ.get('SCREENSHOT_DIR','screenshots'));OUT.mkdir(parents=True,exist_ok=True)

def conversations(page):
    for _ in range(15):
        if not page.locator('.conversation').is_visible():return
        page.locator('.cinematic-next').click()
    raise AssertionError('Conversation did not finish')

def approach(page,id):
    expect(page.locator('#phaser-stage canvas')).to_be_visible()
    page.wait_for_function("document.querySelector('canvas')?.dataset.area === document.documentElement.dataset.fieldArea")
    page.locator('#btn-nearby').click()
    page.locator(f'.nearby-menu [data-hotspot="{id}"]').click()
    expect(page.locator('#btn-interact')).to_have_attribute('data-target-id',id,timeout=20000)
    expect(page.locator('#btn-interact')).to_be_enabled()
    page.wait_for_timeout(800)
    page.locator('#btn-interact').click()

def solve(page,index):
    expect(page.locator('[data-memory-answer]')).to_have_count(2)
    page.locator(f'[data-memory-answer="{index}"]').click()
    expect(page.locator('.conversation')).to_be_visible()
    conversations(page)

def layout(page,name):
    for width,height in [(320,640),(390,844),(768,1024),(1440,900)]:
        page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(220)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
        assert page.evaluate('document.documentElement.scrollHeight <= innerHeight+1'),f'{name} page scroll at {width}'
        ids=['#commands','#party','#foe-intent'] if name=='battle' else ['#btn-interact','#btn-nearby','#btn-memories']
        for id in ids:
            box=page.locator(id).bounding_box()
            assert box and box['y']>=0 and box['y']+box['height']<=height, (name,width,id,box)
        page.screenshot(path=str(OUT/f'journey-{name}-{width}.png'))
    page.set_viewport_size({'width':390,'height':844})

def fight(page):
    for _ in range(45):
        if page.locator('#battle-panel').is_hidden():return
        button=page.locator('[data-command="echo"]')
        if button.is_enabled():button.click()
        elif page.locator('[data-command="arts"]').is_enabled():page.locator('[data-command="arts"]').click()
        else:page.locator('[data-command="attack"]').click()
    raise AssertionError('Battle did not finish')

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_EXECUTABLE'),args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':390,'height':844},has_touch=True,accept_downloads=True)
    failures=[];page.on('pageerror',lambda error:failures.append(str(error)))
    page.goto(ROOT);page.locator('#btn-start').tap();conversations(page)
    expect(page.locator('#phaser-stage canvas')).to_have_attribute('data-sprite-source','painted-atlas')
    layout(page,'explore')
    canvas=page.locator('canvas');x=canvas.get_attribute('data-player-x')
    page.keyboard.down('d');page.wait_for_timeout(300);page.keyboard.up('d')
    assert canvas.get_attribute('data-player-x')!=x
    approach(page,'sena');conversations(page)
    # Route assistance stops before interaction.
    page.locator('#btn-guide-route').click();page.wait_for_timeout(2200)
    expect(page.locator('#overlay')).not_to_be_visible()
    page.locator('#btn-interact').click()
    page.locator('[data-memory-answer="1"]').click()
    expect(page.get_by_role('status').filter(has_text='もう一度')).to_be_visible()
    solve(page,0)
    expect(page.locator('#journey-goal')).to_contain_text('整備士')
    approach(page,'letter');approach(page,'to-market')
    approach(page,'merchant');conversations(page)
    approach(page,'market-cache');approach(page,'to-harbor');approach(page,'to-observatory')
    approach(page,'scholar');conversations(page)
    page.locator('#btn-memories').click();page.locator('[data-memory="maker"]').click();solve(page,1)
    approach(page,'to-harbor');approach(page,'to-corridor');approach(page,'ritz')
    layout(page,'battle');fight(page)
    approach(page,'lamp');conversations(page);approach(page,'badge');approach(page,'key');conversations(page)
    page.locator('#btn-memories').click();page.locator('[data-memory="mira"]').click();solve(page,0)
    # New sidecar progress survives a real IndexedDB reload.
    page.locator('#btn-main-menu').click();page.get_by_role('button',name='セーブする 現在の冒険をこの端末に保存').click()
    expect(page.locator('#notice')).to_have_text('記憶を保存しました。')
    page.reload();page.locator('#btn-title-continue').click()
    page.locator('#btn-memories').click();expect(page.locator('[data-memory="mira"]')).to_be_disabled();page.locator('#btn-close').click()
    approach(page,'to-vault');approach(page,'boss');fight(page)
    approach(page,'to-dock');approach(page,'escape')
    page.locator('[data-memory-choice="harbor"]').click()
    expect(page.locator('#ending-copy')).to_contain_text('港の灯')
    page.locator('#btn-main-menu').click();page.get_by_role('button',name='冒険の記録 集めた記憶とセーブデータ').click()
    with page.expect_download() as download:page.get_by_role('button',name='セーブJSONを書き出す').click()
    assert download.value.suggested_filename.endswith('.json')
    legacy=json.loads(Path(download.value.path()).read_text())
    legacy.pop('living',None);legacy.pop('expansion',None)
    legacy['phase']='explore';legacy['area']='dock';legacy['flags']['escaped']=False
    page.locator('#btn-close').click()
    page.locator('#import-file').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{invalid'})
    expect(page.locator('#notice')).to_contain_text('インポートに失敗')
    page.locator('#import-file').set_input_files({'name':'legacy.json','mimeType':'application/json','buffer':json.dumps(legacy).encode()})
    expect(page.locator('#area-title')).to_have_text('雲海の船着き場')
    approach(page,'escape');page.locator('[data-memory-choice="letter"]').click()
    expect(page.locator('#ending-copy')).to_contain_text('ミラへの手紙')
    assert not failures,failures
    print('PASS: four viewports, approach/confirm, story and all memory puzzles, extra-action combat, save/resume, ending choice and JSON export')
    browser.close()
