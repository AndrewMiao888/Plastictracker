import { createError, deleteCookie, getCookie, getHeader, setCookie, type H3Event } from 'h3'
import { findSession, removeSession, storeSession } from './repository'
import { hashSessionToken, newSessionToken } from './password'

const COOKIE_NAME = 'plastic_class_session'
const SESSION_SECONDS = 14 * 24 * 60 * 60

export function requireSameOrigin(event: H3Event) {
  const fetchSite = getHeader(event, 'sec-fetch-site')
  const origin = getHeader(event, 'origin')
  let foreignOrigin = false
  if (origin) {
    try { foreignOrigin = new URL(origin).host !== getHeader(event, 'host') }
    catch { foreignOrigin = true }
  }
  if (fetchSite === 'cross-site' || foreignOrigin) {
    throw createError({ statusCode: 403, message: 'This request must come from the school tracker.' })
  }
}

export async function readClassSession(event: H3Event): Promise<string | null> {
  const token = getCookie(event, COOKIE_NAME)
  if (!token) return null
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) { deleteCookie(event, COOKIE_NAME, { path: '/' }); return null }
  const name = await findSession(hashSessionToken(token))
  if (!name) deleteCookie(event, COOKIE_NAME, { path: '/' })
  return name
}

export async function requireClassSession(event: H3Event, name?: string) {
  requireSameOrigin(event)
  const signedIn = await readClassSession(event)
  if (!signedIn) throw createError({ statusCode: 401, message: 'Sign in to your class first.' })
  if (name && signedIn !== name) throw createError({ statusCode: 403, message: 'Sign in to this class to make changes.' })
  return signedIn
}

export async function issueClassSession(event: H3Event, name: string) {
  await revokeClassSession(event)
  const token = newSessionToken()
  await storeSession(hashSessionToken(token), name, new Date(Date.now() + SESSION_SECONDS * 1000).toISOString())
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
    path: '/', maxAge: SESSION_SECONDS,
  })
}

export async function revokeClassSession(event: H3Event) {
  const token = getCookie(event, COOKIE_NAME)
  if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) await removeSession(hashSessionToken(token))
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}
