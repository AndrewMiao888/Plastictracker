import { deleteWeekLabel } from '../../../../utils/repository'
import { validSchoolWeekDate } from '../../../../utils/tracker'
import { requireAdminSession } from '../../../../utils/admin-session'

export default defineEventHandler(async event => {
  await requireAdminSession(event)
  const week = getRouterParam(event, 'week')
  if (!week || !validSchoolWeekDate(week)) throw createError({ statusCode: 400, message: 'Choose a valid Monday.' })
  if (!await deleteWeekLabel(week)) throw createError({ statusCode: 404, message: 'Week label not found.' })
  return { ok: true }
})
