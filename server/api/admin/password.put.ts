import { getAdminCredentials, removeAllAdminSessions, setAdminPassword } from '../../utils/repository'
import { hashPassword, validPassword, verifyPassword } from '../../utils/password'
import { issueAdminSession, requireAdminSession } from '../../utils/admin-session'

export default defineEventHandler(async event => {
  await requireAdminSession(event)
  const body = await readBody(event)
  if (typeof body?.currentPassword !== 'string' || body.currentPassword.length > 128 || !validPassword(body.newPassword)) {
    throw createError({ statusCode: 400, message: 'Enter the current password and a new password of 10 to 128 characters.' })
  }
  const credentials = await getAdminCredentials()
  if (!await verifyPassword(body.currentPassword, credentials?.hash || null)) {
    throw createError({ statusCode: 401, message: 'Current principal password is incorrect.' })
  }
  await setAdminPassword(await hashPassword(body.newPassword))
  await removeAllAdminSessions()
  await issueAdminSession(event)
  return { ok: true }
})
