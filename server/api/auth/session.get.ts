import { readClassSession } from '../../utils/session'

export default defineEventHandler(async event => ({ className: await readClassSession(event) }))
