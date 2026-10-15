<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  collectTrash,
  deleteBirthday,
  deleteDiaryCompletely,
  deleteEvent,
  deleteTodo,
  estimateUsage,
  getAllBirthdays,
  getAllDiaries,
  getAllEvents,
  getAllTodos,
  purgeExpiredTrash,
  putBirthday,
  putDiary,
  putEvent,
  putTodo,
  wipeAllData,
  type Birthday,
  type CalendarEvent,
  type Diary,
  type Todo,
  type TrashItem,
} from '@/utils/db'
import { loadBirthdays } from '@/composables/useBirthdays'
import { loadDiaries } from '@/composables/useDiaries'
import { loadEvents } from '@/composables/useEvents'
import { loadTodos } from '@/composables/useTodos'
import { showToast } from '@/composables/useUi'
import { t } from '@/composables/useI18n'
import { formatCN } from '@/utils/date'

const router = useRouter()

/* ------------------------------ 存储占用 ------------------------------ */

const usage = ref<{ usedMB: number; quotaMB: number } | null>(null)
const usagePercent = computed(() => {
  if (!usage.value || !usage.value.quotaMB) return 0
  return Math.min(100, (usage.value.usedMB / usage.value.quotaMB) * 100)
})

function fmtMB(n: number): string {
  if (n >= 1024) return (n / 1024).toFixed(2) + ' GB'
  if (n < 0.01) return '0 MB'
  return n < 1 ? n.toFixed(2) + ' MB' : n.toFixed(1) + ' MB'
}

/* ------------------------------ 备份导出 ------------------------------ */

const exporting = ref(false)

async function exportBackup() {
  if (exporting.value) return
  exporting.value = true
  try {
    const [diaries, events, todos, birthdays] = await Promise.all([
      getAllDiaries(),
      getAllEvents(),
      getAllTodos(),
      getAllBirthdays(),
    ])
    const payload = {
      app: 'qingyanglu',
      schema: 3,
      exportedAt: new Date().toISOString(),
      diaries,
      events,
      todos,
      birthdays,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const d = new Date()
    a.href = url
    a.download = `青阳录备份-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    showToast(t('toast.exportDone', { d: diaries.length, e: events.length, t: todos.length, b: birthdays.length }))
  } catch (err) {
    console.error('[青阳录] 导出备份失败', err)
    showToast(t('err.export'))
  } finally {
    exporting.value = false
  }
}

/* ------------------------------ 备份导入 ------------------------------ */

const fileInput = ref<HTMLInputElement | null>(null)
const importing = ref(false)

function pickImportFile() {
  fileInput.value?.click()
}

async function onImportFile(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // 允许连续选同一个文件
  if (!file || importing.value) return

  let data: unknown
  try {
    data = JSON.parse(await file.text())
  } catch {
    showToast(t('data.badFile'))
    return
  }

  const d = data as Partial<Record<string, unknown>>
  if (d.app !== 'qingyanglu' || !Array.isArray(d.diaries) || !Array.isArray(d.events) || !Array.isArray(d.todos) || !Array.isArray(d.birthdays)) {
    showToast(t('data.notBackup'))
    return
  }

  const diaries = d.diaries as Diary[]
  const events = d.events as CalendarEvent[]
  const todos = d.todos as Todo[]
  const birthdays = d.birthdays as Birthday[]
  const total = diaries.length + events.length + todos.length + birthdays.length
  if (total === 0) {
    showToast(t('data.emptyBackup'))
    return
  }

  const msg = t('data.importConfirm', { d: diaries.length, e: events.length, t: todos.length, b: birthdays.length })
  if (!window.confirm(msg)) return

  importing.value = true
  try {
    for (const x of diaries) await putDiary(x)
    for (const x of events) await putEvent(x)
    for (const x of todos) await putTodo(x)
    for (const x of birthdays) await putBirthday(x)
    await reloadAll()
    await refresh()
    showToast(t('toast.importDone', { n: total }))
  } catch (err) {
    console.error('[青阳录] 导入备份失败', err)
    showToast(t('err.import'))
  } finally {
    importing.value = false
  }
}

/* ------------------------------ 回收站 ------------------------------ */

const KIND_ICONS: Record<TrashItem['kind'], string> = {
  diary: '📝',
  event: '🗓',
  todo: '✓',
  birthday: '🎂',
}

function kindLabel(kind: TrashItem['kind']): string {
  return t(`data.kind.${kind}`)
}

const trash = ref<TrashItem[]>([])
const trashBusy = ref(false)

function daysLeft(ts: number): number {
  const rest = Math.ceil((ts + 30 * 86400000 - Date.now()) / 86400000)
  return Math.max(0, rest)
}

function keyOfTs(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function trashTimeText(ts: number): string {
  return t('data.deletedOn', { date: formatCN(keyOfTs(ts)) })
}

function displayTitle(item: TrashItem): string {
  if (item.kind === 'diary' && !(item.raw as Diary).title) return t('data.untitledDiary')
  return item.title
}

function subText(item: TrashItem): string {
  if (item.kind === 'diary') {
    const d = item.raw as Diary
    const tail = d.attachments.length ? t('data.attachN', { n: d.attachments.length }) : t('data.textOnly')
    return `${formatCN(d.date)} · ${tail}`
  }
  if (item.kind === 'event') return formatCN((item.raw as CalendarEvent).date)
  if (item.kind === 'todo') {
    const td = item.raw as Todo
    return td.due ? formatCN(td.due) : t('todo.notScheduled')
  }
  const b = item.raw as Birthday
  return t('search.bdType', { type: b.type === 'lunar' ? t('common.lunar') : t('common.solar') })
}

async function restoreItem(item: TrashItem) {
  if (trashBusy.value) return
  trashBusy.value = true
  try {
    const restored = { ...(item.raw as Record<string, unknown>), deletedAt: null }
    if (item.kind === 'diary') await putDiary(restored as Diary)
    else if (item.kind === 'event') await putEvent(restored as CalendarEvent)
    else if (item.kind === 'todo') await putTodo(restored as Todo)
    else await putBirthday(restored as Birthday)
    await Promise.all([loadDiaries(), loadEvents(), loadTodos(), loadBirthdays()])
    await refresh()
    showToast(t('toast.trashRestored', { kind: kindLabel(item.kind), title: displayTitle(item) }))
  } catch (err) {
    console.error('[青阳录] 恢复失败', err)
    showToast(t('err.restore'))
  } finally {
    trashBusy.value = false
  }
}

async function destroyItem(item: TrashItem) {
  if (trashBusy.value) return
  if (!window.confirm(t('data.confirmDestroy', { title: displayTitle(item) }))) return
  trashBusy.value = true
  try {
    if (item.kind === 'diary') await deleteDiaryCompletely(item.raw as Diary)
    else if (item.kind === 'event') await deleteEvent(item.id)
    else if (item.kind === 'todo') await deleteTodo(item.id)
    else await deleteBirthday(item.id)
    await refresh()
    showToast(t('toast.destroyed'))
  } catch (err) {
    console.error('[青阳录] 彻底删除失败', err)
    showToast(t('err.destroy'))
  } finally {
    trashBusy.value = false
  }
}

async function emptyTrash() {
  if (trashBusy.value || trash.value.length === 0) return
  if (!window.confirm(t('data.confirmEmpty', { n: trash.value.length }))) return
  trashBusy.value = true
  try {
    for (const item of [...trash.value]) {
      if (item.kind === 'diary') await deleteDiaryCompletely(item.raw as Diary)
      else if (item.kind === 'event') await deleteEvent(item.id)
      else if (item.kind === 'todo') await deleteTodo(item.id)
      else await deleteBirthday(item.id)
    }
    await refresh()
    showToast(t('toast.trashEmptied'))
  } catch (err) {
    console.error('[青阳录] 清空回收站失败', err)
    showToast(t('err.empty'))
  } finally {
    trashBusy.value = false
  }
}

/* ------------------------------ 清空全部 ------------------------------ */

async function wipeEverything() {
  if (!window.confirm(t('data.confirmWipe1'))) return
  if (!window.confirm(t('data.confirmWipe2'))) return
  try {
    await wipeAllData()
    await reloadAll()
    await refresh()
    showToast(t('toast.dataWiped'))
  } catch (err) {
    console.error('[青阳录] 清空数据失败', err)
    showToast(t('err.wipe'))
  }
}

/* ------------------------------ 刷新 ------------------------------ */

async function reloadAll() {
  await Promise.all([loadDiaries(), loadEvents(), loadTodos(), loadBirthdays()])
}

async function refresh() {
  trash.value = await collectTrash()
  usage.value = await estimateUsage()
}

onMounted(async () => {
  const purged = await purgeExpiredTrash(30)
  if (purged > 0) showToast(t('toast.purged', { n: purged }))
  await refresh()
})

function goBack() {
  router.back()
}
</script>

<template>
  <div class="app-shell">
    <header class="page-head">
      <button class="icon-btn back" :title="t('common.back')" @click="goBack">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.5 5.5L8 12l6.5 6.5" />
        </svg>
      </button>
      <div class="head-txt">
        <b>{{ t('data.title') }}</b>
        <small>{{ t('data.subtitle') }}</small>
      </div>
    </header>

    <p class="section-title"><span>{{ t('data.privacy') }}</span></p>
    <div class="card pad">
      <p class="privacy" v-html="t('data.privacyText')"></p>
      <p class="privacy tip">{{ t('data.privacyTip') }}</p>
    </div>

    <p class="section-title"><span>{{ t('data.storage') }}</span></p>
    <div class="card pad">
      <template v-if="usage">
        <div class="usage-row">
          <span class="usage-num">{{ fmtMB(usage.usedMB) }}</span>
          <span class="usage-quota">{{ t('data.quota', { size: fmtMB(usage.quotaMB) }) }}</span>
        </div>
        <div class="usage-bar"><i :style="{ width: usagePercent + '%' }"></i></div>
      </template>
      <p v-else class="muted">{{ t('data.noQuota') }}</p>
    </div>

    <p class="section-title"><span>{{ t('data.backup') }}</span><span>{{ t('data.backupBadge') }}</span></p>
    <div class="card pad">
      <p class="privacy tip">
        {{ t('data.backupDesc') }}
      </p>
      <div class="btn-row">
        <button class="btn primary" :disabled="exporting" @click="exportBackup">
          {{ exporting ? t('data.exporting') : t('data.export') }}
        </button>
        <button class="btn" :disabled="importing" @click="pickImportFile">
          {{ importing ? t('data.importing') : t('data.import') }}
        </button>
      </div>
      <input ref="fileInput" type="file" accept="application/json,.json" hidden @change="onImportFile" />
    </div>

    <p class="section-title">
      <span>{{ t('data.trash') }}</span>
      <span>{{ t('data.trashHead', { n: trash.length }) }}</span>
    </p>
    <div class="card list">
      <div v-if="trash.length === 0" class="empty">
        <span class="big">🗑</span>
        {{ t('data.trashEmpty1') }}<br />
        {{ t('data.trashEmpty2') }}
      </div>

      <div v-for="item in trash" :key="item.kind + item.id" class="trash-row">
        <span class="t-icon">{{ KIND_ICONS[item.kind] }}</span>
        <span class="t-txt">
          <b>{{ displayTitle(item) }}</b>
          <small>{{ kindLabel(item.kind) }} · {{ subText(item) }} · {{ trashTimeText(item.deletedAt) }} · {{ t('data.daysLeft', { n: daysLeft(item.deletedAt) }) }}</small>
        </span>
        <button class="t-btn restore" :disabled="trashBusy" @click="restoreItem(item)">{{ t('data.restore') }}</button>
        <button class="t-btn destroy" :disabled="trashBusy" @click="destroyItem(item)">{{ t('data.destroy') }}</button>
      </div>

      <button v-if="trash.length" class="clear-trash" :disabled="trashBusy" @click="emptyTrash">{{ t('data.emptyTrash') }}</button>
    </div>

    <p class="section-title"><span>{{ t('data.danger') }}</span></p>
    <div class="card pad danger-zone">
      <p class="privacy tip">{{ t('data.dangerDesc') }}</p>
      <button class="btn danger" @click="wipeEverything">{{ t('data.wipe') }}</button>
    </div>
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 0 4px;
}

.back {
  background: var(--qyl-surface);
  border: 1px solid var(--qyl-line);
  border-radius: 12px;
}

.head-txt b {
  display: block;
  font-size: 16px;
}

.head-txt small {
  display: block;
  font-size: 11.5px;
  color: var(--qyl-text-3);
}

.pad {
  padding: 13px 14px;
}

.privacy {
  margin: 0;
  font-size: 13px;
  line-height: 1.9;
  color: var(--qyl-text-2);
}

.privacy b {
  color: var(--qyl-text);
}

.privacy.tip {
  margin-top: 8px;
  font-size: 12.5px;
  color: var(--qyl-text-3);
}

.privacy.tip:only-child,
.pad > .privacy.tip:first-child:last-child {
  margin-top: 0;
}

.muted {
  margin: 0;
  font-size: 13px;
  color: var(--qyl-text-3);
}

.usage-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.usage-num {
  font-size: 21px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.usage-quota {
  font-size: 12px;
  color: var(--qyl-text-3);
}

.usage-bar {
  margin-top: 9px;
  height: 7px;
  border-radius: 999px;
  background: var(--qyl-surface-2);
  overflow: hidden;
}

.usage-bar i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #3fb894, var(--qyl-primary));
  transition: width 0.4s ease;
}

.btn-row {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.btn {
  flex: 1;
  padding: 12px 10px;
  border-radius: var(--qyl-radius-sm);
  background: var(--qyl-surface-2);
  color: var(--qyl-text-2);
  font-size: 14px;
  font-weight: 600;
}

.btn.primary {
  background: var(--qyl-primary);
  color: #fff;
}

.btn.danger {
  width: 100%;
  background: var(--qyl-warn-soft);
  color: var(--qyl-warn);
}

.btn:disabled {
  opacity: 0.55;
}

.list {
  padding: 4px 6px;
}

.trash-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 8px;
}

.trash-row + .trash-row {
  border-top: 1px solid var(--qyl-line);
}

.t-icon {
  flex: none;
  width: 30px;
  text-align: center;
  font-size: 17px;
}

.t-txt {
  flex: 1;
  min-width: 0;
}

.t-txt b {
  display: block;
  font-size: 13.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.t-txt small {
  display: block;
  font-size: 11.5px;
  color: var(--qyl-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.t-btn {
  flex: none;
  padding: 7px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.t-btn.restore {
  background: var(--qyl-primary-soft);
  color: var(--qyl-primary);
}

.t-btn.destroy {
  background: var(--qyl-surface-2);
  color: var(--qyl-text-3);
}

.t-btn:disabled {
  opacity: 0.5;
}

.clear-trash {
  width: calc(100% - 12px);
  margin: 8px 6px 6px;
  padding: 11px;
  border-radius: var(--qyl-radius-sm);
  background: var(--qyl-surface-2);
  color: var(--qyl-text-2);
  font-size: 13.5px;
}

.clear-trash:disabled {
  opacity: 0.5;
}

.danger-zone .btn {
  margin-top: 10px;
}
</style>
