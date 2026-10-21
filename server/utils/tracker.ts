export type WeekEntry = { lunches: number; items: number; updatedAt: string }
export type ClassEntry = { name: string; sample: boolean; claimable: boolean; createdAt: string; weeks: Record<string, WeekEntry> }
export type Dashboard = { goal: number; classes: ClassEntry[] }

export const CLASS_NAME_PATTERN = /^[0-9][a-zA-Z]{1,3}$/
export const SCHOOL_GOAL = 1000

export function weekStartFor(date = new Date()) {
  const localDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Adelaide', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date)
  const day = new Date(`${localDate}T00:00:00Z`)
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7))
  return day.toISOString().slice(0, 10)
}

export function shiftWeek(week: string, weeks: number) {
  const date = new Date(`${week}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + weeks * 7)
  return date.toISOString().slice(0, 10)
}

export function validWeek(week: unknown, currentWeek = weekStartFor()) {
  if (typeof week !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(week)) return false
  const date = new Date(`${week}T00:00:00Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === week &&
    date.getUTCDay() === 1 && week <= currentWeek
}

export function validCount(value: unknown) {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 10000
}

function starterClass(name: string, weeklyCounts: [number, number][], currentWeek: string): ClassEntry {
  const weeks: Record<string, WeekEntry> = {}
  weeklyCounts.forEach(([lunches, items], index) => {
    weeks[shiftWeek(currentWeek, -index)] = { lunches, items, updatedAt: new Date().toISOString() }
  })
  return { name, sample: true, claimable: true, createdAt: new Date().toISOString(), weeks }
}

export function starterData(currentWeek = weekStartFor()): Dashboard {
  return {
    goal: SCHOOL_GOAL,
    classes: [
      starterClass('6AB', [[39, 54], [35, 48], [37, 46]], currentWeek),
      starterClass('5B', [[31, 43], [28, 37], [24, 32]], currentWeek),
      starterClass('3C', [[23, 29], [26, 34], [20, 25]], currentWeek),
      starterClass('4ABC', [[28, 36], [24, 31]], currentWeek),
      starterClass('2A', [[18, 22], [21, 26]], currentWeek),
    ],
  }
}
