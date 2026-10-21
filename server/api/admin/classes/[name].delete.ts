import { CLASS_NAME_PATTERN } from '../../../utils/tracker'
import { deleteClass } from '../../../utils/repository'
import { requireAdminSession } from '../../../utils/admin-session'

export default defineEventHandler(async event => {
  await requireAdminSession(event)
  const name = (getRouterParam(event, 'name') || '').toUpperCase()
  if (!CLASS_NAME_PATTERN.test(name)) throw createError({ statusCode: 400, message: 'Choose a valid class.' })
  if (!await deleteClass(name)) throw createError({ statusCode: 404, message: 'Class not found.' })
  return { ok: true }
})
