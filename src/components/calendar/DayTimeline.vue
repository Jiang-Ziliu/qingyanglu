<script setup lang="ts">
import { computed } from 'vue'
import { getDayInfo, getVisibleFestivals } from '@/utils/lunar'
import { formatFull, todayKey } from '@/utils/date'
import { settings } from '@/composables/useSettings'
import { eventTimeText, eventsOf, hourOf } from '@/composables/useEvents'
import { openEventEditor } from '@/composables/useUi'
import { locale, t, tf } from '@/composables/useI18n'

const props = defineProps<{
  selected: string
  marks?: Record<string, string[]>
}>()

const today = todayKey()
const info = computed(() => getDayInfo(props.selected))
const festivals = computed(() => getVisibleFestivals(info.value, settings.festivalFilter).map(tf))
const nowHour = new Date().getHours()
const hours = Array.from({ length: 24 }, (_, i) => i)

const isToday = computed(() => props.selected === today)
const dayEvents = computed(() => eventsOf(props.selected))
const allDayEvents = computed(() => dayEvents.value.filter((e) => e.allDay || !e.startTime))
const timedCount = computed(() => dayEvents.value.length - allDayEvents.value.length)

function eventsAtHour(h: number) {
  return dayEvents.value.filter((e) => !e.allDay && hourOf(e.startTime) === h)
}

function addEvent() {
  openEventEditor({ date: props.selected })
}

function editEvent(id: string) {
  openEventEditor({ id, date: props.selected })
}
</script>

<template>
  <div class="day-view">
    <div class="head card">
      <div class="head-main">
        <span class="d">{{ info.day }}</span>
        <div class="head-txt">
          <b>{{ formatFull(info.key) }}</b>
          <small v-if="locale === 'zh'">{{ info.ganzhiYear }}年 {{ info.lunarMonthDay }} · 属{{ info.zodiac }}</small>
          <small v-else>{{ info.lunarMonthDay }} · {{ t('cal.yearLabel.en', { zodiac: tf(info.zodiac) }) }}</small>
        </div>
      </div>
      <div class="head-chips">
        <span v-if="info.jieQi" class="chip primary">{{ tf(info.jieQi) }}</span>
        <span v-for="f in festivals.slice(0, 4)" :key="f" class="chip accent">{{ f }}</span>
        <span v-if="info.isRest" class="chip accent">{{ t('cal.rest') }} · {{ tf(info.holidayName) }}</span>
        <span v-else-if="info.isWork" class="chip warn">{{ t('cal.work') }} · {{ t('cal.workLong') }}</span>
        <span v-if="isToday" class="chip primary">{{ t('day.todayChip') }}</span>
      </div>
    </div>

    <p class="section-title">
      <span>{{ t('day.eventsTitle', { n: dayEvents.length }) }}</span>
      <button class="mini-btn" @click="addEvent">{{ t('day.add') }}</button>
    </p>

    <div class="card list">
      <p v-if="dayEvents.length === 0" class="hint">{{ t('day.noEvent') }}</p>
      <button v-for="e in dayEvents" :key="e.id" class="ev-row" @click="editEvent(e.id)">
        <span class="ev-time">{{ eventTimeText(e) }}</span>
        <span class="ev-txt">
          <b>{{ e.title }}</b>
          <small v-if="e.note">{{ e.note }}</small>
        </span>
        <span class="arrow">›</span>
      </button>
    </div>

    <p class="section-title">
      <span>{{ t('day.timeline') }}</span>
      <span v-if="timedCount">{{ t('day.timedN', { n: timedCount }) }}</span>
    </p>

    <div class="timeline card">
      <div v-if="allDayEvents.length" class="allday">
        <p class="mini-title">{{ t('common.allDay') }}</p>
        <div class="ev-chips">
          <button v-for="e in allDayEvents" :key="e.id" class="ev-chip allday" @click="editEvent(e.id)">
            {{ e.title }}
          </button>
        </div>
      </div>

      <div v-for="h in hours" :key="h" class="slot" :class="{ now: isToday && h === nowHour }">
        <span class="hour">{{ String(h).padStart(2, '0') }}:00</span>
        <div class="slot-body">
          <div v-if="eventsAtHour(h).length" class="ev-chips">
            <button v-for="e in eventsAtHour(h)" :key="e.id" class="ev-chip" @click="editEvent(e.id)">
              <span class="dot"></span>{{ e.startTime }} {{ e.title }}
            </button>
          </div>
          <span class="line"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.head {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.head-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.d {
  width: 46px;
  height: 46px;
  flex: none;
  border-radius: 14px;
  background: var(--qyl-primary-soft);
  color: var(--qyl-primary);
  font-size: 22px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.head-txt b {
  display: block;
  font-size: 15.5px;
}

.head-txt small {
  color: var(--qyl-text-3);
  font-size: 12.5px;
}

.head-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.mini-btn {
  padding: 5px 12px;
  border-radius: 999px;
  background: var(--qyl-accent-soft);
  color: var(--qyl-accent);
  font-size: 12px;
  font-weight: 600;
}

.list {
  padding: 4px 6px;
}

.hint {
  margin: 0;
  padding: 14px 10px;
  font-size: 13px;
  color: var(--qyl-text-3);
}

.ev-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 10px;
  border-radius: var(--qyl-radius-sm);
  text-align: left;
}

.ev-row + .ev-row {
  border-top: 1px solid var(--qyl-line);
}

.ev-row:active {
  background: var(--qyl-surface-2);
}

.ev-time {
  flex: none;
  min-width: 52px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--qyl-accent);
  font-variant-numeric: tabular-nums;
}

.ev-txt {
  flex: 1;
  min-width: 0;
}

.ev-txt b {
  display: block;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ev-txt small {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--qyl-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.arrow {
  flex: none;
  color: var(--qyl-text-3);
  font-size: 18px;
  line-height: 1;
}

.timeline {
  padding: 12px 14px;
}

.allday {
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px dashed var(--qyl-line);
}

.mini-title {
  margin: 0 0 6px;
  font-size: 11.5px;
  color: var(--qyl-text-3);
}

.ev-chips {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ev-chip {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--qyl-accent-soft);
  color: var(--qyl-accent);
  font-size: 12.5px;
  font-weight: 600;
  text-align: left;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.ev-chip.allday {
  background: var(--qyl-primary-soft);
  color: var(--qyl-primary);
}

.dot {
  width: 5px;
  height: 5px;
  flex: none;
  border-radius: 50%;
  background: currentColor;
}

.slot {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-height: 34px;
  padding: 2px 0;
}

.slot.now .hour {
  color: var(--qyl-primary);
  font-weight: 700;
}

.slot.now .line {
  background: var(--qyl-primary-soft);
}

.hour {
  flex: none;
  width: 44px;
  padding-top: 2px;
  font-size: 11.5px;
  color: var(--qyl-text-3);
  font-variant-numeric: tabular-nums;
}

.slot-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 2px 0;
}

.line {
  height: 1px;
  background: var(--qyl-line);
}
</style>
