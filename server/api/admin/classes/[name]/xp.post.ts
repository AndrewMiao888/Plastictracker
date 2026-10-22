import { awardBonusXp } from '../../../../utils/repository'
import { CLASS_NAME_PATTERN } from '../../../../utils/tracker'
import { requireAdminSession } from '../../../../utils/admin-session'

export default defineEventHandler(async event => {
  await requireAdminSession(event)
  const name = (getRouterParam(event, 'name') || '').toUpperCase()
  const body = await readBody(event)
  if (!CLASS_NAME_PATTERN.test(name) || !Number.isInteger(body?.amount) || body.amount < 1 || body.amount > 1_000_000) {
    throw createError({ statusCode: 400, message: 'Choose a class and 1 to 1,000,000 bonus EcoXP.' })
  }
  if (!await awardBonusXp(name, body.amount)) {
    throw createError({ statusCode: 409, message: 'Class not found or bonus EcoXP limit reached.' })
  }
  return { ok: true }
})
