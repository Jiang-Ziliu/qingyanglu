<script setup lang="ts">
import { computed } from 'vue'
import { getDayInfo, getVisibleFestivals } from '@/utils/lunar'
import { diffDays, formatFull, todayKey } from '@/utils/date'
import { settings } from '@/composables/useSettings'
import { diariesOf } from '@/composables/useDiaries'
import { eventsOf, eventTimeText } from '@/composables/useEvents'
import { birthdaysOn } from '@/composables/useBirthdays'
import { openBirthdayEditor, openDiaryEditor, openEventEditor } from '@/composables/useUi'
import { plainExcerpt } from '@/utils/markdown'
import { locale, t, tf } from '@/composables/useI18n'

const props = defineProps<{
  selected: string
  marks?: Record<string, string[]>
}>()

const today = todayKey()
const info = computed(() => getDayInfo(props.selected))
/** 完整节日名（不截断），由「显示设置」决定显示国内 / 国外 */
const festivals = computed(() => getVisibleFestivals(info.value, settings.festivalFilter).map(tf))
const isStatutory = computed(() => settings.festivalFilter === 'statutory')

const dayDiaries = computed(() => diariesOf(props.selected))
const dayEvents = computed(() => eventsOf(props.selected))
const dayBirthdays = computed(() => birthdaysOn(props.selected))

const relText = computed(() => {
  const n = diffDays(today, props.selected)
  if (n === 0) return t('info.relToday')
  if (n > 0) return t('info.relFuture', { n })
  return t('info.relPast', { n: -n })
})

const hasAnyChip = computed(
  () =>
    !!info.value.jieQi ||
    shownFestivals.value.length > 0 ||
    info.value.isRest ||
    info.value.isWork,
)

/** 「仅法定节假日」模式下只显示放假名称，其余模式显示选定的节日 */
const shownFestivals = computed(() => {
  if (isStatutory.value && (info.value.isRest || info.value.isWork)) {
    return [info.value.holidayName ? tf(info.value.holidayName) : info.value.isRest ? t('cal.holiday') : t('cal.workLong')]
  }
  return festivals.value.slice(0, 6)
})

function summary(d: (typeof dayDiaries.value)[number]): string {
  const body = plainExcerpt(d.content, 46)
  if (body) return body
  if (d.attachments.length) return t('info.attachN', { n: d.attachments.length })
  if (d.mood) return t('info.moodOnly')
  return t('info.noBody')
}

function writeDiary() {
  openDiaryEditor({ date: props.selected })
}

function editDiary(id: string) {
  openDiaryEditor({ id, date: props.selected })
}

function addEvent() {
  openEventEditor({ date: props.selected })
}

function editEvent(id: string) {
  openEventEditor({ id, date: props.selected })
}

function addBirthday() {
  openBirthdayEditor()
}

function editBirthday(id: string) {
  openBirthdayEditor({ id })
}
</script>

<template>
  <div class="info card">
    <div class="top">
      <div class="top-txt">
        <b>{{ formatFull(selected) }}</b>
        <small v-if="locale === 'zh'">{{ info.ganzhiYear }}年 {{ info.lunarMonthDay }} · 属{{ info.zodiac }}</small>
        <small v-else>{{ info.lunarMonthDay }} · {{ t('cal.yearLabel.en', { zodiac: tf(info.zodiac) }) }}</small>
      </div>
      <span class="chip primary rel">{{ relText }}</span>
    </div>

    <div class="chips">
      <span v-if="info.jieQi" class="chip primary">{{ t('cal.termChip', { name: tf(info.jieQi) }) }}</span>

      <span v-for="f in shownFestivals" :key="f" class="chip accent">{{ f }}</span>

      <span v-if="info.isRest" class="chip accent">{{ t('cal.rest') }} · {{ t('cal.restLong') }}</span>
      <span v-else-if="info.isWork" class="chip warn">{{ t('cal.work') }} · {{ t('cal.workLong') }}</span>

      <span v-if="!hasAnyChip" class="chip">{{ t('cal.normal') }}</span>
    </div>

    <div class="event-block">
      <div class="block-head">
        <p class="label">{{ t('info.events') }}</p>
        <button class="mini-btn" @click="addEvent">{{ t('info.addMini') }}</button>
      </div>

      <div v-if="dayEvents.length" class="event-list">
        <button v-for="e in dayEvents" :key="e.id" class="event-item" @click="editEvent(e.id)">
          <span class="time" :class="{ allday: e.allDay }">{{ eventTimeText(e) }}</span>
          <span class="event-txt">
            <b>{{ e.title }}</b>
            <small v-if="e.note">{{ e.note }}</small>
          </span>
          <span class="arrow">›</span>
        </button>
      </div>
      <p v-else class="hint">{{ t('info.noEvent') }}</p>
    </div>

    <div class="diary-block">
      <div class="diary-head">
        <p class="label">{{ t('info.diaries') }}</p>
        <button class="write-btn" @click="writeDiary">{{ t('info.writeOne') }}</button>
      </div>

      <div v-if="dayDiaries.length" class="diary-list">
        <button v-for="d in dayDiaries" :key="d.id" class="diary-item" @click="editDiary(d.id)">
          <span class="mood">{{ d.mood || '📝' }}</span>
          <span class="diary-txt">
            <b>{{ d.title || t('common.noTitle') }}</b>
            <small>{{ summary(d) }}</small>
          </span>
          <span v-if="d.favorite" class="fav">★</span>
          <span class="arrow">›</span>
        </button>
      </div>
      <p v-else class="hint">{{ t('info.noDiary') }}</p>
    </div>

    <div class="birthday-block">
      <div class="block-head">
        <p class="label">{{ t('info.birthdays') }}</p>
        <button class="pink-btn" @click="addBirthday">{{ t('info.addMini') }}</button>
      </div>

      <div v-if="dayBirthdays.length" class="event-list">
        <button v-for="x in dayBirthdays" :key="x.b.id" class="event-item" @click="editBirthday(x.b.id)">
          <span class="cake">🎂</span>
          <span class="event-txt">
            <b>{{ x.b.name }}</b>
            <small>{{ x.b.type === 'lunar' ? t('info.bdLunar') : t('info.bdSolar') }}<template v-if="x.age != null"> · {{ t('info.turnsAge', { n: x.age }) }}</template></small>
          </span>
          <span class="arrow">›</span>
        </button>
      </div>
      <p v-else class="hint">{{ t('info.noBirthday') }}</p>
    </div>
  </div>
</template>

<style scoped>
.info {
  margin-top: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.top-txt b {
  display: block;
  font-size: 17px;
  letter-spacing: 0.01em;
}

.top-txt small {
  display: block;
  margin-top: 3px;
  font-size: 12.5px;
  color: var(--qyl-text-2);
}

.rel {
  flex: none;
  margin-top: 2px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.diary-block {
  padding-top: 10px;
  border-top: 1px dashed var(--qyl-line);
}

.diary-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.write-btn {
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--qyl-primary-soft);
  color: var(--qyl-primary);
  font-size: 12.5px;
  font-weight: 600;
}

.diary-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
}

.diary-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: var(--qyl-radius-sm);
  background: var(--qyl-surface-2);
  text-align: left;
}

.diary-item:active {
  background: var(--qyl-primary-soft);
}

.mood {
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: var(--qyl-surface);
  font-size: 17px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.diary-txt {
  flex: 1;
  min-width: 0;
}

.diary-txt b {
  display: block;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.diary-txt small {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--qyl-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fav {
  flex: none;
  color: var(--qyl-warn);
  font-size: 15px;
}

.arrow {
  flex: none;
  color: var(--qyl-text-3);
  font-size: 18px;
  line-height: 1;
}

.event-block {
  padding-top: 10px;
  border-top: 1px dashed var(--qyl-line);
}

.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.mini-btn {
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--qyl-accent-soft);
  color: var(--qyl-accent);
  font-size: 12.5px;
  font-weight: 600;
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
}

.event-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: var(--qyl-radius-sm);
  background: var(--qyl-surface-2);
  text-align: left;
}

.event-item:active {
  background: var(--qyl-accent-soft);
}

.time {
  flex: none;
  min-width: 46px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--qyl-accent);
  font-variant-numeric: tabular-nums;
}

.time.allday {
  color: var(--qyl-primary);
}

.event-txt {
  flex: 1;
  min-width: 0;
}

.event-txt b {
  display: block;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-txt small {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--qyl-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.birthday-block {
  padding-top: 10px;
  border-top: 1px dashed var(--qyl-line);
}

.pink-btn {
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--qyl-pink-soft);
  color: var(--qyl-pink);
  font-size: 12.5px;
  font-weight: 600;
}

.cake {
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: var(--qyl-surface);
  font-size: 16px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.label {
  margin: 0 0 4px;
  font-size: 12px;
  color: var(--qyl-text-3);
}

.hint {
  margin: 0;
  font-size: 13px;
  color: var(--qyl-text-2);
}
</style>
