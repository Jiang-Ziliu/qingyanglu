import { computed, reactive } from 'vue'
import { getAllBirthdays, putBirthday, type Birthday } from '@/utils/db'
import { genId } from '@/utils/id'
import { Lunar, LunarYear } from 'lunar-typescript'
import { parseKey, todayKey } from '@/utils/date'

export const birthdayState = reactive({
  ready: false,
  list: [] as Birthday[],
})

export async function loadBirthdays(): Promise<void> {
  try {
    const all = await getAllBirthdays()
    birthdayState.list = all.filter((b) => !b.deletedAt)
  } catch (err) {
    console.error('[青阳录] 读取生日失败', err)
    birthdayState.list = []
  }
  birthdayState.ready = true
}

export function createBirthdayDraft(): Birthday {
  const now = Date.now()
  return {
    id: genId(),
    name: '',
    month: 1,
    day: 1,
    birthYear: null,
    type: 'solar',
    note: '',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
}

/* ------------------------- 农历 ↔ 公历换算 ------------------------- */

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function solarToKey(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`
}

/**
 * 农历月日 → 某农历年份对应的公历日期。
 * 当天不存在（如小月的三十）时自动按当月最后一天算；闰月一律按同数字的平月算。
 */
export function lunarToSolarKey(lunarYear: number, month: number, day: number): string | null {
  try {
    const lm = LunarYear.fromYear(lunarYear).getMonth(month)
    if (!lm) return null
    const d = Math.min(Math.max(1, day), lm.getDayCount())
    const solar = Lunar.fromYmd(lunarYear, month, d).getSolar()
    return solarToKey(solar.getYear(), solar.getMonth(), solar.getDay())
  } catch {
    return null
  }
}

/** 生日在某公历年里的那一天；null 表示换算不出来 */
export function birthdayDateInYear(b: Birthday, year: number): string | null {
  if (b.type === 'solar') {
    // 公历 2 月 29 日：平年顺延按 2 月 28 日算
    const dim = new Date(year, b.month, 0).getDate()
    if (b.day > dim) return solarToKey(year, b.month, dim)
    return solarToKey(year, b.month, b.day)
  }
  // 农历生日：腊月可能落在公历次年初，所以公历 year 要看农历 year 和 year-1 两次换算
  const out: string[] = []
  for (const ly of [year - 1, year]) {
    const key = lunarToSolarKey(ly, b.month, b.day)
    if (key && key.startsWith(String(year) + '-')) out.push(key)
  }
  return out.length ? out[0] : null
}

/* ------------------------- 查询与展示 ------------------------- */

export interface BirthdayHit {
  b: Birthday
  /** 具体那天的公历日期 YYYY-MM-DD */
  date: string
  /** 到那天还要多少天；0 = 就是今天 */
  daysUntil: number
  /** 那天满几岁；不知道出生年份则为 null */
  age: number | null
}

function hitFor(b: Birthday, date: string, from: string): BirthdayHit {
  return {
    b,
    date,
    daysUntil: Math.round((parseKey(date).getTime() - parseKey(from).getTime()) / 86400000),
    age: b.birthYear ? parseKey(date).getFullYear() - b.birthYear : null,
  }
}

/** 下一次生日（从 from 起，含今天） */
export function nextBirthday(b: Birthday, from = todayKey()): BirthdayHit | null {
  const y = parseKey(from).getFullYear()
  for (let dy = 0; dy <= 2; dy++) {
    const date = birthdayDateInYear(b, y + dy)
    if (date && date >= from) return hitFor(b, date, from)
  }
  return null
}

/** 某天的生日（可能多条，比如同一天两个人） */
export function birthdaysOn(key: string): BirthdayHit[] {
  const y = parseKey(key).getFullYear()
  const out: BirthdayHit[] = []
  for (const b of birthdayState.list) {
    const date = birthdayDateInYear(b, y)
    if (date === key) out.push(hitFor(b, key, todayKey()))
  }
  return out
}

/** 最近生日：从今天起 days 天内，按先后排序 */
export function upcomingBirthdays(days = 60, limit = 5): BirthdayHit[] {
  const out: BirthdayHit[] = []
  for (const b of birthdayState.list) {
    const hit = nextBirthday(b)
    if (hit && hit.daysUntil <= days) out.push(hit)
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1)).slice(0, limit)
}

/* ------------------------- 存取 ------------------------- */

export async function persistBirthday(birthday: Birthday): Promise<void> {
  const stored: Birthday = { ...birthday, updatedAt: Date.now() }
  try {
    await putBirthday(stored)
  } catch (err) {
    console.error('[青阳录] 保存生日失败', err)
    return
  }
  const i = birthdayState.list.findIndex((x) => x.id === stored.id)
  if (i >= 0) birthdayState.list[i] = stored
  else birthdayState.list.push(stored)
}

/** 用户删除生日：进回收站（软删除），可在「数据 · 备份 · 回收站」里恢复 */
export async function removeBirthday(id: string): Promise<void> {
  const b = birthdayState.list.find((x) => x.id === id)
  if (b) {
    const trashed: Birthday = { ...b, deletedAt: Date.now() }
    try {
      await putBirthday(trashed)
    } catch (err) {
      console.error('[青阳录] 移入回收站失败', err)
      return
    }
  }
  birthdayState.list = birthdayState.list.filter((x) => x.id !== id)
}

/* ------------------------- 日历圆点 ------------------------- */

/** 生日圆点：每年都亮。窗口取前后各 15 年，足够年视图翻页 */
export const birthdayMarks = computed(() => {
  const marks: Record<string, string[]> = {}
  if (!birthdayState.list.length) return marks
  const y0 = new Date().getFullYear()
  for (const b of birthdayState.list) {
    for (let y = y0 - 15; y <= y0 + 15; y++) {
      const key = birthdayDateInYear(b, y)
      if (key) marks[key] = ['var(--qyl-pink)']
    }
  }
  return marks
})
