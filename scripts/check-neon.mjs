import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { neon } from '@neondatabase/serverless'

const origin = process.env.CHECK_ORIGIN || 'http://localhost:5175'
const className = '9QA'
const password = randomBytes(16).toString('base64url')
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl || process.env.NEON_PROJECT_ID !== 'rapid-sunset-49316146') throw new Error('Load the linked Plastic Tracker Neon environment before this check.')
const sql = neon(databaseUrl)
let created = false

async function request(path, options = {}) {
  const response = await fetch(`${origin}${path}`, options)
  const body = await response.json()
  assert.ok(response.ok, `${path}: ${response.status} ${JSON.stringify(body)}`)
  return { response, body }
}

try {
  const initial = (await request('/api/dashboard')).body
  assert.ok(!initial.classes.some(entry => entry.name === className), `${className} already exists; refusing to change it.`)
  const createdResponse = await request('/api/classes', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ name: className, password }),
  })
  created = true
  const cookie = createdResponse.response.headers.get('set-cookie')?.split(';')[0]
  assert.ok(cookie?.startsWith('plastic_class_session='))
  const localDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Adelaide', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  const date = new Date(`${localDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
  const week = date.toISOString().slice(0, 10)
  const path = `/api/classes/${className}/weeks/${week}`
  const anonymous = await fetch(`${origin}${path}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ lunches: 12, items: 18 }),
  })
  assert.equal(anonymous.status, 401)
  await request(path, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: origin },
    body: JSON.stringify({ lunches: 12, items: 18 }),
  })
  const updated = (await request('/api/dashboard')).body
  assert.equal(updated.classes.find(entry => entry.name === className)?.weeks[week]?.items, 18)
  assert.ok(!JSON.stringify(updated).includes('password_hash'))
  console.log('Dedicated Neon public read, protected create, and weekly log passed.')
  await request(`/api/classes/${className}`, {
    method: 'DELETE', headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: origin },
    body: JSON.stringify({ password }),
  })
  created = false
  const clean = (await request('/api/dashboard')).body
  assert.ok(!clean.classes.some(entry => entry.name === className))
  assert.deepEqual(clean.classes.map(entry => entry.name).sort(), initial.classes.map(entry => entry.name).sort())
  console.log('Temporary class removed; existing classes unchanged.')
} finally {
  if (created) {
    await sql`DELETE FROM plastic_classes WHERE name = ${className}`
    console.log('Temporary class cleaned up after an incomplete check.')
  }
}
