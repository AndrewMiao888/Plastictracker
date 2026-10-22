import assert from 'node:assert/strict'
import test from 'node:test'
import { longestWeeklyStreak, streakRewardXp, weeklyStreak } from './weekly-streak.ts'

const week = '2026-10-19'

test('a lunch or an item starts a weekly streak', () => {
  assert.equal(weeklyStreak({ [week]: { lunches: 1, items: 0 } }, week), 1)
  assert.equal(weeklyStreak({ [week]: { lunches: 0, items: 1 } }, week), 1)
  assert.equal(weeklyStreak({ [week]: { lunches: 0, items: 0 } }, week), 0)
})

test('consecutive weeks count once each and a zero week breaks the streak', () => {
  assert.equal(weeklyStreak({
    '2026-10-05': { lunches: 0, items: 4 },
    '2026-10-12': { lunches: 2, items: 0 },
    [week]: { lunches: 3, items: 5 },
  }, week), 3)
  assert.equal(weeklyStreak({
    '2026-10-05': { lunches: 4, items: 0 },
    '2026-10-12': { lunches: 0, items: 0 },
    [week]: { lunches: 0, items: 2 },
  }, week), 1)
})

test('last week remains active until this week is logged', () => {
  assert.equal(weeklyStreak({
    '2026-10-05': { lunches: 0, items: 1 },
    '2026-10-12': { lunches: 1, items: 0 },
  }, week), 2)
  assert.equal(weeklyStreak({ '2026-10-05': { lunches: 1, items: 0 } }, week), 0)
})

test('streaks cross the year boundary', () => {
  assert.equal(weeklyStreak({
    '2026-12-28': { lunches: 0, items: 1 },
    '2027-01-04': { lunches: 1, items: 0 },
  }, '2027-01-04'), 2)
})

test('longest streak and EcoXP rewards survive a later break', () => {
  const weeks = {
    '2026-08-31': { lunches: 1, items: 0 },
    '2026-09-07': { lunches: 1, items: 0 },
    '2026-09-14': { lunches: 1, items: 0 },
    '2026-09-21': { lunches: 1, items: 0 },
    '2026-10-05': { lunches: 1, items: 0 },
  }
  assert.equal(longestWeeklyStreak(weeks), 4)
  assert.equal(streakRewardXp(weeks), 50)
})
