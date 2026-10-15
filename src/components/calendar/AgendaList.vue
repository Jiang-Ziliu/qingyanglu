<script setup lang="ts">
import { computed } from 'vue'
import { getMonthDays, getMonthHighlights, getYearHolidays } from '@/utils/lunar'
import { formatCN, parseKey, relativeDay, todayKey, weekdayMed } from '@/utils/date'
import { settings } from '@/composables/useSettings'
import { eventTimeText, eventsOf } from '@/composables/useEvents'
import { birthdayDateInYear, birthdayState } from '@/composables/useBirthdays'
import { openBirthdayEditor, openEventEditor } from '@/composables/useUi'
import { locale, t, tf } from '@/composables/useI18n'
import type { Birthday } from '@/utils/db'

const props = defineProps<{
  year: number
  month: number
  selected: string
  marks?: Record<string, string[]>
}>()

const emit = defineEmits<{ (e: 'select', key: string): void }>()

const today = todayKey()

const highlights = computed(() =>
  getMonthHighlights(props.year, props.month, settings.festivalFilter),
)

/** 本月有日程的那几天（按日期升序） */
const monthEvents = computed(() => {
  const groups: { key: string; events: ReturnType<typeof eventsOf> }[] = []
  for (const info of getMonthDays(props.year, props.month).flat()) {
    if (info.month !== props.month) continue
    const events = eventsOf(info.key)
    if (events.length) groups.push({ key: info.key, events })
  }
  return groups.sort((a, b) => (a.key < b.key ? -1 : 1))
})

const eventCount = computed(() => monthEvents.value.reduce((n, g) => n + g.events.length, 0))

/** 本月的生日（按日期升序） */
const monthBirthdays = computed(() => {
  const out: { key: string; b: Birthday; age: number | null }[] = []
  for (const b of birthdayState.list) {
    const key = birthdayDateInYear(b, props.year)
    if (!key || parseKey(key).getMonth() + 1 !== props.month) continue
    out.push({ key, b, age: b.birthYear ? props.year - b.birthYear : null })
  }
  return out.sort((a, b) => (a.key < b.key ? -1 : 1))
})

function addEvent() {
  openEventEditor({ date: props.selected })
}

function editEvent(id: string, date: string) {
  openEventEditor({ id, date })
}

function editBirthday(id: string) {
  openBirthdayEditor({ id })
}

const yearHolidays = computed(() => getYearHolidays(props.year))
const restGroups = computed(() => yearHolidays.value.filter((h) => !h.isWork))
const workByName = computed(() => {
  const map: Record<string, string[]> = {}
  for (const h of yearHolidays.value.filter((x) => x.isWork)) {
    const label = formatCN(h.start)
    if (!map[h.name]) map[h.name] = []
    map[h.name].push(label)
  }
  return Object.entries(map).map(([name, dates]) => ({ name, dates }))
})

const listSeparator = computed(() => (locale.value === 'en' ? ', ' : '、'))

const hasHolidayData = computed(() => restGroups.value.length > 0 || workByName.value.length > 0)

const TAG_CLASS: Record<string, string> = {
  term: 'primary',
  festival: 'accent',
  holiday: 'warn',
}

function rangeText(start: string, end: string): string {
  return start === end ? formatCN(start) : `${formatCN(start)} – ${formatCN(end)}`
}
</script>

<template>
  <div class="agenda">
    <p class="section-title">
      <span>{{ t('agenda.monthEvents') }}</span>
      <span>{{ t('common.items', { n: eventCount }) }}</span>
    </p>

    <div class="card list">
      <div v-if="monthEvents.length === 0" class="empty">
        <span class="big">🗓</span>
        {{ t('agenda.emptyEvents') }}<br />
        {{ t('agenda.emptyEventsHint') }}
      </div>

      <template v-for="g in monthEvents" :key="g.key">
        <button class="row day-head" @click="emit('select', g.key)">
          <span class="d">{{ formatCN(g.key) }}</span>
          <span class="wd">{{ weekdayMed(g.key) }}</span>
          <span class="spacer"></span>
          <span class="rel">{{ relativeDay(g.key, today) }}</span>
        </button>
        <button v-for="e in g.events" :key="e.id" class="ev-row" @click="editEvent(e.id, g.key)">
          <span class="ev-time">{{ eventTimeText(e) }}</span>
          <span class="ev-title">{{ e.title }}</span>
        </button>
      </template>

      <button class="add-row" @click="addEvent">{{ t('agenda.addEvent', { date: formatCN(selected) }) }}</button>
    </div>

    <template v-if="monthBirthdays.length">
      <p class="section-title">
        <span>{{ t('agenda.monthBirthdays') }}</span>
        <span>{{ t('agenda.persons', { n: monthBirthdays.length }) }}</span>
      </p>

      <div class="card list">
        <button v-for="x in monthBirthdays" :key="x.b.id" class="row" @click="editBirthday(x.b.id)">
          <span class="d">{{ formatCN(x.key) }}</span>
          <span class="wd">{{ weekdayMed(x.key) }}</span>
          <span class="bd-name">🎂 {{ x.b.name }}</span>
          <span class="spacer"></span>
          <span class="chip pink">{{
            x.age != null
              ? t('info.turnsAge', { n: x.age })
              : x.b.type === 'lunar'
                ? t('common.lunar')
                : t('common.solar')
          }}</span>
        </button>
      </div>
    </template>

    <p class="section-title">
      <span>{{ t('agenda.highlights') }}</span>
      <span>{{ t('agenda.highlightsN', { n: highlights.length }) }}</span>
    </p>

    <div class="card list">
      <div v-if="highlights.length === 0" class="empty">{{ t('agenda.emptyHighlights') }}</div>
      <button
        v-for="h in highlights"
        :key="h.info.key"
        class="row"
        :class="{ on: h.info.key === selected }"
        @click="emit('select', h.info.key)"
      >
        <span class="d">{{ formatCN(h.info.key) }}</span>
        <span class="wd">{{ weekdayMed(h.info.key) }}</span>
        <span class="spacer"></span>
        <span class="chip" :class="TAG_CLASS[h.tag.type]">{{ h.tag.text }}</span>
        <span class="rel">{{ relativeDay(h.info.key, today) }}</span>
      </button>
    </div>

    <p class="section-title">
      <span>{{ t('agenda.yearHolidays', { year }) }}</span>
      <span>{{ t('agenda.holidaysN', { n: restGroups.length }) }}</span>
    </p>

    <div class="card list">
      <div v-if="!hasHolidayData" class="empty">
        <span class="big">📅</span>
        {{ t('agenda.noHoliday1', { year }) }}<br />
        {{ t('agenda.noHoliday2') }}
      </div>

      <button v-for="h in restGroups" :key="'r' + h.start" class="row" @click="emit('select', h.start)">
        <span class="holiday-name">{{ tf(h.name) }}</span>
        <span class="spacer"></span>
        <span class="range">{{ rangeText(h.start, h.end) }}</span>
        <span class="chip accent">{{ t('agenda.daysN', { n: h.days }) }}</span>
      </button>

      <template v-if="workByName.length">
        <p class="sub-title">{{ t('agenda.makeupWork') }}</p>
        <button v-for="w in workByName" :key="'w' + w.name" class="row" @click="emit('select', w.dates[0])">
          <span class="holiday-name">{{ tf(w.name) }}</span>
          <span class="spacer"></span>
          <span class="range">{{ w.dates.join(listSeparator) }}</span>
          <span class="chip warn">{{ t('cal.work') }}</span>
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.list {
  padding: 4px 6px;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 10px;
  border-radius: var(--qyl-radius-sm);
  text-align: left;
}

.row + .row {
  border-top: 1px solid var(--qyl-line);
}

.row.on {
  background: var(--qyl-surface-2);
}

.d {
  font-size: 14px;
  font-weight: 600;
  min-width: 62px;
}

.wd {
  font-size: 11.5px;
  color: var(--qyl-text-3);
}

.spacer {
  flex: 1;
}

.rel {
  font-size: 11.5px;
  color: var(--qyl-text-3);
  min-width: 52px;
  text-align: right;
}

.holiday-name {
  font-size: 14px;
  font-weight: 600;
}

.day-head {
  background: var(--qyl-surface-2);
  margin-top: 6px;
  border-radius: var(--qyl-radius-sm);
}

.ev-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px 9px 16px;
  border-radius: var(--qyl-radius-sm);
  text-align: left;
}

.ev-row:active {
  background: var(--qyl-accent-soft);
}

.ev-time {
  flex: none;
  min-width: 52px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--qyl-accent);
  font-variant-numeric: tabular-nums;
}

.ev-title {
  flex: 1;
  min-width: 0;
  font-size: 13.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.add-row {
  width: calc(100% - 12px);
  margin: 8px 6px 6px;
  padding: 11px;
  border-radius: var(--qyl-radius-sm);
  background: var(--qyl-primary-soft);
  color: var(--qyl-primary);
  font-size: 13.5px;
  font-weight: 600;
}

.range {
  font-size: 12px;
  color: var(--qyl-text-2);
}

.sub-title {
  margin: 10px 10px 2px;
  font-size: 12px;
  color: var(--qyl-text-3);
}

.bd-name {
  font-size: 13px;
  color: var(--qyl-pink);
  font-weight: 600;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chip.pink {
  background: var(--qyl-pink-soft);
  color: var(--qyl-pink);
}
</style>
