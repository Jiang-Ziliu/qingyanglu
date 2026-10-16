import { computed, reactive } from 'vue'
import { deleteReview, getAllReviews, putReview, type Review } from '@/utils/db'
import { genId } from '@/utils/id'

export const reviewState = reactive({
  ready: false,
  list: [] as Review[],
})

export async function loadReviews(): Promise<void> {
  try {
    const all = await getAllReviews()
    reviewState.list = all.filter((r) => !r.deletedAt)
  } catch (err) {
    console.error('[青阳录] 读取复盘失败', err)
    reviewState.list = []
  }
  reviewState.ready = true
}

/** 日期 -> 当天的复盘（按更新时间倒序） */
export const reviewsByDate = computed(() => {
  const map: Record<string, Review[]> = {}
  for (const r of reviewState.list) {
    if (!map[r.date]) map[r.date] = []
    map[r.date].push(r)
  }
  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => b.updatedAt - a.updatedAt)
  }
  return map
})

/** 日历圆点标记：有复盘的日期显示一个专属色圆点 */
export const reviewMarks = computed(() => {
  const marks: Record<string, string[]> = {}
  for (const r of reviewState.list) marks[r.date] = ['var(--qyl-review)']
  return marks
})

export function reviewsOf(date: string): Review[] {
  return reviewsByDate.value[date] ?? []
}

export function createReviewDraft(date: string, days = 7): Review {
  const now = Date.now()
  return {
    id: genId(),
    date,
    days,
    content: '',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
}

/** 判断一条复盘是否「什么都没写」 */
export function isReviewEmpty(r: Review): boolean {
  return !r.content.trim()
}

export async function persistReview(review: Review): Promise<void> {
  // 与日记同理：不改传入对象，避免触发深度监听导致自动保存死循环
  const stored: Review = { ...review, updatedAt: Date.now() }
  try {
    await putReview(stored)
  } catch (err) {
    console.error('[青阳录] 保存复盘失败', err)
    return
  }
  const i = reviewState.list.findIndex((r) => r.id === stored.id)
  if (i >= 0) reviewState.list[i] = stored
  else reviewState.list.push(stored)
}

/** 用户删除复盘：进回收站（软删除） */
export async function removeReview(id: string): Promise<void> {
  const r = reviewState.list.find((x) => x.id === id)
  if (r) {
    const trashed: Review = { ...r, deletedAt: Date.now() }
    try {
      await putReview(trashed)
    } catch (err) {
      console.error('[青阳录] 复盘移入回收站失败', err)
      return
    }
  }
  reviewState.list = reviewState.list.filter((x) => x.id !== id)
}

/** 彻底删除（空草稿清理用，不进回收站） */
export async function hardDeleteReview(id: string): Promise<void> {
  try {
    await deleteReview(id)
  } catch (err) {
    console.error('[青阳录] 删除复盘失败', err)
  }
  reviewState.list = reviewState.list.filter((x) => x.id !== id)
}

/** 复盘的第一行摘要，用于列表 / 日历标注 */
export function reviewSummary(r: Review): string {
  const first = r.content.split('\n').map((s) => s.trim()).find((s) => s.length > 0)
  return first ? first.replace(/^#+\s*/, '') : ''
}
