<script setup lang="ts">
import { computed } from 'vue'
import { getDayInfo, getDayLabel, getVisibleFestivals } from '@/utils/lunar'
import { todayKey, weekKeys, formatCN, weekdayMed } from '@/utils/date'
import { settings } from '@/composables/useSettings'
import { t, tf } from '@/composables/useI18n'

const props = defineProps<{
  selected: string
  marks?: Record<string, string[]>
}>()

const emit = defineEmits<{ (e: 'select', key: string): void }>()

const today = todayKey()
const days = computed(() =>
  weekKeys(props.selected).map((k) => {
    const info = getDayInfo(k)
    return {
      key: k,
      info,
      label: getDayLabel(info, settings.festivalFilter),
      festivals: getVisibleFestivals(info, settings.festivalFilter).map(tf),
    }
  }),
)
</script>

<template>
  <div class="week-list">
    <button
      v-for="d in days"
      :key="d.key"
      class="row card"
      :class="{ today: d.key === today, selected: d.key === selected }"
      @click="emit('select', d.key)"
    >
      <div class="left">
        <span class="wd">{{ weekdayMed(d.key) }}</span>
        <span class="date">{{ formatCN(d.key) }}</span>
      </div>
      <div class="mid">
        <span class="lunar">{{ d.info.lunarMonthDay }}</span>
        <span v-if="d.label.type === 'term'" class="chip primary">{{ d.label.text }}</span>
        <span v-else-if="d.label.type === 'festival'" class="chip accent">{{ d.label.text }}</span>
        <span v-for="f in d.festivals.slice(1, 3)" :key="f" class="chip accent">{{ f }}</span>
        <span v-if="d.info.isRest" class="chip accent">{{ t('cal.rest') }}</span>
        <span v-else-if="d.info.isWork" class="chip warn">{{ t('cal.work') }}</span>
      </div>
      <div class="right">
        <span v-if="(marks?.[d.key]?.length ?? 0) === 0" class="none">—</span>
        <span v-else class="count">{{ t('week.items', { n: marks?.[d.key]?.length ?? 0 }) }}</span>
      </div>
    </button>
  </div>
</template>

<style scoped>
.week-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  text-align: left;
  transition: border-color 0.16s ease;
}

.row.today {
  border-color: var(--qyl-primary);
}

.row.selected {
  background: var(--qyl-accent-soft);
  border-color: transparent;
}

.left {
  flex: none;
  width: 74px;
  display: flex;
  flex-direction: column;
}

.wd {
  font-size: 14.5px;
  font-weight: 600;
}

.row.today .wd {
  color: var(--qyl-primary);
}

.date {
  font-size: 11.5px;
  color: var(--qyl-text-3);
}

.mid {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}

.lunar {
  font-size: 12.5px;
  color: var(--qyl-text-2);
}

.right {
  flex: none;
  font-size: 12px;
  color: var(--qyl-text-3);
}
</style>
