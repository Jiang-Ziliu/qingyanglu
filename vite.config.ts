import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // 相对路径，部署到 GitHub Pages 子目录也能正常加载
  base: './',
  plugins: [
    vue(),
    VitePWA({
      // 新版本发布后立即自动更新，用户无感知
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        id: './',
        name: '青阳录',
        short_name: '青阳录',
        description: '日历 + 日记 + 待办 + 生日，记录每一天',
        lang: 'zh-CN',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#1f8a70',
        background_color: '#f4f7f5',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 构建产物整体预缓存，离线可完整打开（数据本来就在本地 IndexedDB）
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        // 单页应用：任何路由都回退到 index.html，离线刷新不 404
        navigateFallback: 'index.html',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
})
