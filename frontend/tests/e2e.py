"""End-to-end check of where was i? in a real Chromium at phone size.

Run:  python3 tests/e2e.py http://localhost:4173/ <screenshot-dir>
Needs: pip install playwright && python -m playwright install chromium
"""
import json
import os
import shutil
import sys
import tempfile

from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4173/"
SHOTS = sys.argv[2] if len(sys.argv) > 2 else tempfile.mkdtemp()
os.makedirs(SHOTS, exist_ok=True)
PROFILE = tempfile.mkdtemp(prefix="wwi-profile-")

results = []


def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    print(("PASS " if cond else "FAIL ") + name + (f"  [{detail}]" if detail and not cond else ""))


def no_hscroll(pg):
    return pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")


def open_ctx(p, width=360):
    return p.chromium.launch_persistent_context(
        PROFILE, viewport={"width": width, "height": 740}, device_scale_factor=2,
        is_mobile=True, has_touch=True, accept_downloads=True,
    )


def capture(pg, text):
    pg.fill(".capture-input", text)
    pg.keyboard.press("Enter")
    pg.wait_for_timeout(150)


def stored_items(pg):
    # Read straight from IndexedDB, not from the UI.
    return pg.evaluate("""() => new Promise((res) => {
        const r = indexedDB.open('where-was-i', 1);
        r.onsuccess = () => {
          const g = r.result.transaction('kv').objectStore('kv').get('state');
          g.onsuccess = () => res(g.result ? g.result.items : null);
        };
    })""")


errors = []

with sync_playwright() as p:
    # ── Session 1: fresh install ──────────────────────────────────────────
    ctx = open_ctx(p)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(URL)
    pg.wait_for_selector(".today")
    check("default language is Arabic RTL", pg.evaluate("document.documentElement.dir") == "rtl" and pg.evaluate("document.documentElement.lang") == "ar")
    check("empty Today shows welcome", pg.locator("text=اكتبيها هنا").count() == 1)
    check("Today fits 360px width (no sideways scroll)", no_hscroll(pg))

    # Energy check-in
    pg.click("text=منخفضة")
    check("energy check-in saves and collapses", pg.locator(".energy-pill").count() == 1)

    # Quick capture from the floating button
    pg.click(".fab")
    pg.wait_for_selector(".capture-input")
    pg.fill(".capture-input", "أكلم ماما بكرة")
    chip_area = pg.locator(".capture-guess .chip.on").first.inner_text()
    chip_due = pg.locator(".capture-guess .chip.on").nth(1).inner_text()
    check("capture guesses 'calls' + 'tomorrow' for Egyptian Arabic", "مكالمات" in chip_area and "بكرة" in chip_due, f"{chip_area} / {chip_due}")
    pg.keyboard.press("Enter")
    pg.wait_for_timeout(150)
    check("capture input clears and stays open for the next one", pg.input_value(".capture-input") == "")
    capture(pg, "عيش ولبن وبيض")
    capture(pg, "ارسم اسكتش للمعادي")
    capture(pg, "reply to Sara")
    capture(pg, "تجديد البطاقة")
    pg.screenshot(path=f"{SHOTS}/capture.png")
    check("capture sheet fits 360px", no_hscroll(pg))
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(200)
    check("Escape closes capture", pg.locator(".capture-input").count() == 0)

    items = stored_items(pg)
    check("5 captures stored in IndexedDB", items is not None and len(items) == 5, str(items and len(items)))
    areas = {i["title"]: i["area"] for i in items or []}
    check("groceries / creative / messages guessed", areas.get("عيش ولبن وبيض") == "groceries" and areas.get("ارسم اسكتش للمعادي") == "creative" and areas.get("reply to Sara") == "messages", str(areas))

    # What next
    pg.wait_for_selector(".next-title")
    first = pg.inner_text(".next-title")
    check("What next suggests one item", bool(first))
    check("Tomorrow's call is suggested first", first == "أكلم ماما بكرة", first)
    pg.click(".why-btn")
    check("What next explains why", pg.locator(".next-reasons span").count() == 1 and len(pg.inner_text(".next-reasons span")) > 3, pg.inner_text(".next-reasons"))
    pg.click("text=حاجة تانية")
    second = pg.inner_text(".next-title")
    check("'Something else' moves to a different item", second != first, second)
    check("quick wins section shows small tasks", pg.locator("#wins-h").count() == 1)
    pg.screenshot(path=f"{SHOTS}/today-filled.png", full_page=True)

    # Open an item and edit it
    pg.click(".tabbar >> text=حاجاتي")
    pg.wait_for_selector(".everything")
    check("Everything lists 5 open items", pg.locator(".item-list .item-row").count() == 5)
    pg.fill("input[type=search]", "اسكتش")
    check("search finds the sketch", pg.locator(".item-row").count() == 1)
    pg.click(".row-main")
    pg.wait_for_selector(".item-sheet")
    pg.fill("#item-title", "ارسم اسكتش للمعادي القديمة")
    pg.click(".item-sheet >> text=اقترحي خطوات")
    check("suggest steps adds template steps", pg.locator(".steps li").count() == 3)
    pg.fill(".inline-add input[aria-label='خطوة جديدة']", "اختار صورة مرجعية")
    pg.keyboard.press("Enter")
    check("custom step added", pg.locator(".steps li").count() == 4)
    pg.locator(".steps .check").first.click()
    check("item sheet starts simple (details folded)", pg.locator("#item-repeat").count() == 0)
    pg.click("text=تفاصيل أكتر")
    pg.fill("#item-next", "أكمل تحبير الشجر")
    pg.fill("#item-notes", "ألوان: زيتوني وكريمي")
    pg.click("text=دي مشروع كبير")
    pg.screenshot(path=f"{SHOTS}/item-sheet.png", full_page=True)
    check("item sheet fits 360px", no_hscroll(pg))
    pg.keyboard.press("Escape")
    pg.fill("input[type=search]", "")
    pg.wait_for_timeout(400)

    # Recurring: set weekly on groceries, complete, should roll forward
    pg.click("text=عيش ولبن وبيض")
    pg.click("text=تفاصيل أكتر")
    pg.select_option("#item-repeat", "weekly")
    due_before = pg.input_value("#item-due")
    pg.click(".sheet-actions >> text=خلصت")
    pg.wait_for_timeout(500)
    items = stored_items(pg)
    g = next(i for i in items if i["title"] == "عيش ولبن وبيض")
    check("recurring item stays open after Done", g["status"] == "open", g["status"])
    check("recurring due date moved forward a week", g["dueAt"] > due_before and len(g["completions"]) == 1, f"{due_before} -> {g['dueAt']}")

    # Complete + undo
    row = pg.locator(".item-row", has_text="reply to Sara")
    row.locator(".check").click()
    pg.wait_for_timeout(600)
    check("completed item leaves the Now list", pg.locator(".item-row", has_text="reply to Sara").count() == 0)
    check("done toast shows Undo", pg.locator(".toast-undo").count() >= 1)
    pg.locator(".toast-undo").last.click()
    pg.wait_for_timeout(300)
    check("Undo brings it back", pg.locator(".item-row", has_text="reply to Sara").count() == 1)

    # Waiting
    pg.click("text=reply to Sara")
    pg.click("text=تفاصيل أكتر")
    pg.click("text=مستنية حد؟")
    pg.fill("#item-waiting", "سارة تبعت الملف")
    pg.keyboard.press("Escape")
    pg.click(".tab >> text=مستنية")
    check("waiting filter shows the item with who", pg.locator(".item-row", has_text="سارة تبعت الملف").count() == 1)

    # Later + delete + restore
    pg.click(".tab >> text=دلوقتي")
    pg.click("text=تجديد البطاقة")
    pg.click(".sheet-actions >> text=بعدين")
    pg.click(".later-pick >> text=الأسبوع الجاي")
    pg.wait_for_timeout(300)
    pg.click(".tab >> text=بعدين")
    check("Later parks the item with a return day", pg.locator(".item-row", has_text="تجديد البطاقة").count() == 1)
    pg.click("text=تجديد البطاقة")
    pg.click(".footer-actions >> text=امسحي")
    pg.wait_for_timeout(300)
    pg.click(".tab >> text=المحذوفات")
    check("Delete moves to Deleted, not gone", pg.locator(".item-row", has_text="تجديد البطاقة").count() == 1)
    pg.click(".row-restore")
    pg.wait_for_timeout(300)
    check("Restore from Deleted works", pg.locator(".item-row", has_text="تجديد البطاقة").count() == 0)
    pg.screenshot(path=f"{SHOTS}/everything.png", full_page=True)
    check("Everything fits 360px", no_hscroll(pg))

    # Focus timer: 2-minute start, pause, resume, stop, save memory
    pg.click(".tabbar >> text=النهارده")
    pg.wait_for_selector(".next-title")
    pg.click("text=نبدأ ٢ دقيقة")
    pg.wait_for_selector(".ring-clock")
    t1 = pg.inner_text(".ring-clock")
    pg.wait_for_timeout(2200)
    t2 = pg.inner_text(".ring-clock")
    check("focus timer counts down", t1 != t2, f"{t1} -> {t2}")
    pg.click("text=استني شوية")
    p1 = pg.inner_text(".ring-clock")
    pg.wait_for_timeout(1500)
    check("pause holds the time", pg.inner_text(".ring-clock") == p1)
    pg.click(".focus-actions >> text=كمّلي")
    pg.screenshot(path=f"{SHOTS}/focus.png")
    pg.click("text=كفاية كده")
    pg.fill("#fm-last", "دورت على الرقم")
    pg.fill("#fm-next", "أتصل بعد العصر")
    pg.click(".focus-memory >> text=احفظي")
    pg.wait_for_timeout(400)

    # Projects screen shows memory
    pg.click(".tabbar >> text=حاجاتي")
    pg.click(".tab >> text=مشاريع")
    pg.wait_for_selector(".project-card")
    check("project card shows its saved next step", pg.locator(".project-card", has_text="أكمل تحبير الشجر").count() == 1)
    saved = {i["title"]: i for i in stored_items(pg)}
    check("timer's 'before you go' note is saved on the task it ran on", any(i["lastAction"] == "دورت على الرقم" and i["nextStep"] == "أتصل بعد العصر" for i in saved.values()))
    pg.screenshot(path=f"{SHOTS}/projects.png", full_page=True)
    check("Projects fits 360px", no_hscroll(pg))

    # Keyboard shortcut
    pg.keyboard.press("n")
    check("'N' opens quick capture", pg.locator(".capture-input").count() == 1)
    pg.keyboard.press("Escape")

    snapshot = sorted((i["id"], i["title"], i["status"]) for i in stored_items(pg))

    # ── Reload ────────────────────────────────────────────────────────────
    pg.reload()
    pg.wait_for_selector(".projects, .today, .screen")
    after = sorted((i["id"], i["title"], i["status"]) for i in stored_items(pg))
    check("everything persists after reload", after == snapshot)
    pg.goto(URL + "#today")
    pg.wait_for_selector(".today")
    today_text = " ".join(pg.locator(".bookmark, .next-card").all_inner_texts())
    check("saved next step is shown on Today after reload", "أتصل بعد العصر" in today_text, today_text[:200])
    check("energy remembered for today", pg.locator(".energy-pill").count() == 1)

    # Export
    pg.click(".tabbar >> text=أكتر")
    with pg.expect_download() as dl:
        pg.get_by_role("button", name="صدّري نسخة").click()
    path = dl.value.path()
    exported = json.load(open(path))
    check("export downloads a JSON with all items", exported.get("app") == "where-was-i" and len(exported["items"]) == len(snapshot))
    export_copy = os.path.join(SHOTS, "export.json")
    shutil.copy(path, export_copy)

    # Language switch
    pg.click("text=English")
    pg.wait_for_timeout(200)
    check("English switch flips to LTR", pg.evaluate("document.documentElement.dir") == "ltr" and pg.locator(".tabbar >> text=Today").count() == 1)
    pg.screenshot(path=f"{SHOTS}/more-en.png", full_page=True)
    check("More screen fits 360px", no_hscroll(pg))
    ctx.close()

    # ── Session 2: browser closed and reopened ───────────────────────────
    ctx = open_ctx(p)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(URL)
    pg.wait_for_selector(".today")
    reopened = sorted((i["id"], i["title"], i["status"]) for i in stored_items(pg))
    check("data survives closing and reopening the browser", reopened == snapshot)
    check("language choice survives reopening", pg.evaluate("document.documentElement.dir") == "ltr")
    pg.screenshot(path=f"{SHOTS}/today-en.png", full_page=True)
    # Dark mode look
    pg.goto(URL + "#more")
    pg.click("text=Dark")
    pg.goto(URL + "#today")
    pg.wait_for_timeout(300)
    pg.screenshot(path=f"{SHOTS}/today-dark.png", full_page=True)
    pg.goto(URL + "#more")
    pg.click("text=Light")
    pg.click("text=عربي")
    ctx.close()

    # ── Session 3: brand-new device, restore from the export ─────────────
    shutil.rmtree(PROFILE)
    os.makedirs(PROFILE)
    ctx = open_ctx(p)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(URL + "#more")
    pg.wait_for_selector(".more")
    check("new device starts empty", (stored_items(pg) or []) == [])
    pg.set_input_files("[data-testid=import-file]", export_copy)
    pg.click("text=بدّلي كل حاجة بيها")
    pg.wait_for_timeout(600)
    restored = sorted((i["id"], i["title"], i["status"]) for i in stored_items(pg))
    check("import restores every item", restored == snapshot)
    # Text backup (for phones where file download is blocked)
    pg.click("summary >> text=من غير ملفات")
    pg.get_by_role("button", name="انسخي النسخة كنص").click()
    pg.wait_for_timeout(400)
    fallback_ok = pg.locator("#backup-text").count() == 1 and pg.input_value("#backup-text").startswith('{"app":"where-was-i"')
    check("copy backup shows the full backup as selectable text", fallback_ok)
    pg.fill("#paste-backup", open(export_copy).read())
    pg.click("text=كمّلي")
    pg.click("text=ضيفيها على اللي موجود")
    pg.wait_for_timeout(500)
    merged = sorted((i["id"], i["title"], i["status"]) for i in stored_items(pg))
    check("restore from pasted text merges without duplicates", merged == snapshot)
    bad = os.path.join(SHOTS, "bad.json")
    open(bad, "w").write('{"hello": 1}')
    pg.set_input_files("[data-testid=import-file]", bad)
    pg.wait_for_timeout(200)
    check("wrong file is rejected with a message", pg.locator("[role=alert]", has_text="مش نسخة").count() == 1)
    ctx.close()

    # Small phone (320px) sanity
    ctx = p.chromium.launch_persistent_context(tempfile.mkdtemp(), viewport={"width": 320, "height": 640}, is_mobile=True, has_touch=True)
    pg = ctx.new_page()
    pg.goto(URL)
    pg.wait_for_selector(".today")
    ok = True
    for h in ["#today", "#all", "#all/projects", "#work", "#more"]:
        pg.goto(URL + h)
        pg.wait_for_timeout(200)
        ok = ok and no_hscroll(pg)
    check("all screens fit a 320px phone", ok)
    ctx.close()

shutil.rmtree(PROFILE, ignore_errors=True)
check("no JavaScript errors", not errors, "; ".join(errors[:3]))
failed = [r for r in results if not r[1]]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
sys.exit(1 if failed else 0)
