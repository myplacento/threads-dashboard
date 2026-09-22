#!/usr/bin/env node
/** Buka satu kad draf dalam Content Studio + tangkap gambar penuh. */
const { chromium } = require('playwright-core');
const code = process.argv[2] || 'B9-6';
const out = process.argv[3] || '/tmp/kad.png';
const EXE = '/home/ubuntu/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell';

(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 780, height: 1400 }, deviceScaleFactor: 2 });
  await p.goto('http://127.0.0.1:8080/content', { waitUntil: 'networkidle', timeout: 30000 });
  await p.waitForTimeout(1800);
  await p.locator('nav button', { hasText: 'Antrian' }).first().click();
  await p.waitForTimeout(500);
  const card = p.locator('article', { has: p.locator('span', { hasText: code }) }).first();
  await card.scrollIntoViewIfNeeded();
  await card.locator('button', { hasText: 'Baca penuh' }).first().click();
  await p.waitForTimeout(800);
  await card.screenshot({ path: out });
  const n = await card.locator('p.whitespace-pre-wrap').count();
  console.log(JSON.stringify({ code, mesej_dipapar: n, save: out }));
  await b.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
