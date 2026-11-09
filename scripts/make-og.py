# Social share images (1200x630) for every tool page and the AI tools page.
# Run after adding or renaming tools:  python3 scripts/make-og.py
# Needs Python Playwright with Chrome (the images are committed to public/og/).
import json, re, subprocess, pathlib, html
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).resolve().parent.parent
out = root / "public" / "og"
out.mkdir(parents=True, exist_ok=True)
import base64
fontdir = root / "node_modules/@fontsource/schibsted-grotesk/files"
F800 = base64.b64encode((fontdir / "schibsted-grotesk-latin-800-normal.woff2").read_bytes()).decode()
F500 = base64.b64encode((fontdir / "schibsted-grotesk-latin-500-normal.woff2").read_bytes()).decode()

# Read the catalog through Node so this stays in sync with src/lib/tools.ts.
src = (root / "src/lib/tools.ts").read_text() + "\n" + (root / "src/lib/tools-pro.ts").read_text()
tools = []
for block in re.split(r"\n  \{\n", src)[1:]:
    slug = re.search(r'slug: "([^"]+)"', block)
    title = re.search(r'\n    title: "([^"]+)"', block)
    promise = re.search(r'\n    promise: "((?:[^"\\]|\\.)+)"', block)
    if not (slug and title and promise):
        continue
    level = re.search(r"\n    level: (\d)", block)
    engine = re.search(r'\n    engine: "(\w+)"', block)
    tools.append({
        "slug": slug.group(1),
        "title": title.group(1),
        "promise": promise.group(1).encode().decode("unicode_escape"),
        "level": int(level.group(1)) if level else 0,
        "engine": engine.group(1) if engine else "device",
    })
tools.append({"slug": "ai-tools", "title": "AI tools that do the hard part", "promise": "Voice, photos, video and documents. Try each one free.", "level": 2, "engine": "server"})

PLAN = {0: ("Free", "#0b7a6a"), 1: ("Basic", "#2f5bff"), 2: ("Pro", "#2f5bff"), 3: ("Premium", "#0f1b3d")}

def page(t):
    plan, color = PLAN[t["level"]]
    checks = ["Runs on your device", "Free, no signup", "No watermark"] if t["level"] == 0 else (
        ["Runs on your device", "One free try", f"{plan} plan"] if t["engine"] == "device" else ["Private AI processing", "One free try" if t["level"] < 3 else "Best-quality AI", f"{plan} plan"])
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:S;font-weight:800;src:url(data:font/woff2;base64,{F800}) format("woff2")}}
@font-face{{font-family:S;font-weight:500;src:url(data:font/woff2;base64,{F500}) format("woff2")}}
body{{margin:0;width:1200px;height:630px;background:#fff;font-family:S;color:#0f1b3d;display:flex;flex-direction:column;justify-content:center;padding:0 90px;box-sizing:border-box;position:relative;overflow:hidden}}
.b{{display:flex;align-items:center;gap:18px;font-weight:800;font-size:40px;letter-spacing:-.02em}}
.tag{{margin-left:14px;font-size:22px;padding:6px 16px;border-radius:99px;background:{color};color:{'#ffd98a' if t['level']==3 else '#fff'}}}
h1{{font-size:{70 if len(t['title'])<34 else 60}px;line-height:1.05;letter-spacing:-.025em;margin:36px 0 24px;font-weight:800;max-width:1000px}}
p{{font-size:30px;line-height:1.3;color:#33405f;margin:0;font-weight:500;max-width:1000px}}
.bar{{position:absolute;left:0;right:0;bottom:0;height:18px;background:#2f5bff}}
.c{{display:flex;gap:28px;margin-top:30px;font-size:25px;color:#0b7a6a;font-weight:500}}
.c span:before{{content:"✓ ";font-weight:800}}
</style></head><body>
<div class="b"><svg width="52" height="52" viewBox="0 0 32 32"><path d="M7 3h13l7 7v15a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z" fill="#2f5bff"/><path d="M20 3v4a3 3 0 0 0 3 3h4z" fill="#9db3ff"/><path d="M9.5 17.5l4 4 8.5-9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>Readily{'' if t['level']==0 else f'<span class="tag">{plan}</span>'}</div>
<h1>{html.escape(t['title'])}</h1>
<p>{html.escape(t['promise'])}</p>
<div class="c">{''.join(f'<span>{c}</span>' for c in checks)}</div>
<div class="bar"></div></body></html>"""

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome")
    pg = b.new_page(viewport={"width": 1200, "height": 630})
    for t in tools:
        pg.set_content(page(t))
        pg.evaluate("document.fonts.ready")
        pg.wait_for_timeout(50)
        pg.screenshot(path=str(out / f"{t['slug']}.png"))
    b.close()
subprocess.run(["node", "-e", f"const s=require('sharp');const fs=require('fs');(async()=>{{for(const f of fs.readdirSync('{out}')){{const p='{out}/'+f;const b=await s(p).png({{compressionLevel:9,palette:true,quality:90}}).toBuffer();fs.writeFileSync(p,b)}}}})()"], check=True, cwd=root)
print(f"{len(tools)} social images in public/og/")
