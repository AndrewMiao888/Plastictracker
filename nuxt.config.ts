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
    '/plastic-free-favicon.ico': { headers: { 'cache-control': 'no-store, max-age=0, must-revalidate' } },
    '/plastic-free-favicon.svg': { headers: { 'cache-control': 'no-store, max-age=0, must-revalidate' } },
    '/plastic-free-favicon-32.png': { headers: { 'cache-control': 'no-store, max-age=0, must-revalidate' } },
    '/apple-touch-icon.png': { headers: { 'cache-control': 'no-store, max-age=0, must-revalidate' } },
    '/apple-touch-icon-precomposed.png': { headers: { 'cache-control': 'no-store, max-age=0, must-revalidate' } },
    '/st-andrews-plastic-free-icon.png': { headers: { 'cache-control': 'no-store, max-age=0, must-revalidate' } },
    '/icon-192x192.png': { headers: { 'cache-control': 'no-store, max-age=0, must-revalidate' } },
    '/icon-512x512.png': { headers: { 'cache-control': 'no-store, max-age=0, must-revalidate' } },
    '/plastic-free-icon-192.png': { headers: { 'cache-control': 'no-store, max-age=0, must-revalidate' } },
    '/plastic-free-icon-512.png': { headers: { 'cache-control': 'no-store, max-age=0, must-revalidate' } },
    '/site.webmanifest': { headers: { 'cache-control': 'no-store, max-age=0, must-revalidate' } },
    '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
  },
  app: {
    head: {
      title: "St Andrew's EcoLunch League",
      link: [
        { rel: 'icon', type: 'image/png', sizes: '180x180', href: `/st-andrews-plastic-free-icon.png?v=${assetVersion}` },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: `/plastic-free-favicon-32.png?v=${assetVersion}` },
        { rel: 'icon', type: 'image/svg+xml', href: `/plastic-free-favicon.svg?v=${assetVersion}` },
        { rel: 'icon', type: 'image/x-icon', href: `/plastic-free-favicon.ico?v=${assetVersion}` },
        { rel: 'shortcut icon', type: 'image/x-icon', href: `/plastic-free-favicon.ico?v=${assetVersion}` },
        { rel: 'apple-touch-icon', sizes: '180x180', href: `/st-andrews-plastic-free-icon.png?v=${assetVersion}` },
        { rel: 'apple-touch-icon-precomposed' as never, sizes: '180x180', href: `/apple-touch-icon-precomposed.png?v=${assetVersion}` },
        { rel: 'mask-icon', href: `/plastic-free-favicon.svg?v=${assetVersion}`, color: '#153f38' },
        { rel: 'manifest', href: `/site.webmanifest?v=${assetVersion}` },
      ],
      meta: [
        { name: 'description', content: "Track St Andrew's weekly plastic-free lunches and celebrate every item saved." },
        { name: 'theme-color', content: '#153f38' },
        { name: 'apple-mobile-web-app-title', content: 'EcoLunch League' },
        { name: 'application-name', content: "St Andrew's EcoLunch League" },
        { name: 'app-version', content: appVersion },
      ],
    },
  },
})
