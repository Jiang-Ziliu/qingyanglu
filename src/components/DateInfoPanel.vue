<script setup lang="ts">
import { computed } from 'vue'
import { diariesOf } from '@/composables/useDiaries'
import { eventsOf, eventTimeText } from '@/composables/useEvents'
import { birthdaysOn } from '@/composables/useBirthdays'
import { todosOn, toggleTodo } from '@/composables/useTodos'
import { reviewsOf, reviewSummary } from '@/composables/useReviews'
import {
  openBirthdayEditor,
  openDiaryEditor,
  openEventEditor,
  openReviewEditor,
  openTodoEditor,
} from '@/composables/useUi'
import { plainExcerpt } from '@/utils/markdown'
import { t } from '@/composables/useI18n'
import type { Diary } from '@/utils/db'

const props = defineProps<{
  selected: string
}>()

const dayDiaries = computed(() => diariesOf(props.selected))
const dayReviews = computed(() => reviewsOf(props.selected))
const dayTodos = computed(() => todosOn(props.selected))
const dayEvents = computed(() => eventsOf(props.selected))
const dayBirthdays = computed(() => birthdaysOn(props.selected))

/** 这一天有用内容才显示；什么都没写就整块不出现 */
const hasAny = computed(
  () =>
    dayDiaries.value.length +
      dayReviews.value.length +
      dayTodos.value.length +
      dayEvents.value.length +
      dayBirthdays.value.length >
    0,
)

function diaryText(d: Diary): string {
  const body = plainExcerpt(d.content, 46)
  if (body) return body
  if (d.attachments.length) return t('info.attachN', { n: d.attachments.length })
  if (d.mood) return t('info.moodOnly')
  return t('info.noBody')
}

function reviewRange(days: number): string {
  return t('review.range', { n: days })
}

function editDiary(id: string) {
  openDiaryEditor({ id, date: props.selected })
}

function editReview(id: string) {
  openReviewEditor({ id, date: props.selected })
}

function editTodo(id: string) {
  openTodoEditor({ id })
}

function editEvent(id: string) {
  openEventEditor({ id, date: props.selected })
}

function editBirthday(id: string) {
  openBirthdayEditor({ id })
}
</script>

<template>
  <div v-if="hasAny" class="day-detail card">
    <!-- 1. 日记 -->
    <section v-if="dayDiaries.length" class="mod">
      <p class="mod-head">
        <i class="dot diary"></i><span>{{ t('mod.diary') }}</span><em>{{ dayDiaries.length }}</em>
      </p>
      <button v-for="d in dayDiaries" :key="d.id" class="item" @click="editDiary(d.id)">
        <span class="lead">{{ d.mood || '📝' }}</span>
        <span class="txt">
          <b>{{ d.title || t('common.noTitle') }}</b>
          <small>{{ diaryText(d) }}</small>
        </span>
        <span v-if="d.favorite" class="fav">★</span>
        <span class="arrow">›</span>
      </button>
    </section>

    <!-- 2. 待办 -->
    <section v-if="dayTodos.length" class="mod">
      <p class="mod-head">
        <i class="dot todo"></i><span>{{ t('mod.todo') }}</span><em>{{ dayTodos.length }}</em>
      </p>
      <div v-for="x in dayTodos" :key="x.id" class="item" @click="editTodo(x.id)">
        <button
          type="button"
          class="check"
          :class="{ on: x.done }"
          :aria-label="t(x.done ? 'aria.markUndone' : 'aria.markDone', { title: x.title })"
          @click.stop="toggleTodo(x.id)"
        >
          <svg v-if="x.done" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5.5 12.5l4 4 9-9.5" />
          </svg>
        </button>
        <span class="txt">
          <b :class="{ done: x.done }">{{ x.title }}</b>
          <small v-if="x.note">{{ x.note }}</small>
        </span>
        <span class="arrow">›</span>
      </div>
    </section>

    <!-- 3. 复盘 -->
    <section v-if="dayReviews.length" class="mod">
      <p class="mod-head">
        <i class="dot review"></i><span>{{ t('mod.review') }}</span><em>{{ dayReviews.length }}</em>
      </p>
      <button v-for="r in dayReviews" :key="r.id" class="item" @click="editReview(r.id)">
        <span class="lead review-lead">🧭</span>
        <span class="txt">
          <b>{{ reviewSummary(r) || t('mod.review') }}</b>
          <small>{{ reviewRange(r.days) }}</small>
        </span>
        <span class="arrow">›</span>
      </button>
    </section>

    <!-- 4. 日程 -->
    <section v-if="dayEvents.length" class="mod">
      <p class="mod-head">
        <i class="dot event"></i><span>{{ t('mod.event') }}</span><em>{{ dayEvents.length }}</em>
      </p>
      <button v-for="e in dayEvents" :key="e.id" class="item" @click="editEvent(e.id)">
        <span class="lead time" :class="{ allday: e.allDay || !e.startTime }">{{ e.allDay || !e.startTime ? t('common.allDay') : eventTimeText(e) }}</span>
        <span class="txt">
          <b>{{ e.title }}</b>
          <small v-if="e.note">{{ e.note }}</small>
        </span>
        <span class="arrow">›</span>
      </button>
    </section>

    <!-- 5. 生日 -->
    <section v-if="dayBirthdays.length" class="mod">
      <p class="mod-head">
        <i class="dot birthday"></i><span>{{ t('mod.birthday') }}</span><em>{{ dayBirthdays.length }}</em>
      </p>
      <button v-for="x in dayBirthdays" :key="x.b.id" class="item" @click="editBirthday(x.b.id)">
        <span class="lead cake">🎂</span>
        <span class="txt">
          <b>{{ x.b.name }}</b>
          <small>
            {{ x.b.type === 'lunar' ? t('info.bdLunar') : t('info.bdSolar') }}<template v-if="x.age != null"> · {{ t('info.turnsAge', { n: x.age }) }}</template>
          </small>
        </span>
        <span class="arrow">›</span>
      </button>
    </section>
  </div>
</template>

<style scoped>
.day-detail {
  margin-top: 10px;
  padding: 6px 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mod + .mod {
  padding-top: 8px;
  border-top: 1px dashed var(--qyl-line);
}

.mod-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 6px 4px;
  font-size: 12px;
  color: var(--qyl-text-3);
}

.mod-head em {
  font-style: normal;
  font-variant-numeric: tabular-nums;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: block;
}

.dot.diary {
  background: var(--qyl-primary);
}

.dot.review {
  background: var(--qyl-review);
}

.dot.todo {
  background: var(--qyl-warn);
}

.dot.event {
  background: var(--qyl-accent);
}

.dot.birthday {
  background: var(--qyl-pink);
}

.item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px;
  border-radius: var(--qyl-radius-sm);
  text-align: left;
}

.item:active {
  background: var(--qyl-surface-2);
}

.lead {
  flex: none;
  min-width: 30px;
  font-size: 17px;
  line-height: 1;
  text-align: center;
  color: var(--qyl-accent);
}

.lead.review-lead {
  font-size: 16px;
}

.lead.time {
  min-width: 52px;
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.lead.time.allday {
  color: var(--qyl-primary);
}

.lead.cake {
  font-size: 16px;
}

.txt {
  flex: 1;
  min-width: 0;
}

.txt b {
  display: block;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.txt b.done {
  text-decoration: line-through;
  color: var(--qyl-text-3);
}

.txt small {
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
  width: 22px;
  height: 22px;
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
</style>
