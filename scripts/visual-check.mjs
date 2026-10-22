import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
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
const adminTestPassword = 'PrincipalTest#2026'
const changedAdminPassword = 'PrincipalUpdated#2026'
const seedCookies = new Map()
const server = spawn(process.execPath, [join(root, '.output', 'server', 'index.mjs')], {
  cwd: root,
  env: { ...process.env, PORT: '5174', DATA_FILE: join(temporary, 'school.json'), DATABASE_URL: '', POSTGRES_URL: '', ADMIN_BOOTSTRAP_PASSWORD: adminTestPassword },
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

async function putWeek(name, cookie, week, lunches, items) {
  const response = await fetch(`${origin}/api/classes/${name}/weeks/${week}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ lunches, items }),
  })
  assert.equal(response.status, 200)
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
  await mkdir(screenshots, { recursive: true })
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const emptyPage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  await emptyPage.goto(origin)
  await waitForTotal(emptyPage, '0')
  assert.match(await emptyPage.locator('.hero-empty').innerText(), /sustainable journey starts here/i)
  assert.match(await emptyPage.locator('.table-empty').innerText(), /first entry will appear as soon as a class checks in/i)
  assert.equal(await emptyPage.locator('.hero-visual').getAttribute('data-stage'), 'seed')
  assert.ok((await emptyPage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0)
  await emptyPage.screenshot({ path: join(screenshots, 'empty-mobile.png'), fullPage: true })
  await emptyPage.close()
  const week = schoolWeek()
  for (const [name, lunches, items] of [['6AB', 39, 54], ['5B', 31, 43], ['3C', 23, 29]]) {
    const cookie = await postClass(name, seedPassword)
    seedCookies.set(name, cookie)
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

  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(origin)
  await waitForTotal(page, '126')
  const iconHrefs = await page.locator('link[rel="icon"]').evaluateAll(links => links.map(link => link.getAttribute('href')))
  assert.ok(iconHrefs.some(href => /^\/st-andrews-plastic-free-icon\.png\?v=/.test(href || '')))
  assert.ok(iconHrefs.some(href => /^\/plastic-free-favicon\.svg\?v=/.test(href || '')))
  assert.ok(iconHrefs.some(href => /^\/plastic-free-favicon-32\.png\?v=/.test(href || '')))
  assert.ok(iconHrefs.some(href => /^\/plastic-free-favicon\.ico\?v=/.test(href || '')))
  assert.match(await page.locator('link[rel="apple-touch-icon"]').getAttribute('href'), /^\/st-andrews-plastic-free-icon\.png\?v=/)
  assert.match(await page.locator('link[rel="apple-touch-icon-precomposed"]').getAttribute('href'), /^\/apple-touch-icon-precomposed\.png\?v=/)
  assert.match(await page.locator('link[rel="manifest"]').getAttribute('href'), /^\/site\.webmanifest\?v=/)
  for (const asset of [
    'favicon.ico', 'favicon.svg', 'favicon-32x32.png', 'apple-touch-icon.png', 'icon-192x192.png', 'icon-512x512.png',
    'plastic-free-favicon.ico', 'plastic-free-favicon.svg', 'plastic-free-favicon-32.png',
    'apple-touch-icon-precomposed.png', 'st-andrews-plastic-free-icon.png',
    'plastic-free-icon-192.png', 'plastic-free-icon-512.png', 'site.webmanifest',
  ]) {
    assert.equal((await page.request.get(`${origin}/${asset}`)).status(), 200)
  }
  const versionResponse = await page.request.get(`${origin}/api/version`)
  assert.equal(versionResponse.status(), 200)
  assert.ok((await versionResponse.json()).version)
  assert.equal(await page.locator('.hero-visual').getAttribute('data-stage'), 'sprout')
  assert.equal(await page.locator('.hero-empty').count(), 0)
  assert.equal(await page.locator('.table-head').isVisible(), true)
  assert.equal(await page.locator('.stepper').count(), 0)
  assert.match(await page.locator('.locked-state').innerText(), /Sign in to edit Class 6AB/)
  await page.screenshot({ path: join(screenshots, 'desktop.png'), fullPage: true })

  await putWeek('5B', seedCookies.get('5B'), week, 31, 54)
  await page.reload()
  await waitForTotal(page, '137')
  const leaders = page.locator('#leaderboard .leader-row')
  assert.match(await leaders.nth(0).innerText(), /Class 5B[\s\S]*Tied for #1/)
  assert.match(await leaders.nth(1).innerText(), /Class 6AB[\s\S]*Tied for #1/)
  assert.equal(await leaders.nth(0).locator('.leader-rank').innerText(), '=1')
  assert.equal(await leaders.nth(1).locator('.leader-rank').innerText(), '=1')
  assert.equal(await leaders.nth(2).locator('.leader-rank').innerText(), '3')
  await page.locator('#leaderboard').getByRole('button', { name: 'XP earned' }).click()
  assert.match(await leaders.nth(0).innerText(), /Class 6AB[\s\S]*240[\s\S]*XP earned/)
  assert.match(await leaders.nth(1).innerText(), /Class 5B[\s\S]*224[\s\S]*XP earned/)
  assert.equal(await leaders.nth(1).locator('.leader-rank').innerText(), '2')
  await putWeek('5B', seedCookies.get('5B'), week, 39, 54)
  await page.reload()
  await page.locator('#leaderboard').getByRole('button', { name: 'XP earned' }).click()
  assert.equal(await leaders.nth(0).locator('.leader-rank').innerText(), '=1')
  assert.equal(await leaders.nth(1).locator('.leader-rank').innerText(), '=1')
  assert.match(await leaders.nth(0).innerText(), /Tied for #1/)
  assert.match(await leaders.nth(1).innerText(), /Tied for #1/)
  await page.screenshot({ path: join(screenshots, 'leaderboard-tie-desktop.png'), fullPage: true })
  await putWeek('5B', seedCookies.get('5B'), week, 31, 43)
  await page.reload()
  await waitForTotal(page, '126')

  const priorDate = new Date(`${week}T00:00:00Z`)
  priorDate.setUTCDate(priorDate.getUTCDate() - 7)
  const priorWeek = priorDate.toISOString().slice(0, 10)
  await putWeek('6AB', seedCookies.get('6AB'), priorWeek, 1, 0)
  await page.reload()
  assert.match(await page.locator('.streak-summary').innerText(), /2-week streak/)
  await page.locator('#leaderboard').getByRole('button', { name: 'Streak' }).click()
  assert.match(await leaders.nth(0).innerText(), /Class 6AB[\s\S]*2[\s\S]*weeks in a row/)
  assert.equal(await leaders.nth(0).locator('.leader-rank').innerText(), '1')
  assert.equal(await leaders.nth(1).locator('.leader-rank').innerText(), '=2')
  assert.equal(await leaders.nth(2).locator('.leader-rank').innerText(), '=2')
  const removePriorWeek = await fetch(`${origin}/api/classes/6AB/weeks/${priorWeek}`, {
    method: 'DELETE', headers: { Cookie: seedCookies.get('6AB') },
  })
  assert.equal(removePriorWeek.status, 200)
  await page.reload()
  assert.match(await page.locator('.streak-summary').innerText(), /1-week streak/)

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  mobile.on('pageerror', error => errors.push(error.message))
  await mobile.goto(origin)
  await waitForTotal(mobile, '126')
  assert.equal(await mobile.locator('.table-head').isVisible(), false)
  assert.equal(await mobile.locator('.activity-table .table-row').first().evaluate(element => getComputedStyle(element).display), 'grid')
  assert.match(await mobile.locator('.activity-table .table-row').first().innerText(), /Items saved/i)
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  assert.ok(overflow <= 0, `Mobile page overflows by ${overflow}px.`)
  await mobile.screenshot({ path: join(screenshots, 'mobile.png'), fullPage: true })
  await mobile.locator('#leaderboard').getByRole('button', { name: 'Streak' }).click()
  assert.match(await mobile.locator('#leaderboard .leader-row').first().innerText(), /week in a row/)
  assert.ok((await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0)
  await mobile.screenshot({ path: join(screenshots, 'streak-mobile.png'), fullPage: true })
  await mobile.setViewportSize({ width: 320, height: 700 })
  const narrowOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  assert.ok(narrowOverflow <= 0, `Narrow mobile page overflows by ${narrowOverflow}px.`)
  assert.equal(await mobile.locator('.activity-table .table-row').first().evaluate(element => element.scrollWidth > element.clientWidth), false)
  await page.locator('#class-select').selectOption('5B')
  assert.match(await page.locator('.badge.near').first().innerText(), /items to go/)
  await page.locator('#class-select').selectOption('6AB')

  const dataFile = join(temporary, 'school.json')
  const legacyData = JSON.parse(await readFile(dataFile, 'utf8'))
  legacyData.classes.push({ name: '9Z', sample: false, createdAt: new Date().toISOString(), weeks: {} })
  await writeFile(dataFile, JSON.stringify(legacyData))
  await page.reload()
  await page.locator('#class-select').selectOption('9Z')
  assert.match(await page.locator('.locked-state').innerText(), /Claim Class 9Z/)
  assert.equal((await page.request.post(`${origin}/api/classes/9Z/claim`, { data: { password: 'short' } })).status(), 400)
  const foreignClaim = await fetch(`${origin}/api/classes/9Z/claim`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://other.example' },
    body: JSON.stringify({ password: seedPassword }),
  })
  assert.equal(foreignClaim.status, 403)
  await page.getByRole('button', { name: 'Claim Class 9Z' }).click()
  await page.locator('#claim-password').fill(seedPassword)
  await page.locator('#confirm-claim-password').fill('different-password')
  await page.getByRole('button', { name: 'Claim class', exact: true }).click()
  assert.match(await page.locator('.form-error').innerText(), /do not match/i)
  await page.locator('#confirm-claim-password').fill(seedPassword)
  await page.getByRole('button', { name: 'Claim class', exact: true }).click()
  await page.locator('.modal').waitFor({ state: 'hidden' })
  assert.equal(await page.locator('.stepper').count(), 2)
  assert.equal((await page.request.post(`${origin}/api/classes/9Z/claim`, { data: { password: newPassword } })).status(), 409)
  const claimedData = await (await fetch(`${origin}/api/dashboard`)).json()
  assert.equal(claimedData.classes.find(entry => entry.name === '9Z')?.claimable, false)
  assert.ok(!JSON.stringify(claimedData).includes('passwordHash'))
  await page.getByRole('button', { name: 'Manage' }).click()
  await page.getByRole('button', { name: 'Delete this class' }).click()
  await page.locator('#delete-confirm-name').fill('9Z')
  await page.locator('#delete-password').fill(seedPassword)
  await page.getByRole('button', { name: 'Delete class permanently' }).click()
  await page.locator('.modal').waitFor({ state: 'hidden' })
  await page.locator('#class-select').selectOption('6AB')

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
  await page.getByRole('button', { name: 'Go to overview' }).click()
  await page.waitForFunction(() => window.scrollY < 20)

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

  const classCannotAdmin = await fetch(`${origin}/api/admin/goal`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: seedCookies.get('5B') },
    body: JSON.stringify({ goal: 1500 }),
  })
  assert.equal(classCannotAdmin.status, 401)
  assert.equal((await page.request.put(`${origin}/api/admin/settings`, { data: { goal: 1500, settings: {} } })).status(), 401)
  for (const [path, method, data] of [
    ['/api/admin/levels', 'PUT', { levels: [] }],
    ['/api/admin/badges', 'PUT', { badges: [] }],
    [`/api/admin/weeks/${week}/label`, 'PUT', { label: 'Week 1 Term 4' }],
    ['/api/admin/classes/6AB/xp', 'POST', { amount: 50 }],
  ]) {
    const response = await fetch(`${origin}${path}`, { method, headers: { 'Content-Type': 'application/json', Cookie: seedCookies.get('5B') }, body: JSON.stringify(data) })
    assert.equal(response.status, 401, `${method} ${path} must require principal access`)
  }
  await page.locator('.footer-admin-link').click()
  await page.locator('#admin-login-password').fill('incorrect-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  assert.match(await page.locator('.form-error').innerText(), /incorrect/i)
  await page.locator('#admin-login-password').fill(adminTestPassword)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.locator('.modal').waitFor({ state: 'hidden' })
  await page.locator('#admin').waitFor()
  await page.screenshot({ path: join(screenshots, 'principal-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  const adminOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  assert.ok(adminOverflow <= 0, `Principal mobile page overflows by ${adminOverflow}px.`)
  await page.screenshot({ path: join(screenshots, 'principal-mobile.png'), fullPage: true })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.locator('#school-goal').fill('1500')
  await page.locator('#school-week-name').fill('Waste-Free Wednesday')
  await page.getByRole('button', { name: 'Background #eaf3f6' }).click()
  await page.getByRole('button', { name: 'Accent #a33d62' }).click()
  await page.locator('#school-font').selectOption('Georgia')
  await page.getByRole('button', { name: 'Save settings' }).click()
  await page.waitForFunction(() => document.querySelector('.hero-number')?.textContent?.includes('1,500'))
  const configured = await (await fetch(`${origin}/api/dashboard`)).json()
  assert.equal(configured.goal, 1500)
  assert.deepEqual(configured.settings, {
    weekName: 'Waste-Free Wednesday', backgroundColor: '#eaf3f6', accentColor: '#a33d62', fontFamily: 'Georgia',
  })
  assert.match(await page.locator('.page-heading .eyebrow').innerText(), /WASTE-FREE WEDNESDAY/)
  assert.equal(await page.locator('.app-shell').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(234, 243, 246)')
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.heading-button')).backgroundColor === 'rgb(163, 61, 98)')
  assert.equal(await page.locator('.heading-button').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(163, 61, 98)')
  assert.match(await page.locator('.page-heading h1').evaluate(element => getComputedStyle(element).fontFamily), /Georgia/)
  const invalidSettings = await page.request.put(`${origin}/api/admin/settings`, { data: {
    goal: 1500, settings: { ...configured.settings, backgroundColor: '#14241f' },
  } })
  assert.equal(invalidSettings.status(), 400)
  await page.reload()
  assert.equal(await page.locator('#school-week-name').inputValue(), 'Waste-Free Wednesday')
  await page.screenshot({ path: join(screenshots, 'custom-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  const customOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  assert.ok(customOverflow <= 0, `Customised mobile page overflows by ${customOverflow}px.`)
  await page.screenshot({ path: join(screenshots, 'custom-mobile.png'), fullPage: true })
  await page.setViewportSize({ width: 1440, height: 1000 })
  assert.equal((await page.request.put(`${origin}/api/admin/levels`, { data: { levels: [{ name: 'Only One', threshold: 0 }] } })).status(), 400)
  assert.equal((await page.request.put(`${origin}/api/admin/badges`, { data: { badges: [{ id: 'bad', name: 'Bad Badge', description: 'Invalid icon', icon: 'Unknown', metric: 'items', threshold: 1 }] } })).status(), 400)
  assert.equal((await page.request.put(`${origin}/api/admin/weeks/2026-10-20/label`, { data: { label: 'Week 1 Term 4' } })).status(), 400)
  assert.equal((await page.request.post(`${origin}/api/admin/classes/6AB/xp`, { data: { amount: -1 } })).status(), 400)
  await page.locator('#label-week').fill(week)
  await page.locator('#label-text').fill('Week 1 Term 4')
  await page.getByRole('button', { name: 'Save week name' }).click()
  await page.waitForFunction(() => document.querySelector('.week-picker')?.textContent?.includes('Week 1 Term 4'))
  assert.match(await page.locator('.activity-week').first().innerText(), /Week 1 Term 4/)
  assert.equal((await (await fetch(`${origin}/api/dashboard`)).json()).weekLabels[week], 'Week 1 Term 4')
  await page.getByRole('button', { name: 'Add level' }).click()
  await page.getByRole('textbox', { name: 'Level 2 name' }).fill('Eco Pathfinder')
  await page.getByRole('spinbutton', { name: 'Level 2 XP threshold' }).fill('100')
  await page.getByRole('button', { name: 'Save levels' }).click()
  await page.waitForFunction(() => document.querySelector('.level-card h3')?.textContent === 'Eco Pathfinder')
  const configuredLevels = (await (await fetch(`${origin}/api/dashboard`)).json()).levels
  assert.equal(configuredLevels.length, 6)
  assert.equal(configuredLevels[1].name, 'Eco Pathfinder')
  await page.getByRole('button', { name: 'Add badge' }).click()
  await page.locator('#badge-name').fill('Eco Champion')
  await page.locator('#badge-description').fill('Earn 250 XP')
  await page.locator('#badge-icon').selectOption('Sparkles')
  await page.locator('#badge-metric').selectOption('xp')
  await page.locator('#badge-threshold').fill('250')
  await page.getByRole('button', { name: 'Save badge' }).click()
  await page.locator('.modal').waitFor({ state: 'hidden' })
  assert.equal((await (await fetch(`${origin}/api/dashboard`)).json()).badges.at(-1).name, 'Eco Champion')
  await page.getByRole('button', { name: 'Edit Eco Champion badge' }).click()
  await page.locator('#badge-description').fill('Earn 260 XP')
  await page.locator('#badge-threshold').fill('260')
  await page.getByRole('button', { name: 'Save badge' }).click()
  await page.locator('.modal').waitFor({ state: 'hidden' })
  assert.equal((await (await fetch(`${origin}/api/dashboard`)).json()).badges.at(-1).threshold, 260)
  await page.reload()
  assert.match(await page.locator('.week-picker').innerText(), /Week 1 Term 4/)
  assert.equal(await page.getByRole('textbox', { name: 'Level 2 name' }).inputValue(), 'Eco Pathfinder')
  await page.screenshot({ path: join(screenshots, 'gamification-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  const gamificationOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  assert.ok(gamificationOverflow <= 0, `Gamification mobile page overflows by ${gamificationOverflow}px.`)
  await page.screenshot({ path: join(screenshots, 'gamification-mobile.png'), fullPage: true })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByRole('button', { name: 'Edit Class 5B' }).click()
  assert.equal(await page.locator('#class-select').inputValue(), '5B')
  assert.equal(await page.locator('.stepper').count(), 2)
  await page.locator('.stepper input').nth(1).fill('45')
  await page.locator('.save-button').click()
  await waitForTotal(page, '134')
  await page.getByRole('button', { name: 'Reset Class 5B password' }).click()
  await page.locator('#admin-class-password').fill(changedPassword)
  await page.locator('#admin-class-confirm').fill(changedPassword)
  await page.getByRole('button', { name: 'Reset password' }).click()
  await page.locator('.modal').waitFor({ state: 'hidden' })
  const oldClassSession = await fetch(`${origin}/api/classes/5B/weeks/${week}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: seedCookies.get('5B') },
    body: JSON.stringify({ lunches: 1, items: 1 }),
  })
  assert.equal(oldClassSession.status, 401)
  const oldClassLogin = await fetch(`${origin}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '5B', password: seedPassword }),
  })
  assert.equal(oldClassLogin.status, 401)
  const newClassLogin = await fetch(`${origin}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '5B', password: changedPassword }),
  })
  assert.equal(newClassLogin.status, 200)
  await postClass('8R', seedPassword)
  await page.reload()
  await page.getByRole('button', { name: 'Award XP to Class 8R' }).click()
  await page.getByRole('button', { name: 'Level up to Eco Pathfinder' }).click()
  await page.getByRole('button', { name: 'See achievements' }).click()
  assert.equal((await (await fetch(`${origin}/api/dashboard`)).json()).classes.find(entry => entry.name === '8R')?.bonusXp, 100)
  await page.getByRole('button', { name: 'Delete Eco Champion badge' }).click()
  await page.getByRole('button', { name: 'Delete badge', exact: true }).click()
  await page.locator('.modal').waitFor({ state: 'hidden' })
  assert.ok(!(await page.locator('.admin-badge-list').innerText()).includes('Eco Champion'))
  await page.getByRole('button', { name: 'Remove Week 1 Term 4 label' }).click()
  await page.waitForFunction(() => document.querySelector('.week-picker')?.textContent?.includes('Week of'))
  await page.getByRole('button', { name: 'Delete Class 8R' }).click()
  await page.locator('#admin-delete-confirm').fill('8R')
  await page.getByRole('button', { name: 'Delete class permanently' }).click()
  await page.locator('.modal').waitFor({ state: 'hidden' })
  assert.ok(!(await page.locator('.leader-list').innerText()).includes('Class 8R'))
  await page.getByRole('button', { name: 'Edit Class 6AB' }).click()
  await page.locator('.stepper input').nth(1).fill('1000')
  await page.locator('.save-button').click()
  await page.getByRole('button', { name: 'See achievements' }).click()
  await page.waitForFunction(() => document.querySelector('.hero-visual')?.getAttribute('data-stage') === 'tree')
  await page.locator('#school-goal').fill('1000')
  await page.getByRole('button', { name: 'Save settings' }).click()
  await page.waitForFunction(() => document.querySelector('.hero-visual')?.getAttribute('data-stage') === 'forest')
  await page.getByRole('button', { name: 'Change principal password' }).click()
  await page.locator('#admin-current-password').fill(adminTestPassword)
  await page.locator('#admin-updated-password').fill(changedAdminPassword)
  await page.locator('#admin-confirm-password').fill(changedAdminPassword)
  await page.getByRole('button', { name: 'Update password' }).click()
  await page.locator('.modal').waitFor({ state: 'hidden' })
  await page.locator('#admin').getByRole('button', { name: 'Sign out' }).click()
  await page.locator('#admin').waitFor({ state: 'hidden' })
  const oldAdminLogin = await fetch(`${origin}/api/admin/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: adminTestPassword }),
  })
  assert.equal(oldAdminLogin.status, 401)
  const newAdminLogin = await fetch(`${origin}/api/admin/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: changedAdminPassword }),
  })
  assert.equal(newAdminLogin.status, 200)
  assert.deepEqual(errors, [])
  console.log('Public, claim, class, principal, and visual checks passed. Screenshots: .qa/desktop.png, .qa/mobile.png')
} finally {
  await browser?.close()
  server.kill()
  await rm(temporary, { recursive: true, force: true })
}
