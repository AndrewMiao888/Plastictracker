import { AVATAR_STYLES, CLASS_NAME_PATTERN, ecoXpFor, validAvatarStyle } from '../../../utils/tracker'
import { getDashboard, setAvatarStyle } from '../../../utils/repository'
import { readAdminSession, requireWriteAccess } from '../../../utils/admin-session'

export default defineEventHandler(async event => {
  const name = (getRouterParam(event, 'name') || '').toUpperCase()
  const body = await readBody(event)
  if (!CLASS_NAME_PATTERN.test(name) || !validAvatarStyle(body?.style)) {
    throw createError({ statusCode: 400, message: 'Choose a valid class and unlocked avatar style.' })
  }
  await requireWriteAccess(event, name)
  const dashboard = await getDashboard()
  const entry = dashboard.classes.find(item => item.name === name)
  if (!entry) throw createError({ statusCode: 404, message: 'Class not found.' })
  const level = dashboard.levels.reduce((current, definition, index) => ecoXpFor(entry) >= definition.threshold ? index : current, 0)
  if (AVATAR_STYLES.indexOf(body.style) > level && !await readAdminSession(event)) {
    throw createError({ statusCode: 403, message: 'Earn more EcoXP to unlock this avatar element.' })
  }
  if (!await setAvatarStyle(name, body.style)) throw createError({ statusCode: 404, message: 'Class not found.' })
  return { ok: true }
})
