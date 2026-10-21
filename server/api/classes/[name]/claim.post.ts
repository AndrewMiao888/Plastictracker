import { CLASS_NAME_PATTERN } from '../../../utils/tracker'
import { claimClass } from '../../../utils/repository'
import { hashPassword, validPassword } from '../../../utils/password'
import { issueClassSession, requireSameOrigin } from '../../../utils/session'

export default defineEventHandler(async event => {
  requireSameOrigin(event)
  const rawName = getRouterParam(event, 'name')
  if (!rawName || !CLASS_NAME_PATTERN.test(rawName)) {
    throw createError({ statusCode: 400, message: 'Enter a valid class name.' })
  }
  const body = await readBody(event)
  if (!validPassword(body?.password)) {
    throw createError({ statusCode: 400, message: 'Use a password of 10 to 128 characters.' })
  }
  const name = rawName.toUpperCase()
  if (!await claimClass(name, await hashPassword(body.password))) {
    throw createError({ statusCode: 409, message: 'This class has already been claimed or does not exist. Refresh and sign in.' })
  }
  await issueClassSession(event, name)
  return { className: name }
})
