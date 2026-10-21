import { getCredentials, removeClassSessions, setClassPassword } from '../../utils/repository'
import { hashPassword, validPassword, verifyPassword } from '../../utils/password'
import { issueClassSession, requireClassSession } from '../../utils/session'

export default defineEventHandler(async event => {
  const name = await requireClassSession(event)
  const body = await readBody(event)
  if (!body || typeof body.currentPassword !== 'string' || body.currentPassword.length > 128 || !validPassword(body.newPassword)) {
    throw createError({ statusCode: 400, message: 'Enter your current password and a new password of 10 to 128 characters.' })
  }
  const credentials = await getCredentials(name)
  if (!credentials?.hash || !await verifyPassword(body.currentPassword, credentials.hash)) {
    throw createError({ statusCode: 401, message: 'Current password is incorrect.' })
  }
  if (!await setClassPassword(name, await hashPassword(body.newPassword))) throw createError({ statusCode: 404, message: 'Class not found.' })
  await removeClassSessions(name)
  await issueClassSession(event, name)
  return { ok: true }
})
