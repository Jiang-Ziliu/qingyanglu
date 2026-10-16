import { onMounted, onUnmounted } from 'vue'
import router from '@/router'
import {
  ui,
  openSearch,
  openCreateSheet,
  closeSearch,
  closeCreateSheet,
  closeSettingsSheet,
  closeDiaryEditor,
  closeEventEditor,
  closeTodoEditor,
  closeBirthdayEditor,
  closeReviewEditor,
} from './useUi'
import { backToToday } from './useCalendar'

/** 光标是否在输入类元素里（打字时不响应字母/数字快捷键） */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

/** 是否有任意弹层开着（z-index 从高到低判断） */
function anyPopupOpen(): boolean {
  return (
    ui.diaryEditorOpen ||
    ui.eventEditorOpen ||
    ui.todoEditorOpen ||
    ui.birthdayEditorOpen ||
    ui.reviewEditorOpen ||
    ui.searchOpen ||
    ui.createSheetOpen ||
    ui.settingsSheetOpen
  )
}

/** 按 z-index 从高到低关掉最上面的弹层；返回是否关掉了一个 */
function closeTopPopup(): boolean {
  if (ui.diaryEditorOpen) {
    closeDiaryEditor()
    return true
  }
  if (ui.eventEditorOpen) {
    closeEventEditor()
    return true
  }
  if (ui.todoEditorOpen) {
    closeTodoEditor()
    return true
  }
  if (ui.birthdayEditorOpen) {
    closeBirthdayEditor()
    return true
  }
  if (ui.reviewEditorOpen) {
    closeReviewEditor()
    return true
  }
  if (ui.searchOpen) {
    closeSearch()
    return true
  }
  if (ui.createSheetOpen) {
    closeCreateSheet()
    return true
  }
  if (ui.settingsSheetOpen) {
    closeSettingsSheet()
    return true
  }
  return false
}

function onKey(e: KeyboardEvent) {
  // Esc：任何时候都只关最上层弹层
  if (e.key === 'Escape') {
    closeTopPopup()
    return
  }

  // Ctrl / ⌘ + K：任何时候都能呼出搜索（含输入框中）
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault()
    openSearch()
    return
  }

  // 输入态下不响应其它单键快捷键
  if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return

  // 有弹层开着时，切页 / 新建 / 回今天都不触发，避免误操作
  if (anyPopupOpen()) return

  switch (e.key) {
    case '1':
      router.push('/schedule')
      break
    case '2':
      router.push('/my-day')
      break
    case '3':
      router.push('/todo')
      break
    case '4':
      router.push('/stats')
      break
    case 'n':
    case 'N':
      openCreateSheet()
      break
    case 't':
    case 'T':
      backToToday()
      break
  }
}

/** 全局键盘快捷键，App.vue 挂载时注册一次 */
export function useShortcuts() {
  onMounted(() => window.addEventListener('keydown', onKey))
  onUnmounted(() => window.removeEventListener('keydown', onKey))
}
