<script setup lang="ts">
import { computed, ref } from 'vue'
import TopBar from '@/components/TopBar.vue'
import CalendarToolbar from '@/components/CalendarToolbar.vue'
import MonthGrid, { type AnnoItem } from '@/components/calendar/MonthGrid.vue'
import YearGrid from '@/components/calendar/YearGrid.vue'
import WeekList from '@/components/calendar/WeekList.vue'
import DayTimeline from '@/components/calendar/DayTimeline.vue'
import AgendaList from '@/components/calendar/AgendaList.vue'
import DateInfoPanel from '@/components/DateInfoPanel.vue'
import { calendar, navigate, selectDate, setView } from '@/composables/useCalendar'
import { allMarks } from '@/composables/useMarks'
import { diariesOf } from '@/composables/useDiaries'
import { reviewsOf, reviewSummary } from '@/composables/useReviews'
import { todosOn } from '@/composables/useTodos'
import { eventsOf } from '@/composables/useEvents'
import { birthdaysOn } from '@/composables/useBirthdays'
import { getMonthDays } from '@/utils/lunar'
import { plainExcerpt } from '@/utils/markdown'
import { t } from '@/composables/useI18n'

/** 日期 -> 圆点颜色标记（日记 / 日程 / 待办 / 生日 / 复盘） */
const marks = allMarks

/* -------------------- 日期 -> 当天标注短文本 -------------------- */

/** 单个日期的标注列表：日记 → 待办 → 复盘 → 日程 → 生日，每条一行、句首带类型色点 */
function dayAnnotations(key: string): AnnoItem[] {
  const out: AnnoItem[] = []
  for (const d of diariesOf(key)) {
    out.push({ color: 'var(--qyl-primary)', text: d.title || plainExcerpt(d.content, 10) || t('mod.diary') })
  }
  for (const td of todosOn(key)) {
    out.push({ color: 'var(--qyl-warn)', text: td.title || t('mod.todo') })
  }
  for (const r of reviewsOf(key)) {
    out.push({ color: 'var(--qyl-review)', text: reviewSummary(r) || t('mod.review') })
  }
  for (const ev of eventsOf(key)) {
    out.push({ color: 'var(--qyl-accent)', text: ev.title || t('mod.event') })
  }
  for (const bd of birthdaysOn(key)) {
    out.push({ color: 'var(--qyl-pink)', text: bd.b.name })
  }
  return out
}

function monthAnnotations(y: number, m: number): Record<string, AnnoItem[]> {
  const out: Record<string, AnnoItem[]> = {}
  for (const info of getMonthDays(y, m).flat()) {
    const items = dayAnnotations(info.key)
    if (items.length) out[info.key] = items
  }
  return out
}

/* -------------------- 上一个月 / 下一个月（与当前月无缝衔接） -------------------- */

const prevYM = computed(() => {
  let m = calendar.cursorMonth - 1
  let y = calendar.cursorYear
  if (m < 1) {
    m = 12
    y--
  }
  return { y, m }
})

const nextYM = computed(() => {
  let m = calendar.cursorMonth + 1
  let y = calendar.cursorYear
  if (m > 12) {
    m = 1
    y++
  }
  return { y, m }
})

const annotationsPrev = computed(() => monthAnnotations(prevYM.value.y, prevYM.value.m))
const annotationsNow = computed(() => monthAnnotations(calendar.cursorYear, calendar.cursorMonth))
const annotationsNext = computed(() => monthAnnotations(nextYM.value.y, nextYM.value.m))

/* -------------------- 手势：左右翻月 + 下拖展开 -------------------- */

/** 0 = 收起；1 = 完全展开 */
const expand = ref(0)
/** 横向跟手位移（px） */
const slideX = ref(0)
/** 是否给横向位移加过渡（松手回弹 / 翻页时才加） */
const slideAnim = ref(false)
const dragging = ref(false)

const DRAG_RANGE = 110 // 手指下滑多少像素走完 0 → 1

/** 三倍宽的滑动轨道（上一个月 + 当前月 + 下一个月连在一起） */
const trackRef = ref<HTMLElement | null>(null)

/** 一个“月”的宽度 = 轨道的 1/3，保证翻页后精准对齐、无空白 */
function slotW(): number {
  return trackRef.value ? trackRef.value.clientWidth / 3 : window.innerWidth
}

let axis: 'x' | 'y' | null = null
let startX = 0
let startY = 0
let baseExpand = 0
let moved = false
let blockClick = false
let locking = false
const slideTimer: { t: number } = { t: 0 }

function onDown(e: PointerEvent) {
  if (locking) return
  if (e.pointerType === 'mouse' && e.button !== 0) return
  dragging.value = true
  moved = false
  axis = null
  startX = e.clientX
  startY = e.clientY
  baseExpand = expand.value
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
}

function onMove(e: PointerEvent) {
  if (!dragging.value || locking) return
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  if (!axis) {
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
    axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
  }
  moved = true
  if (axis === 'x') {
    slideAnim.value = false
    slideX.value = dx
  } else {
    expand.value = Math.min(1, Math.max(0, baseExpand + dy / DRAG_RANGE))
  }
}

function onUp() {
  if (!dragging.value) return
  dragging.value = false
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', onUp)

  const done = axis
  axis = null

  if (moved) {
    // 拖动过之后紧接着的那次点击不算点击，避免误选日期
    blockClick = true
    window.setTimeout(() => {
      blockClick = false
    }, 80)
  }

  if (done === 'x') finishSlide()
  else if (done === 'y') {
    slideAnim.value = true
    expand.value = expand.value >= 0.5 ? 1 : 0
  } else {
    slideAnim.value = true
    slideX.value = 0
  }
}

/** 松手：不足半屏弹回；超过半屏翻到上/下一个月（三个月连着，翻页全程无空白） */
function finishSlide() {
  const w = slotW()
  const dx = slideX.value
  if (Math.abs(dx) < w / 2) {
    slideAnim.value = true
    slideX.value = 0
    return
  }
  const dir: 1 | -1 = dx < 0 ? 1 : -1
  locking = true
  slideAnim.value = true
  slideX.value = -dir * w
  slideTimer.t = window.setTimeout(() => {
    // 相邻月份本来就在轨道里连着：切完光标、位移归零，画面纹丝不动
    navigate(dir)
    slideAnim.value = false
    slideX.value = 0
    locking = false
  }, 190)
}

function toggleExpand() {
  slideAnim.value = true
  expand.value = expand.value >= 0.5 ? 0 : 1
}

/* -------------------- 视图切换 -------------------- */

function pick(key: string) {
  if (blockClick) return
  selectDate(key)
}

function pickInYear(key: string) {
  selectDate(key)
  setView('month')
}
</script>

<template>
  <div class="app-shell">
    <TopBar />
    <CalendarToolbar />

    <div class="view-area">
      <div v-if="calendar.view === 'month'" class="swipe-zone">
        <div class="card month-card">
          <div
            ref="trackRef"
            class="track"
            :class="{ anim: slideAnim }"
            :style="{ transform: `translate3d(calc(-33.3333% + ${slideX}px), 0, 0)` }"
            @pointerdown="onDown"
          >
            <div class="month-slot">
              <MonthGrid
                :year="prevYM.y"
                :month="prevYM.m"
                :selected="calendar.selected"
                :marks="marks"
                :expand="expand"
                :annotations="annotationsPrev"
                :dragging="dragging"
                @select="pick"
              />
            </div>
            <div class="month-slot">
              <MonthGrid
                :year="calendar.cursorYear"
                :month="calendar.cursorMonth"
                :selected="calendar.selected"
                :marks="marks"
                :expand="expand"
                :annotations="annotationsNow"
                :dragging="dragging"
                @select="pick"
              />
            </div>
            <div class="month-slot">
              <MonthGrid
                :year="nextYM.y"
                :month="nextYM.m"
                :selected="calendar.selected"
                :marks="marks"
                :expand="expand"
                :annotations="annotationsNext"
                :dragging="dragging"
                @select="pick"
              />
            </div>
          </div>

          <button
            class="grab"
            :class="{ open: expand > 0.5 }"
            :title="expand > 0.5 ? t('cal.collapseHint') : t('cal.expandHint')"
            @click="toggleExpand"
          >
            <span class="grab-bar"></span>
            <svg class="grab-chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 9.5l6 5 6-5" />
            </svg>
          </button>
        </div>
      </div>

      <YearGrid
        v-else-if="calendar.view === 'year'"
        :year="calendar.cursorYear"
        :selected="calendar.selected"
        :marks="marks"
        @pick="pickInYear"
      />

      <WeekList
        v-else-if="calendar.view === 'week'"
        :selected="calendar.selected"
        :marks="marks"
        @select="pick"
      />

      <DayTimeline v-else-if="calendar.view === 'day'" :selected="calendar.selected" :marks="marks" />

      <AgendaList
        v-else
        :year="calendar.cursorYear"
        :month="calendar.cursorMonth"
        :selected="calendar.selected"
        :marks="marks"
        @select="pick"
      />
    </div>

    <DateInfoPanel v-if="calendar.view === 'week' || calendar.view === 'day'" :selected="calendar.selected" />

    <Transition name="fade">
      <DateInfoPanel v-if="calendar.view === 'month' && expand > 0.05" :selected="calendar.selected" />
    </Transition>
  </div>
</template>

<style scoped>
.month-card {
  padding: 12px 4px 6px;
  /* 裁掉左右滑出的相邻月份，卡片边缘像一道“窗口” */
  overflow: clip;
}

.view-area {
  margin-top: 2px;
}

/* 三倍宽轨道：上个月 | 当前月 | 下个月，连在一起滑动 */
.track {
  display: flex;
  width: 300%;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.month-slot {
  flex: 0 0 33.3333%;
  width: 33.3333%;
  min-width: 0;
  box-sizing: border-box;
  /* 月与月之间留 12px 空隙，卡片边缘不会看到相邻月漏出的角标 */
  padding: 0 6px;
}

.track.anim {
  transition: transform 0.19s cubic-bezier(0.22, 0.61, 0.36, 1);
}

/* 展开 / 收起的横杠 + 折线标识 */
.grab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  width: 100%;
  padding: 2px 0 4px;
  color: var(--qyl-text-3);
}

.grab-bar {
  width: 34px;
  height: 4px;
  border-radius: 999px;
  background: var(--qyl-line);
}

.grab-chev {
  transition: transform 0.22s ease;
  opacity: 0.75;
}

.grab.open .grab-chev {
  transform: rotate(180deg);
}
</style>
