type WeeklyCounts = { lunches: number; items: number }

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
