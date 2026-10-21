import { setBadges } from '../../utils/repository'
import { validBadgeDefinitions } from '../../utils/tracker'
import { requireAdminSession } from '../../utils/admin-session'

export default defineEventHandler(async event => {
  await requireAdminSession(event)
  const body = await readBody(event)
  if (!validBadgeDefinitions(body?.badges)) {
    throw createError({ statusCode: 400, message: 'Check badge names, milestones, and icons. Badge names must be unique.' })
  }
  await setBadges(body.badges)
  return { ok: true }
})
