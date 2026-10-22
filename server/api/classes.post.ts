import { CLASS_NAME_PATTERN } from '../utils/tracker'
import { createClass } from '../utils/repository'
import { hashPassword, validPassword } from '../utils/password'
import { requireAdminSession } from '../utils/admin-session'

export default defineEventHandler(async event => {
  await requireAdminSession(event)
  const body = await readBody(event)
  if (!body || typeof body.name !== 'string' || !CLASS_NAME_PATTERN.test(body.name)) {
    throw createError({ statusCode: 400, message: 'Use one digit followed by 1 to 3 letters, like 5B or 6AB.' })
  }
  if (!validPassword(body.password)) {
    throw createError({ statusCode: 400, message: 'Use a password of 10 to 128 characters.' })
  }
  const name = body.name.toUpperCase()
  if (!await createClass(name, await hashPassword(body.password))) throw createError({ statusCode: 409, message: 'That class already exists.' })
  setResponseStatus(event, 201)
  return { className: name }
})
