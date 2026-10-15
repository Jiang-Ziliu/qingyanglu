<script setup lang="ts">
import { useRoute } from 'vue-router'
import { t } from '@/composables/useI18n'

const route = useRoute()

const ICONS: Record<string, string[]> = {
  calendar: ['M4.5 6.5h15v13h-15z', 'M4.5 10.5h15', 'M8.5 3.5v4', 'M15.5 3.5v4'],
  sun: [
    'M12 7.5a4.5 4.5 0 110 9 4.5 4.5 0 010-9z',
    'M12 2.5v2.2',
    'M12 19.3v2.2',
    'M2.5 12h2.2',
    'M19.3 12h2.2',
    'M5.3 5.3l1.6 1.6',
    'M17.1 17.1l1.6 1.6',
    'M18.7 5.3l-1.6 1.6',
    'M6.9 17.1l-1.6 1.6',
  ],
  check: ['M12 3.5a8.5 8.5 0 110 17 8.5 8.5 0 010-17z', 'M8.4 12.3l2.4 2.4 4.8-5'],
  chart: ['M3.5 20h17', 'M6.5 20v-7', 'M12 20V5.5', 'M17.5 20v-10'],
}

const tabs = [
  { path: '/schedule', labelKey: 'nav.schedule', icon: 'calendar' },
  { path: '/my-day', labelKey: 'nav.myDay', icon: 'sun' },
  { path: '/todo', labelKey: 'nav.todo', icon: 'check' },
  { path: '/stats', labelKey: 'nav.stats', icon: 'chart' },
]
</script>

<template>
  <nav class="bottom-nav">
    <div class="inner">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.path"
        :to="tab.path"
        class="tab"
        :class="{ active: route.path === tab.path }"
      >
        <svg
          viewBox="0 0 24 24"
          width="21"
          height="21"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path v-for="(d, i) in ICONS[tab.icon]" :key="i" :d="d" />
        </svg>
        <span>{{ t(tab.labelKey) }}</span>
      </RouterLink>
    </div>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  background: color-mix(in srgb, var(--qyl-surface) 88%, transparent);
  backdrop-filter: blur(14px);
  border-top: 1px solid var(--qyl-line);
  padding-bottom: env(safe-area-inset-bottom);
}

.inner {
  max-width: var(--qyl-max-width);
  margin: 0 auto;
  height: var(--qyl-nav-h);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  align-items: center;
}

.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  height: 100%;
  color: var(--qyl-text-3);
  font-size: 11px;
  text-decoration: none;
  transition: color 0.18s ease;
}

.tab.active {
  color: var(--qyl-primary);
}
</style>
