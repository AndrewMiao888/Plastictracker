import assert from 'node:assert/strict'
import { neon } from '@neondatabase/serverless'
import { verifyPassword } from '../server/utils/password.ts'

const names = ['5C', '5H', '5P']
if (!process.env.DATABASE_URL || process.env.NEON_PROJECT_ID !== 'rapid-sunset-49316146') {
  throw new Error('Load the dedicated Plastic Tracker Neon environment first.')
}
const credentials = JSON.parse(process.env.LEGACY_PASSWORDS_JSON || '{}')
assert.deepEqual(Object.keys(credentials).sort(), names, 'Provide exactly the three temporary class passwords.')
const sql = neon(process.env.DATABASE_URL)
const rows = await sql`SELECT name, password_hash FROM plastic_classes WHERE name IN ('5C', '5H', '5P') ORDER BY name`
assert.deepEqual(rows.map(row => String(row.name)), names, 'Expected legacy classes are missing.')
for (const row of rows) {
  assert.ok(await verifyPassword(credentials[row.name], row.password_hash), `Class ${row.name} has a different password; no classes were changed.`)
}
if (process.argv[2] !== '--apply') {
  console.log('Verified temporary passwords for 5C, 5H, and 5P. Run with --apply to make them claimable.')
  process.exit(0)
}
for (const row of rows) {
  const changed = await sql`UPDATE plastic_classes SET password_hash = NULL, failed_logins = 0, locked_until = NULL
    WHERE name = ${row.name} AND password_hash = ${row.password_hash} RETURNING name`
  assert.equal(changed.length, 1, `Class ${row.name} changed during migration; stopped.`)
  await sql`DELETE FROM plastic_sessions WHERE class_name = ${row.name}`
  console.log(`Class ${row.name} is claimable; temporary password and sessions invalidated.`)
}
