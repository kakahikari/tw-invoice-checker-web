import { defineConfig } from 'vitepress'

// Google Analytics ID from environment variable
const googleAnalyticsId = process.env.GOOGLE_ANALYTICS_ID || ''

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: '/tw-invoice-checker-web/',
  srcDir: './pages',
  outDir: './dist',
  vite: {
    publicDir: '../public',
  },
  cacheDir: './node_modules/vitepress_cache',
  title: '發票來對喔',
  description: '',

  head: [
    [
      'script',
      {
        async: 'true',
        src: `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`,
      },
    ],
    [
      'script',
      {},
      `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${googleAnalyticsId}');
      `,
    ],
  ],

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [{ text: '首頁', link: '/' }],

    sidebar: [
      {
        text: 'Examples',
        items: [],
      },
    ],
  },
})
