<script setup lang="ts">
import { computed } from 'vue'
import TopBar from '@/components/TopBar.vue'
import { diaryState } from '@/composables/useDiaries'
import { eventState } from '@/composables/useEvents'
import { todoState } from '@/composables/useTodos'
import { birthdayState } from '@/composables/useBirthdays'
import { addDays, diffDays, formatCN, todayKey } from '@/utils/date'
import { t, locale } from '@/composables/useI18n'

const today = todayKey()

/* ------------------------- 日记统计 ------------------------- */

const diaryDates = computed(() => new Set(diaryState.list.map((d) => d.date)))

const diaryTotal = computed(() => diaryState.list.length)

const diaryThisMonth = computed(() => {
  const ym = today.slice(0, 7)
  return diaryState.list.filter((d) => d.date.startsWith(ym)).length
})

const diaryChars = computed(() =>
  diaryState.list.reduce((n, d) => n + d.title.length + d.content.length, 0),
)

/** 连续记录：今天或昨天往前数，一天不落 */
const currentStreak = computed(() => {
  const set = diaryDates.value
  let cursor = today
  if (!set.has(cursor)) cursor = addDays(cursor, -1) // 今天还没写不算断
  let n = 0
  while (set.has(cursor)) {
    n++
    cursor = addDays(cursor, -1)
  }
  return n
})

const longestStreak = computed(() => {
  const sorted = [...diaryDates.value].sort()
  let best = 0
  let run = 0
  let prev = ''
  for (const k of sorted) {
    run = prev && diffDays(prev, k) === 1 ? run + 1 : 1
    if (run > best) best = run
    prev = k
  }
  return best
})

/** 最近 30 天每天的日记篇数（今天在最前，越往右越早） */
const bars30 = computed(() => {
  const byDate = new Map<string, number>()
  for (const d of diaryState.list) byDate.set(d.date, (byDate.get(d.date) ?? 0) + 1)
  const out: { key: string; count: number }[] = []
  for (let i = 0; i < 30; i++) {
    const key = addDays(today, -i)
    out.push({ key, count: byDate.get(key) ?? 0 })
  }
  return out
})

const maxBar = computed(() => Math.max(1, ...bars30.value.map((b) => b.count)))

const moodRows = computed(() => {
  const counts = new Map<string, number>()
  for (const d of diaryState.list) {
    if (!d.mood) continue
    counts.set(d.mood, (counts.get(d.mood) ?? 0) + 1)
  }
  const rows = [...counts.entries()].map(([mood, count]) => ({ mood, count }))
  rows.sort((a, b) => b.count - a.count)
  return rows.slice(0, 6)
})

/* ------------------------- 日程 / 待办 / 生日 ------------------------- */

const eventTotal = computed(() => eventState.list.length)
const eventThisMonth = computed(() => {
  const ym = today.slice(0, 7)
  return eventState.list.filter((e) => e.date.startsWith(ym)).length
})
const eventToday = computed(() => eventState.list.filter((e) => e.date === today).length)

const todoTotal = computed(() => todoState.list.length)
const todoDone = computed(() => todoState.list.filter((t) => t.done).length)
const todoOverdue = computed(() => todoState.list.filter((t) => !t.done && t.due && t.due < today).length)
const todoRate = computed(() => (todoTotal.value === 0 ? null : Math.round((todoDone.value / todoTotal.value) * 100)))

const birthdayTotal = computed(() => birthdayState.list.length)

function fmtNum(n: number): string {
  if (n < 10000) return String(n)
  return locale.value === 'zh' ? (n / 10000).toFixed(1) + ' 万' : (n / 1000).toFixed(1) + 'k'
}

function barTip(b: { key: string; count: number }): string {
  const date = formatCN(b.key)
  return b.count ? t('stats.barTipN', { date, n: b.count }) : t('stats.barTipNone', { date })
}

/** 柱子下面的短日期，例如 10/16 */
function shortDate(key: string): string {
  const parts = key.split('-')
  return `${Number(parts[1])}/${Number(parts[2])}`
}
</script>

<template>
  <div class="app-shell">
    <TopBar />

    <p class="section-title">
      <span>{{ t('stats.overview') }}</span>
      <span>{{ t('stats.allLocal') }}</span>
    </p>

    <div class="grid">
      <div class="tile card">
        <span class="num">📝 {{ diaryTotal }}</span>
        <span class="lbl">{{ t('stats.unitDiary') }}</span>
      </div>
      <div class="tile card">
        <span class="num">🗓 {{ eventTotal }}</span>
        <span class="lbl">{{ t('stats.unitEvent') }}</span>
      </div>
      <div class="tile card">
        <span class="num">✓ {{ todoTotal }}</span>
        <span class="lbl">{{ t('stats.unitTodo') }}</span>
      </div>
      <div class="tile card">
        <span class="num">🎂 {{ birthdayTotal }}</span>
        <span class="lbl">{{ t('stats.unitBd') }}</span>
      </div>
    </div>

    <p class="section-title">
      <span>{{ t('stats.diary') }}</span>
      <span>{{ t('stats.recorded', { n: diaryTotal }) }}</span>
    </p>

    <div class="grid four">
      <div class="tile card">
        <span class="num">{{ diaryThisMonth }}</span>
        <span class="lbl">{{ t('stats.thisMonth') }}</span>
      </div>
      <div class="tile card">
        <span class="num">{{ currentStreak }}</span>
        <span class="lbl">{{ t('stats.streak') }}</span>
      </div>
      <div class="tile card">
        <span class="num">{{ longestStreak }}</span>
        <span class="lbl">{{ t('stats.longest') }}</span>
      </div>
      <div class="tile card">
        <span class="num">{{ fmtNum(diaryChars) }}</span>
        <span class="lbl">{{ t('stats.chars') }}</span>
      </div>
    </div>

    <div class="card chart-card">
      <p class="chart-title">
        <span>{{ t('stats.recent30') }}</span>
        <span class="scroll-hint">{{ t('stats.scrollHint') }}</span>
      </p>
      <div class="bars-scroll">
        <div v-for="b in bars30" :key="b.key" class="bar-col" :title="barTip(b)">
          <div class="bar-slot">
            <div
              class="bar"
              :class="{ empty: b.count === 0, hot: b.key === today }"
              :style="{ height: b.count === 0 ? '3px' : Math.max(14, Math.round((b.count / maxBar) * 46)) + 'px' }"
            ></div>
          </div>
          <span class="bar-date" :class="{ hot: b.key === today }">{{ shortDate(b.key) }}</span>
        </div>
      </div>
    </div>

    <div v-if="moodRows.length" class="card chart-card">
      <p class="chart-title">{{ t('stats.moods') }}</p>
      <div v-for="m in moodRows" :key="m.mood" class="mood-row">
        <span class="mood-face">{{ m.mood }}</span>
        <div class="mood-track">
          <div class="mood-fill" :style="{ width: Math.round((m.count / moodRows[0].count) * 100) + '%' }"></div>
        </div>
        <span class="mood-count">{{ m.count }}</span>
      </div>
    </div>

    <p class="section-title">
      <span>{{ t('stats.events') }}</span>
      <span>{{ t('stats.eventsTotal', { n: eventTotal }) }}</span>
    </p>

    <div class="grid">
      <div class="tile card">
        <span class="num">{{ eventToday }}</span>
        <span class="lbl">{{ t('stats.today') }}</span>
      </div>
      <div class="tile card">
        <span class="num">{{ eventThisMonth }}</span>
        <span class="lbl">{{ t('stats.thisMonthShort') }}</span>
      </div>
    </div>

    <p class="section-title">
      <span>{{ t('stats.todos') }}</span>
      <span>{{ t('stats.todosTotal', { n: todoTotal }) }}</span>
    </p>

    <div class="grid">
      <div class="tile card">
        <span class="num">{{ todoDone }}</span>
        <span class="lbl">{{ t('stats.done') }}</span>
      </div>
      <div class="tile card">
        <span class="num">{{ todoRate == null ? '—' : todoRate + '%' }}</span>
        <span class="lbl">{{ t('stats.rate') }}</span>
      </div>
      <div class="tile card">
        <span class="num">{{ todoTotal - todoDone }}</span>
        <span class="lbl">{{ t('stats.open') }}</span>
      </div>
      <div class="tile card">
        <span class="num" :class="{ warn: todoOverdue > 0 }">{{ todoOverdue }}</span>
        <span class="lbl">{{ t('stats.overdue') }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.grid.four {
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.tile {
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.num {
  font-size: 21px;
  font-weight: 700;
  letter-spacing: 0.01em;
  font-variant-numeric: tabular-nums;
}

.num.warn {
  color: var(--qyl-accent);
}

.lbl {
  font-size: 11.5px;
  color: var(--qyl-text-3);
}

.chart-card {
  margin-top: 10px;
  padding: 14px;
  min-width: 0;
}

.chart-title {
  margin: 0 0 12px;
  font-size: 12.5px;
  color: var(--qyl-text-3);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.scroll-hint {
  font-size: 11px;
  opacity: 0.8;
}

/* 横向可滑动，从今天开始往左看过去 30 天；不会把屏幕撑破 */
.bars-scroll {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  min-width: 0;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
}

.bar-col {
  flex: 0 0 auto;
  width: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.bar-slot {
  width: 100%;
  height: 52px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bar {
  width: 100%;
  max-width: 14px;
  border-radius: 3px 3px 1px 1px;
  background: var(--qyl-primary);
  opacity: 0.55;
}

.bar.hot {
  opacity: 1;
}

.bar.empty {
  background: var(--qyl-line);
  opacity: 1;
}

.bar-date {
  font-size: 9.5px;
  color: var(--qyl-text-3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.bar-date.hot {
  color: var(--qyl-primary);
  font-weight: 600;
}

.mood-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 0;
}

.mood-face {
  flex: none;
  width: 28px;
  font-size: 18px;
  text-align: center;
}

.mood-track {
  flex: 1;
  height: 10px;
  border-radius: 999px;
  background: var(--qyl-surface-2);
  overflow: hidden;
}

.mood-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--qyl-primary), var(--qyl-primary) 60%, var(--qyl-pink));
}

.mood-count {
  flex: none;
  width: 26px;
  text-align: right;
  font-size: 12.5px;
  color: var(--qyl-text-2);
  font-variant-numeric: tabular-nums;
}
</style>
