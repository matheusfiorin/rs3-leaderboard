import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:4173/rs3-leaderboard";
const VP = { width: 360, height: 740 };
const OUT = ".review/shots/mobilesmall/interact";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: VP, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
  userAgent: devices["iPhone 13"].userAgent, reducedMotion: "reduce",
});
const log = (...a) => console.log(...a);
async function open(route) {
  const page = await ctx.newPage();
  page.on("pageerror", (e) => log("  PAGEERROR", e.message.slice(0, 120)));
  await page.goto(BASE + (route === "/" ? "/" : route + "/"), { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  return page;
}
const shot = (p, n) => p.screenshot({ path: join(OUT, n + ".png") });
const byText = (page, t) => page.locator(`button:text-is("${t}")`).first();

// PVM
{
  const page = await open("/pvm");
  const inc = page.getByRole("button", { name: "Increase" }).first();
  const geo = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button[aria-label="Increase"]')];
    const i = document.querySelector('input[type=number]');
    const r = b[0]?.getBoundingClientRect(), ri = i?.getBoundingClientRect();
    return { plus: r && { w: Math.round(r.width), h: Math.round(r.height) },
      input: ri && { w: Math.round(ri.width), h: Math.round(ri.height) },
      count: b.length };
  });
  log("PVM counter:", JSON.stringify(geo));
  await inc.scrollIntoViewIfNeeded();
  await shot(page, "pvm-kills-before");
  for (let i = 0; i < 3; i++) { await inc.click(); await page.waitForTimeout(220); }
  await page.waitForTimeout(600);
  await shot(page, "pvm-kills-after");
  log("PVM KILLS LOGGED after +3:", await page.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && e.textContent.trim() === "Kills logged");
    return el ? el.parentElement.innerText.replace(/\n/g, " ") : "n/a";
  }));
  const tiers = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll("button").forEach((b) => {
      const t = b.textContent.trim();
      if (/^(All|Early|Mid|Late|End|Apex)\s*\d+$/.test(t)) {
        const r = b.getBoundingClientRect();
        out.push({ t, w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.left), y: Math.round(r.top + window.scrollY) });
      }
    });
    return out;
  });
  log("PVM tier chips:", JSON.stringify(tiers));
  const ro = page.locator('button:has-text("Ready only")').first();
  log("PVM Ready only exists:", await ro.count());
  const h0 = await page.evaluate(() => document.documentElement.scrollHeight);
  await ro.click();
  await page.waitForTimeout(700);
  const h1 = await page.evaluate(() => document.documentElement.scrollHeight);
  log("PVM height Ready only:", h0, "->", h1);
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Ready only/i.test(x.textContent)); b.scrollIntoView({ block: "start" }); });
  await page.waitForTimeout(300);
  await shot(page, "pvm-readyonly");
  // Apex tier
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Apex\s*\d+$/.test(x.textContent.trim())); b?.click(); });
  await page.waitForTimeout(700);
  await shot(page, "pvm-apex");
  log("PVM height Apex+Ready:", await page.evaluate(() => document.documentElement.scrollHeight));
  await page.close();
}

// GEAR style tabs
{
  const page = await open("/gear");
  const tabs = await page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => /^(Melee|Ranged|Magic|Necro)$/.test(b.textContent.trim())).map((b) => { const r = b.getBoundingClientRect(); return { t: b.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height), pressed: b.getAttribute("aria-pressed"), sel: b.getAttribute("aria-selected"), role: b.getAttribute("role") }; }));
  log("GEAR style tabs:", JSON.stringify(tabs));
  await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Melee")?.click(); });
  await page.waitForTimeout(700);
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, "gear-melee");
  log("GEAR after Melee:", await page.evaluate(() => document.body.innerText.split("\n").filter(Boolean).slice(0, 12).join(" | ")));
  await page.close();
}

// QUESTS
{
  const page = await open("/quests");
  const search = page.getByPlaceholder(/Search quests/i);
  const sgeo = await search.evaluate((e) => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), fs: getComputedStyle(e).fontSize }; });
  log("QUESTS search geo:", JSON.stringify(sgeo));
  await search.scrollIntoViewIfNeeded();
  await search.fill("dragon");
  await page.waitForTimeout(700);
  await shot(page, "quests-search");
  log("QUESTS 'dragon' ->", await page.evaluate(() => document.body.innerText.match(/\d+ quests/)?.[0]), "h", await page.evaluate(() => document.documentElement.scrollHeight));
  await search.fill("zzzzz");
  await page.waitForTimeout(600);
  await shot(page, "quests-empty");
  log("QUESTS empty tail:", (await page.evaluate(() => document.body.innerText)).slice(-250).replace(/\n/g, " | "));
  await search.fill("");
  await page.waitForTimeout(500);
  const ds = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll("*").forEach((e) => {
      if (e.children.length === 0 && e.textContent.trim() === "D") {
        const r = e.getBoundingClientRect();
        out.push({ tag: e.tagName, cls: (e.className || "").slice(0, 50), w: Math.round(r.width), h: Math.round(r.height), cursor: getComputedStyle(e).cursor });
      }
    });
    return out.slice(0, 3);
  });
  log("QUESTS D marks:", JSON.stringify(ds));
  log("QUESTS height:", await page.evaluate(() => document.documentElement.scrollHeight),
      "rows:", await page.evaluate(() => document.querySelectorAll("li").length));
  // is there pagination / show more?
  log("QUESTS 'more' buttons:", await page.evaluate(() => [...document.querySelectorAll("button,a")].filter((b) => /more|load|show all|next/i.test(b.textContent)).map((b) => b.textContent.trim().slice(0, 30))));
  await page.close();
}

// MONEY filters
{
  const page = await open("/money");
  const before = await page.getByText(/Showing \d+ of/).first().innerText();
  await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Gather")?.click(); });
  await page.waitForTimeout(600);
  const after = await page.getByText(/Showing \d+ of/).first().innerText();
  log("MONEY Gather filter:", before, "->", after);
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Gather"); b.scrollIntoView({ block: "center" }); });
  await page.waitForTimeout(300);
  await shot(page, "money-filter-gather");
  // toggle Available to me off
  await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => /Available to me/i.test(b.textContent))?.click(); });
  await page.waitForTimeout(600);
  log("MONEY after Available-off:", await page.getByText(/Showing \d+ of/).first().innerText());
  await shot(page, "money-available-off");
  // labels on segmented groups?
  log("MONEY group labels:", await page.evaluate(() => [...document.querySelectorAll("[role=group],fieldset,legend")].map((g) => g.getAttribute("aria-label") || g.tagName + ":" + g.textContent.trim().slice(0, 30))));
  await page.close();
}

// HOME stat row + wrapped numbers
{
  const page = await open("/");
  const stats = await page.evaluate(() => {
    const out = [];
    for (const l of ["Quests done", "Total level", "Updated"]) {
      const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && e.textContent.trim() === l);
      if (!el) { out.push({ l, missing: true }); continue; }
      const val = el.nextElementSibling;
      const rl = el.getBoundingClientRect(), rv = val?.getBoundingClientRect();
      out.push({ l, labelTop: Math.round(rl.top), labelH: Math.round(rl.height),
        valTop: rv ? Math.round(rv.top) : null, valText: val?.textContent.trim(),
        valSize: val ? getComputedStyle(val).fontSize : null, valColor: val ? getComputedStyle(val).color : null });
    }
    return out;
  });
  log("HOME hero stats:", JSON.stringify(stats));
  const trunc = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll("*").forEach((e) => {
      if (e.children.length) return;
      if (e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 0)
        out.push({ t: e.textContent.trim().slice(0, 36), cw: e.clientWidth, sw: e.scrollWidth });
    });
    return out.slice(0, 25);
  });
  log("HOME truncated:", JSON.stringify(trunc));
  const wrapNum = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll("*").forEach((e) => {
      if (e.children.length) return;
      const t = e.textContent.trim();
      if (/^\d[\d,.KMB]*\s*\/\s*\d/.test(t) || /^\/\s*\d+$/.test(t)) {
        const r = e.getBoundingClientRect();
        const lh = parseFloat(getComputedStyle(e).lineHeight) || 16;
        if (r.height > lh * 1.6) out.push({ t, h: Math.round(r.height), lh: Math.round(lh), w: Math.round(r.width) });
      }
    });
    return out;
  });
  log("HOME wrapped numeric:", JSON.stringify(wrapNum));
  // eyebrow / link collision in section headers
  const heads = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll("h2").forEach((h) => {
      const wrap = h.parentElement?.parentElement;
      const link = wrap?.querySelector("a");
      const eyebrow = h.nextElementSibling;
      if (!eyebrow) return;
      const re = eyebrow.getBoundingClientRect(), rl = link?.getBoundingClientRect();
      out.push({ h: h.textContent.trim(), eyebrow: eyebrow.textContent.trim().slice(0, 40),
        eyebrowLines: Math.round(re.height / (parseFloat(getComputedStyle(eyebrow).lineHeight) || 16)),
        eyeRight: Math.round(re.right), linkLeft: rl ? Math.round(rl.left) : null,
        overlap: rl ? Math.round(re.right - rl.left) : null });
    });
    return out;
  });
  log("HOME section headers:", JSON.stringify(heads));
  await page.close();
}
await browser.close();
