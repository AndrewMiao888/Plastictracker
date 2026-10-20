import { removeSampleClasses } from '../utils/repository'

export default defineEventHandler(async () => {
  await removeSampleClasses()
  return { ok: true }
})
