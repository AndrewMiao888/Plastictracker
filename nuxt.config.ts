export default defineNuxtConfig({
  compatibilityDate: '2026-10-21',
  css: ['~/../src/styles.css'],
  devtools: { enabled: false },
  typescript: { strict: true },
  app: {
    head: {
      title: "St Andrew's Plastic-Free Day",
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
      meta: [
        { name: 'description', content: 'Track weekly plastic-free lunches and celebrate every item saved at school.' },
        { name: 'theme-color', content: '#153f38' },
      ],
    },
  },
})
