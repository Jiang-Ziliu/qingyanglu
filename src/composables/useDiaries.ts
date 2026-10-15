import { computed, reactive } from 'vue'
import {
  deleteAttachment,
  deleteDiaryCompletely,
  getAllDiaries,
  getAttachmentBlob,
  putAttachment,
  putDiary,
  type AttachmentMeta,
  type Diary,
} from '@/utils/db'
import { genId } from '@/utils/id'

export const diaryState = reactive({
  ready: false,
  list: [] as Diary[],
})

export async function loadDiaries(): Promise<void> {
  try {
    const all = await getAllDiaries()
    diaryState.list = all.filter((d) => !d.deletedAt)
  } catch (err) {
    console.error('[青阳录] 读取日记失败', err)
    diaryState.list = []
  }
  diaryState.ready = true
}

/** 日期 -> 当天的日记（按更新时间倒序） */
export const diariesByDate = computed(() => {
  const map: Record<string, Diary[]> = {}
  for (const d of diaryState.list) {
    if (!map[d.date]) map[d.date] = []
    map[d.date].push(d)
  }
  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => b.updatedAt - a.updatedAt)
  }
  return map
})

/** 日历圆点标记：有日记的日期显示一个主色圆点 */
export const diaryMarks = computed(() => {
  const marks: Record<string, string[]> = {}
  for (const d of diaryState.list) marks[d.date] = ['var(--qyl-primary)']
  return marks
})

export function diariesOf(date: string): Diary[] {
  return diariesByDate.value[date] ?? []
}

export function createDiaryDraft(date: string): Diary {
  const now = Date.now()
  return {
    id: genId(),
    date,
    title: '',
    content: '',
    mood: '',
    tags: [],
    favorite: false,
    attachments: [],
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
}

/** 判断一条日记是否「什么都没写」 */
export function isDiaryEmpty(d: Diary): boolean {
  return !d.title.trim() && !d.content.trim() && !d.mood && d.tags.length === 0 && d.attachments.length === 0
}

export async function persistDiary(diary: Diary): Promise<void> {
  // 注意：不要改传入的 diary（它是编辑器里的响应式草稿），
  // 否则 updatedAt 一改会再次触发「深度监听→自动保存」，形成死循环。
  const stored: Diary = {
    ...diary,
    tags: [...diary.tags],
    attachments: [...diary.attachments],
    updatedAt: Date.now(),
  }
  try {
    await putDiary(stored)
  } catch (err) {
    console.error('[青阳录] 保存日记失败', err)
    return
  }
  const i = diaryState.list.findIndex((d) => d.id === stored.id)
  if (i >= 0) diaryState.list[i] = stored
  else diaryState.list.push(stored)
}

/** 用户删除日记：进回收站（软删除），可在「数据 · 备份 · 回收站」里恢复 */
export async function removeDiary(id: string): Promise<void> {
  const d = diaryState.list.find((x) => x.id === id)
  if (d) {
    const trashed: Diary = { ...d, deletedAt: Date.now() }
    try {
      await putDiary(trashed)
    } catch (err) {
      console.error('[青阳录] 移入回收站失败', err)
      return
    }
  }
  diaryState.list = diaryState.list.filter((x) => x.id !== id)
}

/** 彻底删除（清空草稿这类场景用，不进回收站） */
export async function hardDeleteDiary(id: string): Promise<void> {
  const d = diaryState.list.find((x) => x.id === id)
  if (d) {
    try {
      await deleteDiaryCompletely(d)
    } catch (err) {
      console.error('[青阳录] 删除日记失败', err)
    }
  }
  diaryState.list = diaryState.list.filter((x) => x.id !== id)
}

/** 上传附件：文件本体存 Blob，返回元数据 */
export async function attachFile(diary: Diary, file: File): Promise<AttachmentMeta | null> {
  const id = genId()
  try {
    await putAttachment(id, file)
  } catch (err) {
    console.error('[青阳录] 附件保存失败', err)
    return null
  }
  const meta: AttachmentMeta = {
    id,
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    createdAt: Date.now(),
  }
  diary.attachments.push(meta)
  return meta
}

export async function detachFile(diary: Diary, meta: AttachmentMeta): Promise<void> {
  diary.attachments = diary.attachments.filter((a) => a.id !== meta.id)
  try {
    await deleteAttachment(meta.id)
  } catch (err) {
    console.error('[青阳录] 附件删除失败', err)
  }
}

/** 取附件本体用于预览 / 播放 */
export async function loadAttachmentBlob(id: string): Promise<Blob | undefined> {
  try {
    return await getAttachmentBlob(id)
  } catch (err) {
    console.error('[青阳录] 附件读取失败', err)
    return undefined
  }
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}
