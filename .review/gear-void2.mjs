import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:4173/rs3-leaderboard/gear/", { waitUntil: "networkidle" });
await p.waitForTimeout(1500);
console.log(await p.evaluate(() => {
  const out = [];
  document.querySelectorAll("ol > li").forEach((li, i) => {
    const ring = li.querySelector('[role="img"]');
    if (!ring) return;
    const rb = ring.getBoundingClientRect();
    let max = 0;
    const w = document.createTreeWalker(li, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      if (!n.textContent.trim()) continue;
      const r = document.createRange();
      r.selectNodeContents(n);
      for (const rect of r.getClientRects()) if (rect.right < rb.left) max = Math.max(max, rect.right);
    }
    out.push(`row ${i + 1}: last glyph ends ${Math.round(max)}, ring starts ${Math.round(rb.left)}, void ${Math.round(rb.left - max)}px`);
  });
  return out.join("\n");
}));
await b.close();
