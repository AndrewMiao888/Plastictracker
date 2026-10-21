import { createError, deleteCookie, getCookie, setCookie, type H3Event } from 'h3'
import { findAdminSession, removeAdminSession, storeAdminSession } from './repository'
import { hashSessionToken, newSessionToken } from './password'
import { readClassSession, requireSameOrigin } from './session'

const COOKIE_NAME = 'plastic_admin_session'
const SESSION_SECONDS = 8 * 60 * 60

export async function readAdminSession(event: H3Event) {
  const token = getCookie(event, COOKIE_NAME)
  if (!token) return false
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) { deleteCookie(event, COOKIE_NAME, { path: '/' }); return false }
  const valid = await findAdminSession(hashSessionToken(token))
  if (!valid) deleteCookie(event, COOKIE_NAME, { path: '/' })
  return valid
}

export async function requireAdminSession(event: H3Event) {
  requireSameOrigin(event)
  if (!await readAdminSession(event)) throw createError({ statusCode: 401, message: 'Sign in as principal first.' })
}

export async function requireWriteAccess(event: H3Event, name: string) {
  requireSameOrigin(event)
  if (await readAdminSession(event)) return
  const signedIn = await readClassSession(event)
  if (!signedIn) throw createError({ statusCode: 401, message: 'Sign in to your class first.' })
  if (signedIn !== name) throw createError({ statusCode: 403, message: 'Sign in to this class to make changes.' })
}

export async function issueAdminSession(event: H3Event) {
  await revokeAdminSession(event)
  const token = newSessionToken()
  await storeAdminSession(hashSessionToken(token), new Date(Date.now() + SESSION_SECONDS * 1000).toISOString())
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
    path: '/', maxAge: SESSION_SECONDS,
  })
}

export async function revokeAdminSession(event: H3Event) {
  const token = getCookie(event, COOKIE_NAME)
  if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) await removeAdminSession(hashSessionToken(token))
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}
