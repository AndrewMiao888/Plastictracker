import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CLASS_NAME_PATTERN, DEFAULT_SCHOOL_SETTINGS, starterData, validCount, validSchoolSettings, validWeek } from './tracker.ts'

test('class names require exactly one digit followed by 1 to 3 letters', () => {
  for (const name of ['5B', '6AB', '4ABC', '0z']) assert.equal(CLASS_NAME_PATTERN.test(name), true, name)
  for (const name of ['', '5', '55A', 'A5', '5ABCD', '5-A', ' 5B', '5B ']) assert.equal(CLASS_NAME_PATTERN.test(name), false, name)
})

test('weekly entries require a current or past Monday and whole-number counts', () => {
  assert.equal(validWeek('2026-10-19', '2026-10-19'), true)
  assert.equal(validWeek('2026-10-12', '2026-10-19'), true)
  assert.equal(validWeek('2026-10-20', '2026-10-19'), false)
  assert.equal(validWeek('2026-10-26', '2026-10-19'), false)
  assert.equal(validCount(0), true)
  assert.equal(validCount(10000), true)
  for (const count of [-1, 1.5, 10001, '4']) assert.equal(validCount(count), false)
})

test('sample data uses the chosen school week', () => {
  const sample = starterData('2026-10-19')
  assert.equal(sample.classes.length, 5)
  assert.equal(sample.classes[0]?.weeks['2026-10-19']?.items, 54)
  assert.equal(sample.classes[0]?.weeks['2026-10-12']?.items, 48)
})

test('school appearance settings accept readable backgrounds and supported fonts', () => {
  assert.equal(validSchoolSettings(DEFAULT_SCHOOL_SETTINGS), true)
  assert.equal(validSchoolSettings({ ...DEFAULT_SCHOOL_SETTINGS, weekName: 'Waste-Free Wednesday', backgroundColor: '#e9f1f8', accentColor: '#f5ac71', fontFamily: 'Georgia' }), true)
  assert.equal(validSchoolSettings({ ...DEFAULT_SCHOOL_SETTINGS, weekName: ' ' }), false)
  assert.equal(validSchoolSettings({ ...DEFAULT_SCHOOL_SETTINGS, backgroundColor: '#14241f' }), false)
  assert.equal(validSchoolSettings({ ...DEFAULT_SCHOOL_SETTINGS, accentColor: 'red' }), false)
  assert.equal(validSchoolSettings({ ...DEFAULT_SCHOOL_SETTINGS, fontFamily: 'Comic Sans MS' }), false)
})
