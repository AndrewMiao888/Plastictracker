import { setSchoolGoal } from '../../utils/repository'
import { requireAdminSession } from '../../utils/admin-session'

export default defineEventHandler(async event => {
  await requireAdminSession(event)
  const body = await readBody(event)
  if (!Number.isInteger(body?.goal) || body.goal < 1 || body.goal > 1_000_000) {
    throw createError({ statusCode: 400, message: 'Choose a school goal from 1 to 1,000,000.' })
  }
  await setSchoolGoal(body.goal)
  return { ok: true }
})
