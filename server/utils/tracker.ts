export type WeekEntry = { lunches: number; items: number; updatedAt: string }
export type ClassEntry = { name: string; sample: boolean; claimable: boolean; bonusXp: number; createdAt: string; weeks: Record<string, WeekEntry> }
export type SchoolSettings = { weekName: string; backgroundColor: string; accentColor: string; fontFamily: string }
export type LevelDefinition = { name: string; threshold: number }
export type BadgeMetric = 'weeks' | 'lunches' | 'items' | 'xp' | 'level'
export type BadgeDefinition = { id: string; name: string; description: string; icon: string; metric: BadgeMetric; threshold: number }
export type Dashboard = { goal: number; settings: SchoolSettings; levels: LevelDefinition[]; badges: BadgeDefinition[]; weekLabels: Record<string, string>; classes: ClassEntry[] }

export const CLASS_NAME_PATTERN = /^[0-9][a-zA-Z]{1,3}$/
export const SCHOOL_GOAL = 1000
export const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
  weekName: 'Plastic-Free Day', backgroundColor: '#f6f8f4', accentColor: '#286747', fontFamily: 'DM Sans',
}
export const SCHOOL_FONTS = ['DM Sans', 'Outfit', 'Arial', 'Georgia'] as const
export const BADGE_ICONS = ['Sprout', 'Sandwich', 'PackageCheck', 'Medal', 'CalendarDays', 'Earth', 'Trophy', 'Leaf', 'Recycle', 'Sparkles', 'Award'] as const
export const BADGE_METRICS: BadgeMetric[] = ['weeks', 'lunches', 'items', 'xp', 'level']
export const DEFAULT_LEVELS: LevelDefinition[] = [
  { name: 'Eco Rookie', threshold: 0 }, { name: 'Green Scout', threshold: 120 },
  { name: 'Waste Warrior', threshold: 300 }, { name: 'Earth Guardian', threshold: 550 },
  { name: 'Planet Saver', threshold: 900 },
]
export const DEFAULT_BADGES: BadgeDefinition[] = [
  { id: 'first-steps', name: 'First Steps', description: 'Log your first week', icon: 'Sprout', metric: 'weeks', threshold: 1 },
  { id: 'lunch-hero', name: 'Lunch Hero', description: 'Pack 25 plastic-free lunches', icon: 'Sandwich', metric: 'lunches', threshold: 25 },
  { id: 'plastic-buster', name: 'Plastic Buster', description: 'Save 50 plastic items', icon: 'PackageCheck', metric: 'items', threshold: 50 },
  { id: 'century-club', name: 'Century Club', description: 'Save 100 plastic items', icon: 'Medal', metric: 'items', threshold: 100 },
  { id: 'on-a-roll', name: 'On a Roll', description: 'Log four school weeks', icon: 'CalendarDays', metric: 'weeks', threshold: 4 },
  { id: 'planet-saver', name: 'Planet Saver', description: 'Reach level 5', icon: 'Earth', metric: 'level', threshold: 5 },
]

function validLabel(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.length >= 2 && value.length <= maxLength &&
    value.trim() === value && !/[\x00-\x1f\x7f]/.test(value)
}

export function validLevelDefinitions(value: unknown): value is LevelDefinition[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > 12) return false
  const names = new Set<string>()
  return value.every((level, index) => {
    if (!level || !validLabel(level.name, 30) || !Number.isInteger(level.threshold) ||
        level.threshold < 0 || level.threshold > 1_000_000 ||
        (index === 0 ? level.threshold !== 0 : level.threshold <= value[index - 1].threshold)) return false
    const name = level.name.toLowerCase()
    if (names.has(name)) return false
    names.add(name)
    return true
  })
}

export function validBadgeDefinitions(value: unknown): value is BadgeDefinition[] {
  if (!Array.isArray(value) || value.length > 30) return false
  const ids = new Set<string>()
  const names = new Set<string>()
  return value.every(badge => {
    if (!badge || typeof badge.id !== 'string' || !/^[a-z0-9-]{1,40}$/.test(badge.id) ||
        !validLabel(badge.name, 30) || !validLabel(badge.description, 80) ||
        !BADGE_ICONS.includes(badge.icon) || !BADGE_METRICS.includes(badge.metric) ||
        !Number.isInteger(badge.threshold) || badge.threshold < 1 || badge.threshold > 1_000_000 ||
        (badge.metric === 'level' && badge.threshold > 12)) return false
    const name = badge.name.toLowerCase()
    if (ids.has(badge.id) || names.has(name)) return false
    ids.add(badge.id)
    names.add(name)
    return true
  })
}

export function validSchoolWeekDate(week: unknown) {
  if (typeof week !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(week)) return false
  const date = new Date(`${week}T00:00:00Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === week &&
    date.getUTCDay() === 1 && week >= '2020-01-01' && week <= '2100-12-31'
}

export function validWeekLabel(value: unknown) { return validLabel(value, 40) }

export function validSchoolSettings(value: unknown): value is SchoolSettings {
  if (!value || typeof value !== 'object') return false
  const settings = value as Record<string, unknown>
  const backgroundColor = settings.backgroundColor
  const accentColor = settings.accentColor
  if (typeof settings.weekName !== 'string' || settings.weekName.length < 2 || settings.weekName.length > 40 ||
      settings.weekName.trim() !== settings.weekName || /[\x00-\x1f\x7f]/.test(settings.weekName)) return false
  if (typeof backgroundColor !== 'string' || typeof accentColor !== 'string' ||
      !/^#[0-9a-fA-F]{6}$/.test(backgroundColor) || !/^#[0-9a-fA-F]{6}$/.test(accentColor)) return false
  if (!SCHOOL_FONTS.includes(settings.fontFamily as typeof SCHOOL_FONTS[number])) return false
  const channels = [1, 3, 5].map(index => parseInt(backgroundColor.slice(index, index + 2), 16) / 255)
  const luminance = channels.map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  return 0.2126 * luminance[0]! + 0.7152 * luminance[1]! + 0.0722 * luminance[2]! >= 0.65
}

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
  return { name, sample: true, claimable: true, bonusXp: 0, createdAt: new Date().toISOString(), weeks }
}

export function starterData(currentWeek = weekStartFor()): Dashboard {
  return {
    goal: SCHOOL_GOAL,
    settings: DEFAULT_SCHOOL_SETTINGS,
    levels: DEFAULT_LEVELS,
    badges: DEFAULT_BADGES,
    weekLabels: {},
    classes: [
      starterClass('6AB', [[39, 54], [35, 48], [37, 46]], currentWeek),
      starterClass('5B', [[31, 43], [28, 37], [24, 32]], currentWeek),
      starterClass('3C', [[23, 29], [26, 34], [20, 25]], currentWeek),
      starterClass('4ABC', [[28, 36], [24, 31]], currentWeek),
      starterClass('2A', [[18, 22], [21, 26]], currentWeek),
    ],
  }
}
