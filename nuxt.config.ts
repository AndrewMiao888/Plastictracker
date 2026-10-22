const appVersion = process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version || 'local'
const assetVersion = appVersion.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'local'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-21',
  css: ['~/../src/styles.css'],
  devtools: { enabled: false },
  typescript: { strict: true },
  runtimeConfig: {
    public: {
      appVersion,
      appEnvironment: process.env.VERCEL_ENV || 'local',
    },
  },
  routeRules: {
    '/': { headers: { 'cache-control': 'no-store, max-age=0, must-revalidate' } },
    '/api/**': { headers: { 'cache-control': 'no-store, max-age=0, must-revalidate' } },
    '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
  },
  app: {
    head: {
      title: "St Andrew's Plastic-Free Day",
      link: [
        { rel: 'icon', type: 'image/x-icon', href: `/favicon.ico?v=${assetVersion}` },
      ],
      meta: [
        { name: 'description', content: 'Track weekly plastic-free lunches and celebrate every item saved at school.' },
        { name: 'theme-color', content: '#153f38' },
        { name: 'app-version', content: appVersion },
      ],
    },
  },
})
