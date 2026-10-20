import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { neon } from '@neondatabase/serverless'
import { SCHOOL_GOAL, starterData, type Dashboard, type WeekEntry } from './tracker'

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
const sql = databaseUrl ? neon(databaseUrl) : null
const filePath = process.env.DATA_FILE || join(process.cwd(), 'data', 'school.json')
let queue = Promise.resolve<unknown>(undefined)
let schemaPromise: Promise<void> | undefined

async function ensureSchema() {
  if (!sql) throw new Error('The school database is not configured.')
  if (!schemaPromise) schemaPromise = (async () => {
    await sql`CREATE TABLE IF NOT EXISTS plastic_classes (
      name varchar(4) PRIMARY KEY,
      sample boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    )`
    await sql`CREATE TABLE IF NOT EXISTS plastic_weekly_entries (
      class_name varchar(4) NOT NULL REFERENCES plastic_classes(name) ON DELETE CASCADE,
      week_start date NOT NULL,
      lunches integer NOT NULL CHECK (lunches BETWEEN 0 AND 10000),
      items integer NOT NULL CHECK (items BETWEEN 0 AND 10000),
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (class_name, week_start)
    )`
  })().catch(error => { schemaPromise = undefined; throw error })
  await schemaPromise
  return sql
}

async function readLocal(): Promise<Dashboard> {
  if (process.env.VERCEL) throw new Error('The deployed school database is not configured.')
  try { return JSON.parse(await readFile(filePath, 'utf8')) as Dashboard }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    const initial = starterData()
    await mkdir(dirname(filePath), { recursive: true })
    try {
      await writeFile(filePath, JSON.stringify(initial, null, 2), { flag: 'wx' })
      return initial
    } catch (writeError) {
      if ((writeError as NodeJS.ErrnoException).code !== 'EEXIST') throw writeError
      return JSON.parse(await readFile(filePath, 'utf8')) as Dashboard
    }
  }
}

function updateLocal<T>(change: (data: Dashboard) => T): Promise<T> {
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
  if (!sql) return readLocal()
  await ensureSchema()
  const classRows = await sql`SELECT name, sample, created_at::text AS created_at FROM plastic_classes ORDER BY name`
  const weekRows = await sql`SELECT class_name, week_start::text AS week_start, lunches, items, updated_at::text AS updated_at FROM plastic_weekly_entries`
  const classes = classRows.map(row => ({
    name: String(row.name), sample: Boolean(row.sample), createdAt: String(row.created_at), weeks: {} as Record<string, WeekEntry>,
  }))
  const byName = new Map(classes.map(entry => [entry.name, entry]))
  for (const row of weekRows) {
    const entry = byName.get(String(row.class_name))
    if (entry) entry.weeks[String(row.week_start)] = {
      lunches: Number(row.lunches), items: Number(row.items), updatedAt: String(row.updated_at),
    }
  }
  return { goal: SCHOOL_GOAL, classes }
}

export async function createClass(name: string): Promise<boolean> {
  if (!sql) return updateLocal(data => {
    if (data.classes.some(entry => entry.name === name)) return false
    data.classes.push({ name, sample: false, createdAt: new Date().toISOString(), weeks: {} })
    return true
  })
  await ensureSchema()
  const rows = await sql`INSERT INTO plastic_classes (name) VALUES (${name}) ON CONFLICT DO NOTHING RETURNING name`
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

export async function removeSampleClasses() {
  if (!sql) return updateLocal(data => {
    data.classes = data.classes.filter(entry => !entry.sample)
    return true
  })
  await ensureSchema()
  await sql`DELETE FROM plastic_classes WHERE sample = true`
  return true
}
