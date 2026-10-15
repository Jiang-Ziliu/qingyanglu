<script setup lang="ts">
import { computed } from 'vue'
import { calendar, VIEW_TABS, cursorTitle, goToday, navigate, setView } from '@/composables/useCalendar'
import { getDayInfo } from '@/utils/lunar'
import { locale, t, tf } from '@/composables/useI18n'

const monthHead = computed(() => {
  const m = String(calendar.cursorMonth).padStart(2, '0')
  return getDayInfo(`${calendar.cursorYear}-${m}-01`)
})

const yearSubLine = computed(() => {
  const h = monthHead.value
  return locale.value === 'en'
    ? t('cal.yearLabel.en', { zodiac: tf(h.zodiac) })
    : t('cal.yearLabel.zh', { ganzhi: h.ganzhiYear, zodiac: h.zodiac })
})
</script>

<template>
  <div class="toolbar">
    <div class="tabs">
      <button
        v-for="tab in VIEW_TABS"
        :key="tab.value"
        class="tab"
        :class="{ active: calendar.view === tab.value }"
        @click="setView(tab.value)"
      >
        {{ t(tab.labelKey) }}
      </button>
    </div>

    <div class="nav">
      <button class="icon-btn" :aria-label="t('cal.goPrev')" @click="navigate(-1)">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.5 5.5L8 12l6.5 6.5" />
        </svg>
      </button>

      <div class="title">
        <b>{{ cursorTitle }}</b>
        <small v-if="calendar.view === 'month' || calendar.view === 'agenda'">
          {{ yearSubLine }}
        </small>
        <small v-else-if="calendar.view === 'year' && locale === 'zh'">{{ calendar.cursorYear }} 年</small>
      </div>

      <button class="icon-btn" :aria-label="t('cal.goNext')" @click="navigate(1)">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9.5 5.5L16 12l-6.5 6.5" />
        </svg>
      </button>

      <button class="today" @click="goToday">{{ t('common.today') }}</button>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  margin-top: 4px;
}

.tabs {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 2px;
  padding: 3px;
  background: var(--qyl-surface-2);
  border-radius: 14px;
}

.tab {
  padding: 7px 0;
  border-radius: 11px;
  font-size: 13.5px;
  color: var(--qyl-text-2);
  transition: background 0.18s ease, color 0.18s ease;
}

.tab.active {
  background: var(--qyl-surface);
  color: var(--qyl-primary);
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.nav {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 0 8px;
}

.title {
  flex: 1;
  text-align: center;
  line-height: 1.25;
}

.title b {
  display: block;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.title small {
  display: block;
  font-size: 11.5px;
  color: var(--qyl-text-3);
}

.today {
  flex: none;
  padding: 0 13px;
  height: 34px;
  border-radius: 999px;
  background: var(--qyl-primary-soft);
  color: var(--qyl-primary);
  font-size: 13px;
  font-weight: 600;
}

.today:active {
  opacity: 0.7;
}
</style>
