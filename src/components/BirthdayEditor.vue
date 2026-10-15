<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { closeBirthdayEditor, showToast, ui } from '@/composables/useUi'
import {
  birthdayState,
  createBirthdayDraft,
  nextBirthday,
  persistBirthday,
  removeBirthday,
} from '@/composables/useBirthdays'
import type { Birthday } from '@/utils/db'
import { formatCN, todayKey, weekdayCN } from '@/utils/date'
import { t } from '@/composables/useI18n'

const draft = reactive<Birthday>(createBirthdayDraft())
const hasSaved = ref(false)
const yearText = ref('')

const MAX_DAY = computed(() => (draft.type === 'lunar' ? 30 : 31))
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

const preview = computed(() => {
  if (!draft.name.trim()) return null
  const probe: Birthday = { ...draft, birthYear: parsedYear.value }
  const hit = nextBirthday(probe, todayKey())
  if (!hit) return null
  return hit
})

const parsedYear = computed<number | null>(() => {
  const n = Number(yearText.value)
  return yearText.value && n >= 1900 && n <= 2100 ? n : null
})

function initDraft() {
  const src = ui.birthdayEditingId ? birthdayState.list.find((b) => b.id === ui.birthdayEditingId) : undefined
  if (src) {
    hasSaved.value = true
    Object.assign(draft, src)
    yearText.value = src.birthYear ? String(src.birthYear) : ''
  } else {
    hasSaved.value = false
    Object.assign(draft, createBirthdayDraft())
    yearText.value = ''
  }
}

watch(
  () => [ui.birthdayEditorOpen, ui.birthdayEditingId],
  () => {
    if (ui.birthdayEditorOpen) initDraft()
  },
  { immediate: true },
)

function setType(type: 'solar' | 'lunar') {
  draft.type = type
  if (draft.day > MAX_DAY.value) draft.day = MAX_DAY.value
}

async function save() {
  if (!draft.name.trim()) {
    showToast(t('toast.birthdayNeedName'))
    return
  }
  await persistBirthday({ ...draft, birthYear: parsedYear.value })
  closeBirthdayEditor()
  showToast(hasSaved.value ? t('toast.birthdayUpdated') : t('toast.birthdayAdded'))
}

async function onDelete() {
  if (!hasSaved.value) {
    closeBirthdayEditor()
    return
  }
  if (!window.confirm(t('confirm.birthdayDelete', { name: draft.name }))) return
  await removeBirthday(draft.id)
  closeBirthdayEditor()
  showToast(t('toast.birthdayDeleted'))
}
</script>

<template>
  <Transition name="sheet">
    <div v-if="ui.birthdayEditorOpen" class="sheet" @click.self="closeBirthdayEditor">
      <div class="panel">
        <header class="head">
          <button class="icon-btn" :title="t('common.close')" @click="closeBirthdayEditor">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 5.5l-7 6.5 7 6.5" />
            </svg>
          </button>
          <div class="head-title">
            <b>{{ hasSaved ? t('birthday.edit') : t('birthday.create') }}</b>
            <small>{{ t('birthday.sub') }}</small>
          </div>
          <button v-if="hasSaved" class="icon-btn del" :title="t('common.delete')" @click="onDelete">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 7h14M9.5 7V5.5h5V7M7 7l.8 12h8.4L17 7" />
            </svg>
          </button>
          <span v-else class="ph"></span>
        </header>

        <div class="body">
          <input
            v-model="draft.name"
            class="title-input"
            :placeholder="t('birthday.namePh')"
            maxlength="30"
            @keyup.enter="save"
          />

          <div class="row">
            <span class="lbl">{{ t('birthday.calendar') }}</span>
            <div class="type-chips">
              <button class="type-chip" :class="{ on: draft.type === 'solar' }" @click="setType('solar')">{{ t('common.solar') }}</button>
              <button class="type-chip" :class="{ on: draft.type === 'lunar' }" @click="setType('lunar')">{{ t('common.lunar') }}</button>
            </div>
            <span class="meta">{{ draft.type === 'lunar' ? t('birthday.lunarDesc') : t('birthday.solarDesc') }}</span>
          </div>

          <div class="row">
            <span class="lbl">{{ t('birthday.date') }}</span>
            <select v-model.number="draft.month" class="sel">
              <option v-for="m in MONTHS" :key="m" :value="m">{{
                draft.type === 'lunar' ? t('birthday.lunarMonthZh', { m }) : t('birthday.monthZh', { m })
              }}</option>
            </select>
            <select v-model.number="draft.day" class="sel">
              <option v-for="d in MAX_DAY" :key="d" :value="d">{{ t('birthday.dayZh', { d }) }}</option>
            </select>
          </div>

          <div class="row">
            <span class="lbl">{{ t('birthday.birthYear') }}</span>
            <input v-model="yearText" type="number" min="1900" max="2100" class="year-input" :placeholder="t('birthday.yearPh')" />
            <span class="meta">{{ parsedYear ? t('birthday.ageShown') : t('birthday.ageOptional') }}</span>
          </div>

          <p v-if="preview" class="preview">
            {{ t('birthday.next') }}<b>{{ formatCN(preview.date) }}（{{ weekdayCN(preview.date) }}）</b>
            <template v-if="preview.daysUntil === 0"> · {{ t('birthday.isToday') }}</template>
            <template v-else> · {{ t('birthday.inDays', { n: preview.daysUntil }) }}</template>
            <template v-if="preview.age != null"> · {{ t('birthday.turns', { n: preview.age }) }}</template>
          </p>

          <p v-if="draft.type === 'lunar'" class="tip">{{ t('birthday.lunarTip') }}</p>

          <textarea v-model="draft.note" class="note" :placeholder="t('birthday.notePh')"></textarea>
        </div>

        <div class="foot">
          <button class="save" @click="save">{{ hasSaved ? t('common.saveChanges') : t('birthday.add') }}</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.sheet {
  position: fixed;
  inset: 0;
  z-index: 75;
  background: var(--qyl-overlay);
  display: flex;
  align-items: flex-end;
}

.panel {
  width: 100%;
  max-width: var(--qyl-max-width);
  margin: 0 auto;
  max-height: 88dvh;
  background: var(--qyl-surface);
  border-radius: var(--qyl-radius-lg) var(--qyl-radius-lg) 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 8px 6px;
  border-bottom: 1px solid var(--qyl-line);
}

.head-title {
  flex: 1;
  text-align: center;
}

.head-title b {
  display: block;
  font-size: 15.5px;
  font-weight: 600;
}

.head-title small {
  display: block;
  font-size: 11.5px;
  color: var(--qyl-text-3);
}

.icon-btn.del {
  color: var(--qyl-accent);
}

.ph {
  width: 34px;
}

.body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.foot {
  flex: none;
  padding: 10px 16px calc(14px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--qyl-line);
  background: var(--qyl-surface);
}

.title-input {
  width: 100%;
  padding: 10px 2px;
  border: none;
  border-bottom: 1px solid var(--qyl-line);
  background: transparent;
  font-size: 19px;
  font-weight: 600;
  outline: none;
}

.title-input::placeholder {
  color: var(--qyl-text-3);
  font-weight: 400;
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.lbl {
  flex: none;
  width: 46px;
  font-size: 13px;
  color: var(--qyl-text-3);
}

.meta {
  font-size: 12.5px;
  color: var(--qyl-text-3);
}

.type-chips {
  display: flex;
  gap: 6px;
}

.type-chip {
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--qyl-surface-2);
  color: var(--qyl-text-2);
  font-size: 13px;
}

.type-chip.on {
  background: var(--qyl-pink-soft);
  color: var(--qyl-pink);
  font-weight: 600;
}

.sel,
.year-input {
  padding: 8px 10px;
  border: 1px solid var(--qyl-line);
  border-radius: var(--qyl-radius-sm);
  background: var(--qyl-surface-2);
  font-size: 14px;
  color: var(--qyl-text);
  outline: none;
}

.year-input {
  width: 110px;
}

.preview {
  margin: 0;
  padding: 10px 12px;
  border-radius: var(--qyl-radius-sm);
  background: var(--qyl-pink-soft);
  color: var(--qyl-pink);
  font-size: 13px;
  line-height: 1.6;
}

.preview b {
  font-weight: 700;
}

.tip {
  margin: 0;
  font-size: 12px;
  color: var(--qyl-text-3);
  line-height: 1.6;
}

.note {
  width: 100%;
  min-height: 84px;
  padding: 12px;
  border: 1px solid var(--qyl-line);
  border-radius: var(--qyl-radius-sm);
  background: var(--qyl-surface-2);
  font-size: 14.5px;
  line-height: 1.7;
  resize: vertical;
  outline: none;
}

.save {
  width: 100%;
  padding: 14px;
  border-radius: var(--qyl-radius-sm);
  background: var(--qyl-primary);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}
</style>
