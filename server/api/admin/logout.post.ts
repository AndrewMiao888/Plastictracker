import { revokeAdminSession } from '../../utils/admin-session'
import { requireSameOrigin } from '../../utils/session'

export default defineEventHandler(async event => {
  requireSameOrigin(event)
  await revokeAdminSession(event)
  return { ok: true }
})
