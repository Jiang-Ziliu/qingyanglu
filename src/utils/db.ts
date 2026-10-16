/**
 * 青阳录 · 本地存储层（IndexedDB）
 * - 日记正文与元数据存在 diaries 表
 * - 日程事件存在 events 表
 * - 待办存在 todos 表
 * - 复盘存在 reviews 表
 * - 附件（图片/音频/视频/文件）以 Blob 存在 attachments 表，日记里只存元数据
 * - 预留 deletedAt 字段，供第 6 步「回收站」使用
 */

export interface AttachmentMeta {
  id: string
  /** 原始文件名 */
  name: string
  /** MIME 类型，如 image/png */
  type: string
  /** 字节数 */
  size: number
  createdAt: number
}

export interface Diary {
  id: string
  /** YYYY-MM-DD，允许写未来的日期 */
  date: string
  title: string
  /** Markdown 正文 */
  content: string
  /** 心情标识（emoji 字符），空字符串表示未选 */
  mood: string
  tags: string[]
  favorite: boolean
  attachments: AttachmentMeta[]
  createdAt: number
  updatedAt: number
  /** 软删除时间戳；null 表示未删除 */
  deletedAt: number | null
}

/** 一条日程事件 */
export interface CalendarEvent {
  id: string
  title: string
  /** YYYY-MM-DD，事件所在的那一天 */
  date: string
  /** 全天事件（没有具体时间） */
  allDay: boolean
  /** HH:mm；全天事件为空字符串 */
  startTime: string
  /** HH:mm；可不填 */
  endTime: string
  note: string
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}

/** 一条待办 */
export interface Todo {
  id: string
  title: string
  note: string
  /** YYYY-MM-DD；空字符串表示「没定哪天」 */
  due: string
  done: boolean
  /** 完成时间戳；null 表示未完成 */
  doneAt: number | null
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}

/** 一条生日提醒（每年重复） */
export interface Birthday {
  id: string
  name: string
  /** 月份 1-12（type 为 lunar 时指农历月） */
  month: number
  /** 日 1-31（农历 1-30，当天不存在时自动按当月最后一天算） */
  day: number
  /** 出生年份；null 表示不知道，不显示岁数 */
  birthYear: number | null
  /** solar = 公历生日，lunar = 农历生日 */
  type: 'solar' | 'lunar'
  note: string
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}

/** 一条复盘（可以覆盖若干天，如 7 天 / 30 天） */
export interface Review {
  id: string
  /** YYYY-MM-DD，复盘写在（归属）的那一天 */
  date: string
  /** 本次复盘覆盖的天数，例如 7 表示「每周复盘」 */
  days: number
  /** Markdown 正文 */
  content: string
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}

const DB_NAME = 'qingyanglu'
const DB_VERSION = 4
const STORE_DIARIES = 'diaries'
const STORE_ATTACHMENTS = 'attachments'
const STORE_EVENTS = 'events'
const STORE_TODOS = 'todos'
const STORE_BIRTHDAYS = 'birthdays'
const STORE_REVIEWS = 'reviews'

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_DIARIES)) {
        const store = db.createObjectStore(STORE_DIARIES, { keyPath: 'id' })
        store.createIndex('date', 'date', { unique: false })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_ATTACHMENTS)) {
        db.createObjectStore(STORE_ATTACHMENTS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_EVENTS)) {
        const store = db.createObjectStore(STORE_EVENTS, { keyPath: 'id' })
        store.createIndex('date', 'date', { unique: false })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_TODOS)) {
        const store = db.createObjectStore(STORE_TODOS, { keyPath: 'id' })
        store.createIndex('due', 'due', { unique: false })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_BIRTHDAYS)) {
        const store = db.createObjectStore(STORE_BIRTHDAYS, { keyPath: 'id' })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_REVIEWS)) {
        const store = db.createObjectStore(STORE_REVIEWS, { keyPath: 'id' })
        store.createIndex('date', 'date', { unique: false })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(store, mode)
        const request = run(transaction.objectStore(store))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      }),
  )
}

/* ------------------------------ 日记 ------------------------------ */

export async function getAllDiaries(): Promise<Diary[]> {
  const all = await tx<Diary[]>(STORE_DIARIES, 'readonly', (s) => s.getAll())
  return all ?? []
}

export async function getDiary(id: string): Promise<Diary | undefined> {
  return tx<Diary | undefined>(STORE_DIARIES, 'readonly', (s) => s.get(id))
}

export async function putDiary(diary: Diary): Promise<void> {
  await tx(STORE_DIARIES, 'readwrite', (s) => s.put(diary))
}

/** 彻底删除日记，连同它的附件 */
export async function deleteDiaryCompletely(diary: Diary): Promise<void> {
  for (const a of diary.attachments) {
    await deleteAttachment(a.id)
  }
  await tx(STORE_DIARIES, 'readwrite', (s) => s.delete(diary.id))
}

/* ------------------------------ 附件 ------------------------------ */

interface AttachmentRecord {
  id: string
  blob: Blob
}

export async function putAttachment(id: string, blob: Blob): Promise<void> {
  await tx(STORE_ATTACHMENTS, 'readwrite', (s) => s.put({ id, blob } satisfies AttachmentRecord))
}

export async function getAttachmentBlob(id: string): Promise<Blob | undefined> {
  const rec = await tx<AttachmentRecord | undefined>(STORE_ATTACHMENTS, 'readonly', (s) => s.get(id))
  return rec?.blob
}

/** 删除时兼容调用方只传 id */
export async function deleteAttachment(id: string): Promise<void> {
  await tx(STORE_ATTACHMENTS, 'readwrite', (s) => s.delete(id))
}

/* ------------------------------ 日程事件 ------------------------------ */

export async function getAllEvents(): Promise<CalendarEvent[]> {
  const all = await tx<CalendarEvent[]>(STORE_EVENTS, 'readonly', (s) => s.getAll())
  return all ?? []
}

export async function putEvent(event: CalendarEvent): Promise<void> {
  await tx(STORE_EVENTS, 'readwrite', (s) => s.put(event))
}

export async function deleteEvent(id: string): Promise<void> {
  await tx(STORE_EVENTS, 'readwrite', (s) => s.delete(id))
}

/* ------------------------------ 待办 ------------------------------ */

export async function getAllTodos(): Promise<Todo[]> {
  const all = await tx<Todo[]>(STORE_TODOS, 'readonly', (s) => s.getAll())
  return all ?? []
}

export async function putTodo(todo: Todo): Promise<void> {
  await tx(STORE_TODOS, 'readwrite', (s) => s.put(todo))
}

export async function deleteTodo(id: string): Promise<void> {
  await tx(STORE_TODOS, 'readwrite', (s) => s.delete(id))
}

/* ------------------------------ 生日 ------------------------------ */

export async function getAllBirthdays(): Promise<Birthday[]> {
  const all = await tx<Birthday[]>(STORE_BIRTHDAYS, 'readonly', (s) => s.getAll())
  return all ?? []
}

export async function putBirthday(birthday: Birthday): Promise<void> {
  await tx(STORE_BIRTHDAYS, 'readwrite', (s) => s.put(birthday))
}

export async function deleteBirthday(id: string): Promise<void> {
  await tx(STORE_BIRTHDAYS, 'readwrite', (s) => s.delete(id))
}

/* ------------------------------ 复盘 ------------------------------ */

export async function getAllReviews(): Promise<Review[]> {
  const all = await tx<Review[]>(STORE_REVIEWS, 'readonly', (s) => s.getAll())
  return all ?? []
}

export async function putReview(review: Review): Promise<void> {
  await tx(STORE_REVIEWS, 'readwrite', (s) => s.put(review))
}

export async function deleteReview(id: string): Promise<void> {
  await tx(STORE_REVIEWS, 'readwrite', (s) => s.delete(id))
}

/* ------------------------------ 回收站 / 备份 ------------------------------ */

export interface TrashItem {
  kind: 'diary' | 'event' | 'todo' | 'birthday' | 'review'
  id: string
  title: string
  subtitle: string
  deletedAt: number
  raw: Diary | CalendarEvent | Todo | Birthday | Review
}

function fmtDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 收集所有进了回收站（deletedAt 不为空）的项目 */
export async function collectTrash(): Promise<TrashItem[]> {
  const [diaries, events, todos, birthdays, reviews] = await Promise.all([
    getAllDiaries(),
    getAllEvents(),
    getAllTodos(),
    getAllBirthdays(),
    getAllReviews(),
  ])
  const out: TrashItem[] = []
  for (const d of diaries) {
    if (!d.deletedAt) continue
    out.push({
      kind: 'diary',
      id: d.id,
      title: d.title || '无标题日记',
      subtitle: `${fmtDate(d.date)} · ${d.attachments.length ? d.attachments.length + ' 个附件' : '纯文字'}`,
      deletedAt: d.deletedAt,
      raw: d,
    })
  }
  for (const e of events) {
    if (!e.deletedAt) continue
    out.push({ kind: 'event', id: e.id, title: e.title, subtitle: fmtDate(e.date), deletedAt: e.deletedAt, raw: e })
  }
  for (const t of todos) {
    if (!t.deletedAt) continue
    out.push({ kind: 'todo', id: t.id, title: t.title, subtitle: t.due ? fmtDate(t.due) : '没定日期', deletedAt: t.deletedAt, raw: t })
  }
  for (const b of birthdays) {
    if (!b.deletedAt) continue
    out.push({ kind: 'birthday', id: b.id, title: b.name, subtitle: `${b.type === 'lunar' ? '农历' : '公历'}生日`, deletedAt: b.deletedAt, raw: b })
  }
  for (const r of reviews) {
    if (!r.deletedAt) continue
    out.push({
      kind: 'review',
      id: r.id,
      title: reviewTitle(r),
      subtitle: `${fmtDate(r.date)} · 近 ${r.days} 天`,
      deletedAt: r.deletedAt,
      raw: r,
    })
  }
  return out.sort((a, b) => b.deletedAt - a.deletedAt)
}

/** 复盘在列表/回收站里的显示名（取正文首行，没有就兜底） */
export function reviewTitle(review: Review): string {
  const first = review.content.split('\n').map((s) => s.trim()).find((s) => s.length > 0)
  if (!first) return '复盘'
  return first.replace(/^#+\s*/, '').slice(0, 30)
}

/** 清掉回收站里超过 days 天的项目，返回清除条数 */
export async function purgeExpiredTrash(days = 30): Promise<number> {
  const trash = await collectTrash()
  const cutoff = Date.now() - days * 86400000
  let n = 0
  for (const item of trash) {
    if (item.deletedAt >= cutoff) continue
    if (item.kind === 'diary') await deleteDiaryCompletely(item.raw as Diary)
    else if (item.kind === 'event') await deleteEvent(item.id)
    else if (item.kind === 'todo') await deleteTodo(item.id)
    else if (item.kind === 'review') await deleteReview(item.id)
    else await deleteBirthday(item.id)
    n++
  }
  return n
}

/** 清空全部数据（日记、日程、待办、生日、复盘、附件），不可恢复 */
export async function wipeAllData(): Promise<void> {
  await openDB().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const names = [STORE_DIARIES, STORE_ATTACHMENTS, STORE_EVENTS, STORE_TODOS, STORE_BIRTHDAYS, STORE_REVIEWS]
        const transaction = db.transaction(names, 'readwrite')
        for (const name of names) transaction.objectStore(name).clear()
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      }),
  )
}

/* ------------------------------ 其它 ------------------------------ */

/** 估算本地占用（MB），用于第 6 步的数据页 */
export async function estimateUsage(): Promise<{ usedMB: number; quotaMB: number } | null> {
  if (!navigator.storage?.estimate) return null
  const { usage = 0, quota = 0 } = await navigator.storage.estimate()
  return { usedMB: usage / 1048576, quotaMB: quota / 1048576 }
}
