#!/usr/bin/env node
/**
 * verify_content.js — ujian headless Content Studio.
 * Guna: node verify_content.js <url> [prefixScreenshot]
 * Semak: pageerror Alpine, tab switch, kira kad, buka thread, mod edit, screenshot phone+desktop.
 */
const { chromium } = require('playwright-core');
const url = process.argv[2] || 'http://127.0.0.1:8080/content';
const prefix = process.argv[3] || '/tmp/cs';
const EXE = process.env.CHROME_HEADLESS
  || '/home/ubuntu/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell';

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const out = {};

  for (const vp of [{ n: 'phone', w: 390, h: 844 }, { n: 'desktop', w: 1280, h: 900 }]) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    const errs = [];
    page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 160)); });

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1800);

    const base = await page.evaluate(() => ({
      alpine: typeof window.Alpine !== 'undefined',
      articles: document.querySelectorAll('article').length,
      statCards: document.querySelectorAll('section.grid > div').length,
      bodyLen: document.body.innerText.length,
      headerText: (document.querySelector('header') || {}).innerText || '',
      studioUndefined: document.body.innerText.includes('undefined'),
    }));

    // --- tab switch
    const tabs = {};
    for (const label of ['Tayang', 'Prestasi', 'Panduan', 'Antrian']) {
      try {
        await page.locator('nav button', { hasText: label }).first().click();
        await page.waitForTimeout(650);
        tabs[label] = await page.evaluate(() => {
          const m = document.querySelector('main');
          const vis = [...m.children].filter(c => c.offsetParent !== null);
          return vis.reduce((a, c) => a + c.innerText.trim().length, 0);
        });
      } catch (e) { tabs[label] = 'ERR:' + e.message.slice(0, 50); }
    }

    // --- buka thread + mod edit pada kad pertama
    let inter = {};
    try {
      await page.locator('nav button', { hasText: 'Antrian' }).first().click();
      await page.waitForTimeout(500);
      const baca = page.locator('button', { hasText: 'Baca penuh' }).first();
      await baca.click(); await page.waitForTimeout(650);
      inter.threadLines = await page.evaluate(() =>
        [...document.querySelectorAll('article p.whitespace-pre-wrap')].length);
      const edit = page.locator('button', { hasText: 'Edit' }).first();
      await edit.click(); await page.waitForTimeout(650);
      inter.editBox = await page.locator('textarea').count();
      inter.editChars = await page.evaluate(() => (document.querySelector('textarea') || {}).value?.length || 0);
    } catch (e) { inter.err = e.message.slice(0, 120); }

    out[vp.n] = { base, tabs, inter, errs: errs.slice(0, 6) };
    await page.screenshot({ path: `${prefix}_${vp.n}.png`, fullPage: true });

    // screenshot setiap tab (phone sahaja)
    if (vp.n === 'phone') {
      for (const label of ['Antrian', 'Tayang', 'Prestasi', 'Panduan']) {
        await page.locator('nav button', { hasText: label }).first().click();
        await page.waitForTimeout(700);
        await page.screenshot({ path: `${prefix}_tab_${label.toLowerCase()}.png` });
      }
    }
    await page.close();
  }

  console.log(JSON.stringify(out, null, 1));
  const bad = Object.values(out).some(r => r.errs.length || !r.base.alpine || r.base.bodyLen < 500);
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
