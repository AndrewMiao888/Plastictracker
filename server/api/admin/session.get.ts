import { readAdminSession } from '../../utils/admin-session'

export default defineEventHandler(async event => ({ admin: await readAdminSession(event) }))
