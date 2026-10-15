/** 日期工具：全部以本地时区的 YYYY-MM-DD 字符串作为「一天」的唯一标识 */

import { locale } from '@/composables/useI18n'

const WEEK_ZH_FULL = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const WEEK_ZH_MED = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const WEEK_ZH_SHORT = ['日', '一', '二', '三', '四', '五', '六']
const WEEK_EN_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WEEK_EN_MED = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEK_EN_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function toKey(d: Date): string {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function todayKey(): string {
  return toKey(new Date())
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, n: number): string {
  const d = parseKey(key)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  let m = month + delta
  let y = year
  while (m < 1) {
    m += 12
    y -= 1
  }
  while (m > 12) {
    m -= 12
    y += 1
  }
  return { year: y, month: m }
}

/** 一天的差值：b - a（单位天） */
export function diffDays(a: string, b: string): number {
  const ms = parseKey(b).getTime() - parseKey(a).getTime()
  return Math.round(ms / 86400000)
}

/** 该日期所在周的周日 */
export function startOfWeek(key: string): string {
  const d = parseKey(key)
  d.setDate(d.getDate() - d.getDay())
  return toKey(d)
}

/** 该日期所在周的 7 天 */
export function weekKeys(key: string): string[] {
  const start = startOfWeek(key)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** 6 行 × 7 列 的日期网格（含上月/下月补位） */
export function monthMatrixKeys(year: number, month: number): string[][] {
  const first = new Date(year, month - 1, 1)
  const start = new Date(year, month - 1, 1 - first.getDay())
  const rows: string[][] = []
  for (let r = 0; r < 6; r++) {
    const row: string[] = []
    for (let c = 0; c < 7; c++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + r * 7 + c)
      row.push(toKey(d))
    }
    rows.push(row)
  }
  return rows
}

/** 「10月15日」/「Oct 15」 */
export function formatCN(key: string): string {
  const d = parseKey(key)
  if (locale.value === 'en') return `${MONTH_EN[d.getMonth()]} ${d.getDate()}`
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/** 「星期一」/「Monday」 */
export function weekdayCN(key: string): string {
  const w = parseKey(key).getDay()
  return (locale.value === 'en' ? WEEK_EN_FULL : WEEK_ZH_FULL)[w]
}

/** 「日」/「S」——单字，月历表头与日期角标用 */
export function weekdayShort(key: string): string {
  const w = parseKey(key).getDay()
  return (locale.value === 'en' ? WEEK_EN_SHORT : WEEK_ZH_SHORT)[w]
}

/** 「周一」/「Mon」——周视图条目等用 */
export function weekdayMed(key: string): string {
  const w = parseKey(key).getDay()
  return (locale.value === 'en' ? WEEK_EN_MED : WEEK_ZH_MED)[w]
}

/** 日历表头：日 一 二 … / S M T … */
export function weekHeadLabels(): string[] {
  return locale.value === 'en' ? [...WEEK_EN_SHORT] : [...WEEK_ZH_SHORT]
}

/** 「10月15日 · 星期一」/「Oct 15 · Monday」 */
export function formatFull(key: string): string {
  return `${formatCN(key)} · ${weekdayCN(key)}`
}

/** 今天 / 明天 / 昨天 / 还有 N 天 / N 天前 */
export function relativeDay(key: string, base = todayKey()): string {
  const n = diffDays(base, key)
  if (locale.value === 'en') {
    if (n === 0) return 'Today'
    if (n === 1) return 'Tomorrow'
    if (n === 2) return 'Day after'
    if (n === -1) return 'Yesterday'
    if (n === -2) return '2 days ago'
    if (n > 0) return `in ${n} days`
    return `${-n} days ago`
  }
  if (n === 0) return '今天'
  if (n === 1) return '明天'
  if (n === 2) return '后天'
  if (n === -1) return '昨天'
  if (n === -2) return '前天'
  if (n > 0) return `还有 ${n} 天`
  return `${-n} 天前`
}

export function isWeekend(key: string): boolean {
  const w = parseKey(key).getDay()
  return w === 0 || w === 6
}
