export default defineEventHandler(() => {
  throw createError({ statusCode: 410, message: 'Public sample-data deletion is no longer available.' })
})
