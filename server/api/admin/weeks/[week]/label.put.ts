import { putWeekLabel } from '../../../../utils/repository'
import { validSchoolWeekDate, validWeekLabel } from '../../../../utils/tracker'
import { requireAdminSession } from '../../../../utils/admin-session'

export default defineEventHandler(async event => {
  await requireAdminSession(event)
  const week = getRouterParam(event, 'week')
  const body = await readBody(event)
  if (!week || !validSchoolWeekDate(week) || !validWeekLabel(body?.label)) {
    throw createError({ statusCode: 400, message: 'Choose a Monday and a week label of 2 to 40 characters.' })
  }
  await putWeekLabel(week, body.label)
  return { ok: true }
})
