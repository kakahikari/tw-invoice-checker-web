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
  description:
    '發票來對喔是一款專為長輩設計的台灣發票對獎 App，提供大字體介面與國語、台語語音播報，只需輸入末三碼即可快速對獎，操作簡單、看得清楚、聽得明白，適合全家人安心使用。',

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
    ['meta', { property: 'og:image', content: '/images/og.png' }],
  ],

  sitemap: {
    hostname: 'https://kakahikari.me/tw-invoice-checker-web/',
  },

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '首頁', link: '/' },
      { text: '下載', link: '/download' },
      {
        text: '隱私權政策',
        link: 'https://kakahikari.me/tw-invoice-checker-web/privacy-policy.html',
      },
      { text: '作者的blog', link: 'https://kakahikari.me/' },
    ],

    footer: {
      message: '本應用提供的資訊僅供參考 實際中獎情形請以財政部公告為準',
      copyright: 'Copyright © 2026 發票來對喔',
    },
  },
})
