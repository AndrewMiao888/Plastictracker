import assert from 'node:assert/strict'
import { neon } from '@neondatabase/serverless'

const origin = process.env.CHECK_ORIGIN || 'http://localhost:5175'
const className = '9QA'
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl || !process.env.NEON_PROJECT_ID) throw new Error('Load the linked Neon environment before this check.')
const sql = neon(databaseUrl)
let created = false

async function request(path, options) {
  const response = await fetch(`${origin}${path}`, options)
  const body = await response.json()
  assert.ok(response.ok, `${path}: ${response.status} ${JSON.stringify(body)}`)
  return body
}

try {
  const initial = await request('/api/dashboard')
  assert.ok(!initial.classes.some(entry => entry.name === className), `${className} already exists; refusing to change it.`)
  await request('/api/classes', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: className }),
  })
  created = true
  const localDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Adelaide', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  const date = new Date(`${localDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
  const week = date.toISOString().slice(0, 10)
  await request(`/api/classes/${className}/weeks/${week}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lunches: 12, items: 18 }),
  })
  const updated = await request('/api/dashboard')
  assert.equal(updated.classes.find(entry => entry.name === className)?.weeks[week]?.items, 18)
  console.log('Dedicated Neon create, weekly log, and dashboard read passed.')
} finally {
  if (created) {
    await sql`DELETE FROM plastic_classes WHERE name = ${className}`
    const clean = await request('/api/dashboard')
    assert.ok(!clean.classes.some(entry => entry.name === className))
    console.log('Temporary 9QA record removed from the dedicated database.')
  }
}
