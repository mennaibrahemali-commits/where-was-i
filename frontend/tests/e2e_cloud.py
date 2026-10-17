"""Accounts + sync, end to end, against the stand-in server
(tests/mock_supabase.mjs) and a build made with VITE_SUPABASE_URL pointing at it.

Run:
  node tests/mock_supabase.mjs 54321 &
  VITE_SUPABASE_URL=http://localhost:54321 VITE_SUPABASE_ANON_KEY=test-anon-key npx vite build --outDir dist-cloud
  npx vite preview --outDir dist-cloud --port 4174 &
  python3 tests/e2e_cloud.py http://localhost:4174/ http://localhost:54321 <screenshot-dir>
"""
import json
import os
import sys
import tempfile
import urllib.request

from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4174/"
API = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:54321"
SHOTS = sys.argv[3] if len(sys.argv) > 3 else tempfile.mkdtemp()
os.makedirs(SHOTS, exist_ok=True)
results, errors = [], []


def check(name, cond, detail=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + (f"  [{detail}]" if detail and not cond else ""))


def admin(path, body=None):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"content-type": "application/json"}, method="POST" if body is not None else "GET")
    return json.loads(urllib.request.urlopen(req).read() or "null")


def server_titles(email_user_id=None):
    rows = admin("/__admin/rows")
    return {(r["user_id"], r["data"].get("title")) for r in rows if not r["id"].startswith("__") and not r["data"].get("purged")}


def device(p, width=360):
    ctx = p.chromium.launch_persistent_context(tempfile.mkdtemp(), viewport={"width": width, "height": 740}, is_mobile=True, has_touch=True)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    return ctx, pg


def signup(pg, email, pw="secret123"):
    pg.goto(URL)
    pg.wait_for_selector(".auth")
    pg.click(".auth-tabs >> text=حساب جديد")
    pg.fill("#auth-email", email)
    pg.fill("#auth-password", pw)
    pg.click(".auth-form button[type=submit]")


def signin(pg, email, pw="secret123"):
    pg.goto(URL)
    pg.wait_for_selector(".auth")
    pg.click(".auth-tabs >> text=عندي حساب")
    pg.fill("#auth-email", email)
    pg.fill("#auth-password", pw)
    pg.click(".auth-form button[type=submit]")


def capture(pg, text):
    pg.click(".fab")
    pg.fill(".capture-input", text)
    pg.keyboard.press("Enter")
    pg.keyboard.press("Escape")


def wait_synced(pg):
    pg.goto(URL + "#more")
    pg.wait_for_selector(".account")
    pg.get_by_role("button", name="احفظي دلوقتي").click()
    pg.wait_for_selector(".sync-line.s-synced", timeout=10000)


with sync_playwright() as p:
    # ── Phone: sign-up screen ─────────────────────────────────────────────
    phone_ctx, phone = device(p)
    phone.goto(URL)
    phone.wait_for_selector(".auth")
    check("app asks to sign up first (Arabic, RTL)", phone.locator("text=اعملي الحساب").count() == 1 and phone.evaluate("document.documentElement.dir") == "rtl")
    phone.screenshot(path=f"{SHOTS}/auth.png", full_page=True)
    phone.fill("#auth-email", "not-an-email")
    phone.fill("#auth-password", "secret123")
    phone.click(".auth-form button[type=submit]")
    check("bad email gets a clear message", phone.locator("[role=alert]", has_text="الإيميل ده شكله").count() == 1)
    phone.fill("#auth-email", "menna@example.com")
    phone.fill("#auth-password", "123")
    phone.click(".auth-form button[type=submit]")
    check("short password gets a clear message", phone.locator("[role=alert]", has_text="كلمة السر قصيرة").count() == 1)
    phone.fill("#auth-password", "secret123")
    phone.click(".auth-form button[type=submit]")
    phone.wait_for_selector(".today", timeout=10000)
    check("sign-up opens the app", True)

    capture(phone, "عيش ولبن")
    capture(phone, "أرسم اسكتش للمعادي")
    phone.click(".tabbar >> text=الشغل")
    phone.fill(".work-add input >> nth=0", "لوجو لمحل ورد")
    phone.click(".work-add button[type=submit]")
    wait_synced(phone)
    a_rows = server_titles()
    check("items are saved to the account (server)", {"عيش ولبن", "أرسم اسكتش للمعادي", "لوجو لمحل ورد"} <= {t for _, t in a_rows}, str(a_rows))
    phone.screenshot(path=f"{SHOTS}/more-account.png", full_page=True)

    # ── Laptop: same account, different device ───────────────────────────
    lap_ctx, lap = device(p, 1200)
    signin(lap, "menna@example.com", "wrong-pass")
    lap.wait_for_selector("[role=alert] >> text=الإيميل أو كلمة السر غلط", timeout=8000)
    check("wrong password gets a clear message", True)
    signin(lap, "menna@example.com")
    lap.wait_for_selector(".today", timeout=10000)
    lap.goto(URL + "#all")
    lap.wait_for_selector(".item-row", timeout=10000)
    check("other device sees the same things after signing in", lap.locator(".item-row", has_text="عيش ولبن").count() == 1)
    lap.goto(URL + "#work")
    check("work board comes along too", lap.locator(".work-card", has_text="لوجو لمحل ورد").count() == 1)

    # edit on laptop → shows on phone
    lap.goto(URL + "#all")
    lap.click("text=عيش ولبن")
    lap.fill("#item-title", "عيش ولبن وجبنة")
    lap.keyboard.press("Escape")
    wait_synced(lap)
    phone.goto(URL + "#all")
    phone.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
    phone.wait_for_selector("text=عيش ولبن وجبنة", timeout=10000)
    check("a change on one device reaches the other", True)

    # delete for good on laptop → gone on phone
    lap.goto(URL + "#all")
    lap.click("text=أرسم اسكتش للمعادي")
    lap.click(".footer-actions >> text=امسحي")
    lap.click(".tab >> text=المحذوفات")
    lap.click("text=افضي المحذوفات")
    lap.click("text=امسحي للأبد")
    wait_synced(lap)
    phone.goto(URL + "#all/trash")
    phone.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
    phone.wait_for_timeout(2500)
    phone.goto(URL + "#all")
    check("permanent delete reaches the other device", phone.locator(".item-row", has_text="أرسم اسكتش").count() == 0)

    # ── Offline on the phone ──────────────────────────────────────────────
    phone_ctx.set_offline(True)
    phone.goto(URL + "#today")
    phone.wait_for_selector(".today")
    capture(phone, "أكلم ماما")
    phone.goto(URL + "#more")
    phone.wait_for_selector(".account")
    phone.wait_for_selector(".sync-line.s-offline", timeout=8000)
    check("offline: says things are kept on the device for now", True)
    phone.get_by_role("button", name="اخرجي من الحساب").click()
    phone.wait_for_selector("text=لسه ما اتحفظتش", timeout=8000)
    check("sign-out while offline warns about unsaved changes", True)
    phone.get_by_role("button", name="خليني").click()
    phone_ctx.set_offline(False)
    phone.evaluate("window.dispatchEvent(new Event('online'))")
    phone.wait_for_selector(".sync-line.s-synced", timeout=10000)
    check("back online: the offline change is saved to the account", "أكلم ماما" in {t for _, t in server_titles()})

    # reload keeps you signed in
    phone.reload()
    phone.wait_for_selector(".more", timeout=10000)
    check("still signed in after reload", phone.locator(".account").count() == 1)

    # ── A different person ────────────────────────────────────────────────
    other_ctx, other = device(p)
    signup(other, "sara@example.com")
    other.wait_for_selector(".today", timeout=10000)
    other.goto(URL + "#all")
    other.wait_for_timeout(1500)
    check("a new person sees none of Menna's things", other.locator(".item-row").count() == 0)
    capture(other, "حاجة سارة")
    wait_synced(other)
    phone.goto(URL + "#all")
    phone.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
    phone.wait_for_timeout(2000)
    check("and Menna doesn't see Sara's", phone.locator("text=حاجة سارة").count() == 0)

    # ── Sign out ──────────────────────────────────────────────────────────
    phone.goto(URL + "#more")
    phone.get_by_role("button", name="اخرجي من الحساب").click()
    phone.wait_for_selector(".auth", timeout=10000)
    left = phone.evaluate("""() => new Promise((res) => { const r = indexedDB.open('where-was-i', 1);
        r.onsuccess = () => { const q = r.result.transaction('kv').objectStore('kv').getAllKeys(); q.onsuccess = () => res(q.result.filter((k) => String(k).startsWith('state:'))); }; })""")
    check("sign-out removes the account's copy from the phone", left == [], str(left))
    signin(phone, "menna@example.com")
    phone.wait_for_selector(".today", timeout=10000)
    phone.goto(URL + "#all")
    phone.wait_for_selector("text=عيش ولبن وجبنة", timeout=10000)
    check("signing back in brings everything back", True)

    # ── Things saved before having an account ─────────────────────────────
    guest_ctx, guest = device(p)
    guest.goto(URL)
    guest.wait_for_selector(".auth")
    guest.evaluate("""() => new Promise((res) => { const r = indexedDB.open('where-was-i', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => { const tx = r.result.transaction('kv', 'readwrite');
          tx.objectStore('kv').put({ items: [{ id: 'g1', title: 'حاجة قديمة على الجهاز', area: 'other', status: 'open', createdAt: '2026-10-01T10:00:00Z', updatedAt: '2026-10-01T10:00:00Z', steps: [], links: [], completions: [] }] }, 'state');
          tx.oncomplete = () => res(true); }; })""")
    signup(guest, "new@example.com")
    guest.wait_for_selector(".confirm.guest", timeout=10000)
    check("offers to add things saved before the account", "١" in guest.inner_text(".confirm.guest") or "1" in guest.inner_text(".confirm.guest"))
    guest.click("text=ضيفيهم")
    wait_synced(guest)
    check("those things are now in the account", "حاجة قديمة على الجهاز" in {t for _, t in server_titles()})

    # ── Email confirmation turned on in the project ───────────────────────
    admin("/__admin/confirm-mode", {"on": True})
    conf_ctx, conf = device(p)
    signup(conf, "confirm@example.com")
    conf.wait_for_selector(".auth-sent", timeout=10000)
    check("with email confirmation on: says to check the inbox", "confirm@example.com" in conf.inner_text(".auth-sent"))
    admin("/__admin/confirm-mode", {"on": False})
    conf.screenshot(path=f"{SHOTS}/auth-check-email.png", full_page=True)

    # English sign-in screen
    conf.locator(".auth-sent").get_by_role("button", name="ادخلي").click()
    conf.click("text=English")
    check("sign-in screen switches to English, LTR", conf.locator("text=I have an account").count() == 1 and conf.evaluate("document.documentElement.dir") == "ltr")
    conf.get_by_role("tab", name="I have an account").click()
    conf.get_by_role("button", name="Forgot your password?").click()
    check("forgot-password screen opens", conf.locator(".auth-title", has_text="Forgot your password?").count() == 1)
    conf.fill("#auth-email", "menna@example.com")
    conf.click(".auth-form button[type=submit]")
    conf.wait_for_selector(".auth-info", timeout=8000)
    check("reset link message shown", "link" in conf.inner_text(".auth-info"))
    for c in (phone_ctx, lap_ctx, other_ctx, guest_ctx, conf_ctx):
        c.close()

check("no JavaScript errors", not errors, "; ".join(errors[:3]))
failed = [r for r in results if not r[1]]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
sys.exit(1 if failed else 0)
