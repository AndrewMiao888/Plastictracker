import { setSchoolSettings } from '../../utils/repository'
import { validSchoolSettings } from '../../utils/tracker'
import { requireAdminSession } from '../../utils/admin-session'

export default defineEventHandler(async event => {
  await requireAdminSession(event)
  const body = await readBody(event)
  if (!body || !Number.isInteger(body.goal) || body.goal < 1 || body.goal > 1_000_000 ||
      !validSchoolSettings(body.settings)) {
    throw createError({ statusCode: 400, message: 'Check the goal, weekly name, colours, and font. The background must be light enough for readable text.' })
  }
  await setSchoolSettings(body.goal, body.settings)
  return { ok: true }
})
