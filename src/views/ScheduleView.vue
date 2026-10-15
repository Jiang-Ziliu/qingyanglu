<script setup lang="ts">
import TopBar from '@/components/TopBar.vue'
import CalendarToolbar from '@/components/CalendarToolbar.vue'
import MonthGrid from '@/components/calendar/MonthGrid.vue'
import YearGrid from '@/components/calendar/YearGrid.vue'
import WeekList from '@/components/calendar/WeekList.vue'
import DayTimeline from '@/components/calendar/DayTimeline.vue'
import AgendaList from '@/components/calendar/AgendaList.vue'
import DateInfoPanel from '@/components/DateInfoPanel.vue'
import { calendar, selectDate, setView } from '@/composables/useCalendar'
import { allMarks } from '@/composables/useMarks'

/** 日期 -> 圆点颜色标记（日记 / 日程 / 待办） */
const marks = allMarks

function pick(key: string) {
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
      <div v-if="calendar.view === 'month'" class="card month-card">
        <MonthGrid
          :year="calendar.cursorYear"
          :month="calendar.cursorMonth"
          :selected="calendar.selected"
          :marks="marks"
          @select="pick"
        />
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

    <DateInfoPanel v-if="calendar.view === 'month' || calendar.view === 'week' || calendar.view === 'day'" :selected="calendar.selected" :marks="marks" />
  </div>
</template>

<style scoped>
.month-card {
  padding: 12px 10px 8px;
}

.view-area {
  margin-top: 2px;
}
</style>
