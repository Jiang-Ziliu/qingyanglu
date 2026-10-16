<script setup lang="ts">
import { computed } from 'vue'
import { clipText, getDayLabel, getMonthDays } from '@/utils/lunar'
import { todayKey, weekHeadLabels } from '@/utils/date'
import { settings } from '@/composables/useSettings'
import { t } from '@/composables/useI18n'

/** 一条当天标注：句首圆点颜色 + 单行文本 */
export interface AnnoItem {
  color: string
  text: string
}

const props = defineProps<{
  year: number
  /** 1 - 12*/
  month: number
  selected: string
  /** 日期 -> 圆点颜色列表（事件/生日标记） */
  marks?: Record<string, string[]>
  /** 0 = 收起；1 = 完全展开（行距拉大、露出当天标注） */
  expand?: number
  /** 日期 -> 当天标注列表（没内容的日期不出现），每条一行 */
  annotations?: Record<string, AnnoItem[]>
  /** 手指拖动中：关掉过渡，保证跟手 */
  dragging?: boolean
}>()

const emit = defineEmits<{ (e: 'select', key: string): void }>()

const today = todayKey()
const WEEK = computed(() => weekHeadLabels())

/** 展开到 1 时每行多出 32px，用来放当天的标注 */
const grow = computed(() => Math.round((props.expand ?? 0) * 32))
const cellH = computed(() => 60 + grow.value)
const showAnno = computed(() => (props.expand ?? 0) > 0.05)
const annoOpacity = computed(() => Math.min(1, Math.max(0, ((props.expand ?? 0) - 0.05) / 0.45)))

/** 每天最多露 2 行标注，每行一句话 */
function anno(key: string): AnnoItem[] {
  return (props.annotations?.[key] ?? []).slice(0, 2)
}

const cells = computed(() =>
  getMonthDays(props.year, props.month)
    .flat()
    .map((info) => {
      const label = getDayLabel(info, settings.festivalFilter)
      return { info, label, text: clipText(label.text) }
    }),
)

function dots(key: string): string[] {
  return (props.marks?.[key] ?? []).slice(0, 3)
}
</script>

<template>
  <div class="month-wrap" :class="{ dragging, expanded: showAnno }">
    <div class="week-head">
      <span v-for="(w, i) in WEEK" :key="i" :class="{ weekend: i === 0 || i === 6 }">{{ w }}</span>
    </div>

    <div class="grid">
      <button
        v-for="(c, idx) in cells"
        :key="c.info.key"
        class="cell"
        :class="{
          other: c.info.month !== month,
          today: c.info.key === today,
          selected: c.info.key === selected,
          grown: grow > 0,
          'has-line': idx >= 7,
        }"
        :style="{ minHeight: cellH + 'px' }"
        @click="emit('select', c.info.key)"
      >
        <span v-if="c.info.isRest" class="badge rest">{{ t('cal.rest') }}</span>
        <span v-else-if="c.info.isWork" class="badge work">{{ t('cal.work') }}</span>

        <span class="num">{{ c.info.day }}</span>
        <span class="sub" :class="c.label.type">{{ c.text }}</span>
        <span
          v-if="showAnno && anno(c.info.key).length"
          class="anno"
          :style="{ opacity: annoOpacity, maxHeight: grow + 'px' }"
        >
          <span v-for="(a, i) in anno(c.info.key)" :key="i" class="anno-line">
            <i class="anno-dot" :style="{ background: a.color }"></i>
            <span class="anno-text">{{ a.text }}</span>
          </span>
        </span>
        <span v-else class="dots">
          <i v-for="(color, i) in dots(c.info.key)" :key="i" :style="{ background: color }"></i>
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.week-head {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  padding: 2px 0 6px;
}

.week-head span {
  text-align: center;
  font-size: 12px;
  color: var(--qyl-text-3);
}

.week-head span.weekend {
  color: var(--qyl-primary);
}

.grid {
  display: grid;
  /* minmax(0, 1fr) 是关键：不让长文字把列撑宽 */
  grid-template-columns: repeat(7, minmax(0, 1fr));
  row-gap: 2px;
}

.cell {
  position: relative;
  min-width: 0;
  min-height: 60px;
  overflow: hidden;
  padding-top: 5px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  border-radius: 13px;
  transition: background 0.15s ease, min-height 0.18s ease;
}

/* 手指拖动时关掉过渡，保证格子跟着手指走 */
.month-wrap.dragging .cell {
  transition: none;
}

.cell:active {
  background: var(--qyl-surface-2);
}

.cell.other {
  opacity: 0.3;
}

.num {
  width: 33px;
  height: 33px;
  flex: none;
  line-height: 33px;
  text-align: center;
  border-radius: 50%;
  font-size: 16px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  transition: background 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}

.cell.today .num {
  box-shadow: inset 0 0 0 1.6px var(--qyl-primary);
  color: var(--qyl-primary);
  font-weight: 700;
}

.cell.selected .num {
  background: var(--qyl-accent);
  color: #fff;
  box-shadow: none;
  font-weight: 600;
}

/* 小字：最多一行，超出必截断，绝不越出格子 */
.sub {
  width: 100%;
  padding: 0 1px;
  font-size: 10px;
  line-height: 1.35;
  color: var(--qyl-text-3);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sub.term {
  color: var(--qyl-primary);
  font-weight: 600;
}

.sub.festival {
  color: var(--qyl-accent);
  font-weight: 600;
}

.cell.selected .sub {
  color: var(--qyl-accent);
}

/* 展开后出现在日期格子下方的当天标注：每条一行，句首带类型色点 */
.anno {
  width: 100%;
  padding: 0 3px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow: hidden;
  transition: opacity 0.18s ease;
}

.anno-line {
  display: flex;
  align-items: center;
  gap: 3px;
  min-width: 0;
  font-size: 10.5px;
  line-height: 1.4;
  color: var(--qyl-text-2);
  text-align: left;
}

.anno-dot {
  flex: none;
  width: 4px;
  height: 4px;
  border-radius: 50%;
}

.anno-text {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.month-wrap.dragging .anno {
  transition: none;
}

/* 展开后每一周排之间的细分隔线 */
.cell.has-line::before {
  content: '';
  position: absolute;
  top: 0;
  left: 3px;
  right: 3px;
  height: 1px;
  background: var(--qyl-line);
  opacity: 0;
  transition: opacity 0.18s ease;
  pointer-events: none;
}

.month-wrap.expanded .cell.has-line::before {
  opacity: 0.55;
}

.month-wrap.dragging .cell.has-line::before {
  transition: none;
}

.dots {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 6px;
}

.dots i {
  width: 4.5px;
  height: 4.5px;
  border-radius: 50%;
  display: block;
}

.badge {
  position: absolute;
  top: 3px;
  right: 3px;
  padding: 1.5px 3.5px;
  font-size: 9.5px;
  line-height: 1.2;
  border-radius: 4px;
  font-weight: 600;
}

.badge.rest {
  background: var(--qyl-accent-soft);
  color: var(--qyl-accent);
}

.badge.work {
  background: var(--qyl-surface-2);
  color: var(--qyl-text-3);
}
</style>
