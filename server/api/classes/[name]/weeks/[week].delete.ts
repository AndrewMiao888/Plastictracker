import { CLASS_NAME_PATTERN, validWeek } from '../../../../utils/tracker'
import { deleteWeek } from '../../../../utils/repository'
import { requireClassSession } from '../../../../utils/session'

export default defineEventHandler(async event => {
  const name = (getRouterParam(event, 'name') || '').toUpperCase()
  const week = getRouterParam(event, 'week') || ''
  if (!CLASS_NAME_PATTERN.test(name) || !validWeek(week)) {
    throw createError({ statusCode: 400, message: 'Choose a valid class and a current or past school week.' })
  }
  await requireClassSession(event, name)
  if (!await deleteWeek(name, week)) throw createError({ statusCode: 404, message: 'Class not found.' })
  return { ok: true }
})
