import { CLASS_NAME_PATTERN } from '../../utils/tracker'
import { clearFailedLogins, getCredentials, recordFailedLogin } from '../../utils/repository'
import { verifyPassword } from '../../utils/password'
import { issueClassSession, requireSameOrigin } from '../../utils/session'

export default defineEventHandler(async event => {
  requireSameOrigin(event)
  const body = await readBody(event)
  if (!body || typeof body.name !== 'string' || !CLASS_NAME_PATTERN.test(body.name) ||
      typeof body.password !== 'string' || body.password.length > 128) {
    throw createError({ statusCode: 400, message: 'Enter your class name and password.' })
  }
  const name = body.name.toUpperCase()
  const credentials = await getCredentials(name)
  if (!credentials) throw createError({ statusCode: 401, message: 'Class name or password is incorrect.' })
  if (!credentials.hash) throw createError({ statusCode: 403, message: 'This class has not been given a password yet. Ask the school coordinator.' })
  if (credentials.lockedUntil && new Date(credentials.lockedUntil).getTime() > Date.now()) {
    throw createError({ statusCode: 429, message: 'Too many attempts. Try again in 15 minutes.' })
  }
  if (!await verifyPassword(body.password, credentials.hash)) {
    await recordFailedLogin(name)
    throw createError({ statusCode: 401, message: 'Class name or password is incorrect.' })
  }
  await clearFailedLogins(name)
  await issueClassSession(event, name)
  return { className: name }
})
