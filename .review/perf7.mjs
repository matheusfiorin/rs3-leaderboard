import { chromium } from "@playwright/test";
const b = await chromium.launch();
for (const route of ["/", "/skills", "/money", "/pvm", "/quests"]) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:4173/rs3-leaderboard" + (route === "/" ? "/" : route + "/"), { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => {
    const imgs = Array.from(document.images);
    const res = performance.getEntriesByType("resource").filter(x => /\.(png|webp|gif|jpg|svg)$/.test(x.name));
    const inView = imgs.filter(i => { const b = i.getBoundingClientRect(); return b.top < innerHeight && b.bottom > 0; });
    return {
      imgTags: imgs.length, inViewport: inView.length,
      lazy: imgs.filter(i => i.loading === "lazy").length,
      noDims: imgs.filter(i => !i.getAttribute("width") && !i.style.width && getComputedStyle(i).width === "auto").length,
      imgRequests: res.length, imgKB: Math.round(res.reduce((a, x) => a + (x.decodedBodySize || x.transferSize || 0), 0) / 1024),
      fontRequests: performance.getEntriesByType("resource").filter(x => /\.woff2?$/.test(x.name)).length,
      fontKB: Math.round(performance.getEntriesByType("resource").filter(x => /\.woff2?$/.test(x.name)).reduce((a, x) => a + (x.decodedBodySize || 0), 0) / 1024),
      cssKB: Math.round(performance.getEntriesByType("resource").filter(x => x.name.endsWith(".css")).reduce((a, x) => a + (x.decodedBodySize || 0), 0) / 1024),
      dataFetch: performance.getEntriesByType("resource").filter(x => x.name.includes("/data/")).map(x => x.name.split("/").pop() + " " + Math.round((x.decodedBodySize || 0) / 1024) + "KB"),
    };
  });
  console.log(route, JSON.stringify(r));
  await page.close(); await ctx.close();
}
await b.close();
