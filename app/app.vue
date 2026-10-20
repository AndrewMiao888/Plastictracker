<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import {
  ArrowRight, ArrowUpRight, Award, CalendarDays, Check, ChevronDown,
  ChevronLeft, ChevronRight, CircleCheck, Earth, Leaf, Medal, Minus,
  PackageCheck, Plus, Recycle, Save, Sandwich, Sparkles, Sprout,
  Trash2, Trophy, UsersRound, X,
} from '@lucide/vue'

type WeekEntry = { lunches: number; items: number; updatedAt: string }
type ClassEntry = { name: string; sample: boolean; createdAt: string; weeks: Record<string, WeekEntry> }
type Dashboard = { goal: number; classes: ClassEntry[] }
type Celebration = { title: string; detail: string }

const classPattern = /^[0-9][a-zA-Z]{1,3}$/
const levels = [
  { name: 'Eco Rookie', threshold: 0 },
  { name: 'Green Scout', threshold: 120 },
  { name: 'Waste Warrior', threshold: 300 },
  { name: 'Earth Guardian', threshold: 550 },
  { name: 'Planet Saver', threshold: 900 },
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

function totals(entry: ClassEntry) {
  return Object.values(entry.weeks).reduce((sum, item) => ({
    lunches: sum.lunches + item.lunches,
    items: sum.items + item.items,
    weeks: sum.weeks + 1,
  }), { lunches: 0, items: 0, weeks: 0 })
}

function xpFor(entry: ClassEntry) {
  const total = totals(entry)
  return total.lunches * 2 + total.items * 3
}

function levelFor(xp: number) {
  return levels.reduce((index, level, nextIndex) => xp >= level.threshold ? nextIndex : index, 0)
}

const badges: { name: string; description: string; icon: Component; earned: (entry: ClassEntry) => boolean }[] = [
  { name: 'First Steps', description: 'Log your first week', icon: Sprout, earned: entry => totals(entry).weeks >= 1 },
  { name: 'Lunch Hero', description: 'Pack 25 plastic-free lunches', icon: Sandwich, earned: entry => totals(entry).lunches >= 25 },
  { name: 'Plastic Buster', description: 'Save 50 plastic items', icon: PackageCheck, earned: entry => totals(entry).items >= 50 },
  { name: 'Century Club', description: 'Save 100 plastic items', icon: Medal, earned: entry => totals(entry).items >= 100 },
  { name: 'On a Roll', description: 'Log four school weeks', icon: CalendarDays, earned: entry => totals(entry).weeks >= 4 },
  { name: 'Planet Saver', description: 'Reach level 5', icon: Earth, earned: entry => levelFor(xpFor(entry)) === 4 },
]

const { data: dashboard, error: loadError, refresh } = await useFetch<Dashboard>('/api/dashboard', { key: 'dashboard' })
const selectedName = ref(dashboard.value?.classes[0]?.name || '')
const week = ref(currentWeek())
const lunches = ref('0')
const items = ref('0')
const busy = ref(false)
const showCreate = ref(false)
const newName = ref('')
const formError = ref('')
const toast = ref('')
const celebration = ref<Celebration | null>(null)

const selected = computed(() => dashboard.value?.classes.find(entry => entry.name === selectedName.value))
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
const goal = computed(() => dashboard.value?.goal || 1000)
const progress = computed(() => Math.min(100, Math.round(schoolItems.value / goal.value * 100)))
const selectedXp = computed(() => selected.value ? xpFor(selected.value) : 0)
const selectedLevel = computed(() => levelFor(selectedXp.value))
const nextLevel = computed(() => levels[selectedLevel.value + 1])
const currentThreshold = computed(() => levels[selectedLevel.value]!.threshold)
const levelProgress = computed(() => nextLevel.value
  ? Math.min(100, Math.round((selectedXp.value - currentThreshold.value) / (nextLevel.value.threshold - currentThreshold.value) * 100))
  : 100)
const activities = computed(() => (dashboard.value?.classes || []).flatMap(entry => Object.entries(entry.weeks).map(([date, log]) => ({
  name: entry.name, date, ...log,
}))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5))
const hasSamples = computed(() => dashboard.value?.classes.some(entry => entry.sample) || false)
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
  busy.value = true
  formError.value = ''
  try {
    const name = newName.value.toUpperCase()
    await request('/api/classes', { method: 'POST', body: { name: newName.value } })
    await reload()
    selectedName.value = name
    showCreate.value = false
    newName.value = ''
    toast.value = `Class ${name} is ready to go!`
    window.setTimeout(() => scrollTo('check-in'), 100)
  } catch (error) { formError.value = (error as Error).message }
  finally { busy.value = false }
}

async function saveWeek() {
  if (!selected.value) return
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
    const oldBadges = badges.filter(badge => badge.earned(selected.value!)).map(badge => badge.name)
    await request(`/api/classes/${name}/weeks/${week.value}`, { method: 'PUT', body: { lunches: lunchCount, items: itemCount } })
    const data = await reload()
    const updated = data.classes.find(entry => entry.name === name)!
    const newLevel = levelFor(xpFor(updated))
    const earnedBadge = badges.find(badge => badge.earned(updated) && !oldBadges.includes(badge.name))
    if (newLevel > oldLevel) celebration.value = { title: `Level ${newLevel + 1} unlocked!`, detail: `${name} is now ${levels[newLevel]!.name}. Keep the momentum going!` }
    else if (earnedBadge) celebration.value = { title: `${earnedBadge.name} unlocked!`, detail: `${name} earned a new badge. Brilliant work!` }
    else toast.value = `${name}'s week has been saved.`
  } catch (error) { toast.value = (error as Error).message }
  finally { busy.value = false }
}

async function deleteWeek() {
  if (!selected.value || !existing.value) return
  busy.value = true
  try {
    const name = selected.value.name
    await request(`/api/classes/${name}/weeks/${week.value}`, { method: 'DELETE' })
    await reload()
    toast.value = `${name}'s entry for ${weekLabel(week.value)} was removed.`
  } catch (error) { toast.value = (error as Error).message }
  finally { busy.value = false }
}

async function removeSamples() {
  if (!window.confirm('Remove the five sample classes and their entries? Your own classes will stay.')) return
  busy.value = true
  try {
    await request('/api/sample-classes', { method: 'DELETE' })
    await reload()
    toast.value = 'Sample classes removed.'
  } catch (error) { toast.value = (error as Error).message }
  finally { busy.value = false }
}

function changeCount(current: string, amount: number) {
  return String(Math.max(0, Math.min(10000, (Number(current) || 0) + amount)))
}
</script>

<template>
  <div v-if="loadError" class="load-screen"><Leaf :size="34" /><h1>We couldn't load the school tracker.</h1><p>{{ loadError.message }}</p><button @click="reload">Try again</button></div>
  <div v-else-if="!dashboard" class="load-screen"><span class="loading-leaf"><Leaf :size="40" /></span><p>Loading your school...</p></div>
  <div v-else class="app-shell">
    <aside class="sidebar">
      <div class="brand"><span class="brand-mark"><Leaf :size="25" :stroke-width="2.6" /></span><span>plastic<span class="brand-accent">free.</span><small>SCHOOL TRACKER</small></span></div>
      <button v-if="hasSamples" class="mobile-sample-button" :disabled="busy" @click="removeSamples"><Trash2 :size="15" /> Clear demo</button>
      <div class="side-group"><div class="side-label">WORKSPACE</div>
        <button class="side-link active" @click="scrollTo('overview')"><span class="side-icon"><Earth :size="18" /></span>Overview</button>
        <button class="side-link" @click="scrollTo('check-in')"><span class="side-icon"><CalendarDays :size="18" /></span>Weekly check-in</button>
        <button class="side-link" @click="scrollTo('leaderboard')"><span class="side-icon"><Trophy :size="18" /></span>Leaderboard</button>
        <button class="side-link" @click="scrollTo('achievements')"><span class="side-icon"><Award :size="18" /></span>Achievements</button>
      </div>
      <div class="side-group class-group"><div class="side-label side-label-row">YOUR CLASSES <span>{{ dashboard.classes.length }}</span></div>
        <button v-for="entry in dashboard.classes.slice(0, 6)" :key="entry.name" class="class-link" :class="{ selected: selectedName === entry.name }" @click="selectedName = entry.name; scrollTo('check-in')"><span class="class-mini-icon">{{ entry.name[0] }}</span>Class {{ entry.name }}<span v-if="selectedName === entry.name" class="selected-dot" /></button>
        <button class="add-side" @click="showCreate = true"><Plus :size="16" /> Add a class</button>
      </div>
      <div class="sidebar-bottom"><div class="mission-icon"><Recycle :size="23" /></div><strong>Every item matters.</strong><p>One school day at a time, we're making a difference.</p><button v-if="hasSamples" :disabled="busy" @click="removeSamples">Remove sample data <ArrowRight :size="14" /></button></div>
    </aside>

    <main id="overview" class="main">
      <div class="topbar"><div class="breadcrumb">School dashboard <ChevronRight :size="14" /> <strong>Overview</strong></div><div class="top-actions"><span class="date-pill"><CalendarDays :size="15" /> Week of {{ weekLabel(currentWeek()) }}</span><span class="top-avatar"><Leaf :size="17" /></span></div></div>
      <div class="content">
        <header class="page-heading"><div><div class="eyebrow"><span class="eyebrow-dot" /> PLASTIC-FREE DAY <span v-if="hasSamples" class="sample-badge">SAMPLE DATA</span></div><h1>Small swaps. Big impact.</h1><p>Look what your school is doing together.</p></div><button class="primary-button heading-button" @click="showCreate = true"><Plus :size="18" /> Create class</button></header>

        <section class="hero-panel" aria-label="School goal progress"><div class="hero-copy"><div class="hero-kicker"><Sparkles :size="16" /> SCHOOL GOAL</div><h2>Together, we're making<br>a cleaner tomorrow.</h2><p>Plastic items saved by our school so far</p><div class="hero-number"><strong>{{ schoolItems.toLocaleString() }}</strong><span>/ {{ goal.toLocaleString() }} items</span></div><div class="hero-progress"><span :style="{ width: `${progress}%` }" /></div><div class="hero-foot"><span>{{ progress }}% of school goal</span><span>{{ Math.max(0, goal - schoolItems).toLocaleString() }} to go</span></div></div><div class="hero-visual"><div class="hero-ring" :style="{ '--progress': `${progress}%` }"><div class="hero-ring-inner"><Earth :size="93" :stroke-width="1.25" /><span class="ring-leaf"><Leaf :size="29" fill="currentColor" /></span></div></div><span class="visual-spark spark-one">✦</span><span class="visual-spark spark-two">✳</span><span class="visual-spark spark-three">✦</span></div></section>

        <section class="stats-grid" aria-label="School statistics"><div v-for="metric in metricRows" :key="metric.label" class="metric surface"><span class="metric-icon" :class="metric.tone"><component :is="metric.icon" :size="23" /></span><div><span class="metric-label">{{ metric.label }}</span><strong>{{ metric.value }}</strong><span class="metric-detail"><ArrowUpRight :size="14" /> {{ metric.detail }}</span></div></div></section>

        <div class="main-grid">
          <section id="check-in" class="surface checkin"><div class="section-heading"><div><div class="section-kicker">MAKE IT COUNT</div><h2>Weekly check-in</h2><p>Record your class's progress for the week.</p></div><span class="heading-icon green"><CalendarDays :size="21" /></span></div>
            <form v-if="selected" @submit.prevent="saveWeek"><div class="form-top"><label class="field-label" for="class-select">YOUR CLASS</label><div class="select-wrap"><select id="class-select" v-model="selectedName"><option v-for="entry in dashboard.classes" :key="entry.name" :value="entry.name">Class {{ entry.name }}</option></select><ChevronDown :size="18" /></div><div class="week-picker"><span>Week of <strong>{{ weekLabel(week) }}</strong></span><div><button type="button" title="Previous week" aria-label="Previous week" @click="week = shiftWeek(week, -1)"><ChevronLeft :size="18" /></button><button type="button" title="Next week" aria-label="Next week" :disabled="week >= currentWeek()" @click="week = shiftWeek(week, 1)"><ChevronRight :size="18" /></button></div></div></div>
              <div class="entry-fields"><div class="counter-row"><span class="counter-icon peach"><Sandwich :size="21" /></span><span class="counter-label"><strong>Plastic-free lunches</strong><small>Lunches packed this week</small></span><div class="stepper"><button type="button" aria-label="Decrease Plastic-free lunches" @click="lunches = changeCount(lunches, -1)"><Minus :size="15" /></button><input v-model="lunches" type="number" min="0" max="10000" step="1" aria-label="Plastic-free lunches"><button type="button" aria-label="Increase Plastic-free lunches" @click="lunches = changeCount(lunches, 1)"><Plus :size="15" /></button></div></div>
                <div class="counter-row"><span class="counter-icon mint"><PackageCheck :size="21" /></span><span class="counter-label"><strong>Plastic items saved</strong><small>Items avoided this week</small></span><div class="stepper"><button type="button" aria-label="Decrease Plastic items saved" @click="items = changeCount(items, -1)"><Minus :size="15" /></button><input v-model="items" type="number" min="0" max="10000" step="1" aria-label="Plastic items saved"><button type="button" aria-label="Increase Plastic items saved" @click="items = changeCount(items, 1)"><Plus :size="15" /></button></div></div></div>
              <div class="form-footer"><span class="edit-hint"><CircleCheck :size="16" /> {{ existing ? "Editing this week's entry" : 'Ready for a new entry' }}</span><div class="form-actions"><button v-if="existing" class="delete-button" type="button" title="Delete this week's entry" aria-label="Delete this week's entry" :disabled="busy" @click="deleteWeek"><Trash2 :size="17" /></button><button class="primary-button save-button" :disabled="busy" type="submit"><Save :size="17" /> {{ busy ? 'Saving...' : 'Save week' }}</button></div></div>
            </form><div v-else class="empty-state"><span><UsersRound :size="28" /></span><h3>Start with a class</h3><p>Create your first class to begin logging plastic-free days.</p><button class="primary-button" @click="showCreate = true"><Plus :size="17" /> Create class</button></div>
          </section>

          <section id="leaderboard" class="surface leaderboard"><div class="section-heading"><div><div class="section-kicker">FRIENDLY COMPETITION</div><h2>Leaderboard</h2><p>Top classes by plastic items saved.</p></div><span class="heading-icon yellow"><Trophy :size="21" /></span></div>
            <div v-if="ranked.length" class="leader-list"><button v-for="(row, index) in ranked" :key="row.entry.name" class="leader-row" :class="{ 'leader-selected': row.entry.name === selectedName }" @click="selectedName = row.entry.name; scrollTo('check-in')"><span class="leader-rank" :class="`rank-${index + 1}`"><Medal v-if="index < 3" :size="19" /><template v-else>{{ String(index + 1).padStart(2, '0') }}</template></span><span class="leader-avatar">{{ row.entry.name[0] }}</span><span class="leader-name"><strong>Class {{ row.entry.name }}</strong><small>Level {{ levelFor(row.xp) + 1 }} · {{ levels[levelFor(row.xp)]?.name }}</small></span><span class="leader-score"><strong>{{ row.items }}</strong><small>items saved</small></span></button></div><div v-else class="empty-state compact"><span><Trophy :size="28" /></span><h3>The leaderboard starts here</h3><p>Log a class week to take the first spot.</p></div>
          </section>
        </div>

        <section id="achievements" class="journey-section"><div class="section-title-row"><div><div class="section-kicker">KEEP GROWING</div><h2>{{ selected ? `Class ${selected.name}'s journey` : 'Class journey' }}</h2></div><span class="xp-explainer"><Sparkles :size="15" /> 2 XP per lunch · 3 XP per item</span></div>
          <div class="journey-grid"><div class="surface level-card"><div class="level-top"><span class="level-emblem"><Leaf :size="34" /></span><span class="level-number">LEVEL {{ selectedLevel + 1 }} OF 5</span></div><h3>{{ selected ? levels[selectedLevel]?.name : 'Eco Rookie' }}</h3><p>{{ selected ? `${selectedXp} XP earned so far` : 'Choose a class to begin the journey' }}</p><div class="level-track"><span :style="{ width: `${selected ? levelProgress : 0}%` }" /></div><div class="level-track-label"><span>{{ selectedXp }} XP</span><span>{{ nextLevel ? `${nextLevel.threshold} XP to Level ${selectedLevel + 2}` : 'Highest level reached' }}</span></div><div class="level-pips"><span v-for="(level, index) in levels" :key="level.name" :class="{ reached: index <= selectedLevel && selected }" :title="`Level ${index + 1}: ${level.name}`"><Check v-if="index < selectedLevel && selected" :size="13" /><template v-else>{{ index + 1 }}</template></span></div></div>
            <div class="surface badges-card"><div class="badges-heading"><h3>Achievement badges</h3><span>{{ selected ? badges.filter(badge => badge.earned(selected!)).length : 0 }} / {{ badges.length }} unlocked</span></div><div class="badge-grid"><div v-for="badge in badges" :key="badge.name" class="badge" :class="selected && badge.earned(selected) ? 'earned' : 'locked'" :title="badge.description"><span class="badge-icon"><component :is="badge.icon" :size="22" :stroke-width="1.8" /></span><strong>{{ badge.name }}</strong><small>{{ badge.description }}</small></div></div></div></div>
        </section>

        <section class="activity-section"><div class="section-title-row"><div><div class="section-kicker">LATEST UPDATES</div><h2>Recent activity</h2></div><span class="activity-count">{{ activities.length }} recent entries</span></div><div class="surface activity-table"><div class="table-head"><span>CLASS</span><span>WEEK</span><span>LUNCHES</span><span>ITEMS SAVED</span></div><template v-if="activities.length"><div v-for="activity in activities" :key="`${activity.name}-${activity.date}`" class="table-row"><span class="table-class"><span class="table-avatar">{{ activity.name[0] }}</span>Class {{ activity.name }}</span><span>Week of {{ weekLabel(activity.date) }}</span><span>{{ activity.lunches }}</span><span class="table-items">+{{ activity.items }} <ArrowUpRight :size="15" /></span></div></template><div v-else class="table-empty">No weeks logged yet. Your first entry will appear here.</div></div></section>
        <footer class="footer"><span><Leaf :size="15" /> Plastic-Free Day</span><span>Small choices add up.</span></footer>
      </div>
    </main>

    <div v-if="toast" class="toast" role="status"><CircleCheck :size="19" />{{ toast }}<button aria-label="Dismiss" @click="toast = ''"><X :size="16" /></button></div>
    <div v-if="showCreate" class="modal-backdrop" @mousedown.self="showCreate = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="create-title"><button class="modal-close" aria-label="Close" @click="showCreate = false"><X :size="20" /></button><span class="modal-icon"><UsersRound :size="25" /></span><div class="section-kicker">JOIN THE MOVEMENT</div><h2 id="create-title">Create a class</h2><p>Give your group a place on the school tracker.</p><form @submit.prevent="createClass"><label class="field-label" for="class-name">CLASS NAME</label><input id="class-name" v-model="newName" autofocus placeholder="e.g. 5B" :aria-invalid="!!formError" @input="formError = ''"><small class="field-help">One digit followed by 1 to 3 letters.</small><div v-if="formError" class="form-error" role="alert">{{ formError }}</div><button class="primary-button modal-submit" type="submit" :disabled="busy"><Plus :size="18" /> {{ busy ? 'Creating...' : 'Create class' }}</button></form></div></div>
    <div v-if="celebration" class="modal-backdrop celebration-backdrop" @mousedown.self="celebration = null"><div class="modal celebration" role="dialog" aria-modal="true" aria-labelledby="celebration-title"><div class="confetti" aria-hidden="true"><i v-for="i in 20" :key="i" :style="{ '--i': i - 1 }" /></div><button class="modal-close" aria-label="Close" @click="celebration = null"><X :size="20" /></button><span class="celebration-icon"><Trophy :size="38" /></span><div class="section-kicker">WELL DONE!</div><h2 id="celebration-title">{{ celebration.title }}</h2><p>{{ celebration.detail }}</p><button class="primary-button modal-submit" @click="celebration = null; scrollTo('achievements')">See achievements <ArrowRight :size="17" /></button></div></div>
  </div>
</template>
