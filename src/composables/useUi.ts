import { reactive } from 'vue'

export const ui = reactive({
  /** 右下角「+」弹出的快捷新建面板 */
  createSheetOpen: false,
  /** 右上角「⋯」弹出的显示设置面板 */
  settingsSheetOpen: false,
  /** 日记编辑器（写 / 改日记） */
  diaryEditorOpen: false,
  /** 正在编辑的日记 id；空字符串表示新建 */
  diaryEditingId: '',
  /** 新建日记时落在哪一天 */
  diaryEditingDate: '',
  /** 日程编辑器（新建 / 修改事件） */
  eventEditorOpen: false,
  eventEditingId: '',
  eventEditingDate: '',
  /** 待办编辑器（新建 / 修改待办） */
  todoEditorOpen: false,
  todoEditingId: '',
  todoEditingDate: '',
  /** 生日编辑器（新建 / 修改生日提醒） */
  birthdayEditorOpen: false,
  birthdayEditingId: '',
  /** 复盘编辑器（新建 / 修改复盘） */
  reviewEditorOpen: false,
  reviewEditingId: '',
  /** 新建复盘时落在哪一天 */
  reviewEditingDate: '',
  /** 全局搜索面板 */
  searchOpen: false,
  toast: '',
})

let timer: number | undefined

export function showToast(message: string) {
  ui.toast = message
  if (timer) window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    ui.toast = ''
  }, 2200)
}

export function openCreateSheet() {
  ui.createSheetOpen = true
}

export function closeCreateSheet() {
  ui.createSheetOpen = false
}

export function openSettingsSheet() {
  ui.settingsSheetOpen = true
}

export function closeSettingsSheet() {
  ui.settingsSheetOpen = false
}

/** 打开日记编辑器；传 id 表示改已有日记，否则在 date 这天新建 */
export function openDiaryEditor(options: { id?: string; date: string }) {
  ui.diaryEditingId = options.id ?? ''
  ui.diaryEditingDate = options.date
  ui.diaryEditorOpen = true
}

export function closeDiaryEditor() {
  ui.diaryEditorOpen = false
}

/** 打开日程编辑器；传 id 表示改已有日程，否则在 date 这天新建 */
export function openEventEditor(options: { id?: string; date: string }) {
  ui.eventEditingId = options.id ?? ''
  ui.eventEditingDate = options.date
  ui.eventEditorOpen = true
}

export function closeEventEditor() {
  ui.eventEditorOpen = false
}

/** 打开待办编辑器；传 id 表示改已有待办，否则新建（due 可空） */
export function openTodoEditor(options: { id?: string; due?: string }) {
  ui.todoEditingId = options.id ?? ''
  ui.todoEditingDate = options.due ?? ''
  ui.todoEditorOpen = true
}

export function closeTodoEditor() {
  ui.todoEditorOpen = false
}

/** 打开生日编辑器；传 id 表示改已有生日，否则新建 */
export function openBirthdayEditor(options: { id?: string } = {}) {
  ui.birthdayEditingId = options.id ?? ''
  ui.birthdayEditorOpen = true
}

export function closeBirthdayEditor() {
  ui.birthdayEditorOpen = false
}

/** 打开复盘编辑器；传 id 表示改已有复盘，否则在 date 这天新建 */
export function openReviewEditor(options: { id?: string; date: string }) {
  ui.reviewEditingId = options.id ?? ''
  ui.reviewEditingDate = options.date
  ui.reviewEditorOpen = true
}

export function closeReviewEditor() {
  ui.reviewEditorOpen = false
}

export function openSearch() {
  ui.searchOpen = true
}

export function closeSearch() {
  ui.searchOpen = false
}
