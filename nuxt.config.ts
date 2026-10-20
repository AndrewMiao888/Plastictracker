export default defineNuxtConfig({
  compatibilityDate: '2026-10-21',
  css: ['~/../src/styles.css'],
  devtools: { enabled: false },
  typescript: { strict: true },
  app: {
    head: {
      title: 'Plastic-Free Day | School Tracker',
      meta: [
        { name: 'description', content: 'Track weekly plastic-free lunches and celebrate every item saved at school.' },
        { name: 'theme-color', content: '#f6f8f4' },
      ],
    },
  },
})
