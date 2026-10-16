<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { closeReviewEditor, showToast, ui } from '@/composables/useUi'
import {
  createReviewDraft,
  hardDeleteReview,
  isReviewEmpty,
  persistReview,
  removeReview,
  reviewState,
} from '@/composables/useReviews'
import type { Review } from '@/utils/db'
import { todayKey, weekdayCN } from '@/utils/date'
import { getDayInfo } from '@/utils/lunar'
import { renderMarkdown } from '@/utils/markdown'
import { t } from '@/composables/useI18n'
import WheelPicker from '@/components/WheelPicker.vue'

const draft = reactive<Review>(createReviewDraft(todayKey()))
const hasSaved = ref(false)
const showPreview = ref(false)
const saveState = ref<'idle' | 'saving' | 'saved'>('idle')
const savedAt = ref<number>(0)

let initialized = false
let saveTimer: number | undefined
let statusTimer: number | undefined

const dateInfo = computed(() => getDayInfo(draft.date))
const previewHtml = computed(() => renderMarkdown(draft.content))
const isEmpty = computed(() => isReviewEmpty(draft))
const savedTimeText = computed(() => {
  if (saveState.value === 'saving') return t('diary.saving')
  if (saveState.value === 'saved') {
    const d = new Date(savedAt.value)
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    return t('diary.savedAt', { time })
  }
  return ''
})

/** 快捷周期：每天 = 1 天，每周 = 7 天，每月 = 30 天 */
function setDays(n: number) {
  draft.days = n
}

/** 滚轮选择器松手后把天数写进去 */
function onPickerDays(n: number) {
  draft.days = n
}

/* --------------------------- 打开 / 关闭 --------------------------- */

function initDraft() {
  initialized = false
  showPreview.value = false
  saveState.value = 'idle'

  const src = ui.reviewEditingId ? reviewState.list.find((r) => r.id === ui.reviewEditingId) : undefined
  if (src) {
    hasSaved.value = true
    draft.id = src.id
    draft.date = src.date
    draft.days = src.days
    draft.content = src.content
    draft.createdAt = src.createdAt
    draft.updatedAt = src.updatedAt
    draft.deletedAt = src.deletedAt
  } else {
    hasSaved.value = false
    Object.assign(draft, createReviewDraft(ui.reviewEditingDate || todayKey()))
  }
  requestAnimationFrame(() => {
    initialized = true
  })
}

watch(
  () => ui.reviewEditorOpen,
  (open) => {
    if (open) initDraft()
  },
)

watch(
  () => [ui.reviewEditingId, ui.reviewEditingDate],
  () => {
    if (ui.reviewEditorOpen) initDraft()
  },
)

/* --------------------------- 自动保存 --------------------------- */

watch(
  draft,
  () => {
    if (!initialized) return
    scheduleSave()
  },
  { deep: true },
)

function scheduleSave() {
  saveState.value = 'saving'
  if (saveTimer) window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    void doSave()
  }, 650)
}

async function doSave(silent = true) {
  if (isReviewEmpty(draft)) {
    if (hasSaved.value) {
      // 空草稿清理：彻底删除，不进回收站
      await hardDeleteReview(draft.id)
      hasSaved.value = false
      saveState.value = 'idle'
    }
    return
  }
  await persistReview(draft)
  hasSaved.value = true
  savedAt.value = Date.now()
  saveState.value = 'saved'
  if (statusTimer) window.clearTimeout(statusTimer)
  statusTimer = window.setTimeout(() => {
    if (saveState.value === 'saved') saveState.value = 'idle'
  }, 2600)
  if (!silent) showToast(t('review.saved'))
}

async function finish() {
  if (saveTimer) window.clearTimeout(saveTimer)
  if (!isReviewEmpty(draft)) await doSave()
  closeReviewEditor()
  if (hasSaved.value) showToast(t('toast.reviewSaved'))
  else showToast(t('toast.reviewEmpty'))
}

async function onDelete() {
  if (!hasSaved.value) {
    closeReviewEditor()
    return
  }
  if (!window.confirm(t('confirm.reviewDelete'))) return
  await removeReview(draft.id)
  hasSaved.value = false
  closeReviewEditor()
  showToast(t('toast.reviewDeleted'))
}
</script>

<template>
  <Transition name="sheet">
    <div v-if="ui.reviewEditorOpen" class="review-sheet">
      <div class="panel">
        <header class="head">
          <button class="icon-btn" :title="t('common.close')" @click="finish">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 5.5l-7 6.5 7 6.5" />
            </svg>
          </button>
          <div class="head-title">
            <b>{{ hasSaved ? t('review.edit') : t('review.new') }}</b>
            <small v-if="savedTimeText">{{ savedTimeText }}</small>
            <small v-else>{{ t('diary.autoSaveHint') }}</small>
          </div>
          <span class="icon-btn ghost"></span>
        </header>

        <div class="body">
          <div class="date-row">
            <input v-model="draft.date" type="date" class="date-input" />
            <span class="date-meta">{{ weekdayCN(draft.date) }} · {{ dateInfo.lunarMonthDay }}</span>
          </div>

          <div class="days-block">
            <span class="lbl">{{ t('review.period') }}</span>
            <div class="days-row">
              <button class="quick" :class="{ on: draft.days === 1 }" @click="setDays(1)">
                {{ t('review.daily') }}
              </button>
              <button class="quick" :class="{ on: draft.days === 7 }" @click="setDays(7)">
                {{ t('review.weekly') }}
              </button>
              <button class="quick" :class="{ on: draft.days === 30 }" @click="setDays(30)">
                {{ t('review.monthly') }}
              </button>
            </div>
            <div class="days-picker-wrap">
              <WheelPicker
                :model-value="draft.days"
                :max="3650"
                :unit="t('review.daysUnit')"
                @update:model-value="onPickerDays"
              />
            </div>
          </div>

          <div class="content-head">
            <span class="lbl">{{ t('review.body') }}</span>
            <div class="toggle">
              <button :class="{ on: !showPreview }" @click="showPreview = false">{{ t('diary.editTab') }}</button>
              <button :class="{ on: showPreview }" @click="showPreview = true">{{ t('diary.previewTab') }}</button>
            </div>
          </div>

          <textarea
            v-if="!showPreview"
            v-model="draft.content"
            class="editor"
            :placeholder="t('review.contentPh')"
          ></textarea>
          <div v-else class="preview markdown-body">
            <p v-if="!draft.content.trim()" class="preview-empty">{{ t('diary.previewEmpty') }}</p>
            <div v-else v-html="previewHtml"></div>
          </div>

          <div class="foot">
            <button v-if="hasSaved" class="danger" @click="onDelete">{{ t('common.delete') }}</button>
            <button class="save" @click="finish">{{ isEmpty ? t('common.close') : t('review.saveClose') }}</button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.review-sheet {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: var(--qyl-overlay);
  display: flex;
  align-items: flex-end;
}

.panel {
  width: 100%;
  max-width: var(--qyl-max-width);
  margin: 0 auto;
  height: 88dvh;
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

.ghost {
  pointer-events: none;
}

.body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px calc(18px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.date-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.date-input {
  flex: none;
  padding: 8px 10px;
  border: 1px solid var(--qyl-line);
  border-radius: var(--qyl-radius-sm);
  background: var(--qyl-surface-2);
  font-size: 14px;
  color: var(--qyl-text);
}

.date-meta {
  font-size: 12.5px;
  color: var(--qyl-text-3);
}

.lbl {
  font-size: 12.5px;
  color: var(--qyl-text-3);
}

.days-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.days-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.quick {
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  background: var(--qyl-surface-2);
  color: var(--qyl-text-2);
  font-size: 13px;
  font-weight: 600;
}

.quick.on {
  background: var(--qyl-review-soft);
  color: var(--qyl-review);
}

.days-input-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
}

.days-picker-wrap {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

.days-picker-wrap :deep(.wheel-picker) {
  background: var(--qyl-surface-2);
  border-radius: 14px;
}

.content-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 2px;
}

.toggle {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: var(--qyl-surface-2);
}

.toggle button {
  padding: 4px 14px;
  border-radius: 999px;
  font-size: 12.5px;
  color: var(--qyl-text-2);
}

.toggle button.on {
  background: var(--qyl-surface);
  color: var(--qyl-review);
  font-weight: 600;
  box-shadow: var(--qyl-shadow);
}

.editor {
  width: 100%;
  min-height: 240px;
  padding: 12px;
  border: 1px solid var(--qyl-line);
  border-radius: var(--qyl-radius-sm);
  background: var(--qyl-surface-2);
  font-size: 15px;
  line-height: 1.75;
  resize: vertical;
  outline: none;
}

.preview {
  min-height: 240px;
  padding: 12px 14px;
  border: 1px solid var(--qyl-line);
  border-radius: var(--qyl-radius-sm);
  background: var(--qyl-surface-2);
}

.preview-empty {
  margin: 0;
  color: var(--qyl-text-3);
  font-size: 14px;
}

.foot {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.foot button {
  padding: 14px;
  border-radius: var(--qyl-radius-sm);
  font-size: 15px;
  font-weight: 600;
}

.danger {
  flex: none;
  padding-left: 22px !important;
  padding-right: 22px !important;
  background: var(--qyl-accent-soft);
  color: var(--qyl-accent);
}

.save {
  flex: 1;
  background: var(--qyl-review);
  color: #fff;
}
</style>
