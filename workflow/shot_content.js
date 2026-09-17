#!/usr/bin/env node
/** Gambar bersih untuk Ustaz (phone 390x844). Guna: node shot_content.js <url> <prefix> */
const { chromium } = require('playwright-core');
const url = process.argv[2] || 'http://127.0.0.1:8080/content';
const pre = process.argv[3] || '/tmp/shot';
const EXE = process.env.CHROME_HEADLESS
  || '/home/ubuntu/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell';

(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await p.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await p.waitForTimeout(1800);
  for (const t of ['Antrian', 'Prestasi', 'Panduan']) {
    await p.locator('nav button', { hasText: t }).first().click();
    await p.waitForTimeout(700);
    if (t === 'Antrian') { await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(250); }
    await p.screenshot({ path: `${pre}_${t.toLowerCase()}.png` });
  }
  await b.close();
  console.log('ok');
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
