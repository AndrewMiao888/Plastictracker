import { setLevels } from '../../utils/repository'
import { validLevelDefinitions } from '../../utils/tracker'
import { requireAdminSession } from '../../utils/admin-session'

export default defineEventHandler(async event => {
  await requireAdminSession(event)
  const body = await readBody(event)
  if (!validLevelDefinitions(body?.levels)) {
    throw createError({ statusCode: 400, message: 'Use 2 to 12 levels with unique names and rising XP thresholds, starting at 0.' })
  }
  await setLevels(body.levels)
  return { ok: true }
})
