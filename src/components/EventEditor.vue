<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { closeEventEditor, showToast, ui } from '@/composables/useUi'
import { createEventDraft, eventState, persistEvent, removeEvent } from '@/composables/useEvents'
import type { CalendarEvent } from '@/utils/db'
import { todayKey, weekdayCN } from '@/utils/date'
import { getDayInfo } from '@/utils/lunar'
import { t } from '@/composables/useI18n'

const draft = reactive<CalendarEvent>(createEventDraft(todayKey()))
const hasSaved = ref(false)

const dateInfo = computed(() => getDayInfo(draft.date))

/** 常用时间，点一下就填上 */
const TIME_PRESETS = ['08:00', '09:00', '12:00', '14:00', '18:00', '20:00']

function initDraft() {
  const src = ui.eventEditingId ? eventState.list.find((e) => e.id === ui.eventEditingId) : undefined
  if (src) {
    hasSaved.value = true
    Object.assign(draft, src)
  } else {
    hasSaved.value = false
    Object.assign(draft, createEventDraft(ui.eventEditingDate || todayKey()))
  }
}

watch(
  () => [ui.eventEditorOpen, ui.eventEditingId, ui.eventEditingDate],
  () => {
    if (ui.eventEditorOpen) initDraft()
  },
  { immediate: true },
)

function setAllDay(v: boolean) {
  draft.allDay = v
  if (v) {
    draft.startTime = ''
    draft.endTime = ''
  } else if (!draft.startTime) {
    draft.startTime = '09:00'
  }
}

/** 点预设时间直接填上；要清空时间就用上面的「全天」开关 */
function pickTime(field: 'startTime' | 'endTime', value: string) {
  draft[field] = value
}

async function save() {
  if (!draft.title.trim()) {
    showToast(t('toast.eventNeedTitle'))
    return
  }
  await persistEvent(draft)
  closeEventEditor()
  showToast(hasSaved.value ? t('toast.eventUpdated') : t('toast.eventAdded'))
}

async function onDelete() {
  if (!hasSaved.value) {
    closeEventEditor()
    return
  }
  if (!window.confirm(t('confirm.eventDelete'))) return
  await removeEvent(draft.id)
  closeEventEditor()
  showToast(t('toast.eventDeleted'))
}
</script>

<template>
  <Transition name="sheet">
    <div v-if="ui.eventEditorOpen" class="sheet" @click.self="closeEventEditor">
      <div class="panel">
        <header class="head">
          <button class="icon-btn" :title="t('common.close')" @click="closeEventEditor">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 5.5l-7 6.5 7 6.5" />
            </svg>
          </button>
          <div class="head-title">
            <b>{{ hasSaved ? t('event.edit') : t('event.create') }}</b>
            <small>{{ t('event.sub') }}</small>
          </div>
          <button v-if="hasSaved" class="icon-btn del" :title="t('common.delete')" @click="onDelete">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 7h14M9.5 7V5.5h5V7M7 7l.8 12h8.4L17 7" />
            </svg>
          </button>
          <span v-else class="ph"></span>
        </header>

        <div class="body">
          <input v-model="draft.title" class="title-input" :placeholder="t('event.titlePh')" maxlength="60" @keyup.enter="save" />

          <div class="row">
            <span class="lbl">{{ t('event.date') }}</span>
            <input v-model="draft.date" type="date" class="date-input" />
            <span class="meta">{{ weekdayCN(draft.date) }} · {{ dateInfo.lunarMonthDay }}</span>
          </div>

          <div class="row">
            <span class="lbl">{{ t('event.allDay') }}</span>
            <button class="switch" :class="{ on: draft.allDay }" @click="setAllDay(!draft.allDay)">
              <span class="knob"></span>
            </button>
            <span class="meta">{{ draft.allDay ? t('event.noTime') : t('event.canTime') }}</span>
          </div>

          <template v-if="!draft.allDay">
            <div class="row">
              <span class="lbl">{{ t('event.time') }}</span>
              <input v-model="draft.startTime" type="time" class="date-input" />
              <span class="dash">–</span>
              <input v-model="draft.endTime" type="time" class="date-input" />
            </div>

            <div class="presets">
              <button
                v-for="pt in TIME_PRESETS"
                :key="pt"
                class="preset"
                :class="{ on: draft.startTime === pt }"
                @click="pickTime('startTime', pt)"
              >
                {{ pt }}
              </button>
            </div>
          </template>

          <textarea v-model="draft.note" class="note" :placeholder="t('event.notePh')"></textarea>
        </div>

        <div class="foot">
          <button class="save" @click="save">{{ hasSaved ? t('common.saveChanges') : t('event.add') }}</button>
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
  width: 40px;
  font-size: 13px;
  color: var(--qyl-text-3);
}

.date-input {
  padding: 8px 10px;
  border: 1px solid var(--qyl-line);
  border-radius: var(--qyl-radius-sm);
  background: var(--qyl-surface-2);
  font-size: 14px;
  color: var(--qyl-text);
  outline: none;
}

.meta {
  font-size: 12.5px;
  color: var(--qyl-text-3);
}

.dash {
  color: var(--qyl-text-3);
}

.switch {
  width: 46px;
  height: 27px;
  flex: none;
  border-radius: 999px;
  background: var(--qyl-surface-2);
  border: 1px solid var(--qyl-line);
  padding: 2px;
  display: flex;
  align-items: center;
  transition: background 0.18s ease;
}

.switch.on {
  background: var(--qyl-primary);
  border-color: var(--qyl-primary);
}

.knob {
  width: 21px;
  height: 21px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition: transform 0.18s ease;
}

.switch.on .knob {
  transform: translateX(19px);
}

.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-left: 50px;
}

.preset {
  padding: 5px 11px;
  border-radius: 999px;
  background: var(--qyl-surface-2);
  color: var(--qyl-text-2);
  font-size: 12.5px;
}

.preset.on {
  background: var(--qyl-primary-soft);
  color: var(--qyl-primary);
  font-weight: 600;
}

.note {
  width: 100%;
  min-height: 92px;
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
