import { clearFailedAdminLogins, getAdminCredentials, recordFailedAdminLogin } from '../../utils/repository'
import { verifyPassword } from '../../utils/password'
import { issueAdminSession } from '../../utils/admin-session'
import { requireSameOrigin } from '../../utils/session'

export default defineEventHandler(async event => {
  requireSameOrigin(event)
  const body = await readBody(event)
  if (typeof body?.password !== 'string' || body.password.length > 128) {
    throw createError({ statusCode: 400, message: 'Enter the principal password.' })
  }
  const credentials = await getAdminCredentials()
  if (!credentials?.hash) throw createError({ statusCode: 503, message: 'Principal access is not configured.' })
  if (credentials.lockedUntil && new Date(credentials.lockedUntil).getTime() > Date.now()) {
    throw createError({ statusCode: 429, message: 'Too many attempts. Try again in 15 minutes.' })
  }
  if (!await verifyPassword(body.password, credentials.hash)) {
    await recordFailedAdminLogin()
    throw createError({ statusCode: 401, message: 'Principal password is incorrect.' })
  }
  await clearFailedAdminLogins()
  await issueAdminSession(event)
  return { ok: true }
})
