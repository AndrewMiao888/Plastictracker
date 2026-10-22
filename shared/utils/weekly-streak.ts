type WeeklyCounts = { lunches: number; items: number }

function followingWeek(week: string) {
  const date = new Date(`${week}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 7)
  return date.toISOString().slice(0, 10)
}

export function weeklyStreak(weeks: Record<string, WeeklyCounts>, currentWeek: string) {
  const date = new Date(`${currentWeek}T00:00:00Z`)
  const hasActivity = () => {
    const entry = weeks[date.toISOString().slice(0, 10)]
    return !!entry && (entry.lunches > 0 || entry.items > 0)
  }

  if (!hasActivity()) date.setUTCDate(date.getUTCDate() - 7)
  let streak = 0
  while (hasActivity()) {
    streak += 1
    date.setUTCDate(date.getUTCDate() - 7)
  }
  return streak
}

export function longestWeeklyStreak(weeks: Record<string, WeeklyCounts>) {
  const active = Object.entries(weeks)
    .filter(([, counts]) => counts.lunches > 0 || counts.items > 0)
    .map(([week]) => week)
    .sort()
  let longest = 0
  let run = 0
  let previous = ''
  for (const week of active) {
    const expected = previous ? followingWeek(previous) : ''
    run = previous && week === expected ? run + 1 : 1
    longest = Math.max(longest, run)
    previous = week
  }
  return longest
}

export function streakRewardXp(weeks: Record<string, WeeklyCounts>) {
  return Math.floor(longestWeeklyStreak(weeks) / 4) * 50
}
