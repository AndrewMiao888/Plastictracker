import { CLASS_NAME_PATTERN } from '../../../../utils/tracker'
import { removeClassSessions, setClassPassword } from '../../../../utils/repository'
import { hashPassword, validPassword } from '../../../../utils/password'
import { requireAdminSession } from '../../../../utils/admin-session'

export default defineEventHandler(async event => {
  await requireAdminSession(event)
  const name = (getRouterParam(event, 'name') || '').toUpperCase()
  if (!CLASS_NAME_PATTERN.test(name)) throw createError({ statusCode: 400, message: 'Choose a valid class.' })
  const body = await readBody(event)
  if (!validPassword(body?.password)) throw createError({ statusCode: 400, message: 'Use a password of 10 to 128 characters.' })
  if (!await setClassPassword(name, await hashPassword(body.password))) throw createError({ statusCode: 404, message: 'Class not found.' })
  await removeClassSessions(name)
  return { ok: true }
})
