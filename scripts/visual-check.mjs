import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const root = fileURLToPath(new URL('../', import.meta.url))
const temporary = await mkdtemp(join(tmpdir(), 'plastic-free-qa-'))
const screenshots = join(root, '.qa')
const origin = 'http://localhost:5174'
const seedPassword = 'SeedClass#2026'
const newPassword = 'NewClass#2026'
const changedPassword = 'UpdatedClass#2026'
const server = spawn(process.execPath, [join(root, '.output', 'server', 'index.mjs')], {
  cwd: root,
  env: { ...process.env, PORT: '5174', DATA_FILE: join(temporary, 'school.json'), DATABASE_URL: '', POSTGRES_URL: '' },
  stdio: 'pipe',
})
let browser

function schoolWeek() {
  const local = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Adelaide', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  const date = new Date(`${local}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
  return date.toISOString().slice(0, 10)
}

async function postClass(name, password) {
  const response = await fetch(`${origin}/api/classes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, password }),
  })
  assert.equal(response.status, 201)
  const cookie = response.headers.get('set-cookie')?.split(';')[0]
  assert.ok(cookie?.startsWith('plastic_class_session='))
  return cookie
}

async function waitForTotal(page, value) {
  await page.waitForFunction(expected => document.querySelector('.hero-number strong')?.textContent === expected, value)
}

try {
  for (let attempt = 0; attempt < 80; attempt++) {
    try { if ((await fetch(`${origin}/api/dashboard`)).ok) break }
    catch { await new Promise(resolve => setTimeout(resolve, 100)) }
    if (attempt === 79) throw new Error('QA server did not start.')
  }
  const week = schoolWeek()
  for (const [name, lunches, items] of [['6AB', 39, 54], ['5B', 31, 43], ['3C', 23, 29]]) {
    const cookie = await postClass(name, seedPassword)
    const response = await fetch(`${origin}/api/classes/${name}/weeks/${week}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ lunches, items }),
    })
    assert.equal(response.status, 200)
  }
  const publicData = await (await fetch(`${origin}/api/dashboard`)).json()
  assert.equal(publicData.classes.length, 3)
  assert.ok(!JSON.stringify(publicData).includes('passwordHash'))
  assert.ok(!JSON.stringify(publicData).includes(seedPassword))

  await mkdir(screenshots, { recursive: true })
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(origin)
  await waitForTotal(page, '126')
  assert.equal(await page.locator('link[rel="icon"]').getAttribute('href'), '/favicon.svg')
  assert.equal((await page.request.get(`${origin}/favicon.svg`)).status(), 200)
  assert.equal(await page.locator('.stepper').count(), 0)
  assert.match(await page.locator('.locked-state').innerText(), /Sign in to edit Class 6AB/)
  await page.screenshot({ path: join(screenshots, 'desktop.png'), fullPage: true })

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  mobile.on('pageerror', error => errors.push(error.message))
  await mobile.goto(origin)
  await waitForTotal(mobile, '126')
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  assert.ok(overflow <= 0, `Mobile page overflows by ${overflow}px.`)
  await mobile.screenshot({ path: join(screenshots, 'mobile.png'), fullPage: true })

  const anonymousWrite = await fetch(`${origin}/api/classes/6AB/weeks/${week}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lunches: 1, items: 1 }),
  })
  assert.equal(anonymousWrite.status, 401)
  assert.equal((await fetch(`${origin}/api/classes/6AB`, { method: 'DELETE' })).status, 401)
  assert.equal((await fetch(`${origin}/api/sample-classes`, { method: 'DELETE' })).status, 410)
  assert.equal((await fetch(`${origin}/api/classes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '8Q' }),
  })).status, 400)
  const guardedCookie = await postClass('8Q', seedPassword)
  const foreignWrite = await fetch(`${origin}/api/classes/8Q/weeks/${week}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: guardedCookie, Origin: 'https://other.example' },
    body: JSON.stringify({ lunches: 1, items: 1 }),
  })
  assert.equal(foreignWrite.status, 403)
  for (let attempt = 0; attempt < 5; attempt++) {
    const wrongLogin = await fetch(`${origin}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '8Q', password: 'wrong-password' }),
    })
    assert.equal(wrongLogin.status, 401)
  }
  const lockedLogin = await fetch(`${origin}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '8Q', password: seedPassword }),
  })
  assert.equal(lockedLogin.status, 429)
  const guardedDelete = await fetch(`${origin}/api/classes/8Q`, {
    method: 'DELETE', headers: { 'Content-Type': 'application/json', Cookie: guardedCookie },
    body: JSON.stringify({ password: seedPassword }),
  })
  assert.equal(guardedDelete.status, 200)

  await page.getByRole('button', { name: 'Sign in to Class 6AB' }).click()
  await page.locator('#login-password').fill('incorrect-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  assert.match(await page.locator('.form-error').innerText(), /incorrect/i)
  await page.locator('#login-password').fill(seedPassword)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.locator('.modal').waitFor({ state: 'hidden' })
  assert.equal(await page.locator('.stepper').count(), 2)
  const sessionCookie = (await page.context().cookies()).find(cookie => cookie.name === 'plastic_class_session')
  assert.equal(sessionCookie?.httpOnly, true)
  await page.locator('.stepper input').nth(1).fill('60')
  await page.locator('.save-button').click()
  await waitForTotal(page, '132')
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.locator('.locked-state').waitFor()
  assert.equal(await page.locator('.stepper').count(), 0)

  await page.locator('.heading-button').click()
  await page.locator('#class-name').fill('55A')
  await page.locator('#new-password').fill(newPassword)
  await page.locator('#confirm-password').fill(newPassword)
  await page.getByRole('button', { name: 'Create class', exact: true }).last().click()
  assert.match(await page.locator('.form-error').innerText(), /one digit followed/i)
  await page.locator('#class-name').fill('7D')
  await page.getByRole('button', { name: 'Create class', exact: true }).last().click()
  await page.locator('.modal').waitFor({ state: 'hidden' })
  assert.equal(await page.locator('#class-select').inputValue(), '7D')
  assert.equal(await page.locator('.stepper').count(), 2)
  const wrongClass = await page.request.put(`${origin}/api/classes/6AB/weeks/${week}`, { data: { lunches: 1, items: 1 } })
  assert.equal(wrongClass.status(), 403)
  await page.locator('.stepper input').nth(0).fill('12')
  await page.locator('.stepper input').nth(1).fill('18')
  await page.locator('.save-button').click()
  await waitForTotal(page, '150')
  await page.getByRole('button', { name: 'See achievements' }).click()

  await page.getByRole('button', { name: 'Manage' }).click()
  await page.locator('#current-password').fill(newPassword)
  await page.locator('#updated-password').fill(changedPassword)
  await page.locator('#confirm-updated-password').fill(changedPassword)
  await page.getByRole('button', { name: 'Update password' }).click()
  await page.locator('.modal').waitFor({ state: 'hidden' })
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.getByRole('button', { name: 'Sign in to Class 7D' }).click()
  await page.locator('#login-password').fill(newPassword)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  assert.match(await page.locator('.form-error').innerText(), /incorrect/i)
  await page.locator('#login-password').fill(changedPassword)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.locator('.modal').waitFor({ state: 'hidden' })

  await page.getByRole('button', { name: 'Manage' }).click()
  await page.getByRole('button', { name: 'Delete this class' }).click()
  await page.locator('#delete-confirm-name').fill('7D')
  await page.locator('#delete-password').fill('wrong-password')
  await page.getByRole('button', { name: 'Delete class permanently' }).click()
  assert.match(await page.locator('.form-error').innerText(), /incorrect/i)
  await page.locator('#delete-password').fill(changedPassword)
  await page.getByRole('button', { name: 'Delete class permanently' }).click()
  await page.locator('.modal').waitFor({ state: 'hidden' })
  await waitForTotal(page, '132')
  assert.ok(!(await page.locator('.leader-list').innerText()).includes('Class 7D'))
  assert.deepEqual(errors, [])
  console.log('Public, auth, visual, and class-management checks passed. Screenshots: .qa/desktop.png, .qa/mobile.png')
} finally {
  await browser?.close()
  server.kill()
  await rm(temporary, { recursive: true, force: true })
}
