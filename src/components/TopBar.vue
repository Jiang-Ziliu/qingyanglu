<script setup lang="ts">
import { computed } from 'vue'
import { themeMode, toggleTheme } from '@/composables/useTheme'
import { openSearch, openSettingsSheet } from '@/composables/useUi'
import { t } from '@/composables/useI18n'

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 5) return t('topbar.greet.night')
  if (h < 11) return t('topbar.greet.morning')
  if (h < 14) return t('topbar.greet.noon')
  if (h < 18) return t('topbar.greet.afternoon')
  return t('topbar.greet.evening')
})
</script>

<template>
  <header class="top-bar">
    <div class="brand">
      <span class="logo">青</span>
      <div class="brand-txt">
        <b>青阳录</b>
        <small>{{ greeting }} · {{ t('topbar.subtitle') }}</small>
      </div>
    </div>

    <div class="actions">
      <button class="icon-btn theme" :title="t('topbar.search')" @click="openSearch">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round">
          <circle cx="11" cy="11" r="6.2" />
          <path d="M15.6 15.6L20 20" />
        </svg>
      </button>

      <button class="icon-btn" :title="t('topbar.settings')" @click="openSettingsSheet">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M6 12h.01M12 12h.01M18 12h.01" />
        </svg>
      </button>

      <button class="icon-btn theme" :title="themeMode === 'dark' ? t('topbar.toLight') : t('topbar.toDark')" @click="toggleTheme">
        <svg v-if="themeMode === 'dark'" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <path d="M12 7.5a4.5 4.5 0 110 9 4.5 4.5 0 010-9z" />
          <path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4" />
        </svg>
        <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 14.2A8.4 8.4 0 019.8 4a8.6 8.6 0 100 16 8.5 8.5 0 0010.2-5.8z" />
        </svg>
      </button>
    </div>
  </header>
</template>

<style scoped>
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 2px 10px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: linear-gradient(160deg, #3fb894, var(--qyl-primary));
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 10px rgba(31, 138, 112, 0.32);
}

.brand-txt b {
  display: block;
  font-size: 17px;
  letter-spacing: 0.04em;
}

.brand-txt small {
  display: block;
  font-size: 11.5px;
  color: var(--qyl-text-3);
}

.theme {
  background: var(--qyl-surface);
  border: 1px solid var(--qyl-line);
  border-radius: 12px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
