import { CLASS_NAME_PATTERN } from '../../utils/tracker'
import { deleteClass, getCredentials } from '../../utils/repository'
import { verifyPassword } from '../../utils/password'
import { requireClassSession, revokeClassSession } from '../../utils/session'

export default defineEventHandler(async event => {
  const name = (getRouterParam(event, 'name') || '').toUpperCase()
  if (!CLASS_NAME_PATTERN.test(name)) throw createError({ statusCode: 400, message: 'Choose a valid class.' })
  await requireClassSession(event, name)
  const body = await readBody(event)
  const credentials = await getCredentials(name)
  if (!body || typeof body.password !== 'string' || body.password.length > 128 || !credentials?.hash || !await verifyPassword(body.password, credentials.hash)) {
    throw createError({ statusCode: 401, message: 'Password is incorrect.' })
  }
  if (!await deleteClass(name)) throw createError({ statusCode: 404, message: 'Class not found.' })
  await revokeClassSession(event)
  return { ok: true }
})
