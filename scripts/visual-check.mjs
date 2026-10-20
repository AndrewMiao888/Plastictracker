import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), 'plastic-free-qa-'));
const screenshots = join(root, '.qa');
const origin = 'http://localhost:5174';
const server = spawn(process.execPath, [join(root, '.output', 'server', 'index.mjs')], {
  cwd: root,
  env: { ...process.env, PORT: '5174', DATA_FILE: join(temporary, 'school.json') },
  stdio: 'pipe',
});
let browser;

async function waitForTotal(page, value) {
  await page.waitForFunction(expected => document.querySelector('.hero-number strong')?.textContent === expected, value);
}

try {
  for (let attempt = 0; attempt < 50; attempt++) {
    try { if ((await fetch(`${origin}/api/dashboard`)).ok) break; }
    catch { await new Promise(resolve => setTimeout(resolve, 100)); }
    if (attempt === 49) throw new Error('QA server did not start.');
  }
  await mkdir(screenshots, { recursive: true });
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
  await page.locator('.hero-number strong').waitFor();
  assert.equal(await page.locator('.hero-number strong').innerText(), '463');
  await page.screenshot({ path: join(screenshots, 'desktop.png'), fullPage: true });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  mobile.on('pageerror', error => errors.push(error.message));
  await mobile.goto(origin);
  await mobile.locator('.hero-number strong').waitFor();
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 0, `Mobile page overflows by ${overflow}px.`);
  await mobile.screenshot({ path: join(screenshots, 'mobile.png'), fullPage: true });

  await page.locator('.heading-button').click();
  await page.locator('#class-name').fill('5ABCD');
  await page.locator('.modal-submit').click();
  assert.match(await page.locator('.form-error').innerText(), /one digit followed by 1 to 3 letters/i);
  await page.locator('#class-name').fill('7D');
  await page.locator('.modal-submit').click();
  await page.locator('.modal').waitFor({ state: 'hidden' });
  assert.equal(await page.locator('#class-select').inputValue(), '7D');

  await page.locator('.stepper input').nth(0).fill('12');
  await page.locator('.stepper input').nth(1).fill('18');
  await page.locator('.save-button').click();
  await page.locator('.celebration').waitFor();
  await waitForTotal(page, '481');
  await page.getByRole('button', { name: 'See achievements' }).click();
  assert.ok((await page.locator('.leader-list').innerText()).includes('Class 7D'));

  await page.locator('.stepper input').nth(1).fill('22');
  await page.locator('.save-button').click();
  await waitForTotal(page, '485');
  await page.locator('.delete-button').click();
  await waitForTotal(page, '463');

  const invalidResponse = await fetch(`${origin}/api/classes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '55A' }),
  });
  assert.equal(invalidResponse.status, 400);
  const duplicateResponse = await fetch(`${origin}/api/classes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '7d' }),
  });
  assert.equal(duplicateResponse.status, 409);
  const overlongResponse = await fetch(`${origin}/api/classes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '5ABCD' }),
  });
  assert.equal(overlongResponse.status, 400);
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Remove sample data' }).click();
  await waitForTotal(page, '0');
  assert.equal(await page.locator('#class-select').inputValue(), '7D');
  assert.equal(await page.locator('.leader-row').count(), 1);
  assert.deepEqual(errors, []);
  console.log('Visual and interaction checks passed. Screenshots: .qa/desktop.png, .qa/mobile.png');
} finally {
  await browser?.close();
  server.kill();
  await rm(temporary, { recursive: true, force: true });
}
