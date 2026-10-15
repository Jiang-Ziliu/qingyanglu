<script setup lang="ts">
import { backToToday } from '@/composables/useCalendar'
import { openCreateSheet } from '@/composables/useUi'
import { locale, t } from '@/composables/useI18n'
</script>

<template>
  <div class="float-btns">
    <button class="fab small" :title="t('float.backToday')" @click="backToToday">
      {{ locale === 'en' ? 'T' : '今' }}
    </button>
    <button class="fab big" :title="t('float.quickCreate')" @click="openCreateSheet">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <path d="M12 5.5v13M5.5 12h13" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.float-btns {
  position: fixed;
  right: 16px;
  bottom: calc(var(--qyl-nav-h) + 18px + env(safe-area-inset-bottom));
  z-index: 45;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.fab {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--qyl-shadow-lift);
  transition: transform 0.16s ease;
}

.fab:active {
  transform: scale(0.92);
}

.fab.small {
  width: 44px;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
  background: var(--qyl-surface);
  color: var(--qyl-primary);
  border: 1px solid var(--qyl-line);
}

.fab.big {
  width: 56px;
  height: 56px;
  background: var(--qyl-primary);
  color: #fff;
}
</style>
