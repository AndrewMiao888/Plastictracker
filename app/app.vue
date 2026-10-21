<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import {
  ArrowRight, ArrowUpRight, Award, CalendarDays, Check, ChevronDown,
  ChevronLeft, ChevronRight, CircleCheck, Earth, Leaf, Medal, Minus,
  PackageCheck, Plus, Recycle, Save, Sandwich, Sparkles, Sprout,
  Trash2, Trophy, UsersRound, X, LockKeyhole, LogIn, LogOut, Settings2,
  Eye, EyeOff, ShieldCheck, KeyRound,
} from '@lucide/vue'

type WeekEntry = { lunches: number; items: number; updatedAt: string }
type ClassEntry = { name: string; sample: boolean; claimable: boolean; bonusXp: number; createdAt: string; weeks: Record<string, WeekEntry> }
type SchoolSettings = { weekName: string; backgroundColor: string; accentColor: string; fontFamily: string }
type LevelDefinition = { name: string; threshold: number }
type BadgeMetric = 'weeks' | 'lunches' | 'items' | 'xp' | 'level'
type BadgeDefinition = { id: string; name: string; description: string; icon: string; metric: BadgeMetric; threshold: number }
type Dashboard = { goal: number; settings: SchoolSettings; levels: LevelDefinition[]; badges: BadgeDefinition[]; weekLabels: Record<string, string>; classes: ClassEntry[] }
type Celebration = { title: string; detail: string }

const classPattern = /^[0-9][a-zA-Z]{1,3}$/
const defaultSchoolSettings: SchoolSettings = { weekName: 'Plastic-Free Day', backgroundColor: '#f6f8f4', accentColor: '#286747', fontFamily: 'DM Sans' }
const fontOptions = ['DM Sans', 'Outfit', 'Arial', 'Georgia']
const fontStacks: Record<string, string> = {
  'DM Sans': "'DM Sans', Arial, sans-serif", Outfit: "Outfit, 'DM Sans', sans-serif",
  Arial: 'Arial, sans-serif', Georgia: 'Georgia, serif',
}
const backgroundPresets = ['#f6f8f4', '#eaf3f6', '#f9eff2', '#f3f3eb']
const accentPresets = ['#286747', '#1f6d85', '#a33d62', '#ba633d']
const defaultLevels: LevelDefinition[] = [
  { name: 'Eco Rookie', threshold: 0 },
  { name: 'Green Scout', threshold: 120 },
  { name: 'Waste Warrior', threshold: 300 },
  { name: 'Earth Guardian', threshold: 550 },
  { name: 'Planet Saver', threshold: 900 },
]
const badgeIcons: Record<string, Component> = { Sprout, Sandwich, PackageCheck, Medal, CalendarDays, Earth, Trophy, Leaf, Recycle, Sparkles, Award }
const badgeMetricOptions: { value: BadgeMetric; label: string }[] = [
  { value: 'weeks', label: 'Weeks logged' }, { value: 'lunches', label: 'Plastic-free lunches' },
  { value: 'items', label: 'Plastic items saved' }, { value: 'xp', label: 'XP earned' }, { value: 'level', label: 'Level reached' },
]

function currentWeek() {
  const local = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Adelaide', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  const date = new Date(`${local}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
  return date.toISOString().slice(0, 10)
}

function shiftWeek(value: string, offset: number) {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + offset * 7)
  return date.toISOString().slice(0, 10)
}

function weekLabel(value: string) {
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(`${value}T00:00:00Z`))
}

function displayWeek(value: string) {
  return dashboard.value?.weekLabels[value] || `Week of ${weekLabel(value)}`
}

function totals(entry: ClassEntry) {
  return Object.values(entry.weeks).reduce((sum, item) => ({
    lunches: sum.lunches + item.lunches,
    items: sum.items + item.items,
    weeks: sum.weeks + 1,
  }), { lunches: 0, items: 0, weeks: 0 })
}

function xpFor(entry: ClassEntry) {
  const total = totals(entry)
  return total.lunches * 2 + total.items * 3 + (entry.bonusXp || 0)
}

function levelFor(xp: number) {
  return levels.value.reduce((index, level, nextIndex) => xp >= level.threshold ? nextIndex : index, 0)
}

function badgeEarned(entry: ClassEntry, badge: BadgeDefinition) {
  const total = totals(entry)
  const value = badge.metric === 'weeks' ? total.weeks : badge.metric === 'lunches' ? total.lunches :
    badge.metric === 'items' ? total.items : badge.metric === 'xp' ? xpFor(entry) : levelFor(xpFor(entry)) + 1
  return value >= badge.threshold
}

const { data: dashboard, error: loadError, refresh } = await useFetch<Dashboard>('/api/dashboard', { key: 'dashboard' })
const levels = computed(() => dashboard.value?.levels || defaultLevels)
const badges = computed(() => dashboard.value?.badges || [])
const { data: authSession, refresh: refreshAuth } = await useFetch<{ className: string | null }>('/api/auth/session', { key: 'auth-session' })
const { data: adminSession, refresh: refreshAdmin } = await useFetch<{ admin: boolean }>('/api/admin/session', { key: 'admin-session' })
const selectedName = ref(authSession.value?.className || dashboard.value?.classes[0]?.name || '')
const week = ref(currentWeek())
const lunches = ref('0')
const items = ref('0')
const busy = ref(false)
const showCreate = ref(false)
const newName = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const formError = ref('')
const showLogin = ref(false)
const loginPassword = ref('')
const loginError = ref('')
const showClaim = ref(false)
const claimPassword = ref('')
const confirmClaimPassword = ref('')
const claimError = ref('')
const showManage = ref(false)
const currentPassword = ref('')
const updatedPassword = ref('')
const confirmUpdatedPassword = ref('')
const manageError = ref('')
const showDelete = ref(false)
const deletePassword = ref('')
const deleteConfirmName = ref('')
const deleteError = ref('')
const showAdminLogin = ref(false)
const adminPassword = ref('')
const adminLoginError = ref('')
const adminGoal = ref(String(dashboard.value?.goal || 1000))
const adminWeekName = ref(dashboard.value?.settings.weekName || defaultSchoolSettings.weekName)
const adminBackground = ref(dashboard.value?.settings.backgroundColor || defaultSchoolSettings.backgroundColor)
const adminAccent = ref(dashboard.value?.settings.accentColor || defaultSchoolSettings.accentColor)
const adminFont = ref(dashboard.value?.settings.fontFamily || defaultSchoolSettings.fontFamily)
const adminSettingsError = ref('')
const adminLevels = ref<LevelDefinition[]>(dashboard.value?.levels.map(level => ({ ...level })) || defaultLevels.map(level => ({ ...level })))
const adminLevelError = ref('')
const labelWeek = ref(currentWeek())
const labelText = ref(dashboard.value?.weekLabels[currentWeek()] || '')
const weekLabelError = ref('')
const showBadgeEditor = ref(false)
const badgeDraft = ref<BadgeDefinition>({ id: '', name: '', description: '', icon: 'Award', metric: 'items', threshold: 1 })
const badgeError = ref('')
const showBadgeDelete = ref(false)
const badgeDeleteId = ref('')
const showXpAward = ref(false)
const xpTargetName = ref('')
const xpAmount = ref('50')
const xpError = ref('')
const showAdminReset = ref(false)
const adminTargetName = ref('')
const adminClassPassword = ref('')
const adminConfirmPassword = ref('')
const adminResetError = ref('')
const showAdminDelete = ref(false)
const adminDeleteConfirm = ref('')
const adminDeleteError = ref('')
const showAdminPassword = ref(false)
const currentAdminPassword = ref('')
const updatedAdminPassword = ref('')
const confirmAdminPassword = ref('')
const adminPasswordError = ref('')
const toast = ref('')
const celebration = ref<Celebration | null>(null)

const selected = computed(() => dashboard.value?.classes.find(entry => entry.name === selectedName.value))
const signedInName = computed(() => authSession.value?.className || null)
const isAdmin = computed(() => !!adminSession.value?.admin)
const canEdit = computed(() => !!selected.value && (isAdmin.value || signedInName.value === selected.value.name))
const schoolSettings = computed(() => dashboard.value?.settings || defaultSchoolSettings)
const themeStyle = computed(() => {
  const accent = schoolSettings.value.accentColor
  const channels = [1, 3, 5].map(index => parseInt(accent.slice(index, index + 2), 16) / 255)
  const linear = channels.map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  const luminance = 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!
  return {
    '--page-bg': schoolSettings.value.backgroundColor,
    '--accent-color': accent,
    '--accent-ink': luminance > 0.18 ? '#173d38' : '#ffffff',
    '--app-font': fontStacks[schoolSettings.value.fontFamily] || fontStacks['DM Sans'],
    '--display-font': fontStacks[schoolSettings.value.fontFamily] || fontStacks['DM Sans'],
  }
})
useHead(() => ({ title: `St Andrew's ${schoolSettings.value.weekName}` }))
const existing = computed(() => selected.value?.weeks[week.value])
watch([selected, week], () => {
  lunches.value = String(existing.value?.lunches ?? 0)
  items.value = String(existing.value?.items ?? 0)
}, { immediate: true })
watch(toast, value => {
  if (value && import.meta.client) window.setTimeout(() => { if (toast.value === value) toast.value = '' }, 4200)
})

const ranked = computed(() => (dashboard.value?.classes || []).map(entry => ({
  entry, ...totals(entry), xp: xpFor(entry),
})).sort((a, b) => b.items - a.items || b.lunches - a.lunches || a.entry.name.localeCompare(b.entry.name)))
const schoolItems = computed(() => ranked.value.reduce((sum, row) => sum + row.items, 0))
const schoolLunches = computed(() => ranked.value.reduce((sum, row) => sum + row.lunches, 0))
const schoolWeeklyItems = computed(() => (dashboard.value?.classes || []).reduce((sum, entry) => sum + (entry.weeks[currentWeek()]?.items || 0), 0))
const weeklyActiveClasses = computed(() => (dashboard.value?.classes || []).filter(entry => entry.weeks[currentWeek()]).length)
const goal = computed(() => dashboard.value?.goal || 1000)
const progress = computed(() => Math.min(100, Math.round(schoolItems.value / goal.value * 100)))
const selectedXp = computed(() => selected.value ? xpFor(selected.value) : 0)
const selectedLevel = computed(() => levelFor(selectedXp.value))
const nextLevel = computed(() => levels.value[selectedLevel.value + 1])
const currentThreshold = computed(() => levels.value[selectedLevel.value]!.threshold)
const levelProgress = computed(() => nextLevel.value
  ? Math.min(100, Math.round((selectedXp.value - currentThreshold.value) / (nextLevel.value.threshold - currentThreshold.value) * 100))
  : 100)
const activities = computed(() => (dashboard.value?.classes || []).flatMap(entry => Object.entries(entry.weeks).map(([date, log]) => ({
  name: entry.name, date, ...log,
}))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5))
const hasSamples = computed(() => dashboard.value?.classes.some(entry => entry.sample) || false)
const namedWeeks = computed(() => Object.entries(dashboard.value?.weekLabels || {}).sort((a, b) => b[0].localeCompare(a[0])))
watch(labelWeek, value => { labelText.value = dashboard.value?.weekLabels[value] || '' })
const xpTargetClass = computed(() => dashboard.value?.classes.find(entry => entry.name === xpTargetName.value))
const xpNextLevel = computed(() => xpTargetClass.value && levels.value[levelFor(xpFor(xpTargetClass.value)) + 1])
const metricRows = computed(() => [
  { icon: PackageCheck, label: 'Plastic items saved', value: schoolItems.value.toLocaleString(), detail: `+${schoolWeeklyItems.value} this week`, tone: 'mint' },
  { icon: Sandwich, label: 'Plastic-free lunches', value: schoolLunches.value.toLocaleString(), detail: 'Packed with care', tone: 'peach' },
  { icon: UsersRound, label: 'Classes taking part', value: String(dashboard.value?.classes.length || 0), detail: 'Working together', tone: 'blue' },
])

async function request(path: string, options?: Parameters<typeof $fetch>[1]) {
  try { return await $fetch(path, options) }
  catch (error) {
    const failure = error as { data?: { message?: string; error?: string }; message?: string }
    throw new Error(failure.data?.message || failure.data?.error || failure.message || 'Something went wrong.')
  }
}

async function reload() {
  await refresh()
  const data = dashboard.value!
  if (!data.classes.some(entry => entry.name === selectedName.value)) selectedName.value = data.classes[0]?.name || ''
  return data
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function createClass() {
  if (!classPattern.test(newName.value)) {
    formError.value = 'Use one digit followed by 1 to 3 letters, like 5B or 6AB.'
    return
  }
  if (newPassword.value.length < 10 || newPassword.value.length > 128 || newPassword.value.trim().length < 10) {
    formError.value = 'Choose a password with at least 10 characters.'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    formError.value = 'Passwords do not match.'
    return
  }
  busy.value = true
  formError.value = ''
  try {
    const name = newName.value.toUpperCase()
    await request('/api/classes', { method: 'POST', body: { name: newName.value, password: newPassword.value } })
    await refreshAuth()
    await reload()
    selectedName.value = name
    showCreate.value = false
    newName.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    toast.value = `Class ${name} is ready to go!`
    window.setTimeout(() => scrollTo('check-in'), 100)
  } catch (error) { formError.value = (error as Error).message }
  finally { busy.value = false }
}

async function saveWeek() {
  if (!selected.value || !canEdit.value) return
  const lunchCount = Number(lunches.value)
  const itemCount = Number(items.value)
  if (!Number.isInteger(lunchCount) || !Number.isInteger(itemCount) ||
      lunchCount < 0 || itemCount < 0 || lunchCount > 10000 || itemCount > 10000 ||
      (lunchCount === 0 && itemCount === 0)) {
    toast.value = 'Enter whole numbers up to 10,000, with at least one lunch or item.'
    return
  }
  busy.value = true
  try {
    const name = selected.value.name
    const oldLevel = levelFor(xpFor(selected.value))
    const oldBadges = badges.value.filter(badge => badgeEarned(selected.value!, badge)).map(badge => badge.id)
    await request(`/api/classes/${name}/weeks/${week.value}`, { method: 'PUT', body: { lunches: lunchCount, items: itemCount } })
    const data = await reload()
    const updated = data.classes.find(entry => entry.name === name)!
    const newLevel = levelFor(xpFor(updated))
    const earnedBadge = badges.value.find(badge => badgeEarned(updated, badge) && !oldBadges.includes(badge.id))
    if (newLevel > oldLevel) celebration.value = { title: `Level ${newLevel + 1} unlocked!`, detail: `${name} is now ${levels.value[newLevel]!.name}. Keep the momentum going!` }
    else if (earnedBadge) celebration.value = { title: `${earnedBadge.name} unlocked!`, detail: `${name} earned a new badge. Brilliant work!` }
    else toast.value = `${name}'s week has been saved.`
  } catch (error) { toast.value = (error as Error).message }
  finally { busy.value = false }
}

async function deleteWeek() {
  if (!selected.value || !existing.value || !canEdit.value) return
  busy.value = true
  try {
    const name = selected.value.name
    await request(`/api/classes/${name}/weeks/${week.value}`, { method: 'DELETE' })
    await reload()
    toast.value = `${name}'s entry for ${displayWeek(week.value)} was removed.`
  } catch (error) { toast.value = (error as Error).message }
  finally { busy.value = false }
}

async function loginClass() {
  if (!selected.value) return
  busy.value = true
  loginError.value = ''
  try {
    await request('/api/auth/login', { method: 'POST', body: { name: selected.value.name, password: loginPassword.value } })
    await refreshAuth()
    showLogin.value = false
    loginPassword.value = ''
    toast.value = `Signed in to Class ${selected.value.name}.`
  } catch (error) { loginError.value = (error as Error).message }
  finally { busy.value = false }
}

async function claimSelectedClass() {
  if (!selected.value?.claimable) return
  if (claimPassword.value.length < 10 || claimPassword.value.length > 128 || claimPassword.value.trim().length < 10) {
    claimError.value = 'Choose a password with at least 10 characters.'
    return
  }
  if (claimPassword.value !== confirmClaimPassword.value) {
    claimError.value = 'Passwords do not match.'
    return
  }
  busy.value = true
  claimError.value = ''
  const name = selected.value.name
  try {
    await request(`/api/classes/${name}/claim`, { method: 'POST', body: { password: claimPassword.value } })
    await refreshAuth()
    await reload()
    showClaim.value = false
    claimPassword.value = ''
    confirmClaimPassword.value = ''
    toast.value = `Class ${name} is yours to manage.`
  } catch (error) {
    claimError.value = (error as Error).message
    await reload()
  } finally { busy.value = false }
}

async function logoutClass() {
  busy.value = true
  try {
    await request('/api/auth/logout', { method: 'POST' })
    await refreshAuth()
    toast.value = 'Signed out. School progress is still public.'
  } catch (error) { toast.value = (error as Error).message }
  finally { busy.value = false }
}

async function loginAdmin() {
  busy.value = true
  adminLoginError.value = ''
  try {
    await request('/api/admin/login', { method: 'POST', body: { password: adminPassword.value } })
    await refreshAdmin()
    showAdminLogin.value = false
    adminPassword.value = ''
    toast.value = 'Principal access is active.'
    window.setTimeout(() => scrollTo('admin'), 100)
  } catch (error) { adminLoginError.value = (error as Error).message }
  finally { busy.value = false }
}

async function logoutAdmin() {
  busy.value = true
  try {
    await request('/api/admin/logout', { method: 'POST' })
    await refreshAdmin()
    toast.value = 'Principal access signed out.'
  } catch (error) { toast.value = (error as Error).message }
  finally { busy.value = false }
}

async function saveAdminSettings() {
  const goalValue = Number(adminGoal.value)
  if (!Number.isInteger(goalValue) || goalValue < 1 || goalValue > 1_000_000) {
    adminSettingsError.value = 'Choose a whole-number goal from 1 to 1,000,000.'
    return
  }
  const settings = {
    weekName: adminWeekName.value.trim(), backgroundColor: adminBackground.value,
    accentColor: adminAccent.value, fontFamily: adminFont.value,
  }
  if (settings.weekName.length < 2 || settings.weekName.length > 40) {
    adminSettingsError.value = 'The week name must be 2 to 40 characters.'
    return
  }
  busy.value = true
  adminSettingsError.value = ''
  try {
    await request('/api/admin/settings', { method: 'PUT', body: { goal: goalValue, settings } })
    await reload()
    toast.value = 'School settings updated.'
  } catch (error) { adminSettingsError.value = (error as Error).message }
  finally { busy.value = false }
}

async function saveWeekName() {
  const name = labelText.value.trim()
  if (name.length < 2 || name.length > 40) {
    weekLabelError.value = 'Use a label of 2 to 40 characters.'
    return
  }
  busy.value = true
  weekLabelError.value = ''
  try {
    await request(`/api/admin/weeks/${labelWeek.value}/label`, { method: 'PUT', body: { label: name } })
    await reload()
    labelText.value = name
    toast.value = `${name} is now the label for ${weekLabel(labelWeek.value)}.`
  } catch (error) { weekLabelError.value = (error as Error).message }
  finally { busy.value = false }
}

async function removeWeekName(value: string) {
  busy.value = true
  try {
    await request(`/api/admin/weeks/${value}/label`, { method: 'DELETE' })
    await reload()
    if (labelWeek.value === value) labelText.value = ''
    toast.value = `The week of ${weekLabel(value)} uses its date again.`
  } catch (error) { toast.value = (error as Error).message }
  finally { busy.value = false }
}

function addLevel() {
  if (adminLevels.value.length >= 12) return
  const last = adminLevels.value.at(-1)
  adminLevels.value.push({ name: `Level ${adminLevels.value.length + 1}`, threshold: Math.min(1_000_000, (last?.threshold || 0) + 200) })
}

async function saveAdminLevels() {
  busy.value = true
  adminLevelError.value = ''
  try {
    await request('/api/admin/levels', { method: 'PUT', body: { levels: adminLevels.value.map(level => ({ name: level.name.trim(), threshold: Number(level.threshold) })) } })
    const data = await reload()
    adminLevels.value = data.levels.map(level => ({ ...level }))
    toast.value = 'School levels updated.'
  } catch (error) { adminLevelError.value = (error as Error).message }
  finally { busy.value = false }
}

function openBadgeEditor(badge?: BadgeDefinition) {
  badgeDraft.value = badge ? { ...badge } : { id: '', name: '', description: '', icon: 'Award', metric: 'items', threshold: 1 }
  badgeError.value = ''
  showBadgeEditor.value = true
}

async function saveBadge() {
  const badge = { ...badgeDraft.value, id: badgeDraft.value.id || crypto.randomUUID(),
    name: badgeDraft.value.name.trim(), description: badgeDraft.value.description.trim(), threshold: Number(badgeDraft.value.threshold) }
  const updated = badges.value.some(item => item.id === badge.id)
    ? badges.value.map(item => item.id === badge.id ? badge : item) : [...badges.value, badge]
  busy.value = true
  badgeError.value = ''
  try {
    await request('/api/admin/badges', { method: 'PUT', body: { badges: updated } })
    await reload()
    showBadgeEditor.value = false
    toast.value = `${badge.name} badge saved.`
  } catch (error) { badgeError.value = (error as Error).message }
  finally { busy.value = false }
}

async function deleteBadge() {
  const name = badges.value.find(badge => badge.id === badgeDeleteId.value)?.name || 'Badge'
  busy.value = true
  try {
    await request('/api/admin/badges', { method: 'PUT', body: { badges: badges.value.filter(badge => badge.id !== badgeDeleteId.value) } })
    await reload()
    showBadgeDelete.value = false
    toast.value = `${name} badge removed.`
  } catch (error) { toast.value = (error as Error).message }
  finally { busy.value = false }
}

function openXpAward(name: string) {
  xpTargetName.value = name
  xpAmount.value = '50'
  xpError.value = ''
  showXpAward.value = true
}

async function awardXp(amount = Number(xpAmount.value)) {
  if (!Number.isInteger(amount) || amount < 1 || amount > 1_000_000) {
    xpError.value = 'Enter 1 to 1,000,000 XP.'
    return
  }
  const before = dashboard.value?.classes.find(entry => entry.name === xpTargetName.value)
  const oldLevel = before ? levelFor(xpFor(before)) : 0
  busy.value = true
  xpError.value = ''
  try {
    await request(`/api/admin/classes/${xpTargetName.value}/xp`, { method: 'POST', body: { amount } })
    const data = await reload()
    const updated = data.classes.find(entry => entry.name === xpTargetName.value)!
    const newLevel = levelFor(xpFor(updated))
    showXpAward.value = false
    if (newLevel > oldLevel) celebration.value = { title: `Level ${newLevel + 1} unlocked!`, detail: `Class ${updated.name} is now ${levels.value[newLevel]!.name}.` }
    else toast.value = `Class ${updated.name} earned ${amount.toLocaleString()} bonus XP.`
  } catch (error) { xpError.value = (error as Error).message }
  finally { busy.value = false }
}

function openAdminReset(name: string) {
  adminTargetName.value = name
  adminClassPassword.value = ''
  adminConfirmPassword.value = ''
  adminResetError.value = ''
  showAdminReset.value = true
}

async function resetAdminClassPassword() {
  if (adminClassPassword.value.length < 10 || adminClassPassword.value.length > 128 || adminClassPassword.value.trim().length < 10) {
    adminResetError.value = 'Choose a password with at least 10 characters.'
    return
  }
  if (adminClassPassword.value !== adminConfirmPassword.value) {
    adminResetError.value = 'Passwords do not match.'
    return
  }
  busy.value = true
  adminResetError.value = ''
  try {
    await request(`/api/admin/classes/${adminTargetName.value}/password`, { method: 'PUT', body: { password: adminClassPassword.value } })
    await reload()
    showAdminReset.value = false
    adminClassPassword.value = ''
    adminConfirmPassword.value = ''
    toast.value = `Class ${adminTargetName.value}'s password changed. Its other sessions were signed out.`
  } catch (error) { adminResetError.value = (error as Error).message }
  finally { busy.value = false }
}

async function deleteAdminClass() {
  if (adminDeleteConfirm.value.toUpperCase() !== adminTargetName.value) {
    adminDeleteError.value = 'Type the class name to confirm deletion.'
    return
  }
  busy.value = true
  adminDeleteError.value = ''
  try {
    await request(`/api/admin/classes/${adminTargetName.value}`, { method: 'DELETE' })
    await reload()
    showAdminDelete.value = false
    adminDeleteConfirm.value = ''
    toast.value = `Class ${adminTargetName.value} and its entries were deleted.`
  } catch (error) { adminDeleteError.value = (error as Error).message }
  finally { busy.value = false }
}

async function changeAdminPassword() {
  if (updatedAdminPassword.value.length < 10 || updatedAdminPassword.value.length > 128 || updatedAdminPassword.value.trim().length < 10) {
    adminPasswordError.value = 'Choose a password with at least 10 characters.'
    return
  }
  if (updatedAdminPassword.value !== confirmAdminPassword.value) {
    adminPasswordError.value = 'Passwords do not match.'
    return
  }
  busy.value = true
  adminPasswordError.value = ''
  try {
    await request('/api/admin/password', { method: 'PUT', body: { currentPassword: currentAdminPassword.value, newPassword: updatedAdminPassword.value } })
    await refreshAdmin()
    showAdminPassword.value = false
    currentAdminPassword.value = ''
    updatedAdminPassword.value = ''
    confirmAdminPassword.value = ''
    toast.value = 'Principal password updated. Other principal sessions were signed out.'
  } catch (error) { adminPasswordError.value = (error as Error).message }
  finally { busy.value = false }
}

async function changePassword() {
  if (updatedPassword.value.length < 10 || updatedPassword.value.trim().length < 10 || updatedPassword.value.length > 128) {
    manageError.value = 'Choose a new password with at least 10 characters.'
    return
  }
  if (updatedPassword.value !== confirmUpdatedPassword.value) {
    manageError.value = 'New passwords do not match.'
    return
  }
  busy.value = true
  manageError.value = ''
  try {
    await request('/api/auth/password', { method: 'PUT', body: { currentPassword: currentPassword.value, newPassword: updatedPassword.value } })
    await refreshAuth()
    showManage.value = false
    currentPassword.value = ''
    updatedPassword.value = ''
    confirmUpdatedPassword.value = ''
    toast.value = 'Password updated. Other sessions were signed out.'
  } catch (error) { manageError.value = (error as Error).message }
  finally { busy.value = false }
}

async function removeClass() {
  if (!selected.value || !canEdit.value || deleteConfirmName.value.toUpperCase() !== selected.value.name) {
    deleteError.value = 'Type the class name to confirm deletion.'
    return
  }
  busy.value = true
  deleteError.value = ''
  try {
    const name = selected.value.name
    await request(`/api/classes/${name}`, { method: 'DELETE', body: { password: deletePassword.value } })
    await refreshAuth()
    await reload()
    showDelete.value = false
    showManage.value = false
    deletePassword.value = ''
    deleteConfirmName.value = ''
    toast.value = `Class ${name} and its weekly entries were deleted.`
  } catch (error) { deleteError.value = (error as Error).message }
  finally { busy.value = false }
}

function changeCount(current: string, amount: number) {
  return String(Math.max(0, Math.min(10000, (Number(current) || 0) + amount)))
}
</script>

<template>
  <div v-if="loadError" class="load-screen"><Leaf :size="34" /><h1>We couldn't load the school tracker.</h1><p>{{ loadError.message }}</p><button @click="reload">Try again</button></div>
  <div v-else-if="!dashboard" class="load-screen"><span class="loading-leaf"><Leaf :size="40" /></span><p>Loading your school...</p></div>
  <div v-else class="app-shell" :style="themeStyle">
    <aside class="sidebar">
      <div class="brand"><span class="brand-mark"><Leaf :size="25" :stroke-width="2.6" /></span><span>plastic<span class="brand-accent">free.</span><small>SCHOOL TRACKER</small></span></div>
      <button v-if="isAdmin" class="mobile-sample-button" @click="scrollTo('admin')"><ShieldCheck :size="15" /> Principal</button><button v-else-if="signedInName" class="mobile-sample-button" @click="selectedName = signedInName; scrollTo('check-in')"><ShieldCheck :size="15" /> Class {{ signedInName }}</button><button v-else class="mobile-sample-button" @click="showAdminLogin = true"><KeyRound :size="15" /> Principal</button>
      <div class="side-group"><div class="side-label">WORKSPACE</div>
        <button class="side-link active" @click="scrollTo('overview')"><span class="side-icon"><Earth :size="18" /></span>Overview</button>
        <button class="side-link" @click="scrollTo('check-in')"><span class="side-icon"><CalendarDays :size="18" /></span>Weekly check-in</button>
        <button class="side-link" @click="scrollTo('leaderboard')"><span class="side-icon"><Trophy :size="18" /></span>Leaderboard</button>
        <button class="side-link" @click="scrollTo('achievements')"><span class="side-icon"><Award :size="18" /></span>Achievements</button>
        <button v-if="isAdmin" class="side-link" @click="scrollTo('admin')"><span class="side-icon"><Settings2 :size="18" /></span>Principal panel</button>
      </div>
      <div class="side-group class-group"><div class="side-label side-label-row">SCHOOL CLASSES <span>{{ dashboard.classes.length }}</span></div>
        <button v-for="entry in dashboard.classes.slice(0, 6)" :key="entry.name" class="class-link" :class="{ selected: selectedName === entry.name }" @click="selectedName = entry.name; scrollTo('check-in')"><span class="class-mini-icon">{{ entry.name[0] }}</span>Class {{ entry.name }}<span v-if="selectedName === entry.name" class="selected-dot" /></button>
        <button class="add-side" @click="showCreate = true"><Plus :size="16" /> Add a class</button>
      </div>
      <div class="sidebar-bottom"><div class="mission-icon"><Recycle :size="23" /></div><strong>Every item matters.</strong><p>One school day at a time, we're making a difference.</p><button v-if="signedInName" @click="selectedName = signedInName; scrollTo('check-in')">My class <ArrowRight :size="14" /></button><button class="principal-side-link" @click="isAdmin ? scrollTo('admin') : showAdminLogin = true"><KeyRound :size="14" /> {{ isAdmin ? 'Principal panel' : 'Principal sign in' }}</button></div>
    </aside>

    <main id="overview" class="main">
      <div class="topbar"><div class="breadcrumb">School dashboard <ChevronRight :size="14" /> <strong>Overview</strong></div><div class="top-actions"><span v-if="isAdmin" class="session-label"><ShieldCheck :size="15" /> Principal access</span><span v-else-if="signedInName" class="session-label"><ShieldCheck :size="15" /> Editing Class {{ signedInName }}</span><span class="date-pill"><CalendarDays :size="15" /><span :title="displayWeek(currentWeek())">{{ displayWeek(currentWeek()) }}</span></span><span class="top-avatar"><Leaf :size="17" /></span></div></div>
      <div class="content">
        <header class="page-heading"><div><div class="eyebrow"><span class="eyebrow-dot" /> ST ANDREW'S {{ schoolSettings.weekName.toUpperCase() }} <span v-if="hasSamples" class="sample-badge">SAMPLE DATA</span></div><h1>Small swaps. Big impact.</h1><p>Every lunch counts. See how we're doing together.</p></div><button class="primary-button heading-button" @click="showCreate = true"><Plus :size="18" /> Create class</button></header>

        <section class="hero-panel" aria-label="School goal progress">
          <div class="hero-copy">
            <div class="hero-kicker"><Sparkles :size="16" /> SCHOOL GOAL</div>
            <h2>Together, we're making<br>a cleaner tomorrow.</h2>
            <p>Plastic items saved by our school so far</p>
            <div class="hero-number"><strong>{{ schoolItems.toLocaleString() }}</strong><span>/ {{ goal.toLocaleString() }} items</span></div>
            <div class="hero-progress" role="progressbar" :aria-valuenow="Math.min(schoolItems, goal)" :aria-valuemax="goal" aria-valuemin="0" aria-label="School plastic items goal"><span :style="{ width: `${progress}%` }" /></div>
            <div class="hero-foot"><span>{{ progress }}% of school goal</span><span>{{ Math.max(0, goal - schoolItems).toLocaleString() }} to go</span></div>
            <div class="hero-pulse"><span class="pulse-dot" /><span>THIS WEEK</span><strong>{{ schoolWeeklyItems.toLocaleString() }}</strong><span>items saved</span><i /><strong>{{ weeklyActiveClasses }}</strong><span>classes checked in</span></div>
          </div>
          <div class="hero-visual"><div class="hero-ring" :style="{ '--progress': `${progress}%` }"><div class="hero-ring-inner"><Earth :size="93" :stroke-width="1.25" /><span class="ring-leaf"><Leaf :size="29" fill="currentColor" /></span></div></div><span class="visual-spark spark-one">✦</span><span class="visual-spark spark-two">✳</span><span class="visual-spark spark-three">✦</span></div>
        </section>

        <section class="stats-grid" aria-label="School statistics"><div v-for="metric in metricRows" :key="metric.label" class="metric surface"><span class="metric-icon" :class="metric.tone"><component :is="metric.icon" :size="23" /></span><div><span class="metric-label">{{ metric.label }}</span><strong>{{ metric.value }}</strong><span class="metric-detail"><ArrowUpRight :size="14" /> {{ metric.detail }}</span></div></div></section>

        <div class="main-grid">
          <section id="check-in" class="surface checkin"><div class="section-heading"><div><div class="section-kicker">{{ schoolSettings.weekName.toUpperCase() }}</div><h2>Weekly check-in</h2><p>Record your class's progress for the week.</p></div><span class="heading-icon green"><CalendarDays :size="21" /></span></div>
            <div v-if="selected">
              <div class="form-top"><label class="field-label" for="class-select">VIEW CLASS</label><div class="select-wrap"><select id="class-select" v-model="selectedName"><option v-for="entry in dashboard.classes" :key="entry.name" :value="entry.name">Class {{ entry.name }}</option></select><ChevronDown :size="18" /></div><div class="week-picker"><span :title="displayWeek(week)"><strong>{{ displayWeek(week) }}</strong></span><div><button type="button" title="Previous week" aria-label="Previous week" @click="week = shiftWeek(week, -1)"><ChevronLeft :size="18" /></button><button type="button" title="Next week" aria-label="Next week" :disabled="week >= currentWeek()" @click="week = shiftWeek(week, 1)"><ChevronRight :size="18" /></button></div></div></div>
              <div class="class-session-bar"><span v-if="canEdit" class="class-session-state editing"><ShieldCheck :size="15" /> {{ isAdmin ? 'Principal editing' : 'Editing' }} Class {{ selected.name }}</span><span v-else class="class-session-state"><LockKeyhole :size="15" /> Public view</span><div v-if="signedInName === selected.name" class="class-session-actions"><button type="button" title="Manage class and password" @click="showManage = true"><Settings2 :size="15" /> Manage</button><button type="button" title="Sign out of class" :disabled="busy" @click="logoutClass"><LogOut :size="15" /> Sign out</button></div><div v-else-if="isAdmin" class="class-session-actions"><button type="button" @click="scrollTo('admin')"><Settings2 :size="15" /> Principal panel</button></div></div>
              <form v-if="canEdit" @submit.prevent="saveWeek"><div class="entry-fields"><div class="counter-row"><span class="counter-icon peach"><Sandwich :size="21" /></span><span class="counter-label"><strong>Plastic-free lunches</strong><small>Lunches packed this week</small></span><div class="stepper"><button type="button" aria-label="Decrease Plastic-free lunches" @click="lunches = changeCount(lunches, -1)"><Minus :size="15" /></button><input v-model="lunches" type="number" min="0" max="10000" step="1" aria-label="Plastic-free lunches"><button type="button" aria-label="Increase Plastic-free lunches" @click="lunches = changeCount(lunches, 1)"><Plus :size="15" /></button></div></div>
                <div class="counter-row"><span class="counter-icon mint"><PackageCheck :size="21" /></span><span class="counter-label"><strong>Plastic items saved</strong><small>Items avoided this week</small></span><div class="stepper"><button type="button" aria-label="Decrease Plastic items saved" @click="items = changeCount(items, -1)"><Minus :size="15" /></button><input v-model="items" type="number" min="0" max="10000" step="1" aria-label="Plastic items saved"><button type="button" aria-label="Increase Plastic items saved" @click="items = changeCount(items, 1)"><Plus :size="15" /></button></div></div></div>
              <div class="form-footer"><span class="edit-hint"><CircleCheck :size="16" /> {{ existing ? "Editing this week's entry" : 'Ready for a new entry' }}</span><div class="form-actions"><button v-if="existing" class="delete-button" type="button" title="Delete this week's entry" aria-label="Delete this week's entry" :disabled="busy" @click="deleteWeek"><Trash2 :size="17" /></button><button class="primary-button save-button" :disabled="busy" type="submit"><Save :size="17" /> {{ busy ? 'Saving...' : 'Save week' }}</button></div></div>
              </form>
              <div v-else class="locked-state"><div class="locked-heading"><span><LockKeyhole :size="22" /></span><div><strong>{{ selected.claimable ? `Claim Class ${selected.name}` : `Sign in to edit Class ${selected.name}` }}</strong><p>{{ selected.claimable ? 'This class has no password yet. A member of the class can set one to manage its entries.' : 'Everyone can follow this class. Its password protects weekly entries and class settings.' }}</p></div></div><div v-if="existing" class="public-week"><span><Sandwich :size="16" /> {{ existing.lunches }} lunches</span><span><PackageCheck :size="16" /> {{ existing.items }} items saved</span></div><button v-if="selected.claimable" class="primary-button" @click="showClaim = true; claimError = ''"><KeyRound :size="17" /> Claim Class {{ selected.name }}</button><button v-else class="primary-button" @click="showLogin = true; loginError = ''"><LogIn :size="17" /> Sign in to Class {{ selected.name }}</button><p v-if="signedInName" class="switch-hint">You're signed in to Class {{ signedInName }}. Choose it above to edit, or sign in to this class.</p></div>
            </div><div v-else class="empty-state"><span><UsersRound :size="28" /></span><h3>Start with a class</h3><p>Create your first class to begin logging plastic-free days.</p><button class="primary-button" @click="showCreate = true"><Plus :size="17" /> Create class</button></div>
          </section>

          <section id="leaderboard" class="surface leaderboard"><div class="section-heading"><div><div class="section-kicker">FRIENDLY COMPETITION</div><h2>Leaderboard</h2><p>Top classes by plastic items saved.</p></div><span class="heading-icon yellow"><Trophy :size="21" /></span></div>
            <div v-if="ranked.length" class="leader-list"><button v-for="(row, index) in ranked" :key="row.entry.name" class="leader-row" :class="{ 'leader-selected': row.entry.name === selectedName }" @click="selectedName = row.entry.name; scrollTo('check-in')"><span class="leader-rank" :class="`rank-${index + 1}`"><Medal v-if="index < 3" :size="19" /><template v-else>{{ String(index + 1).padStart(2, '0') }}</template></span><span class="leader-avatar">{{ row.entry.name[0] }}</span><span class="leader-name"><strong>Class {{ row.entry.name }}</strong><small>Level {{ levelFor(row.xp) + 1 }} · {{ levels[levelFor(row.xp)]?.name }}</small></span><span class="leader-score"><strong>{{ row.items }}</strong><small>items saved</small></span></button></div><div v-else class="empty-state compact"><span><Trophy :size="28" /></span><h3>The leaderboard starts here</h3><p>Log a class week to take the first spot.</p></div>
          </section>
        </div>

        <section id="achievements" class="journey-section"><div class="section-title-row"><div><div class="section-kicker">KEEP GROWING</div><h2>{{ selected ? `Class ${selected.name}'s journey` : 'Class journey' }}</h2></div><span class="xp-explainer"><Sparkles :size="15" /> 2 XP per lunch · 3 XP per item</span></div>
          <div class="journey-grid"><div class="surface level-card"><div class="level-top"><span class="level-emblem"><Leaf :size="34" /></span><span class="level-number">LEVEL {{ selectedLevel + 1 }} OF {{ levels.length }}</span></div><h3>{{ selected ? levels[selectedLevel]?.name : levels[0]?.name }}</h3><p>{{ selected ? `${selectedXp} XP earned so far${selected.bonusXp ? `, including ${selected.bonusXp} bonus XP` : ''}` : 'Choose a class to begin the journey' }}</p><div class="level-track"><span :style="{ width: `${selected ? levelProgress : 0}%` }" /></div><div class="level-track-label"><span>{{ selectedXp }} XP</span><span>{{ nextLevel ? `${nextLevel.threshold} XP to Level ${selectedLevel + 2}` : 'Highest level reached' }}</span></div><div class="level-pips"><span v-for="(level, index) in levels" :key="level.name" :class="{ reached: index <= selectedLevel && selected }" :title="`Level ${index + 1}: ${level.name}`"><Check v-if="index < selectedLevel && selected" :size="13" /><template v-else>{{ index + 1 }}</template></span></div></div>
            <div class="surface badges-card"><div class="badges-heading"><h3>Achievement badges</h3><span>{{ selected ? badges.filter(badge => badgeEarned(selected!, badge)).length : 0 }} / {{ badges.length }} unlocked</span></div><div class="badge-grid"><div v-for="badge in badges" :key="badge.id" class="badge" :class="selected && badgeEarned(selected, badge) ? 'earned' : 'locked'" :title="badge.description"><span class="badge-icon"><component :is="badgeIcons[badge.icon] || Award" :size="22" :stroke-width="1.8" /></span><strong>{{ badge.name }}</strong><small>{{ badge.description }}</small></div></div></div></div>
        </section>

        <section class="activity-section"><div class="section-title-row"><div><div class="section-kicker">LATEST UPDATES</div><h2>Recent activity</h2></div><span class="activity-count">{{ activities.length }} recent entries</span></div><div class="surface activity-table"><div class="table-head"><span>CLASS</span><span>WEEK</span><span>LUNCHES</span><span>ITEMS SAVED</span></div><template v-if="activities.length"><div v-for="activity in activities" :key="`${activity.name}-${activity.date}`" class="table-row"><span class="table-class"><span class="table-avatar">{{ activity.name[0] }}</span>Class {{ activity.name }}</span><span :title="displayWeek(activity.date)" class="activity-week">{{ displayWeek(activity.date) }}</span><span>{{ activity.lunches }}</span><span class="table-items">+{{ activity.items }} <ArrowUpRight :size="15" /></span></div></template><div v-else class="table-empty">No weeks logged yet. Your first entry will appear here.</div></div></section>
        <section v-if="isAdmin" id="admin" class="admin-section">
          <div class="section-title-row"><div><div class="section-kicker">SCHOOL CONTROL</div><h2>Principal panel</h2></div><button class="admin-text-button" :disabled="busy" @click="logoutAdmin"><LogOut :size="16" /> Sign out</button></div>
          <div class="admin-grid">
            <div class="surface admin-settings"><h3>School settings</h3>
              <form class="school-settings-form" @submit.prevent="saveAdminSettings">
                <label class="field-label" for="school-goal">PLASTIC ITEMS GOAL</label>
                <input id="school-goal" v-model="adminGoal" type="number" min="1" max="1000000" step="1">
                <label class="field-label" for="school-week-name">WEEK NAME</label>
                <input id="school-week-name" v-model="adminWeekName" type="text" minlength="2" maxlength="40">
                <span class="field-label">BACKGROUND COLOUR</span>
                <div class="setting-colors"><button v-for="color in backgroundPresets" :key="color" type="button" class="color-swatch" :class="{ chosen: adminBackground.toLowerCase() === color }" :style="{ backgroundColor: color }" :aria-label="`Background ${color}`" :aria-pressed="adminBackground.toLowerCase() === color" @click="adminBackground = color" /><label class="custom-color" title="Custom background colour"><input v-model="adminBackground" type="color" aria-label="Custom background colour"><span>Custom</span></label><code>{{ adminBackground }}</code></div>
                <span class="field-label">ACCENT COLOUR</span>
                <div class="setting-colors"><button v-for="color in accentPresets" :key="color" type="button" class="color-swatch" :class="{ chosen: adminAccent.toLowerCase() === color }" :style="{ backgroundColor: color }" :aria-label="`Accent ${color}`" :aria-pressed="adminAccent.toLowerCase() === color" @click="adminAccent = color" /><label class="custom-color" title="Custom accent colour"><input v-model="adminAccent" type="color" aria-label="Custom accent colour"><span>Custom</span></label><code>{{ adminAccent }}</code></div>
                <label class="field-label" for="school-font">FONT</label>
                <select id="school-font" v-model="adminFont"><option v-for="font in fontOptions" :key="font" :value="font">{{ font }}</option></select>
                <div v-if="adminSettingsError" class="form-error" role="alert">{{ adminSettingsError }}</div>
                <button class="primary-button admin-save-settings" type="submit" :disabled="busy"><Save :size="16" /> {{ busy ? 'Saving...' : 'Save settings' }}</button>
              </form>
              <button class="admin-text-button admin-password-action" @click="showAdminPassword = true"><KeyRound :size="16" /> Change principal password</button>
            </div>
            <div class="surface admin-classes">
              <div class="admin-classes-head"><h3>Classes <span>{{ dashboard.classes.length }}</span></h3><button class="admin-text-button" @click="showCreate = true"><Plus :size="16" /> Add class</button></div>
              <div v-if="dashboard.classes.length" class="admin-class-list">
                <div v-for="entry in dashboard.classes" :key="entry.name" class="admin-class-row">
                  <span class="admin-class-name"><span class="table-avatar">{{ entry.name[0] }}</span><strong>{{ entry.name }}</strong><small>{{ entry.claimable ? 'Unclaimed' : `${totals(entry).items} items saved` }}{{ entry.bonusXp ? ` · ${entry.bonusXp} bonus XP` : '' }}</small></span>
                  <div class="admin-row-actions">
                    <button title="Edit weekly entries" :aria-label="`Edit Class ${entry.name}`" @click="selectedName = entry.name; scrollTo('check-in')"><CalendarDays :size="16" /></button>
                    <button title="Award bonus XP" :aria-label="`Award XP to Class ${entry.name}`" @click="openXpAward(entry.name)"><Sparkles :size="16" /></button>
                    <button title="Reset class password" :aria-label="`Reset Class ${entry.name} password`" @click="openAdminReset(entry.name)"><KeyRound :size="16" /></button>
                    <button class="danger" title="Delete class" :aria-label="`Delete Class ${entry.name}`" @click="adminTargetName = entry.name; adminDeleteConfirm = ''; adminDeleteError = ''; showAdminDelete = true"><Trash2 :size="16" /></button>
                  </div>
                </div>
              </div>
              <p v-else class="admin-empty">No classes yet.</p>
            </div>
          </div>
          <div class="admin-tools">
            <div class="surface admin-tool admin-week-labels">
              <div class="admin-tool-heading"><div><div class="section-kicker">SCHOOL CALENDAR</div><h3>Week labels</h3></div><CalendarDays :size="19" /></div>
              <form @submit.prevent="saveWeekName">
                <label class="field-label" for="label-week">WEEK STARTING MONDAY</label><input id="label-week" v-model="labelWeek" type="date" required>
                <label class="field-label" for="label-text">DISPLAY NAME</label><input id="label-text" v-model="labelText" type="text" maxlength="40" placeholder="Week 1 Term 4" required>
                <div v-if="weekLabelError" class="form-error" role="alert">{{ weekLabelError }}</div>
                <button class="primary-button admin-tool-save" type="submit" :disabled="busy"><Save :size="16" /> Save week name</button>
              </form>
              <div v-if="namedWeeks.length" class="admin-named-weeks"><div v-for="[date, name] in namedWeeks" :key="date" class="admin-named-week"><button type="button" :title="`Edit ${name}`" @click="labelWeek = date; labelText = name"><strong>{{ name }}</strong><small>{{ weekLabel(date) }}</small></button><button class="admin-icon-button danger" type="button" :aria-label="`Remove ${name} label`" :title="`Remove ${name} label`" :disabled="busy" @click="removeWeekName(date)"><Trash2 :size="15" /></button></div></div>
            </div>
            <div class="surface admin-tool admin-levels">
              <div class="admin-tool-heading"><div><div class="section-kicker">GROWTH PATH</div><h3>Levels</h3></div><button class="admin-text-button" type="button" :disabled="adminLevels.length >= 12 || busy" @click="addLevel"><Plus :size="16" /> Add level</button></div>
              <form @submit.prevent="saveAdminLevels">
                <div class="admin-level-head"><span>LEVEL NAME</span><span>XP STARTS AT</span></div>
                <div v-for="(level, index) in adminLevels" :key="index" class="admin-level-row"><span class="admin-level-index">{{ index + 1 }}</span><input v-model="level.name" type="text" :aria-label="`Level ${index + 1} name`" maxlength="32" required><input v-model.number="level.threshold" type="number" :aria-label="`Level ${index + 1} XP threshold`" :min="index ? 1 : 0" max="1000000" step="1" :readonly="index === 0" required><button v-if="index" class="admin-icon-button danger" type="button" :aria-label="`Remove level ${index + 1}`" title="Remove level" :disabled="adminLevels.length <= 2" @click="adminLevels.splice(index, 1)"><X :size="15" /></button><span v-else class="admin-level-spacer" /></div>
                <div v-if="adminLevelError" class="form-error" role="alert">{{ adminLevelError }}</div>
                <button class="primary-button admin-tool-save" type="submit" :disabled="busy"><Save :size="16" /> Save levels</button>
              </form>
            </div>
            <div class="surface admin-tool admin-badges">
              <div class="admin-tool-heading"><div><div class="section-kicker">MILESTONES</div><h3>Badges <span>{{ badges.length }}</span></h3></div><button class="admin-text-button" type="button" :disabled="badges.length >= 30 || busy" @click="openBadgeEditor()"><Plus :size="16" /> Add badge</button></div>
              <div v-if="badges.length" class="admin-badge-list"><div v-for="badge in badges" :key="badge.id" class="admin-badge-row"><span class="admin-badge-icon"><component :is="badgeIcons[badge.icon] || Award" :size="18" /></span><span class="admin-badge-info"><strong>{{ badge.name }}</strong><small>{{ badge.description }}</small></span><div class="admin-row-actions"><button :aria-label="`Edit ${badge.name} badge`" :title="`Edit ${badge.name} badge`" @click="openBadgeEditor(badge)"><Settings2 :size="16" /></button><button class="danger" :aria-label="`Delete ${badge.name} badge`" :title="`Delete ${badge.name} badge`" @click="badgeDeleteId = badge.id; showBadgeDelete = true"><Trash2 :size="16" /></button></div></div></div>
              <p v-else class="admin-empty">Add the first school badge.</p>
            </div>
          </div>
        </section>
        <footer class="footer"><span><Leaf :size="15" /> {{ schoolSettings.weekName }}</span><button v-if="!isAdmin" class="footer-admin-link" @click="showAdminLogin = true">Principal sign in</button><span v-else>Small choices add up.</span></footer>
      </div>
    </main>

    <div v-if="toast" class="toast" role="status"><CircleCheck :size="19" />{{ toast }}<button aria-label="Dismiss" @click="toast = ''"><X :size="16" /></button></div>
    <div v-if="showCreate" class="modal-backdrop" @mousedown.self="showCreate = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="create-title"><button class="modal-close" aria-label="Close" @click="showCreate = false"><X :size="20" /></button><span class="modal-icon"><UsersRound :size="25" /></span><div class="section-kicker">JOIN THE MOVEMENT</div><h2 id="create-title">Create a class</h2><p>Set a class name and a password your group can share.</p><form @submit.prevent="createClass"><label class="field-label" for="class-name">CLASS NAME</label><input id="class-name" v-model="newName" autofocus placeholder="e.g. 5B" maxlength="4" autocapitalize="characters" :aria-invalid="!!formError" @input="formError = ''"><small class="field-help">One digit followed by 1 to 3 letters.</small><label class="field-label password-label" for="new-password">CLASS PASSWORD</label><div class="password-field"><input id="new-password" v-model="newPassword" :type="showPassword ? 'text' : 'password'" minlength="10" maxlength="128" autocomplete="new-password" placeholder="At least 10 characters" @input="formError = ''"><button type="button" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" :size="17" /><Eye v-else :size="17" /></button></div><label class="field-label password-label" for="confirm-password">CONFIRM PASSWORD</label><input id="confirm-password" v-model="confirmPassword" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" placeholder="Repeat password" @input="formError = ''"><div v-if="formError" class="form-error" role="alert">{{ formError }}</div><button class="primary-button modal-submit" type="submit" :disabled="busy"><Plus :size="18" /> {{ busy ? 'Creating...' : 'Create class' }}</button></form></div></div>
    <div v-if="showLogin && selected" class="modal-backdrop" @mousedown.self="showLogin = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="login-title"><button class="modal-close" aria-label="Close" @click="showLogin = false"><X :size="20" /></button><span class="modal-icon"><LockKeyhole :size="25" /></span><div class="section-kicker">CLASS ACCESS</div><h2 id="login-title">Sign in to Class {{ selected.name }}</h2><p>Use your class password to edit weekly entries.</p><form @submit.prevent="loginClass"><label class="field-label" for="login-password">PASSWORD</label><div class="password-field"><input id="login-password" v-model="loginPassword" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" autofocus @input="loginError = ''"><button type="button" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" :size="17" /><Eye v-else :size="17" /></button></div><div v-if="loginError" class="form-error" role="alert">{{ loginError }}</div><button class="primary-button modal-submit" type="submit" :disabled="busy"><LogIn :size="17" /> {{ busy ? 'Signing in...' : 'Sign in' }}</button></form></div></div>
    <div v-if="showClaim && selected" class="modal-backdrop" @mousedown.self="showClaim = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="claim-title"><button class="modal-close" aria-label="Close" @click="showClaim = false"><X :size="20" /></button><span class="modal-icon"><KeyRound :size="25" /></span><div class="section-kicker">FIRST-TIME SETUP</div><h2 id="claim-title">Claim Class {{ selected.name }}</h2><p>Set a password your class can share. The first person to claim this class will control its entries and settings.</p><form @submit.prevent="claimSelectedClass"><label class="field-label" for="claim-password">CLASS PASSWORD</label><div class="password-field"><input id="claim-password" v-model="claimPassword" :type="showPassword ? 'text' : 'password'" minlength="10" maxlength="128" autocomplete="new-password" autofocus @input="claimError = ''"><button type="button" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" :size="17" /><Eye v-else :size="17" /></button></div><label class="field-label password-label" for="confirm-claim-password">CONFIRM PASSWORD</label><input id="confirm-claim-password" v-model="confirmClaimPassword" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" @input="claimError = ''"><div v-if="claimError" class="form-error" role="alert">{{ claimError }}</div><button class="primary-button modal-submit" type="submit" :disabled="busy || !selected.claimable"><KeyRound :size="17" /> {{ busy ? 'Claiming...' : 'Claim class' }}</button></form></div></div>
    <div v-if="showAdminLogin" class="modal-backdrop" @mousedown.self="showAdminLogin = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="admin-login-title"><button class="modal-close" aria-label="Close" @click="showAdminLogin = false"><X :size="20" /></button><span class="modal-icon"><ShieldCheck :size="25" /></span><div class="section-kicker">SCHOOL ACCESS</div><h2 id="admin-login-title">Principal sign in</h2><p>Use the principal password to manage the school tracker.</p><form @submit.prevent="loginAdmin"><label class="field-label" for="admin-login-password">PASSWORD</label><div class="password-field"><input id="admin-login-password" v-model="adminPassword" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" autofocus @input="adminLoginError = ''"><button type="button" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" :size="17" /><Eye v-else :size="17" /></button></div><div v-if="adminLoginError" class="form-error" role="alert">{{ adminLoginError }}</div><button class="primary-button modal-submit" type="submit" :disabled="busy"><LogIn :size="17" /> {{ busy ? 'Signing in...' : 'Sign in' }}</button></form></div></div>
    <div v-if="showBadgeEditor" class="modal-backdrop" @mousedown.self="showBadgeEditor = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="badge-editor-title"><button class="modal-close" aria-label="Close" @click="showBadgeEditor = false"><X :size="20" /></button><span class="modal-icon"><component :is="badgeIcons[badgeDraft.icon] || Award" :size="25" /></span><div class="section-kicker">SCHOOL ACHIEVEMENTS</div><h2 id="badge-editor-title">{{ badgeDraft.id ? 'Edit badge' : 'Add badge' }}</h2><form @submit.prevent="saveBadge"><label class="field-label" for="badge-name">BADGE NAME</label><input id="badge-name" v-model="badgeDraft.name" maxlength="32" required placeholder="e.g. Recycling Star"><label class="field-label password-label" for="badge-description">DESCRIPTION</label><input id="badge-description" v-model="badgeDraft.description" maxlength="90" required placeholder="What this badge celebrates"><div class="badge-form-grid"><div><label class="field-label" for="badge-icon">ICON</label><select id="badge-icon" v-model="badgeDraft.icon"><option v-for="icon in Object.keys(badgeIcons)" :key="icon" :value="icon">{{ icon }}</option></select></div><div><label class="field-label" for="badge-metric">MILESTONE</label><select id="badge-metric" v-model="badgeDraft.metric"><option v-for="metric in badgeMetricOptions" :key="metric.value" :value="metric.value">{{ metric.label }}</option></select></div></div><label class="field-label password-label" for="badge-threshold">TARGET</label><input id="badge-threshold" v-model.number="badgeDraft.threshold" type="number" min="1" max="1000000" step="1" required><div v-if="badgeError" class="form-error" role="alert">{{ badgeError }}</div><button class="primary-button modal-submit" type="submit" :disabled="busy"><Save :size="17" /> Save badge</button></form></div></div>
    <div v-if="showBadgeDelete" class="modal-backdrop" @mousedown.self="showBadgeDelete = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="badge-delete-title"><button class="modal-close" aria-label="Close" @click="showBadgeDelete = false"><X :size="20" /></button><span class="modal-icon danger-icon"><Trash2 :size="25" /></span><div class="section-kicker">SCHOOL ACHIEVEMENTS</div><h2 id="badge-delete-title">Delete {{ badges.find(badge => badge.id === badgeDeleteId)?.name }}?</h2><p>This badge will disappear from every class's achievements.</p><button class="danger-button modal-submit" type="button" :disabled="busy" @click="deleteBadge"><Trash2 :size="17" /> Delete badge</button></div></div>
    <div v-if="showXpAward && xpTargetClass" class="modal-backdrop" @mousedown.self="showXpAward = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="xp-award-title"><button class="modal-close" aria-label="Close" @click="showXpAward = false"><X :size="20" /></button><span class="modal-icon"><Sparkles :size="25" /></span><div class="section-kicker">PRINCIPAL AWARD</div><h2 id="xp-award-title">Award Class {{ xpTargetName }} XP</h2><p>{{ xpFor(xpTargetClass) }} XP earned · Level {{ levelFor(xpFor(xpTargetClass)) + 1 }} {{ levels[levelFor(xpFor(xpTargetClass))]?.name }}</p><form @submit.prevent="awardXp()"><label class="field-label" for="xp-amount">BONUS XP</label><input id="xp-amount" v-model="xpAmount" type="number" min="1" max="1000000" step="1" required><div v-if="xpError" class="form-error" role="alert">{{ xpError }}</div><button class="primary-button modal-submit" type="submit" :disabled="busy"><Sparkles :size="17" /> Award XP</button></form><button v-if="xpNextLevel" class="admin-text-button xp-level-up" type="button" :disabled="busy" @click="awardXp(xpNextLevel.threshold - xpFor(xpTargetClass))"><ArrowUpRight :size="16" /> Level up to {{ xpNextLevel.name }}</button></div></div>
    <div v-if="showAdminReset" class="modal-backdrop" @mousedown.self="showAdminReset = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="admin-reset-title"><button class="modal-close" aria-label="Close" @click="showAdminReset = false"><X :size="20" /></button><span class="modal-icon"><KeyRound :size="25" /></span><div class="section-kicker">CLASS ACCESS</div><h2 id="admin-reset-title">Reset Class {{ adminTargetName }}</h2><p>This replaces the class password and signs out its existing devices.</p><form @submit.prevent="resetAdminClassPassword"><label class="field-label" for="admin-class-password">NEW CLASS PASSWORD</label><input id="admin-class-password" v-model="adminClassPassword" :type="showPassword ? 'text' : 'password'" minlength="10" maxlength="128" autocomplete="new-password"><label class="field-label password-label" for="admin-class-confirm">CONFIRM PASSWORD</label><input id="admin-class-confirm" v-model="adminConfirmPassword" :type="showPassword ? 'text' : 'password'" autocomplete="new-password"><div v-if="adminResetError" class="form-error" role="alert">{{ adminResetError }}</div><button class="primary-button modal-submit" type="submit" :disabled="busy"><Save :size="17" /> Reset password</button></form></div></div>
    <div v-if="showAdminDelete" class="modal-backdrop" @mousedown.self="showAdminDelete = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="admin-delete-title"><button class="modal-close" aria-label="Close" @click="showAdminDelete = false"><X :size="20" /></button><span class="modal-icon danger-icon"><Trash2 :size="25" /></span><div class="section-kicker">PERMANENT ACTION</div><h2 id="admin-delete-title">Delete Class {{ adminTargetName }}?</h2><p>This removes the class and every weekly entry. It cannot be undone.</p><form @submit.prevent="deleteAdminClass"><label class="field-label" for="admin-delete-confirm">TYPE {{ adminTargetName }} TO CONFIRM</label><input id="admin-delete-confirm" v-model="adminDeleteConfirm" autocomplete="off" autocapitalize="characters"><div v-if="adminDeleteError" class="form-error" role="alert">{{ adminDeleteError }}</div><button class="danger-button modal-submit" type="submit" :disabled="busy"><Trash2 :size="17" /> Delete class permanently</button></form></div></div>
    <div v-if="showAdminPassword" class="modal-backdrop" @mousedown.self="showAdminPassword = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="admin-password-title"><button class="modal-close" aria-label="Close" @click="showAdminPassword = false"><X :size="20" /></button><span class="modal-icon"><ShieldCheck :size="25" /></span><div class="section-kicker">SCHOOL ACCESS</div><h2 id="admin-password-title">Principal password</h2><p>Changing this password signs out other principal devices.</p><form @submit.prevent="changeAdminPassword"><label class="field-label" for="admin-current-password">CURRENT PASSWORD</label><input id="admin-current-password" v-model="currentAdminPassword" :type="showPassword ? 'text' : 'password'" autocomplete="current-password"><label class="field-label password-label" for="admin-updated-password">NEW PASSWORD</label><input id="admin-updated-password" v-model="updatedAdminPassword" :type="showPassword ? 'text' : 'password'" minlength="10" maxlength="128" autocomplete="new-password"><label class="field-label password-label" for="admin-confirm-password">CONFIRM NEW PASSWORD</label><input id="admin-confirm-password" v-model="confirmAdminPassword" :type="showPassword ? 'text' : 'password'" autocomplete="new-password"><div v-if="adminPasswordError" class="form-error" role="alert">{{ adminPasswordError }}</div><button class="primary-button modal-submit" type="submit" :disabled="busy"><Save :size="17" /> Update password</button></form></div></div>
    <div v-if="showManage && signedInName" class="modal-backdrop" @mousedown.self="showManage = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="manage-title"><button class="modal-close" aria-label="Close" @click="showManage = false"><X :size="20" /></button><span class="modal-icon"><KeyRound :size="25" /></span><div class="section-kicker">CLASS SETTINGS</div><h2 id="manage-title">Manage Class {{ signedInName }}</h2><p>Changing the password signs out other devices.</p><form @submit.prevent="changePassword"><label class="field-label" for="current-password">CURRENT PASSWORD</label><input id="current-password" v-model="currentPassword" :type="showPassword ? 'text' : 'password'" autocomplete="current-password"><label class="field-label password-label" for="updated-password">NEW PASSWORD</label><div class="password-field"><input id="updated-password" v-model="updatedPassword" :type="showPassword ? 'text' : 'password'" minlength="10" maxlength="128" autocomplete="new-password"><button type="button" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" :size="17" /><Eye v-else :size="17" /></button></div><label class="field-label password-label" for="confirm-updated-password">CONFIRM NEW PASSWORD</label><input id="confirm-updated-password" v-model="confirmUpdatedPassword" :type="showPassword ? 'text' : 'password'" autocomplete="new-password"><div v-if="manageError" class="form-error" role="alert">{{ manageError }}</div><button class="primary-button modal-submit" type="submit" :disabled="busy"><Save :size="17" /> Update password</button></form><button class="danger-link" type="button" @click="showManage = false; showDelete = true"><Trash2 :size="16" /> Delete this class</button></div></div>
    <div v-if="showDelete && selected" class="modal-backdrop" @mousedown.self="showDelete = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="delete-title"><button class="modal-close" aria-label="Close" @click="showDelete = false"><X :size="20" /></button><span class="modal-icon danger-icon"><Trash2 :size="25" /></span><div class="section-kicker">PERMANENT ACTION</div><h2 id="delete-title">Delete Class {{ selected.name }}?</h2><p>This removes the class, every weekly entry, and its place on the leaderboard. It cannot be undone.</p><form @submit.prevent="removeClass"><label class="field-label" for="delete-confirm-name">TYPE {{ selected.name }} TO CONFIRM</label><input id="delete-confirm-name" v-model="deleteConfirmName" autocomplete="off" autocapitalize="characters"><label class="field-label password-label" for="delete-password">CLASS PASSWORD</label><input id="delete-password" v-model="deletePassword" :type="showPassword ? 'text' : 'password'" autocomplete="current-password"><div v-if="deleteError" class="form-error" role="alert">{{ deleteError }}</div><button class="danger-button modal-submit" type="submit" :disabled="busy"><Trash2 :size="17" /> {{ busy ? 'Deleting...' : 'Delete class permanently' }}</button></form></div></div>
    <div v-if="celebration" class="modal-backdrop celebration-backdrop" @mousedown.self="celebration = null"><div class="modal celebration" role="dialog" aria-modal="true" aria-labelledby="celebration-title"><div class="confetti" aria-hidden="true"><i v-for="i in 20" :key="i" :style="{ '--i': i - 1 }" /></div><button class="modal-close" aria-label="Close" @click="celebration = null"><X :size="20" /></button><span class="celebration-icon"><Trophy :size="38" /></span><div class="section-kicker">WELL DONE!</div><h2 id="celebration-title">{{ celebration.title }}</h2><p>{{ celebration.detail }}</p><button class="primary-button modal-submit" @click="celebration = null; scrollTo('achievements')">See achievements <ArrowRight :size="17" /></button></div></div>
  </div>
</template>
