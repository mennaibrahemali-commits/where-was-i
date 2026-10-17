"""Browser checks for the work board, important-today card, focus alarm and
reminders. Uses Playwright's fake clock to jump ahead in time.

Run:  python3 tests/e2e_v2.py http://localhost:4173/ <screenshot-dir>
"""
import os
import sys
import tempfile
from datetime import datetime

from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4173/"
SHOTS = sys.argv[2] if len(sys.argv) > 2 else tempfile.mkdtemp()
os.makedirs(SHOTS, exist_ok=True)
results = []
errors = []


def check(name, cond, detail=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + (f"  [{detail}]" if detail and not cond else ""))


def no_hscroll(pg):
    return pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")


def stored(pg):
    return pg.evaluate("""() => new Promise((res) => {
        const r = indexedDB.open('where-was-i', 1);
        r.onsuccess = () => { const g = r.result.transaction('kv').objectStore('kv').get('state'); g.onsuccess = () => res(g.result ? g.result.items : []); };
    })""")


def shot_on_fail(pg, name):
    try:
        pg.screenshot(path=f"{SHOTS}/fail-{name}.png", full_page=True)
    except Exception:
        pass


with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context(tempfile.mkdtemp(), viewport={"width": 360, "height": 740},
                                               device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.grant_permissions(["notifications"], origin=URL.rstrip("/"))
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    # Fake clock: Saturday 17 Oct 2026, 10:00 local time.
    pg.clock.install(time=datetime(2026, 10, 17, 10, 0, 0))
    # Record alarm activity: count oscillators started and vibrations.
    pg.add_init_script("""
      window.__osc = 0; window.__vib = 0;
      const AC = window.AudioContext;
      if (AC) { const orig = AC.prototype.createOscillator; AC.prototype.createOscillator = function () { window.__osc++; return orig.call(this); }; }
      navigator.vibrate = () => { window.__vib++; return true; };
    """)
    pg.goto(URL)
    pg.wait_for_selector(".today")
    pg.click("text=مش عايزة أقول")

    # ── Work board ───────────────────────────────────────────────────────
    pg.click(".tabbar >> text=الشغل")
    pg.wait_for_selector(".work")
    pg.fill(".work-add input >> nth=0", "لوجو لمحل ورد")
    pg.fill(".work-add input >> nth=1", "مدام سلوى")
    pg.click(".work-add button[type=submit]")
    pg.fill(".work-add input >> nth=0", "بوستر حفلة")
    pg.click(".work-add button[type=submit]")
    check("work board has 2 jobs in New", pg.locator(".column.st-new .work-card").count() == 2)
    card = pg.locator(".work-card", has_text="لوجو لمحل ورد")
    check("job card shows the client", "مدام سلوى" in card.inner_text())
    card.locator(".move-btn").click()
    check("move to 'Working on it'", pg.locator(".column.st-doing .work-card", has_text="لوجو").count() == 1)
    pg.locator(".work-card", has_text="لوجو").locator(".move-btn").click()
    pg.locator(".work-card", has_text="لوجو").locator(".move-btn").click()
    check("move on to Revisions", pg.locator(".column.st-revisions .work-card", has_text="لوجو").count() == 1)
    pg.locator(".work-card", has_text="لوجو").locator(".move-btn").click()
    pg.wait_for_timeout(300)
    check("Delivered column receives it", pg.locator(".column.st-delivered .work-card", has_text="لوجو").count() == 1)
    w = next(i for i in stored(pg) or [] if i["title"] == "لوجو لمحل ورد") if stored(pg) else None
    pg.wait_for_timeout(500)
    w = next((i for i in stored(pg) if i["title"] == "لوجو لمحل ورد"), None)
    check("delivered job is stored as done in the work space", w and w["status"] == "done" and w["space"] == "work" and w["stage"] == "delivered", str(w and (w["status"], w["stage"])))
    pg.screenshot(path=f"{SHOTS}/work.png", full_page=True)
    check("work board: page itself doesn't scroll sideways", no_hscroll(pg))

    # Quick add from the Work screen goes to work
    pg.click(".fab")
    check("+ on Work screen defaults to Work", pg.locator(".space-switch .seg.on", has_text="الشغل").count() == 1)
    pg.fill(".capture-input", "فاتورة شهر أكتوبر")
    pg.keyboard.press("Enter")
    pg.keyboard.press("Escape")
    check("captured job lands in New", pg.locator(".column.st-new .work-card", has_text="فاتورة").count() == 1)

    # Work stays out of daily views
    pg.click(".tabbar >> text=النهارده")
    pg.wait_for_selector(".today")
    check("Today doesn't show work", pg.locator("text=بوستر حفلة").count() == 0 and pg.locator("text=فاتورة شهر").count() == 0)
    pg.click(".tabbar >> text=حاجاتي")
    check("My things doesn't show work", pg.locator(".item-row", has_text="بوستر").count() == 0)

    # ── Important today + reminder ───────────────────────────────────────
    pg.click(".fab")
    check("+ elsewhere defaults to My life", pg.locator(".space-switch .seg.on", has_text="حياتي").count() == 1)
    pg.fill(".capture-input", "أدفع فاتورة النت النهارده")
    pg.keyboard.press("Enter")
    pg.fill(".capture-input", "أكلم الدكتور")
    pg.keyboard.press("Enter")
    pg.keyboard.press("Escape")
    pg.click("text=أدفع فاتورة النت النهارده")
    pg.click(".item-sheet >> text=مهمة")
    pg.fill("#item-remind", "10:30")
    cal = pg.get_by_role("button", name="ضيفيها لكالندر الموبايل")
    check("add-to-calendar offered once there's a date/time", cal.count() == 1)
    with pg.expect_download() as dl:
        cal.click()
    ics = open(dl.value.path(), encoding="utf-8").read()
    check("calendar file has the time and an alarm", "DTSTART:20261017T103000" in ics and "BEGIN:VALARM" in ics, ics[:120])
    pg.keyboard.press("Escape")
    pg.click(".tabbar >> text=النهارده")
    pg.wait_for_selector(".today")
    # it's either the main suggestion or in the "important today" card, never both
    in_card = pg.locator(".today-card.important", has_text="أدفع فاتورة").count()
    in_next = pg.locator(".next-card", has_text="أدفع فاتورة").count()
    check("important item due today is up front on Today (once)", in_card + in_next == 1, f"card={in_card} next={in_next}")
    pg.click("text=حاجة تانية")
    check("after 'something else', it moves into the 'Important today' card", pg.locator(".today-card.important", has_text="أدفع فاتورة").count() == 1)
    pg.screenshot(path=f"{SHOTS}/today-important.png", full_page=True)

    pg.clock.fast_forward("35:00")  # → 10:35
    pg.wait_for_timeout(1500)
    check("reminder fires at its time (in-app message)", pg.locator(".toast", has_text="تذكير").count() >= 1)
    rem_osc = pg.evaluate("window.__osc")
    check("reminder plays a bell", rem_osc > 0, str(rem_osc))

    # ── Focus alarm ──────────────────────────────────────────────────────
    pg.click(".tabbar >> text=حاجاتي")
    pg.click("text=أكلم الدكتور")
    pg.click(".sheet-actions >> text=ابدئي")
    pg.click(".mode-btn >> nth=0")  # 2 minutes
    pg.wait_for_selector(".ring-clock")
    check("timer asks to keep the screen on", pg.locator("text=سيبي الشاشة مفتوحة").count() == 1)
    before = pg.evaluate("window.__osc")
    pg.clock.fast_forward("02:05")
    pg.wait_for_timeout(1200)
    check("timer end shows 'time is up'", pg.locator(".focus-ended").count() == 1)
    rang = pg.evaluate("window.__osc") - before
    check("alarm rings (bell tones started)", rang >= 8, str(rang))
    check("alarm vibrates where supported", pg.evaluate("window.__vib") > 0)
    pg.clock.fast_forward("00:04")
    pg.wait_for_timeout(500)
    again = pg.evaluate("window.__osc") - before
    check("alarm keeps ringing until stopped", again > rang, f"{rang} -> {again}")
    pg.screenshot(path=f"{SHOTS}/alarm.png")
    pg.click("text=وقّفي الصوت")
    stopped_at = pg.evaluate("window.__osc")
    pg.clock.fast_forward("00:06")
    pg.wait_for_timeout(500)
    check("'stop the sound' stops it", pg.evaluate("window.__osc") == stopped_at)
    pg.locator(".focus-ended").get_by_role("button", name="كفاية كده").click()
    shot_on_fail(pg, "after-enough")
    pg.locator(".focus-memory").get_by_role("button", name="تخطي").click()

    # Sound can be turned off
    pg.click(".tabbar >> text=أكتر")
    pg.click("text=صوت المنبّه لما وقت التركيز يخلص")
    pg.click(".tabbar >> text=حاجاتي")
    pg.click("text=أكلم الدكتور")
    pg.click(".sheet-actions >> text=ابدئي")
    pg.click(".mode-btn >> nth=0")
    b2 = pg.evaluate("window.__osc")
    pg.clock.fast_forward("02:05")
    pg.wait_for_timeout(1000)
    check("with sound off: no bell, still shows time is up", pg.evaluate("window.__osc") == b2 and pg.locator(".focus-ended").count() == 1)
    pg.locator(".focus-ended").get_by_role("button", name="كفاية كده").click()
    pg.locator(".focus-memory").get_by_role("button", name="تخطي").click()

    # Daily nudge at 18:00 for important + not done
    pg.clock.fast_forward("07:30:00")  # → about 18:10
    pg.wait_for_timeout(1500)
    check("evening nudge about important things left today", pg.locator(".toast", has_text="متنسيش").count() >= 1)

    pg.goto(URL + "#more")
    pg.wait_for_selector(".more")
    pg.screenshot(path=f"{SHOTS}/more-v2.png", full_page=True)
    check("More fits 360px", no_hscroll(pg))
    ctx.close()

check("no JavaScript errors", not errors, "; ".join(errors[:3]))
failed = [r for r in results if not r[1]]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
sys.exit(1 if failed else 0)
