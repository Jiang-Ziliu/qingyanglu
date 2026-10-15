<script setup lang="ts">
import { computed } from 'vue'
import { ui, closeCreateSheet, openBirthdayEditor, openDiaryEditor, openEventEditor, openTodoEditor } from '@/composables/useUi'
import { calendar } from '@/composables/useCalendar'
import { todayKey } from '@/utils/date'
import { t } from '@/composables/useI18n'

const actions = computed(() => [
  { key: 'diary', label: t('quick.diary'), desc: t('quick.diaryDesc'), icon: 'M6 3.5h12v17H6z|M9 8h6|M9 12h6|M9 16h3' },
  { key: 'event', label: t('quick.event'), desc: t('quick.eventDesc'), icon: 'M4.5 6.5h15v13h-15z|M4.5 10.5h15|M8.5 3.5v4|M15.5 3.5v4' },
  { key: 'todo', label: t('quick.todo'), desc: t('quick.todoDesc'), icon: 'M12 3.5a8.5 8.5 0 110 17 8.5 8.5 0 010-17z|M8.4 12.3l2.4 2.4 4.8-5' },
  { key: 'birthday', label: t('quick.birthday'), desc: t('quick.birthdayDesc'), icon: 'M5 19.5h14|M7 19.5v-5.5a2.5 2.5 0 012.5-2.5h5a2.5 2.5 0 012.5 2.5v5.5|M12 11.5V9.3|M12 7.6a1.05 1.05 0 110-2.1 1.05 1.05 0 010 2.1z' },
])

function pick(key: string) {
  closeCreateSheet()
  const date = calendar.selected
  if (key === 'diary') {
    openDiaryEditor({ date })
    return
  }
  if (key === 'event') {
    openEventEditor({ date })
    return
  }
  if (key === 'birthday') {
    openBirthdayEditor()
    return
  }
  // 待办：如果选中的那天不是今天，就默认定在那天，否则不定日期
  openTodoEditor({ due: date === todayKey() ? '' : date })
}
</script>

<template>
  <Transition name="sheet">
    <div v-if="ui.createSheetOpen" class="sheet" @click.self="closeCreateSheet">
      <div class="sheet-panel">
        <div class="grip"></div>
        <p class="sheet-title">{{ t('quick.title') }}</p>
        <button v-for="a in actions" :key="a.key" class="action" @click="pick(a.key)">
          <span class="ico">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path v-for="(d, i) in a.icon.split('|')" :key="i" :d="d" />
            </svg>
          </span>
          <span class="txt">
            <b>{{ a.label }}</b>
            <small>{{ a.desc }}</small>
          </span>
        </button>
        <button class="cancel" @click="closeCreateSheet">{{ t('common.cancel') }}</button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.sheet {
  position: fixed;
  inset: 0;
  z-index: 70;
  background: var(--qyl-overlay);
  display: flex;
  align-items: flex-end;
}

.sheet-panel {
  width: 100%;
  max-width: var(--qyl-max-width);
  margin: 0 auto;
  background: var(--qyl-surface);
  border-radius: var(--qyl-radius-lg) var(--qyl-radius-lg) 0 0;
  padding: 10px 16px calc(18px + env(safe-area-inset-bottom));
}

.grip {
  width: 38px;
  height: 4px;
  border-radius: 999px;
  background: var(--qyl-line);
  margin: 4px auto 10px;
}

.sheet-title {
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--qyl-text-3);
  text-align: center;
}

.action {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 6px;
  border-radius: var(--qyl-radius-sm);
  text-align: left;
}

.action:active {
  background: var(--qyl-surface-2);
}

.ico {
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 12px;
  background: var(--qyl-primary-soft);
  color: var(--qyl-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.txt b {
  display: block;
  font-size: 15px;
  font-weight: 600;
}

.txt small {
  color: var(--qyl-text-3);
  font-size: 12.5px;
}

.cancel {
  width: 100%;
  margin-top: 8px;
  padding: 13px;
  border-radius: var(--qyl-radius-sm);
  background: var(--qyl-surface-2);
  color: var(--qyl-text-2);
  font-size: 14.5px;
}
</style>
