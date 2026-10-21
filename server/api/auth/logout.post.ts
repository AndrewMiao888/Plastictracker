import { requireSameOrigin, revokeClassSession } from '../../utils/session'

export default defineEventHandler(async event => {
  requireSameOrigin(event)
  await revokeClassSession(event)
  return { ok: true }
})
