<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { closeTodoEditor, showToast, ui } from '@/composables/useUi'
import { createTodoDraft, persistTodo, removeTodo, todoState } from '@/composables/useTodos'
import type { Todo } from '@/utils/db'
import { addDays, formatCN, todayKey, weekdayCN } from '@/utils/date'
import { t } from '@/composables/useI18n'

const draft = reactive<Todo>(createTodoDraft(''))
const hasSaved = ref(false)

const dueText = computed(() => {
  if (!draft.due) return t('todo.notScheduled')
  return `${formatCN(draft.due)} · ${weekdayCN(draft.due)}`
})

function initDraft() {
  const src = ui.todoEditingId ? todoState.list.find((t) => t.id === ui.todoEditingId) : undefined
  if (src) {
    hasSaved.value = true
    Object.assign(draft, src)
  } else {
    hasSaved.value = false
    Object.assign(draft, createTodoDraft(ui.todoEditingDate || ''))
  }
}

watch(
  () => [ui.todoEditorOpen, ui.todoEditingId, ui.todoEditingDate],
  () => {
    if (ui.todoEditorOpen) initDraft()
  },
  { immediate: true },
)

async function save() {
  if (!draft.title.trim()) {
    showToast(t('toast.todoNeedTitle'))
    return
  }
  await persistTodo(draft)
  closeTodoEditor()
  showToast(hasSaved.value ? t('toast.todoUpdated') : t('toast.todoAdded'))
}

async function onDelete() {
  if (!hasSaved.value) {
    closeTodoEditor()
    return
  }
  if (!window.confirm(t('confirm.todoDelete'))) return
  await removeTodo(draft.id)
  closeTodoEditor()
  showToast(t('toast.todoDeleted'))
}
</script>

<template>
  <Transition name="sheet">
    <div v-if="ui.todoEditorOpen" class="sheet" @click.self="closeTodoEditor">
      <div class="panel">
        <header class="head">
          <button class="icon-btn" :title="t('common.close')" @click="closeTodoEditor">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 5.5l-7 6.5 7 6.5" />
            </svg>
          </button>
          <div class="head-title">
            <b>{{ hasSaved ? t('todo.edit') : t('todo.create') }}</b>
            <small>{{ t('todo.sub') }}</small>
          </div>
          <button v-if="hasSaved" class="icon-btn del" :title="t('common.delete')" @click="onDelete">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 7h14M9.5 7V5.5h5V7M7 7l.8 12h8.4L17 7" />
            </svg>
          </button>
          <span v-else class="ph"></span>
        </header>

        <div class="body">
          <input v-model="draft.title" class="title-input" :placeholder="t('todo.titlePh')" maxlength="80" @keyup.enter="save" />

          <div class="row">
            <span class="lbl">{{ t('todo.whichDay') }}</span>
            <div class="quick">
              <button class="preset" :class="{ on: draft.due === todayKey() }" @click="draft.due = todayKey()">{{ t('common.today') }}</button>
              <button class="preset" :class="{ on: draft.due === addDays(todayKey(), 1) }" @click="draft.due = addDays(todayKey(), 1)">{{ t('common.tomorrow') }}</button>
              <button class="preset" :class="{ on: !draft.due }" @click="draft.due = ''">{{ t('todo.noDateBtn') }}</button>
            </div>
          </div>

          <div class="row">
            <span class="lbl">{{ t('todo.date') }}</span>
            <input v-model="draft.due" type="date" class="date-input" />
            <span class="meta">{{ dueText }}</span>
          </div>

          <textarea v-model="draft.note" class="note" :placeholder="t('todo.notePh')"></textarea>
        </div>

        <div class="foot">
          <button class="save" @click="save">{{ hasSaved ? t('common.saveChanges') : t('todo.add') }}</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.sheet {
  position: fixed;
  inset: 0;
  z-index: 75;
  background: var(--qyl-overlay);
  display: flex;
  align-items: flex-end;
}

.panel {
  width: 100%;
  max-width: var(--qyl-max-width);
  margin: 0 auto;
  max-height: 88dvh;
  background: var(--qyl-surface);
  border-radius: var(--qyl-radius-lg) var(--qyl-radius-lg) 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 8px 6px;
  border-bottom: 1px solid var(--qyl-line);
}

.head-title {
  flex: 1;
  text-align: center;
}

.head-title b {
  display: block;
  font-size: 15.5px;
  font-weight: 600;
}

.head-title small {
  display: block;
  font-size: 11.5px;
  color: var(--qyl-text-3);
}

.icon-btn.del {
  color: var(--qyl-accent);
}

.ph {
  width: 34px;
}

.body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.foot {
  flex: none;
  padding: 10px 16px calc(14px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--qyl-line);
  background: var(--qyl-surface);
}

.title-input {
  width: 100%;
  padding: 10px 2px;
  border: none;
  border-bottom: 1px solid var(--qyl-line);
  background: transparent;
  font-size: 19px;
  font-weight: 600;
  outline: none;
}

.title-input::placeholder {
  color: var(--qyl-text-3);
  font-weight: 400;
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.lbl {
  flex: none;
  width: 40px;
  font-size: 13px;
  color: var(--qyl-text-3);
}

.quick {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preset {
  padding: 5px 12px;
  border-radius: 999px;
  background: var(--qyl-surface-2);
  color: var(--qyl-text-2);
  font-size: 12.5px;
}

.preset.on {
  background: var(--qyl-primary-soft);
  color: var(--qyl-primary);
  font-weight: 600;
}

.date-input {
  padding: 8px 10px;
  border: 1px solid var(--qyl-line);
  border-radius: var(--qyl-radius-sm);
  background: var(--qyl-surface-2);
  font-size: 14px;
  color: var(--qyl-text);
  outline: none;
}

.meta {
  font-size: 12.5px;
  color: var(--qyl-text-3);
}

.note {
  width: 100%;
  min-height: 92px;
  padding: 12px;
  border: 1px solid var(--qyl-line);
  border-radius: var(--qyl-radius-sm);
  background: var(--qyl-surface-2);
  font-size: 14.5px;
  line-height: 1.7;
  resize: vertical;
  outline: none;
}

.save {
  width: 100%;
  padding: 14px;
  border-radius: var(--qyl-radius-sm);
  background: var(--qyl-primary);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}
</style>
