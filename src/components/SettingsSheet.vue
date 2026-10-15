<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ui, closeSettingsSheet, showToast } from '@/composables/useUi'
import { FESTIVAL_FILTER_OPTIONS, settings, setFestivalFilter } from '@/composables/useSettings'
import { locale, setLocale, t, type Locale } from '@/composables/useI18n'
import type { FestivalFilter } from '@/utils/lunar'

const router = useRouter()

const langOptions: { value: Locale; labelKey: string }[] = [
  { value: 'zh', labelKey: 'settings.lang.zh' },
  { value: 'en', labelKey: 'settings.lang.en' },
]

const shortcutRows = computed(() => [
  { label: t('settings.sc.search'), key: t('settings.sc.searchKey') },
  { label: t('settings.sc.create'), key: t('settings.sc.createKey') },
  { label: t('settings.sc.tabs'), key: t('settings.sc.tabsKey') },
  { label: t('settings.sc.today'), key: t('settings.sc.todayKey') },
  { label: t('settings.sc.close'), key: t('settings.sc.closeKey') },
])

function pickLang(value: Locale) {
  setLocale(value)
  showToast(t('toast.langChanged'))
}

function pick(value: FestivalFilter) {
  setFestivalFilter(value)
  closeSettingsSheet()
  const item = FESTIVAL_FILTER_OPTIONS.find((o) => o.value === value)
  showToast(t('toast.filterChanged', { name: item ? t(item.labelKey) : '' }))
}

function openDataPage() {
  closeSettingsSheet()
  router.push('/data')
}
</script>

<template>
  <Transition name="sheet">
    <div v-if="ui.settingsSheetOpen" class="sheet" @click.self="closeSettingsSheet">
      <div class="sheet-panel">
        <div class="grip"></div>
        <p class="sheet-title">{{ t('settings.title') }}</p>

        <p class="group-title">{{ t('settings.language') }}</p>
        <button
          v-for="opt in langOptions"
          :key="opt.value"
          class="option"
          :class="{ on: locale === opt.value }"
          @click="pickLang(opt.value)"
        >
          <span class="txt">
            <b>{{ t(opt.labelKey) }}</b>
          </span>
          <span class="radio" :class="{ on: locale === opt.value }">
            <svg v-if="locale === opt.value" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5.5 12.5l4 4 9-9.5" />
            </svg>
          </span>
        </button>

        <p class="group-title mt">{{ t('settings.festivals') }}</p>
        <button
          v-for="opt in FESTIVAL_FILTER_OPTIONS"
          :key="opt.value"
          class="option"
          :class="{ on: settings.festivalFilter === opt.value }"
          @click="pick(opt.value)"
        >
          <span class="txt">
            <b>{{ t(opt.labelKey) }}</b>
            <small>{{ t(opt.descKey) }}</small>
          </span>
          <span class="radio" :class="{ on: settings.festivalFilter === opt.value }">
            <svg v-if="settings.festivalFilter === opt.value" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5.5 12.5l4 4 9-9.5" />
            </svg>
          </span>
        </button>

        <p class="note">{{ t('settings.filterNote') }}</p>

        <p class="group-title mt">{{ t('settings.shortcuts') }}</p>
        <div class="sc-list">
          <div v-for="row in shortcutRows" :key="row.label" class="sc-row">
            <span>{{ row.label }}</span>
            <kbd>{{ row.key }}</kbd>
          </div>
        </div>

        <p class="group-title mt">{{ t('settings.dataGroup') }}</p>
        <button class="option data-row" @click="openDataPage">
          <span class="txt">
            <b>{{ t('settings.dataEntry') }}</b>
            <small>{{ t('settings.dataDesc') }}</small>
          </span>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9.5 5.5L16 12l-6.5 6.5" />
          </svg>
        </button>

        <button class="cancel" @click="closeSettingsSheet">{{ t('common.close') }}</button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.sheet {
  position: fixed;
  inset: 0;
  z-index: 70;
  background: var(--qyl-overlay);
  display: flex;
  align-items: flex-end;
}

.sheet-panel {
  width: 100%;
  max-width: var(--qyl-max-width);
  margin: 0 auto;
  background: var(--qyl-surface);
  border-radius: var(--qyl-radius-lg) var(--qyl-radius-lg) 0 0;
  padding: 10px 16px calc(18px + env(safe-area-inset-bottom));
}

.grip {
  width: 38px;
  height: 4px;
  border-radius: 999px;
  background: var(--qyl-line);
  margin: 4px auto 10px;
}

.sheet-title {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
  text-align: center;
}

.group-title {
  margin: 0 0 6px 4px;
  font-size: 12.5px;
  color: var(--qyl-text-3);
}

.option {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 10px;
  border-radius: var(--qyl-radius-sm);
  text-align: left;
}

.option.on {
  background: var(--qyl-primary-soft);
}

.option:active {
  background: var(--qyl-surface-2);
}

.data-row {
  color: var(--qyl-text-3);
}

.txt {
  flex: 1;
}

.txt b {
  display: block;
  font-size: 15px;
  font-weight: 600;
}

.option.on .txt b {
  color: var(--qyl-primary);
}

.txt small {
  color: var(--qyl-text-3);
  font-size: 12.5px;
}

.radio {
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1.6px solid var(--qyl-line);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.radio.on {
  background: var(--qyl-primary);
  border-color: var(--qyl-primary);
}

.note {
  margin: 10px 4px 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--qyl-text-3);
}

.group-title.mt {
  margin-top: 18px;
}

.sc-list {
  margin: 2px 0 0;
  border-radius: var(--qyl-radius-sm);
  overflow: hidden;
}

.sc-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 10px;
  font-size: 13.5px;
  color: var(--qyl-text-2);
}

.sc-row + .sc-row {
  border-top: 1px solid var(--qyl-line);
}

.sc-row kbd {
  font-family: inherit;
  font-size: 12px;
  color: var(--qyl-text-2);
  background: var(--qyl-surface-2);
  border: 1px solid var(--qyl-line);
  border-bottom-width: 2px;
  border-radius: 7px;
  padding: 2px 8px;
  min-width: 28px;
  text-align: center;
}

.cancel {
  width: 100%;
  margin-top: 14px;
  padding: 13px;
  border-radius: var(--qyl-radius-sm);
  background: var(--qyl-surface-2);
  color: var(--qyl-text-2);
  font-size: 14.5px;
}
</style>
