<script setup lang="ts">
import { computed, ref } from 'vue'
import TopBar from '@/components/TopBar.vue'
import { doneTodos, openTodos, toggleTodo } from '@/composables/useTodos'
import { openTodoEditor } from '@/composables/useUi'
import { diffDays, formatCN, todayKey, weekdayMed } from '@/utils/date'
import { t } from '@/composables/useI18n'
import type { Todo } from '@/utils/db'

type Filter = 'open' | 'done' | 'all'

const today = todayKey()
const filter = ref<Filter>('open')

const FILTERS = computed(() => [
  { value: 'open' as Filter, label: t('todoPage.fOpen') },
  { value: 'done' as Filter, label: t('todoPage.fDone') },
  { value: 'all' as Filter, label: t('todoPage.fAll') },
])

const overdue = computed(() => openTodos.value.filter((x) => x.due && x.due < today))
const todayList = computed(() => openTodos.value.filter((x) => x.due === today))
const upcoming = computed(() => openTodos.value.filter((x) => x.due && x.due > today))
const someday = computed(() => openTodos.value.filter((x) => !x.due))

const groups = computed(() =>
  [
    { key: 'overdue', label: t('todoPage.gOverdue'), items: overdue.value, tone: 'warn' },
    { key: 'today', label: t('todoPage.gToday'), items: todayList.value, tone: 'primary' },
    { key: 'upcoming', label: t('todoPage.gUpcoming'), items: upcoming.value, tone: '' },
    { key: 'someday', label: t('todoPage.gSomeday'), items: someday.value, tone: '' },
  ].filter((g) => g.items.length > 0),
)

const flatList = computed(() => (filter.value === 'done' ? doneTodos.value : openTodos.value))

function addTodo() {
  openTodoEditor({ due: today })
}

function editTodo(id: string) {
  openTodoEditor({ id })
}

function dueText(item: Todo): string {
  if (!item.due) return ''
  if (item.due === today) return t('common.today')
  const n = diffDays(today, item.due)
  if (n === 1) return t('common.tomorrow')
  return `${formatCN(item.due)} ${weekdayMed(item.due)}`
}

function lateText(due: string): string {
  const n = diffDays(due, today)
  return n === 1 ? t('todoPage.late1') : t('todoPage.lateN', { n })
}
</script>

<template>
  <div class="app-shell">
    <TopBar />

    <p class="section-title">
      <span>{{ t('todoPage.title') }}</span>
      <span>{{ t('todoPage.summary', { total: openTodos.length + doneTodos.length, open: openTodos.length }) }}</span>
    </p>

    <div class="filters">
      <button
        v-for="f in FILTERS"
        :key="f.value"
        class="filter"
        :class="{ on: filter === f.value }"
        @click="filter = f.value"
      >
        {{ f.label }}
      </button>
    </div>

    <!-- 未完成：按 逾期 / 今天 / 以后 / 没定日期 分组 -->
    <template v-if="filter === 'open'">
      <div v-if="groups.length === 0" class="card block">
        <div class="empty">
          <span class="big">✓</span>
          {{ t('todoPage.allDone1') }}<br />
          {{ t('todoPage.allDone2') }}
        </div>
      </div>

      <template v-for="g in groups" :key="g.key">
        <p class="group-title">
          <span>{{ g.label }}</span>
          <span class="chip" :class="g.tone">{{ g.items.length }}</span>
        </p>
        <div class="card block">
          <div v-for="item in g.items" :key="item.id" class="row" @click="editTodo(item.id)">
            <button type="button" class="check" :aria-label="t('aria.markDone', { title: item.title })" @click.stop="toggleTodo(item.id)"></button>
            <span class="row-txt">
              <b>{{ item.title }}</b>
              <small v-if="item.note">{{ item.note }}</small>
            </span>
            <span v-if="g.key === 'overdue' && item.due" class="chip warn">{{ lateText(item.due) }}</span>
            <span v-else-if="item.due" class="due">{{ dueText(item) }}</span>
            <span class="arrow">›</span>
          </div>
        </div>
      </template>
    </template>

    <!-- 已完成 / 全部 -->
    <template v-else>
      <div v-if="flatList.length === 0" class="card block">
        <div class="empty">
          <span class="big">🗒</span>
          {{ filter === 'done' ? t('todoPage.noDone') : t('todoPage.noAny') }}
        </div>
      </div>

      <div v-else class="card block">
        <div v-for="item in flatList" :key="item.id" class="row" @click="editTodo(item.id)">
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
          <span v-if="item.done" class="chip">{{ t('todoPage.doneChip') }}</span>
          <span v-else-if="item.due" class="due">{{ dueText(item) }}</span>
          <span class="arrow">›</span>
        </div>
      </div>
    </template>

    <button class="add" @click="addTodo">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <path d="M12 5.5v13M5.5 12h13" />
      </svg>
      {{ t('todoPage.add') }}
    </button>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  gap: 6px;
  padding: 3px;
  border-radius: 999px;
  background: var(--qyl-surface-2);
  margin-bottom: 12px;
}

.filter {
  flex: 1;
  padding: 8px;
  border-radius: 999px;
  font-size: 13px;
  color: var(--qyl-text-2);
}

.filter.on {
  background: var(--qyl-surface);
  color: var(--qyl-primary);
  font-weight: 600;
  box-shadow: var(--qyl-shadow);
}

.group-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 2px 6px;
  font-size: 12.5px;
  color: var(--qyl-text-3);
}

.block {
  padding: 4px 6px;
}

.row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 10px;
  border-radius: var(--qyl-radius-sm);
  text-align: left;
}

.row + .row {
  border-top: 1px solid var(--qyl-line);
}

.row:active {
  background: var(--qyl-surface-2);
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

.due {
  flex: none;
  font-size: 11.5px;
  color: var(--qyl-text-3);
}

.arrow {
  flex: none;
  color: var(--qyl-text-3);
  font-size: 18px;
  line-height: 1;
}

.add {
  margin-top: 14px;
  width: 100%;
  height: 46px;
  border-radius: var(--qyl-radius);
  background: var(--qyl-primary-soft);
  color: var(--qyl-primary);
  font-size: 14.5px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.add:active {
  opacity: 0.75;
}
</style>
