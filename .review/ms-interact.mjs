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
  page.on("console", (m) => { if (m.type() === "error") log("  CONSOLE", m.text().slice(0, 120)); });
  await page.goto(BASE + (route === "/" ? "/" : route + "/"), { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  return page;
}
const shot = (p, n) => p.screenshot({ path: join(OUT, n + ".png") });

// ---------- MONEY ----------
{
  const page = await open("/money");
  log("MONEY: details count:", await page.locator("details").count());
  const show = page.locator("details summary").first();
  const info = await show.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const faint = el.querySelector("span:last-child");
    return { h: Math.round(r.height), w: Math.round(r.width),
      faintColor: faint ? getComputedStyle(faint).color : null,
      faintFs: faint ? getComputedStyle(faint).fontSize : null,
      marker: getComputedStyle(el, "::marker").content };
  });
  log("MONEY summary:", JSON.stringify(info));
  await show.scrollIntoViewIfNeeded();
  await shot(page, "money-show-before");
  const beforeText = await page.evaluate(() => document.body.innerText.length);
  await show.click();
  await page.waitForTimeout(500);
  const afterText = await page.evaluate(() => document.body.innerText.length);
  log("MONEY SHOW click: textLen", beforeText, "->", afterText);
  await show.scrollIntoViewIfNeeded();
  await shot(page, "money-show-after");
  const tbl = await page.locator("details table").first().evaluate((t) => {
    const wrap = t.parentElement;
    return { tableW: Math.round(t.getBoundingClientRect().width), wrapW: wrap.clientWidth,
      scrollW: wrap.scrollWidth, overflows: wrap.scrollWidth > wrap.clientWidth + 1 };
  }).catch((e) => "err " + e.message.slice(0, 60));
  log("MONEY recipe table:", JSON.stringify(tbl));

  const groups = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll("button").forEach((b) => {
      const r = b.getBoundingClientRect();
      if (r.height > 0 && r.height < 44)
        out.push({ t: b.innerText.replace(/\n/g, "|").slice(0, 18), w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.left), y: Math.round(r.top + window.scrollY) });
    });
    return out.slice(0, 30);
  });
  log("MONEY small buttons:", JSON.stringify(groups));

  const before = await page.getByText(/Showing \d+ of/).first().innerText().catch(() => "n/a");
  await page.getByRole("button", { name: /^GATHER/ }).first().click().catch((e) => log("  GATHER click fail", e.message.slice(0, 80)));
  await page.waitForTimeout(400);
  const after = await page.getByText(/Showing \d+ of/).first().innerText().catch(() => "n/a");
  log("MONEY filter GATHER:", before, "->", after);
  await shot(page, "money-filter-gather");
  await page.close();
}

// ---------- GEAR ----------
{
  const page = await open("/gear");
  const boxes = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll("input[type=checkbox]").forEach((i) => {
      const r = i.getBoundingClientRect();
      const lab = i.closest("label");
      const lr = lab?.getBoundingClientRect();
      out.push({ w: Math.round(r.width), h: Math.round(r.height), op: getComputedStyle(i).opacity,
        labelW: lr ? Math.round(lr.width) : null, labelH: lr ? Math.round(lr.height) : null });
    });
    return out.slice(0, 4);
  });
  log("GEAR checkbox geometry:", JSON.stringify(boxes));
  const owned = page.getByText("Owned", { exact: true }).first();
  await owned.scrollIntoViewIfNeeded();
  await shot(page, "gear-owned-before");
  await owned.click();
  await page.waitForTimeout(700);
  await shot(page, "gear-owned-after");
  const summaryAfter = await page.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && e.textContent.trim() === "pieces marked owned");
    return el ? el.parentElement.innerText.replace(/\n/g, " ") : "n/a";
  });
  log("GEAR owned toggle -> header now:", summaryAfter);
  await page.getByRole("button", { name: /^MELEE$/ }).first().click().catch((e) => log("  MELEE fail", e.message.slice(0, 60)));
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, "gear-melee");
  log("GEAR after MELEE eyebrow:", await page.evaluate(() => document.body.innerText.split("\n").slice(0, 6).join(" | ")));
  await page.close();
}

// ---------- PVM ----------
{
  const page = await open("/pvm");
  const geo = await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")].filter((b) => ["+", "−", "-"].includes(b.innerText.trim()));
    return btns.slice(0, 4).map((b) => { const r = b.getBoundingClientRect(); return { t: b.innerText.trim(), w: Math.round(r.width), h: Math.round(r.height) }; });
  });
  log("PVM counter geometry:", JSON.stringify(geo));
  const plus = page.getByRole("button", { name: "+" }).first();
  await plus.scrollIntoViewIfNeeded();
  await shot(page, "pvm-kills-before");
  for (let i = 0; i < 3; i++) { await plus.click(); await page.waitForTimeout(250); }
  await page.waitForTimeout(700);
  await shot(page, "pvm-kills-after");
  const kl = await page.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && e.textContent.trim() === "KILLS LOGGED");
    return el ? el.parentElement.innerText.replace(/\n/g, " ") : "n/a";
  });
  log("PVM KILLS LOGGED card after +3:", kl);
  const tiers = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll("button").forEach((b) => {
      const t = b.innerText.replace(/\n/g, "");
      if (/^(ALL|EARLY|MID|LATE|END|APEX)\s*\d+$/.test(t)) {
        const r = b.getBoundingClientRect();
        out.push({ t, w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.left), y: Math.round(r.top) });
      }
    });
    return out;
  });
  log("PVM tier chips:", JSON.stringify(tiers));
  await page.getByRole("button", { name: /READY ONLY/ }).first().click().catch((e) => log("  READY fail", e.message.slice(0, 60)));
  await page.waitForTimeout(600);
  await shot(page, "pvm-readyonly");
  log("PVM height after READY ONLY:", await page.evaluate(() => document.documentElement.scrollHeight));
  await page.close();
}

// ---------- QUESTS ----------
{
  const page = await open("/quests");
  const search = page.getByPlaceholder(/Search quests/i);
  await search.scrollIntoViewIfNeeded();
  await search.fill("dragon slayer");
  await page.waitForTimeout(600);
  await shot(page, "quests-search");
  log("QUESTS search ->", await page.evaluate(() => document.body.innerText.match(/(\d+) quests/)?.[0] ?? "n/a"),
      "h", await page.evaluate(() => document.documentElement.scrollHeight));
  await search.fill("zzzzz");
  await page.waitForTimeout(500);
  await shot(page, "quests-empty");
  log("QUESTS empty tail:", (await page.evaluate(() => document.body.innerText)).slice(-300).replace(/\n/g, " | "));
  await search.fill("");
  await page.waitForTimeout(400);
  const ds = await page.evaluate(() => {
    const el = [...document.querySelectorAll("*")].filter((e) => e.children.length === 0 && e.textContent.trim() === "D");
    return el.slice(0, 3).map((e) => { const r = e.getBoundingClientRect(); return { tag: e.tagName, w: Math.round(r.width), h: Math.round(r.height), cursor: getComputedStyle(e).cursor }; });
  });
  log("QUESTS D pills:", JSON.stringify(ds));
  log("QUESTS full height:", await page.evaluate(() => document.documentElement.scrollHeight));
  await page.close();
}

// ---------- HOME ----------
{
  const page = await open("/");
  const stats = await page.evaluate(() => {
    const labels = ["QUESTS DONE", "TOTAL LEVEL", "UPDATED"];
    const out = [];
    for (const l of labels) {
      const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && e.textContent.trim() === l);
      if (!el) { out.push({ l, missing: true }); continue; }
      const val = el.nextElementSibling;
      const rl = el.getBoundingClientRect(), rv = val?.getBoundingClientRect();
      out.push({ l, labelTop: Math.round(rl.top), labelH: Math.round(rl.height),
        valTop: rv ? Math.round(rv.top) : null, valText: val?.innerText,
        valSize: val ? getComputedStyle(val).fontSize : null, valColor: val ? getComputedStyle(val).color : null });
    }
    return out;
  });
  log("HOME hero stat row:", JSON.stringify(stats));
  const trunc = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll("*").forEach((e) => {
      if (e.children.length) return;
      if (e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 0)
        out.push({ t: e.textContent.trim().slice(0, 36), cw: e.clientWidth, sw: e.scrollWidth });
    });
    return out.slice(0, 20);
  });
  log("HOME truncated:", JSON.stringify(trunc));
  const wrapNum = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll("*").forEach((e) => {
      if (e.children.length) return;
      const t = e.textContent.trim();
      if (/^\d[\d,.KMB]*\s*\/\s*\d/.test(t)) {
        const r = e.getBoundingClientRect();
        const lh = parseFloat(getComputedStyle(e).lineHeight) || 16;
        if (r.height > lh * 1.6) out.push({ t, h: Math.round(r.height), lh: Math.round(lh), w: Math.round(r.width) });
      }
    });
    return out;
  });
  log("HOME wrapped numeric pairs:", JSON.stringify(wrapNum));
  await page.close();
}

await browser.close();
