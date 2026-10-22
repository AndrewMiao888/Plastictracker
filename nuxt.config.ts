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
    '/favicon.ico': { headers: { 'cache-control': 'no-store, max-age=0, must-revalidate' } },
    '/favicon.svg': { headers: { 'cache-control': 'no-store, max-age=0, must-revalidate' } },
    '/favicon-32x32.png': { headers: { 'cache-control': 'no-store, max-age=0, must-revalidate' } },
    '/apple-touch-icon.png': { headers: { 'cache-control': 'no-store, max-age=0, must-revalidate' } },
    '/icon-192x192.png': { headers: { 'cache-control': 'no-store, max-age=0, must-revalidate' } },
    '/icon-512x512.png': { headers: { 'cache-control': 'no-store, max-age=0, must-revalidate' } },
    '/site.webmanifest': { headers: { 'cache-control': 'no-store, max-age=0, must-revalidate' } },
    '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
  },
  app: {
    head: {
      title: "St Andrew's Plastic-Free Day",
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: `/favicon.svg?v=${assetVersion}` },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: `/favicon-32x32.png?v=${assetVersion}` },
        { rel: 'icon', type: 'image/x-icon', href: `/favicon.ico?v=${assetVersion}` },
        { rel: 'shortcut icon', type: 'image/x-icon', href: `/favicon.ico?v=${assetVersion}` },
        { rel: 'apple-touch-icon', sizes: '180x180', href: `/apple-touch-icon.png?v=${assetVersion}` },
        { rel: 'manifest', href: `/site.webmanifest?v=${assetVersion}` },
      ],
      meta: [
        { name: 'description', content: 'Track weekly plastic-free lunches and celebrate every item saved at school.' },
        { name: 'theme-color', content: '#153f38' },
        { name: 'app-version', content: appVersion },
      ],
    },
  },
})
