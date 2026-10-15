<script setup lang="ts">
import { computed } from 'vue'
import TopBar from '@/components/TopBar.vue'
import { getDayInfo, getVisibleFestivals } from '@/utils/lunar'
import { addDays, formatCN, todayKey, weekdayCN, diffDays } from '@/utils/date'
import { settings } from '@/composables/useSettings'
import { diariesOf } from '@/composables/useDiaries'
import { copyEventsTo, eventTimeText, eventsOf } from '@/composables/useEvents'
import { todayTodos, toggleTodo } from '@/composables/useTodos'
import { upcomingBirthdays } from '@/composables/useBirthdays'
import { openBirthdayEditor, openDiaryEditor, openEventEditor, openTodoEditor, showToast } from '@/composables/useUi'
import { plainExcerpt } from '@/utils/markdown'
import { t, locale, tf } from '@/composables/useI18n'
import type { Diary } from '@/utils/db'

const today = todayKey()
const yesterday = addDays(today, -1)

const info = computed(() => getDayInfo(today))
const festivals = computed(() => getVisibleFestivals(info.value, settings.festivalFilter))
const heroSub = computed(() =>
  locale.value === 'zh'
    ? `${info.value.ganzhiYear}年 ${info.value.lunarMonthDay} · 属${info.value.zodiac}`
    : `${info.value.lunarMonthDay} · Year of the ${tf(info.value.zodiac)}`,
)
const openTodoCount = computed(() => todos.value.filter((x) => !x.done).length)
const eventCount = computed(() => allDayEvents.value.length + timedEvents.value.length)

const allDayEvents = computed(() => eventsOf(today).filter((e) => e.allDay || !e.startTime))
const timedEvents = computed(() => eventsOf(today).filter((e) => !e.allDay && e.startTime))
const todos = todayTodos
const diaries = computed(() => diariesOf(today))
const yesterdayCount = computed(() => eventsOf(yesterday).length)
const birthdays = computed(() => upcomingBirthdays(60, 5))

function addEvent() {
  openEventEditor({ date: today })
}

function editEvent(id: string) {
  openEventEditor({ id, date: today })
}

function addTodo() {
  openTodoEditor({ due: today })
}

function editTodo(id: string) {
  openTodoEditor({ id })
}

function writeDiary() {
  openDiaryEditor({ date: today })
}

function editDiary(id: string) {
  openDiaryEditor({ id, date: today })
}

function editBirthday(id: string) {
  openBirthdayEditor({ id })
}

async function copyYesterday() {
  if (yesterdayCount.value === 0) {
    showToast(t('toast.copyNone'))
    return
  }
  const n = await copyEventsTo(yesterday, today)
  showToast(t('toast.copyDone', { n }))
}

function diarySummary(d: Diary): string {
  const body = plainExcerpt(d.content, 46)
  if (body) return body
  if (d.attachments.length) return t('info.attachN', { n: d.attachments.length })
  if (d.mood) return t('info.moodOnly')
  return t('info.noBody')
}

function overDays(due: string): number {
  return diffDays(due, today)
}
</script>

<template>
  <div class="app-shell">
    <TopBar />

    <div class="hero card">
      <div class="hero-main">
        <b>{{ formatCN(today) }} · {{ weekdayCN(today) }}</b>
        <small>{{ heroSub }}</small>
      </div>
      <div class="hero-chips">
        <span v-if="info.jieQi" class="chip primary">{{ tf(info.jieQi) }}</span>
        <span v-for="f in festivals.slice(0, 3)" :key="f" class="chip accent">{{ tf(f) }}</span>
        <span v-if="info.isRest" class="chip accent">{{ t('cal.rest') }} · {{ tf(info.holidayName) }}</span>
        <span v-else-if="info.isWork" class="chip warn">{{ t('cal.work') }} · {{ t('cal.workLong') }}</span>
        <span class="chip primary">{{ t('myday.eventsChip', { n: eventCount }) }}</span>
        <span class="chip warn">{{ t('myday.todosChip', { n: openTodoCount }) }}</span>
      </div>
    </div>

    <p class="section-title">
      <span>{{ t('myday.todayTasks') }}</span>
      <span>{{ t('common.items', { n: eventCount }) }}</span>
    </p>

    <div class="card block">
      <div v-if="eventCount === 0" class="empty">
        <span class="big">🗓</span>
        {{ t('myday.emptyEvents1') }}<br />
        {{ t('myday.emptyEvents2') }}
      </div>

      <button v-for="e in allDayEvents" :key="e.id" class="row" @click="editEvent(e.id)">
        <span class="time allday">{{ t('common.allDay') }}</span>
        <span class="row-txt">
          <b>{{ e.title }}</b>
          <small v-if="e.note">{{ e.note }}</small>
        </span>
        <span class="arrow">›</span>
      </button>

      <button v-for="e in timedEvents" :key="e.id" class="row" @click="editEvent(e.id)">
        <span class="time">{{ eventTimeText(e) }}</span>
        <span class="row-txt">
          <b>{{ e.title }}</b>
          <small v-if="e.note">{{ e.note }}</small>
        </span>
        <span class="arrow">›</span>
      </button>

      <div class="btn-row">
        <button class="ghost" @click="addEvent">{{ t('myday.newEvent') }}</button>
        <button class="ghost" :class="{ muted: yesterdayCount === 0 }" @click="copyYesterday">
          {{ t('myday.copyYesterday') }}<template v-if="yesterdayCount">（{{ yesterdayCount }}）</template>
        </button>
      </div>
    </div>

    <p class="section-title">
      <span>{{ t('myday.todoTitle') }}</span>
      <span>{{ t('myday.openN', { n: openTodoCount }) }}</span>
    </p>

    <div class="card block">
      <div v-if="todos.length === 0" class="empty">
        <span class="big">✓</span>
        {{ t('myday.emptyTodo1') }}<br />
        {{ t('myday.emptyTodo2') }}
      </div>

      <div v-for="item in todos" :key="item.id" class="row todo" @click="editTodo(item.id)">
        <button
          type="button"
          class="check"
          :class="{ on: item.done }"
          :aria-label="t(item.done ? 'aria.markUndone' : 'aria.markDone', { title: item.title })"
          @click.stop="toggleTodo(item.id)"
        >
          <svg v-if="item.done" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5.5 12.5l4 4 9-9.5" />
          </svg>
        </button>
        <span class="row-txt">
          <b :class="{ done: item.done }">{{ item.title }}</b>
          <small v-if="item.note">{{ item.note }}</small>
        </span>
        <span v-if="!item.done && item.due && item.due < today" class="chip warn overdue">{{ t('myday.overdueN', { n: -overDays(item.due) }) }}</span>
        <span v-else-if="item.done" class="chip">{{ t('myday.done') }}</span>
        <span class="arrow">›</span>
      </div>

      <div class="btn-row">
        <button class="ghost" @click="addTodo">{{ t('myday.newTodo') }}</button>
      </div>
    </div>

    <p class="section-title">
      <span>{{ t('myday.todayDiary') }}</span>
      <span>{{ t('myday.diaryCount', { n: diaries.length }) }}</span>
    </p>

    <div class="card block">
      <div v-if="diaries.length === 0" class="empty">
        <span class="big">✎</span>
        {{ t('myday.emptyDiary1') }}<br />
        {{ t('myday.emptyDiary2') }}
      </div>

      <button v-for="d in diaries" :key="d.id" class="row" @click="editDiary(d.id)">
        <span class="mood">{{ d.mood || '📝' }}</span>
        <span class="row-txt">
          <b>{{ d.title || t('common.noTitle') }}</b>
          <small>{{ diarySummary(d) }}</small>
        </span>
        <span v-if="d.favorite" class="fav">★</span>
        <span class="arrow">›</span>
      </button>

      <div class="btn-row">
        <button class="ghost" @click="writeDiary">{{ t('myday.writeDiary') }}</button>
      </div>
    </div>

    <template v-if="birthdays.length">
      <p class="section-title">
        <span>{{ t('myday.recentBd') }}</span>
        <span>{{ t('myday.next60') }}</span>
      </p>

      <div class="card block">
        <button v-for="x in birthdays" :key="x.b.id" class="row" @click="editBirthday(x.b.id)">
          <span class="cake">🎂</span>
          <span class="row-txt">
            <b>{{ x.b.name }}</b>
            <small>{{ formatCN(x.date) }} · {{ x.b.type === 'lunar' ? t('common.lunar') : t('common.solar') }}<template v-if="x.age != null"> · {{ t('info.turnsAge', { n: x.age }) }}</template></small>
          </span>
          <span class="chip pink">{{ x.daysUntil === 0 ? t('search.isToday') : t('search.inDays', { n: x.daysUntil }) }}</span>
          <span class="arrow">›</span>
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.hero {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hero-main b {
  display: block;
  font-size: 20px;
  letter-spacing: 0.02em;
}

.hero-main small {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  color: var(--qyl-text-2);
}

.hero-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.block {
  padding: 4px 6px;
}

.row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 10px;
  border-radius: var(--qyl-radius-sm);
  text-align: left;
}

.row + .row {
  border-top: 1px solid var(--qyl-line);
}

.row:active {
  background: var(--qyl-surface-2);
}

.time {
  flex: none;
  min-width: 56px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--qyl-accent);
  font-variant-numeric: tabular-nums;
}

.time.allday {
  color: var(--qyl-primary);
}

.row-txt {
  flex: 1;
  min-width: 0;
}

.row-txt b {
  display: block;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-txt b.done {
  text-decoration: line-through;
  color: var(--qyl-text-3);
}

.row-txt small {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--qyl-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.check {
  flex: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1.7px solid var(--qyl-line);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.check.on {
  background: var(--qyl-primary);
  border-color: var(--qyl-primary);
}

.chip.overdue {
  flex: none;
}

.mood {
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: var(--qyl-surface-2);
  font-size: 17px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fav {
  flex: none;
  color: var(--qyl-warn);
  font-size: 15px;
}

.cake {
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: var(--qyl-pink-soft);
  font-size: 16px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chip.pink {
  background: var(--qyl-pink-soft);
  color: var(--qyl-pink);
}

.arrow {
  flex: none;
  color: var(--qyl-text-3);
  font-size: 18px;
  line-height: 1;
}

.btn-row {
  display: flex;
  gap: 8px;
  padding: 8px 4px 4px;
}

.ghost {
  flex: 1;
  padding: 10px;
  border-radius: var(--qyl-radius-sm);
  background: var(--qyl-primary-soft);
  color: var(--qyl-primary);
  font-size: 13.5px;
  font-weight: 600;
}

.ghost.muted {
  background: var(--qyl-surface-2);
  color: var(--qyl-text-3);
}

.ghost:active {
  opacity: 0.8;
}
</style>
