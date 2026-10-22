import type { H3Event } from 'h3'
import { revokeAdminSession } from './admin-session'
import { requireSameOrigin, revokeClassSession } from './session'

export async function signOutDevice(event: H3Event) {
  requireSameOrigin(event)
  // A principal and a class can be signed in on the same device.
  await revokeAdminSession(event)
  await revokeClassSession(event)
  return { ok: true }
}
