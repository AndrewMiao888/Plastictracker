import { randomBytes } from 'node:crypto'
import { neon } from '@neondatabase/serverless'
import { hashPassword } from '../server/utils/password.ts'

const trackerNeonProject = 'rapid-sunset-49316146'

if (process.argv[2] !== '--apply' || !process.env.DATABASE_URL || process.env.NEON_PROJECT_ID !== trackerNeonProject) {
  throw new Error('Run with --apply and the linked Plastic Tracker Neon environment loaded.')
}

const sql = neon(process.env.DATABASE_URL)
const legacy = await sql`SELECT name FROM plastic_classes WHERE password_hash IS NULL ORDER BY name`
if (!legacy.length) console.log('No existing classes need passwords.')

for (const row of legacy) {
  const name = String(row.name)
  const password = randomBytes(18).toString('base64url')
  const hash = await hashPassword(password)
  const updated = await sql`UPDATE plastic_classes SET password_hash = ${hash}
    WHERE name = ${name} AND password_hash IS NULL RETURNING name`
  if (updated.length) console.log(`Class ${name}: ${password}`)
}
