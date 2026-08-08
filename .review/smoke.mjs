import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const bad = [];
p.on('response', r => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
await p.goto('http://localhost:4173/rs3-leaderboard/', { waitUntil: 'networkidle' });
console.log('failed requests:'); bad.forEach(u => console.log('  ', u));
await b.close();
