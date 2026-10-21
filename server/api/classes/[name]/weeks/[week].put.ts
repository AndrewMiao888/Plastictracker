import { CLASS_NAME_PATTERN, validCount, validWeek } from '../../../../utils/tracker'
import { putWeek } from '../../../../utils/repository'
import { requireWriteAccess } from '../../../../utils/admin-session'

export default defineEventHandler(async event => {
  const name = (getRouterParam(event, 'name') || '').toUpperCase()
  const week = getRouterParam(event, 'week') || ''
  if (!CLASS_NAME_PATTERN.test(name) || !validWeek(week)) {
    throw createError({ statusCode: 400, message: 'Choose a valid class and a current or past school week.' })
  }
  await requireWriteAccess(event, name)
  const body = await readBody(event)
  if (!body || !validCount(body.lunches) || !validCount(body.items) ||
      (body.lunches === 0 && body.items === 0)) {
    throw createError({ statusCode: 400, message: 'Enter whole numbers from 0 to 10,000, with at least one item or lunch.' })
  }
  if (!await putWeek(name, week, body.lunches, body.items)) {
    throw createError({ statusCode: 404, message: 'Class not found.' })
  }
  return { ok: true }
})
