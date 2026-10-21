import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { neon } from '@neondatabase/serverless'
import { hashPassword } from './password'
import { DEFAULT_SCHOOL_SETTINGS, SCHOOL_GOAL, type ClassEntry, type Dashboard, type SchoolSettings, type WeekEntry } from './tracker'

type StoredClass = Omit<ClassEntry, 'claimable'> & { passwordHash?: string | null; failedLogins?: number; lockedUntil?: string | null }
type StoredDashboard = Omit<Dashboard, 'classes' | 'settings'> & { settings?: SchoolSettings; classes: StoredClass[]; admin?: { hash: string; failedLogins: number; lockedUntil: string | null } }
type Credentials = { hash: string | null; failedLogins: number; lockedUntil: string | null }

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
const sql = databaseUrl ? neon(databaseUrl) : null
const filePath = process.env.DATA_FILE || join(process.cwd(), 'data', 'school.json')
let queue = Promise.resolve<unknown>(undefined)
let schemaPromise: Promise<void> | undefined
const localSessions = new Map<string, { name: string; expiresAt: string }>()
const localAdminSessions = new Map<string, string>()

async function ensureSchema() {
  if (!sql) throw new Error('The school database is not configured.')
  if (!schemaPromise) schemaPromise = (async () => {
    await sql`CREATE TABLE IF NOT EXISTS plastic_classes (
      name varchar(4) PRIMARY KEY,
      sample boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      password_hash text,
      failed_logins integer NOT NULL DEFAULT 0,
      locked_until timestamptz
    )`
    await sql`ALTER TABLE plastic_classes ADD COLUMN IF NOT EXISTS password_hash text`
    await sql`ALTER TABLE plastic_classes ADD COLUMN IF NOT EXISTS failed_logins integer NOT NULL DEFAULT 0`
    await sql`ALTER TABLE plastic_classes ADD COLUMN IF NOT EXISTS locked_until timestamptz`
    await sql`CREATE TABLE IF NOT EXISTS plastic_weekly_entries (
      class_name varchar(4) NOT NULL REFERENCES plastic_classes(name) ON DELETE CASCADE,
      week_start date NOT NULL,
      lunches integer NOT NULL CHECK (lunches BETWEEN 0 AND 10000),
      items integer NOT NULL CHECK (items BETWEEN 0 AND 10000),
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (class_name, week_start)
    )`
    await sql`CREATE TABLE IF NOT EXISTS plastic_sessions (
      token_hash char(64) PRIMARY KEY,
      class_name varchar(4) NOT NULL REFERENCES plastic_classes(name) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`
    await sql`CREATE INDEX IF NOT EXISTS plastic_sessions_class_idx ON plastic_sessions(class_name)`
    await sql`CREATE TABLE IF NOT EXISTS plastic_admin (
      id integer PRIMARY KEY CHECK (id = 1),
      password_hash text NOT NULL,
      failed_logins integer NOT NULL DEFAULT 0,
      locked_until timestamptz
    )`
    await sql`CREATE TABLE IF NOT EXISTS plastic_admin_sessions (
      token_hash char(64) PRIMARY KEY,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`
    await sql`CREATE TABLE IF NOT EXISTS plastic_settings (
      id integer PRIMARY KEY CHECK (id = 1),
      goal integer NOT NULL CHECK (goal BETWEEN 1 AND 1000000),
      week_name varchar(40) NOT NULL DEFAULT 'Plastic-Free Day',
      background_color char(7) NOT NULL DEFAULT '#f6f8f4',
      accent_color char(7) NOT NULL DEFAULT '#286747',
      font_family varchar(20) NOT NULL DEFAULT 'DM Sans'
    )`
    await sql`ALTER TABLE plastic_settings ADD COLUMN IF NOT EXISTS week_name varchar(40) NOT NULL DEFAULT 'Plastic-Free Day'`
    await sql`ALTER TABLE plastic_settings ADD COLUMN IF NOT EXISTS background_color char(7) NOT NULL DEFAULT '#f6f8f4'`
    await sql`ALTER TABLE plastic_settings ADD COLUMN IF NOT EXISTS accent_color char(7) NOT NULL DEFAULT '#286747'`
    await sql`ALTER TABLE plastic_settings ADD COLUMN IF NOT EXISTS font_family varchar(20) NOT NULL DEFAULT 'DM Sans'`
  })().catch(error => { schemaPromise = undefined; throw error })
  await schemaPromise
  return sql
}

async function readLocal(): Promise<StoredDashboard> {
  if (process.env.VERCEL) throw new Error('The deployed school database is not configured.')
  try { return JSON.parse(await readFile(filePath, 'utf8')) as StoredDashboard }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    const initial: StoredDashboard = { goal: SCHOOL_GOAL, classes: [] }
    await mkdir(dirname(filePath), { recursive: true })
    try {
      await writeFile(filePath, JSON.stringify(initial, null, 2), { flag: 'wx' })
      return initial
    } catch (writeError) {
      if ((writeError as NodeJS.ErrnoException).code !== 'EEXIST') throw writeError
      return JSON.parse(await readFile(filePath, 'utf8')) as StoredDashboard
    }
  }
}

function updateLocal<T>(change: (data: StoredDashboard) => T): Promise<T> {
  const result = queue.then(async () => {
    const data = await readLocal()
    const response = change(data)
    if (response === false) return response
    const tempPath = `${filePath}.${process.pid}.tmp`
    await writeFile(tempPath, JSON.stringify(data, null, 2))
    await rename(tempPath, filePath)
    return response
  })
  queue = result.catch(() => undefined)
  return result
}

export async function getDashboard(): Promise<Dashboard> {
  if (!sql) {
    const data = await readLocal()
    return { goal: data.goal, settings: data.settings || DEFAULT_SCHOOL_SETTINGS, classes: data.classes.map(entry => ({
      name: entry.name, sample: entry.sample, claimable: !entry.passwordHash, createdAt: entry.createdAt, weeks: entry.weeks,
    })) }
  }
  await ensureSchema()
  const settingsRows = await sql`SELECT goal, week_name, background_color, accent_color, font_family FROM plastic_settings WHERE id = 1`
  const classRows = await sql`SELECT name, sample, password_hash IS NULL AS claimable, created_at::text AS created_at FROM plastic_classes ORDER BY name`
  const weekRows = await sql`SELECT class_name, week_start::text AS week_start, lunches, items, updated_at::text AS updated_at FROM plastic_weekly_entries`
  const classes = classRows.map(row => ({
    name: String(row.name), sample: Boolean(row.sample), claimable: Boolean(row.claimable), createdAt: String(row.created_at), weeks: {} as Record<string, WeekEntry>,
  }))
  const byName = new Map(classes.map(entry => [entry.name, entry]))
  for (const row of weekRows) {
    const entry = byName.get(String(row.class_name))
    if (entry) entry.weeks[String(row.week_start)] = {
      lunches: Number(row.lunches), items: Number(row.items), updatedAt: String(row.updated_at),
    }
  }
  const storedSettings = settingsRows[0]
  return { goal: storedSettings ? Number(storedSettings.goal) : SCHOOL_GOAL,
    settings: storedSettings ? {
      weekName: String(storedSettings.week_name), backgroundColor: String(storedSettings.background_color),
      accentColor: String(storedSettings.accent_color), fontFamily: String(storedSettings.font_family),
    } : DEFAULT_SCHOOL_SETTINGS, classes }
}

export async function setSchoolSettings(goal: number, settings: SchoolSettings) {
  if (!sql) return updateLocal(data => { data.goal = goal; data.settings = settings; return true })
  await ensureSchema()
  await sql`INSERT INTO plastic_settings (id, goal, week_name, background_color, accent_color, font_family)
    VALUES (1, ${goal}, ${settings.weekName}, ${settings.backgroundColor}, ${settings.accentColor}, ${settings.fontFamily})
    ON CONFLICT (id) DO UPDATE SET goal = EXCLUDED.goal, week_name = EXCLUDED.week_name,
      background_color = EXCLUDED.background_color, accent_color = EXCLUDED.accent_color,
      font_family = EXCLUDED.font_family`
  return true
}

export async function setSchoolGoal(goal: number) {
  if (!sql) return updateLocal(data => { data.goal = goal; return true })
  await ensureSchema()
  await sql`INSERT INTO plastic_settings (id, goal) VALUES (1, ${goal})
    ON CONFLICT (id) DO UPDATE SET goal = EXCLUDED.goal`
  return true
}

export async function getAdminCredentials(): Promise<Credentials | null> {
  if (!sql) {
    let admin = (await readLocal()).admin
    if (!admin && process.env.ADMIN_BOOTSTRAP_PASSWORD) {
      const hash = await hashPassword(process.env.ADMIN_BOOTSTRAP_PASSWORD)
      await updateLocal(data => {
        if (data.admin) return false
        data.admin = { hash, failedLogins: 0, lockedUntil: null }
        return true
      })
      admin = (await readLocal()).admin
    }
    return admin ? { hash: admin.hash, failedLogins: admin.failedLogins, lockedUntil: admin.lockedUntil } : null
  }
  await ensureSchema()
  let rows = await sql`SELECT password_hash, failed_logins, locked_until::text AS locked_until FROM plastic_admin WHERE id = 1`
  if (!rows.length && process.env.ADMIN_BOOTSTRAP_PASSWORD) {
    const hash = await hashPassword(process.env.ADMIN_BOOTSTRAP_PASSWORD)
    await sql`INSERT INTO plastic_admin (id, password_hash) VALUES (1, ${hash}) ON CONFLICT DO NOTHING`
    rows = await sql`SELECT password_hash, failed_logins, locked_until::text AS locked_until FROM plastic_admin WHERE id = 1`
  }
  const row = rows[0]
  return row ? { hash: String(row.password_hash), failedLogins: Number(row.failed_logins),
    lockedUntil: row.locked_until ? String(row.locked_until) : null } : null
}

export async function recordFailedAdminLogin() {
  if (!sql) return updateLocal(data => {
    if (!data.admin) return false
    const expired = data.admin.lockedUntil && new Date(data.admin.lockedUntil).getTime() <= Date.now()
    data.admin.failedLogins = expired ? 1 : data.admin.failedLogins + 1
    data.admin.lockedUntil = data.admin.failedLogins >= 5 ? new Date(Date.now() + 15 * 60_000).toISOString() : null
    return true
  })
  await ensureSchema()
  await sql`UPDATE plastic_admin SET
    failed_logins = CASE WHEN locked_until <= now() THEN 1 ELSE failed_logins + 1 END,
    locked_until = CASE WHEN locked_until <= now() THEN NULL
      WHEN failed_logins + 1 >= 5 THEN now() + interval '15 minutes' ELSE NULL END WHERE id = 1`
}

export async function clearFailedAdminLogins() {
  if (!sql) return updateLocal(data => {
    if (!data.admin) return false
    data.admin.failedLogins = 0
    data.admin.lockedUntil = null
    return true
  })
  await ensureSchema()
  await sql`UPDATE plastic_admin SET failed_logins = 0, locked_until = NULL WHERE id = 1`
}

export async function setAdminPassword(hash: string) {
  if (!sql) return updateLocal(data => {
    if (!data.admin) return false
    data.admin.hash = hash
    data.admin.failedLogins = 0
    data.admin.lockedUntil = null
    return true
  })
  await ensureSchema()
  const rows = await sql`UPDATE plastic_admin SET password_hash = ${hash}, failed_logins = 0, locked_until = NULL
    WHERE id = 1 RETURNING id`
  return rows.length > 0
}

export async function storeAdminSession(tokenHash: string, expiresAt: string) {
  if (!sql) { localAdminSessions.set(tokenHash, expiresAt); return }
  await ensureSchema()
  await sql`DELETE FROM plastic_admin_sessions WHERE expires_at <= now()`
  await sql`INSERT INTO plastic_admin_sessions (token_hash, expires_at) VALUES (${tokenHash}, ${expiresAt}::timestamptz)`
}

export async function findAdminSession(tokenHash: string) {
  if (!sql) {
    const expiresAt = localAdminSessions.get(tokenHash)
    if (!expiresAt) return false
    if (new Date(expiresAt).getTime() <= Date.now()) { localAdminSessions.delete(tokenHash); return false }
    return true
  }
  await ensureSchema()
  const rows = await sql`SELECT token_hash FROM plastic_admin_sessions WHERE token_hash = ${tokenHash} AND expires_at > now()`
  return rows.length > 0
}

export async function removeAdminSession(tokenHash: string) {
  if (!sql) { localAdminSessions.delete(tokenHash); return }
  await ensureSchema()
  await sql`DELETE FROM plastic_admin_sessions WHERE token_hash = ${tokenHash}`
}

export async function removeAllAdminSessions() {
  if (!sql) { localAdminSessions.clear(); return }
  await ensureSchema()
  await sql`DELETE FROM plastic_admin_sessions`
}

export async function createClass(name: string, passwordHash: string): Promise<boolean> {
  if (!sql) return updateLocal(data => {
    if (data.classes.some(entry => entry.name === name)) return false
    data.classes.push({ name, sample: false, createdAt: new Date().toISOString(), weeks: {}, passwordHash, failedLogins: 0, lockedUntil: null })
    return true
  })
  await ensureSchema()
  const rows = await sql`INSERT INTO plastic_classes (name, password_hash) VALUES (${name}, ${passwordHash}) ON CONFLICT DO NOTHING RETURNING name`
  return rows.length > 0
}

export async function claimClass(name: string, passwordHash: string): Promise<boolean> {
  if (!sql) return updateLocal(data => {
    const entry = data.classes.find(item => item.name === name)
    if (!entry || entry.passwordHash) return false
    entry.passwordHash = passwordHash
    entry.failedLogins = 0
    entry.lockedUntil = null
    return true
  })
  await ensureSchema()
  const rows = await sql`UPDATE plastic_classes SET password_hash = ${passwordHash}, failed_logins = 0, locked_until = NULL
    WHERE name = ${name} AND password_hash IS NULL RETURNING name`
  return rows.length > 0
}

export async function putWeek(name: string, week: string, lunches: number, items: number): Promise<boolean> {
  if (!sql) return updateLocal(data => {
    const entry = data.classes.find(item => item.name === name)
    if (!entry) return false
    entry.weeks[week] = { lunches, items, updatedAt: new Date().toISOString() }
    return true
  })
  await ensureSchema()
  const rows = await sql`INSERT INTO plastic_weekly_entries (class_name, week_start, lunches, items)
    SELECT name, ${week}::date, ${lunches}, ${items} FROM plastic_classes WHERE name = ${name}
    ON CONFLICT (class_name, week_start) DO UPDATE
      SET lunches = EXCLUDED.lunches, items = EXCLUDED.items, updated_at = now()
    RETURNING class_name`
  return rows.length > 0
}

export async function deleteWeek(name: string, week: string): Promise<boolean> {
  if (!sql) return updateLocal(data => {
    const entry = data.classes.find(item => item.name === name)
    if (!entry) return false
    delete entry.weeks[week]
    return true
  })
  await ensureSchema()
  const classes = await sql`SELECT name FROM plastic_classes WHERE name = ${name}`
  if (!classes.length) return false
  await sql`DELETE FROM plastic_weekly_entries WHERE class_name = ${name} AND week_start = ${week}::date`
  return true
}

export async function getCredentials(name: string): Promise<Credentials | null> {
  if (!sql) {
    const entry = (await readLocal()).classes.find(item => item.name === name)
    return entry ? { hash: entry.passwordHash || null, failedLogins: entry.failedLogins || 0, lockedUntil: entry.lockedUntil || null } : null
  }
  await ensureSchema()
  const rows = await sql`SELECT password_hash, failed_logins, locked_until::text AS locked_until FROM plastic_classes WHERE name = ${name}`
  const row = rows[0]
  return row ? { hash: row.password_hash ? String(row.password_hash) : null,
    failedLogins: Number(row.failed_logins), lockedUntil: row.locked_until ? String(row.locked_until) : null } : null
}

export async function recordFailedLogin(name: string) {
  if (!sql) return updateLocal(data => {
    const entry = data.classes.find(item => item.name === name)
    if (!entry) return false
    const expired = entry.lockedUntil && new Date(entry.lockedUntil).getTime() <= Date.now()
    entry.failedLogins = expired ? 1 : (entry.failedLogins || 0) + 1
    entry.lockedUntil = entry.failedLogins >= 5 ? new Date(Date.now() + 15 * 60_000).toISOString() : null
    return true
  })
  await ensureSchema()
  await sql`UPDATE plastic_classes SET
    failed_logins = CASE WHEN locked_until <= now() THEN 1 ELSE failed_logins + 1 END,
    locked_until = CASE WHEN locked_until <= now() THEN NULL
      WHEN failed_logins + 1 >= 5 THEN now() + interval '15 minutes' ELSE NULL END
    WHERE name = ${name}`
}

export async function clearFailedLogins(name: string) {
  if (!sql) return updateLocal(data => {
    const entry = data.classes.find(item => item.name === name)
    if (!entry) return false
    entry.failedLogins = 0
    entry.lockedUntil = null
    return true
  })
  await ensureSchema()
  await sql`UPDATE plastic_classes SET failed_logins = 0, locked_until = NULL WHERE name = ${name}`
}

export async function setClassPassword(name: string, passwordHash: string) {
  if (!sql) return updateLocal(data => {
    const entry = data.classes.find(item => item.name === name)
    if (!entry) return false
    entry.passwordHash = passwordHash
    entry.failedLogins = 0
    entry.lockedUntil = null
    return true
  })
  await ensureSchema()
  const rows = await sql`UPDATE plastic_classes SET password_hash = ${passwordHash}, failed_logins = 0, locked_until = NULL WHERE name = ${name} RETURNING name`
  return rows.length > 0
}

export async function deleteClass(name: string) {
  if (!sql) {
    const removed = await updateLocal(data => {
      const before = data.classes.length
      data.classes = data.classes.filter(entry => entry.name !== name)
      return data.classes.length < before
    })
    if (removed) await removeClassSessions(name)
    return removed
  }
  await ensureSchema()
  const rows = await sql`DELETE FROM plastic_classes WHERE name = ${name} RETURNING name`
  return rows.length > 0
}

export async function storeSession(tokenHash: string, name: string, expiresAt: string) {
  if (!sql) {
    localSessions.set(tokenHash, { name, expiresAt })
    return
  }
  await ensureSchema()
  await sql`DELETE FROM plastic_sessions WHERE expires_at <= now()`
  await sql`INSERT INTO plastic_sessions (token_hash, class_name, expires_at) VALUES (${tokenHash}, ${name}, ${expiresAt}::timestamptz)`
}

export async function findSession(tokenHash: string): Promise<string | null> {
  if (!sql) {
    const session = localSessions.get(tokenHash)
    if (!session) return null
    if (new Date(session.expiresAt).getTime() <= Date.now()) { localSessions.delete(tokenHash); return null }
    return (await readLocal()).classes.some(entry => entry.name === session.name) ? session.name : null
  }
  await ensureSchema()
  const rows = await sql`SELECT class_name FROM plastic_sessions WHERE token_hash = ${tokenHash} AND expires_at > now()`
  return rows[0] ? String(rows[0].class_name) : null
}

export async function removeSession(tokenHash: string) {
  if (!sql) { localSessions.delete(tokenHash); return }
  await ensureSchema()
  await sql`DELETE FROM plastic_sessions WHERE token_hash = ${tokenHash}`
}

export async function removeClassSessions(name: string) {
  if (!sql) {
    for (const [token, session] of localSessions) if (session.name === name) localSessions.delete(token)
    return
  }
  await ensureSchema()
  await sql`DELETE FROM plastic_sessions WHERE class_name = ${name}`
}
