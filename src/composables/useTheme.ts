import { ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'qyl.theme'
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')

function initial(): ThemeMode {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return prefersDark.matches ? 'dark' : 'light'
}

export const themeMode = ref<ThemeMode>(initial())

function apply(mode: ThemeMode) {
  const el = document.documentElement
  el.setAttribute('data-theme', mode)
  el.style.colorScheme = mode
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', mode === 'dark' ? '#0f1513' : '#f5f7f5')
}

export function initTheme() {
  apply(themeMode.value)
  watch(themeMode, (v) => {
    localStorage.setItem(STORAGE_KEY, v)
    apply(v)
  })
  // 用户没有手动设置过时，跟随系统
  prefersDark.addEventListener('change', (e) => {
    if (localStorage.getItem(STORAGE_KEY)) return
    themeMode.value = e.matches ? 'dark' : 'light'
  })
}

export function toggleTheme() {
  themeMode.value = themeMode.value === 'dark' ? 'light' : 'dark'
}

export function useTheme() {
  return { themeMode, toggleTheme }
}
