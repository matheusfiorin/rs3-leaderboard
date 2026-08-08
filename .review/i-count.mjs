import { chromium } from '@playwright/test';
const BASE = 'http://localhost:4173/rs3-leaderboard';
const OUT = '/home/mbaraofiorin/dev/rs3-leaderboard/.review/shots/interaction';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const log = (...a) => console.log(...a);
await p.goto(BASE + '/pvm/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1600);
const inp = p.locator('input[type=number]').first();
await inp.scrollIntoViewIfNeeded();

// real user flow: click into field, select all, type a number
await inp.click({ clickCount: 3 });
await p.keyboard.type('150', { delay: 90 });
await p.waitForTimeout(500);
log('select-all then type "150" ->', await inp.inputValue());

// backspace-to-clear then type
await inp.click({ clickCount: 3 });
await p.keyboard.press('Backspace');
await p.waitForTimeout(300);
log('after Backspace (cleared) ->', await inp.inputValue());
await p.keyboard.type('42', { delay: 90 });
await p.waitForTimeout(400);
log('then type "42" ->', await inp.inputValue());

// arrow keys / wheel
await inp.click();
await p.keyboard.press('ArrowUp');
await p.waitForTimeout(300);
log('ArrowUp ->', await inp.inputValue());

// blur then check store
await p.keyboard.press('Tab');
await p.waitForTimeout(1000);
log('LS:', await p.evaluate(()=>localStorage.getItem('sexta-era:progress')));
await p.screenshot({ path: OUT + '/x-count-typing.png' });
await b.close();
