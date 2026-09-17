#!/usr/bin/env node
/**
 * test_flow.js — ujian hujung ke hujung butang Tolak di Content Studio.
 * Guna: node test_flow.js <url> <kataLaluan> <kodDraf>
 * Bukti: toast muncul, kod draf ditolak, jalur "tindakan terakhir" berubah.
 */
const { chromium } = require('playwright-core');
const url = process.argv[2] || 'http://127.0.0.1:8080/content';
const KEY = process.argv[3] || '';
const CODE = process.argv[4] || 'V7-17';
const EXE = process.env.CHROME_HEADLESS
  || '/home/ubuntu/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell';

(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(k => localStorage.setItem('wfkey', k), KEY);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await p.waitForTimeout(1800);

  const before = await p.evaluate(() => document.body.innerText.match(/Menunggu\s*(\d+)/)?.[1] || '?');

  // cari kad dengan kod yang diminta, klik Tolak
  const card = p.locator('article', { has: p.locator('span', { hasText: CODE }) }).first();
  await card.scrollIntoViewIfNeeded();
  await card.locator('button', { hasText: 'Tolak' }).first().click();
  await p.waitForTimeout(400);
  const confirmVisible = await card.locator('button', { hasText: 'Pasti tolak?' }).count();
  await card.locator('button', { hasText: 'Pasti tolak?' }).first().click();
  await p.waitForTimeout(2500);

  const after = await p.evaluate(() => ({
    toast: (document.querySelector('div.fixed.bottom-5') || {}).innerText || '',
    tindakan: (() => {
      const el = [...document.querySelectorAll('div')].find(d => d.innerText.trim().startsWith('TINDAKAN TERAKHIR'));
      return el ? el.innerText.replace(/\n+/g, ' | ') : '';
    })(),
    antrianCards: document.querySelectorAll('section[x-show] article').length,
    keyModalOpen: !!document.querySelector('input[type=password]'),
  }));

  await p.screenshot({ path: '/tmp/flow_after.png' });
  console.log(JSON.stringify({ errs, sebelumMenunggu: before, confirmVisible, after }, null, 1));
  await b.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
