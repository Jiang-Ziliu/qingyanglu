<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { closeDiaryEditor, showToast, ui } from '@/composables/useUi'
import {
  attachFile,
  createDiaryDraft,
  detachFile,
  diaryState,
  formatSize,
  hardDeleteDiary,
  isDiaryEmpty,
  loadAttachmentBlob,
  persistDiary,
  removeDiary,
} from '@/composables/useDiaries'
import type { AttachmentMeta, Diary } from '@/utils/db'
import { todayKey, weekdayCN } from '@/utils/date'
import { getDayInfo } from '@/utils/lunar'
import { renderMarkdown } from '@/utils/markdown'
import { t } from '@/composables/useI18n'

const MOODS = ['😄', '🙂', '😌', '😐', '😔', '😢', '😠', '😴', '🤩', '🥳']

const draft = reactive<Diary>(createDiaryDraft(todayKey()))
const hasSaved = ref(false)
const showPreview = ref(false)
const tagInput = ref('')
const saveState = ref<'idle' | 'saving' | 'saved'>('idle')
const savedAt = ref<number>(0)
const blobUrls = reactive<Record<string, string>>({})
const fileInput = ref<HTMLInputElement | null>(null)

let initialized = false
let saveTimer: number | undefined
let statusTimer: number | undefined

const dateInfo = computed(() => getDayInfo(draft.date))
const previewHtml = computed(() => renderMarkdown(draft.content))
const isEmpty = computed(() => isDiaryEmpty(draft))
const savedTimeText = computed(() => {
  if (saveState.value === 'saving') return t('diary.saving')
  if (saveState.value === 'saved') {
    const d = new Date(savedAt.value)
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    return t('diary.savedAt', { time })
  }
  return ''
})

const images = computed(() => draft.attachments.filter((a) => a.type.startsWith('image/')))
const audios = computed(() => draft.attachments.filter((a) => a.type.startsWith('audio/')))
const videos = computed(() => draft.attachments.filter((a) => a.type.startsWith('video/')))
const files = computed(
  () =>
    draft.attachments.filter(
      (a) => !a.type.startsWith('image/') && !a.type.startsWith('audio/') && !a.type.startsWith('video/'),
    ),
)

/* --------------------------- 打开 / 关闭 --------------------------- */

function initDraft() {
  initialized = false
  cleanupUrls()
  showPreview.value = false
  tagInput.value = ''
  saveState.value = 'idle'

  const src = ui.diaryEditingId ? diaryState.list.find((d) => d.id === ui.diaryEditingId) : undefined
  if (src) {
    hasSaved.value = true
    draft.id = src.id
    draft.date = src.date
    draft.title = src.title
    draft.content = src.content
    draft.mood = src.mood
    draft.tags = [...src.tags]
    draft.favorite = src.favorite
    draft.attachments = src.attachments.map((a) => ({ ...a }))
    draft.createdAt = src.createdAt
    draft.updatedAt = src.updatedAt
    draft.deletedAt = src.deletedAt
  } else {
    hasSaved.value = false
    Object.assign(draft, createDiaryDraft(ui.diaryEditingDate || todayKey()))
  }
  syncBlobUrls()
  requestAnimationFrame(() => {
    initialized = true
  })
}

watch(
  () => ui.diaryEditorOpen,
  (open) => {
    if (open) initDraft()
    else cleanupUrls()
  },
)

watch(
  () => [ui.diaryEditingId, ui.diaryEditingDate],
  () => {
    if (ui.diaryEditorOpen) initDraft()
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
  if (isDiaryEmpty(draft)) {
    if (hasSaved.value) {
      // 空草稿清理：彻底删除，不进回收站
      await hardDeleteDiary(draft.id)
      hasSaved.value = false
      saveState.value = 'idle'
    }
    return
  }
  await persistDiary(draft)
  hasSaved.value = true
  savedAt.value = Date.now()
  saveState.value = 'saved'
  if (statusTimer) window.clearTimeout(statusTimer)
  statusTimer = window.setTimeout(() => {
    if (saveState.value === 'saved') saveState.value = 'idle'
  }, 2600)
  if (!silent) showToast(t('diary.saved'))
}

async function finish() {
  if (saveTimer) window.clearTimeout(saveTimer)
  if (!isDiaryEmpty(draft)) await doSave()
  closeDiaryEditor()
  if (hasSaved.value) showToast(t('toast.diarySaved'))
  else showToast(t('toast.diaryEmpty'))
}

async function onDelete() {
  if (!hasSaved.value) {
    closeDiaryEditor()
    return
  }
  if (!window.confirm(t('confirm.diaryDelete'))) return
  await removeDiary(draft.id)
  hasSaved.value = false
  closeDiaryEditor()
  showToast(t('toast.diaryDeleted'))
}

/* --------------------------- 标签 --------------------------- */

function addTag() {
  const tag = tagInput.value.trim().replace(/^#/, '')
  if (!tag) return
  if (!draft.tags.includes(tag)) draft.tags.push(tag)
  tagInput.value = ''
}

function removeTag(tag: string) {
  draft.tags = draft.tags.filter((x) => x !== tag)
}

/* --------------------------- 附件 --------------------------- */

function pickFiles() {
  fileInput.value?.click()
}

async function onFilesChosen(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  for (const f of files) {
    const meta = await attachFile(draft, f)
    if (meta) {
      const blob = await loadAttachmentBlob(meta.id)
      if (blob) blobUrls[meta.id] = URL.createObjectURL(blob)
    }
  }
  if (files.length) showToast(t('toast.attachAdded', { n: files.length }))
}

async function onRemoveAttachment(meta: AttachmentMeta) {
  if (!window.confirm(t('confirm.attachRemove', { name: meta.name }))) return
  await detachFile(draft, meta)
  if (blobUrls[meta.id]) {
    URL.revokeObjectURL(blobUrls[meta.id])
    delete blobUrls[meta.id]
  }
}

async function syncBlobUrls() {
  for (const a of draft.attachments) {
    if (blobUrls[a.id]) continue
    const blob = await loadAttachmentBlob(a.id)
    if (blob) blobUrls[a.id] = URL.createObjectURL(blob)
  }
}

function cleanupUrls() {
  for (const id of Object.keys(blobUrls)) {
    URL.revokeObjectURL(blobUrls[id])
    delete blobUrls[id]
  }
}
</script>

<template>
  <Transition name="sheet">
    <div v-if="ui.diaryEditorOpen" class="diary-sheet">
      <div class="panel">
        <header class="head">
          <button class="icon-btn" :title="t('common.close')" @click="finish">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 5.5l-7 6.5 7 6.5" />
            </svg>
          </button>
          <div class="head-title">
            <b>{{ hasSaved ? t('diary.edit') : t('diary.write') }}</b>
            <small v-if="savedTimeText">{{ savedTimeText }}</small>
            <small v-else>{{ t('diary.autoSaveHint') }}</small>
          </div>
          <button class="icon-btn star" :class="{ on: draft.favorite }" :title="t('diary.favorite')" @click="draft.favorite = !draft.favorite">
            <svg viewBox="0 0 24 24" width="22" height="22" :fill="draft.favorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
              <path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z" />
            </svg>
          </button>
        </header>

        <div class="body">
          <div class="date-row">
            <input v-model="draft.date" type="date" class="date-input" />
            <span class="date-meta">{{ weekdayCN(draft.date) }} · {{ dateInfo.lunarMonthDay }}</span>
          </div>

          <input v-model="draft.title" class="title-input" :placeholder="t('diary.titlePh')" maxlength="60" />

          <div class="moods">
            <button
              v-for="m in MOODS"
              :key="m"
              class="mood"
              :class="{ on: draft.mood === m }"
              @click="draft.mood = draft.mood === m ? '' : m"
            >
              {{ m }}
            </button>
          </div>

          <div class="tags">
            <span v-for="tag in draft.tags" :key="tag" class="chip primary tag">
              #{{ tag }}
              <button class="tag-x" @click="removeTag(tag)">×</button>
            </span>
            <input
              v-model="tagInput"
              class="tag-input"
              :placeholder="t('diary.tagPh')"
              @keydown.enter.prevent="addTag"
              @keydown.,.prevent="addTag"
              @blur="addTag"
            />
          </div>

          <div class="content-head">
            <span class="lbl">{{ t('diary.body') }}</span>
            <div class="toggle">
              <button :class="{ on: !showPreview }" @click="showPreview = false">{{ t('diary.editTab') }}</button>
              <button :class="{ on: showPreview }" @click="showPreview = true">{{ t('diary.previewTab') }}</button>
            </div>
          </div>

          <textarea
            v-if="!showPreview"
            v-model="draft.content"
            class="editor"
            :placeholder="t('diary.contentPh')"
          ></textarea>
          <div v-else class="preview markdown-body">
            <p v-if="!draft.content.trim()" class="preview-empty">{{ t('diary.previewEmpty') }}</p>
            <div v-else v-html="previewHtml"></div>
          </div>

          <div class="attach-head">
            <span class="lbl">{{ t('diary.attach') }}</span>
            <button class="add-attach" @click="pickFiles">{{ t('diary.addAttach') }}</button>
            <input
              ref="fileInput"
              type="file"
              multiple
              class="hidden-input"
              @change="onFilesChosen"
            />
          </div>

          <p v-if="draft.attachments.length === 0" class="attach-empty">{{ t('diary.attachEmpty') }}</p>

          <div v-if="images.length" class="img-grid">
            <div v-for="a in images" :key="a.id" class="img-cell">
              <img v-if="blobUrls[a.id]" :src="blobUrls[a.id]" :alt="a.name" />
              <div v-else class="img-loading">{{ t('common.loading') }}</div>
              <button class="del" :title="t('diary.remove')" @click="onRemoveAttachment(a)">×</button>
            </div>
          </div>

          <div v-for="a in audios" :key="a.id" class="media-row">
            <div class="media-info">
              <b>{{ a.name }}</b>
              <small>{{ formatSize(a.size) }} · {{ t('diary.audio') }}</small>
            </div>
            <audio v-if="blobUrls[a.id]" :src="blobUrls[a.id]" controls class="media-player"></audio>
            <button class="del-line" @click="onRemoveAttachment(a)">{{ t('diary.remove') }}</button>
          </div>

          <div v-for="a in videos" :key="a.id" class="media-row col">
            <div class="media-info">
              <b>{{ a.name }}</b>
              <small>{{ formatSize(a.size) }} · {{ t('diary.video') }}</small>
            </div>
            <video v-if="blobUrls[a.id]" :src="blobUrls[a.id]" controls class="video-player"></video>
            <button class="del-line" @click="onRemoveAttachment(a)">{{ t('diary.remove') }}</button>
          </div>

          <div v-for="a in files" :key="a.id" class="file-row">
            <span class="file-ico">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M13.5 4.5H7a1.5 1.5 0 00-1.5 1.5v12A1.5 1.5 0 007 19.5h10a1.5 1.5 0 001.5-1.5V9z" />
                <path d="M13.5 4.5V9H18" />
              </svg>
            </span>
            <div class="media-info">
              <b>{{ a.name }}</b>
              <small>{{ formatSize(a.size) }}</small>
            </div>
            <a v-if="blobUrls[a.id]" class="dl" :href="blobUrls[a.id]" :download="a.name">{{ t('diary.download') }}</a>
            <button class="del-line" @click="onRemoveAttachment(a)">{{ t('diary.remove') }}</button>
          </div>

          <div class="foot">
            <button v-if="hasSaved" class="danger" @click="onDelete">{{ t('common.delete') }}</button>
            <button class="save" @click="finish">{{ isEmpty ? t('common.close') : t('diary.saveClose') }}</button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.diary-sheet {
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
  height: 92dvh;
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

.icon-btn.star.on {
  color: var(--qyl-warn);
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

.moods {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.mood {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  font-size: 20px;
  line-height: 1;
  background: var(--qyl-surface-2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, transform 0.15s ease;
}

.mood.on {
  background: var(--qyl-primary-soft);
  box-shadow: inset 0 0 0 1.6px var(--qyl-primary);
  transform: scale(1.04);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.tag {
  gap: 2px;
  padding-right: 4px;
}

.tag-x {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  font-size: 13px;
  line-height: 1;
  color: inherit;
}

.tag-input {
  flex: 1;
  min-width: 90px;
  padding: 6px 2px;
  border: none;
  background: transparent;
  font-size: 13.5px;
  outline: none;
}

.tag-input::placeholder {
  color: var(--qyl-text-3);
}

.content-head,
.attach-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 2px;
}

.lbl {
  font-size: 12.5px;
  color: var(--qyl-text-3);
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
  color: var(--qyl-primary);
  font-weight: 600;
  box-shadow: var(--qyl-shadow);
}

.editor {
  width: 100%;
  min-height: 220px;
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
  min-height: 220px;
  padding: 12px 14px;
  border: 1px solid var(--qyl-line);
  border-radius: var(--qyl-radius-sm);
  background: var(--qyl-surface-2);
}

.preview-empty {
  color: var(--qyl-text-3);
  font-size: 14px;
}

.add-attach {
  padding: 7px 12px;
  border-radius: 999px;
  background: var(--qyl-primary-soft);
  color: var(--qyl-primary);
  font-size: 13px;
  font-weight: 600;
}

.hidden-input {
  display: none;
}

.attach-empty {
  margin: 0;
  font-size: 12.5px;
  color: var(--qyl-text-3);
}

.img-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.img-cell {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: var(--qyl-radius-sm);
  overflow: hidden;
  background: var(--qyl-surface-2);
}

.img-cell img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.img-loading {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--qyl-text-3);
}

.del {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 15px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--qyl-line);
  border-radius: var(--qyl-radius-sm);
}

.media-row.col {
  flex-direction: column;
  align-items: stretch;
}

.media-info {
  flex: 1;
  min-width: 0;
}

.media-info b {
  display: block;
  font-size: 13.5px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.media-info small {
  color: var(--qyl-text-3);
  font-size: 12px;
}

.media-player {
  width: 100%;
  height: 38px;
}

.video-player {
  width: 100%;
  max-height: 260px;
  border-radius: 8px;
  background: #000;
}

.file-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--qyl-line);
  border-radius: var(--qyl-radius-sm);
}

.file-ico {
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--qyl-surface-2);
  color: var(--qyl-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dl {
  flex: none;
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--qyl-surface-2);
  color: var(--qyl-primary);
  font-size: 12.5px;
  text-decoration: none;
}

.del-line {
  flex: none;
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--qyl-accent-soft);
  color: var(--qyl-accent);
  font-size: 12.5px;
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
  background: var(--qyl-primary);
  color: #fff;
}

.preview-empty {
  margin: 0;
}
</style>

<style>
/* Markdown 预览样式（非 scoped，作用于 v-html 内容） */
.markdown-body {
  font-size: 15px;
  line-height: 1.75;
  color: var(--qyl-text);
  word-break: break-word;
}

.markdown-body h1,
.markdown-body h2,
.markdown-body h3 {
  margin: 14px 0 8px;
  line-height: 1.4;
}

.markdown-body h1 {
  font-size: 20px;
}

.markdown-body h2 {
  font-size: 17px;
}

.markdown-body h3 {
  font-size: 15.5px;
}

.markdown-body p {
  margin: 8px 0;
}

.markdown-body ul,
.markdown-body ol {
  margin: 8px 0;
  padding-left: 22px;
}

.markdown-body blockquote {
  margin: 10px 0;
  padding: 4px 12px;
  border-left: 3px solid var(--qyl-primary);
  background: var(--qyl-primary-soft);
  color: var(--qyl-text-2);
  border-radius: 0 8px 8px 0;
}

.markdown-body code {
  padding: 1px 5px;
  border-radius: 5px;
  background: var(--qyl-surface-2);
  font-size: 0.92em;
}

.markdown-body pre {
  margin: 10px 0;
  padding: 12px;
  border-radius: 8px;
  background: var(--qyl-surface-2);
  overflow-x: auto;
}

.markdown-body pre code {
  padding: 0;
  background: none;
}

.markdown-body img {
  max-width: 100%;
  border-radius: 8px;
}

.markdown-body a {
  color: var(--qyl-primary);
}

.markdown-body hr {
  border: none;
  border-top: 1px solid var(--qyl-line);
  margin: 14px 0;
}

.markdown-body table {
  border-collapse: collapse;
  width: 100%;
  margin: 10px 0;
}

.markdown-body th,
.markdown-body td {
  border: 1px solid var(--qyl-line);
  padding: 6px 8px;
  font-size: 13.5px;
}
</style>
