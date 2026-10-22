export default defineEventHandler((event) => {
  setHeader(event, 'cache-control', 'no-store, max-age=0, must-revalidate')

  const config = useRuntimeConfig(event)
  const version = String(config.public.appVersion || 'local')

  return {
    version,
    label: version === 'local' ? 'local' : version.slice(0, 7),
    environment: String(config.public.appEnvironment || 'local'),
  }
})
