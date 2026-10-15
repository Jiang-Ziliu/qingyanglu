<script setup lang="ts">
import { computed } from 'vue'
import { getMonthDays } from '@/utils/lunar'
import { MONTH_EN, todayKey } from '@/utils/date'
import { locale, t } from '@/composables/useI18n'

const props = defineProps<{
  year: number
  selected: string
  marks?: Record<string, string[]>
}>()

const emit = defineEmits<{ (e: 'pick', key: string): void }>()

const today = todayKey()

const months = computed(() =>
  Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    title: locale.value === 'en' ? MONTH_EN[i] : t('year.monthTitle', { m: i + 1 }),
    cells: getMonthDays(props.year, i + 1).flat(),
  })),
)
</script>

<template>
  <div class="year-wrap">
    <div class="year-grid">
      <div v-for="m in months" :key="m.month" class="mini card">
        <p class="mini-title">{{ m.title }}</p>
        <div class="mini-grid">
          <button
            v-for="d in m.cells"
            :key="d.key"
            class="mini-cell"
            :class="{
              other: d.month !== m.month,
              weekend: d.isWeekend && d.month === m.month,
              rest: d.isRest,
              work: d.isWork,
              today: d.key === today,
              selected: d.key === selected,
            }"
            @click="emit('pick', d.key)"
          >
            <span>{{ d.month === m.month ? d.day : '' }}</span>
            <i v-if="d.month === m.month && (marks?.[d.key]?.length ?? 0)" class="dot"></i>
          </button>
        </div>
      </div>
    </div>

    <p class="legend">
      <span class="item"><i class="sw rest"></i>{{ t('year.legendRest') }}</span>
      <span class="item"><i class="sw work"></i>{{ t('year.legendWork') }}</span>
      <span class="item"><i class="sw ev"></i>{{ t('year.legendRecord') }}</span>
      <span class="item">{{ t('year.legendTap') }}</span>
    </p>
  </div>
</template>

<style scoped>
.year-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.mini {
  padding: 10px 8px 12px;
}

.mini-title {
  margin: 0 0 8px;
  text-align: center;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--qyl-text-2);
}

.mini-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 1px;
}

.mini-cell {
  position: relative;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  border-radius: 50%;
  color: var(--qyl-text);
  font-variant-numeric: tabular-nums;
}

.mini-cell.other {
  pointer-events: none;
}

.mini-cell.weekend {
  color: var(--qyl-primary);
}

/* 法定假期与调休：全年每月都能一眼看出 */
.mini-cell.rest span {
  color: var(--qyl-accent);
  font-weight: 700;
}

.mini-cell.work span {
  color: var(--qyl-warn);
  font-weight: 700;
}

.mini-cell.today {
  box-shadow: inset 0 0 0 1.2px var(--qyl-primary);
  color: var(--qyl-primary);
  font-weight: 700;
}

.mini-cell.selected {
  background: var(--qyl-accent);
  color: #fff;
  font-weight: 600;
  box-shadow: none;
}

.mini-cell.selected span {
  color: #fff;
}

.mini-cell .dot {
  position: absolute;
  bottom: 1px;
  width: 3.5px;
  height: 3.5px;
  border-radius: 50%;
  background: var(--qyl-primary);
}

.mini-cell.selected .dot {
  background: #fff;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin: 12px 2px 0;
  font-size: 11.5px;
  color: var(--qyl-text-3);
}

.legend .item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.sw {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: block;
}

.sw.rest {
  background: var(--qyl-accent);
}

.sw.work {
  background: var(--qyl-warn);
}

.sw.ev {
  background: var(--qyl-primary);
  width: 6px;
  height: 6px;
}
</style>
