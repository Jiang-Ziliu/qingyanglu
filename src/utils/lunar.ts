import { HolidayUtil, Solar } from 'lunar-typescript'
import { monthMatrixKeys, parseKey } from './date'
import { locale, t, tf } from '@/composables/useI18n'

/** 节日显示筛选 */
export type FestivalFilter = 'domestic' | 'foreign' | 'both' | 'statutory'

export interface DayInfo {
  /** YYYY-MM-DD */
  key: string
  year: number
  month: number
  day: number
  /** 0 = 周日 */
  weekday: number
  weekdayCN: string
  /** 九月初五 */
  lunarMonthDay: string
  /** 初五 */
  lunarDay: string
  /** 九月 */
  lunarMonth: string
  /** 丙午 */
  ganzhiYear: string
  /** 马 */
  zodiac: string
  /** 节气，如「寒露」，无则为空 */
  jieQi: string
  /** 国内节日（春节、端午、国庆…） */
  festivalsCn: string[]
  /** 国外/国际节日（圣诞、情人节、国际海关日…） */
  festivalsIntl: string[]
  /** 法定节假日名称（休/班 都来自它） */
  holidayName: string
  /** 休 */
  isRest: boolean
  /** 班（调休上班） */
  isWork: boolean
  isWeekend: boolean
  /** 农历小字兜底：初一显示月名，其余显示农历日 */
  lunarFallback: string
}

/* ------------------------------------------------------------------ */
/* 节日分类                                                            */
/* ------------------------------------------------------------------ */

/** 西方/国外节日（库里混在「公历/农历节日」里的那批，需要挑出来） */
const FOREIGN_FESTIVALS = new Set([
  '情人节',
  '日记情人节',
  '白色情人节',
  '黑色情人节',
  '玫瑰情人节',
  '网络情人节',
  '相片情人节',
  '银色情人节',
  '绿色情人节',
  '葡萄酒情人节',
  '电影情人节',
  '拥抱情人节',
  '亲亲情人节',
  '愚人节',
  '母亲节',
  '父亲节',
  '万圣节',
  '万圣节前夜',
  '万圣夜',
  '感恩节',
  '平安夜',
  '圣诞节',
  '复活节',
  '复活节前夜',
  '世界住房日',
])

/** 中国传统节日（库里归到「其他节日」里的那批） */
const CN_TRADITIONAL = new Set([
  '尾牙',
  '祭灶日',
  '人日',
  '天穿节',
  '寒食节',
  '上巳节',
  '中元节',
  '财神节',
  '下元节',
  '寒衣节',
  '光棍节',
  '天贶节',
  '社日节',
  '春社',
  '秋社',
  '观莲节',
  '填仓节',
  '中和节',
  '分龙节',
  '会龙节',
  '五谷母节',
  '十成节',
  '天灸日',
  '顺星节',
  '谷日',
  '隔开日',
  '接神日',
  '地日',
  '天日',
  '正月晦',
  '驱傩日',
  '地藏节',
])

const FOREIGN_PREFIX = ['国际', '世界', '联合国', '全球']

function isForeignFestival(name: string): boolean {
  if (FOREIGN_FESTIVALS.has(name)) return true
  if (name.includes('情人节')) return true
  return FOREIGN_PREFIX.some((p) => name.startsWith(p))
}

/**
 * 把节日拆成「国内」「国外」两类。
 * 库里还有大量「纪念日 / 宣传日 / 某某活动日」，名字又长又杂、会让日历很乱，
 * 这类一律不展示（用户在界面上可用「更多」里的显示设置切换前两类）。
 */
function classify(festivals: string[], otherFestivals: string[]) {
  const cn: string[] = []
  const intl: string[] = []

  for (const name of festivals) {
    if (!name) continue
    if (isForeignFestival(name)) intl.push(name)
    else cn.push(name)
  }

  for (const name of otherFestivals) {
    if (!name) continue
    if (isForeignFestival(name)) intl.push(name)
    else if (CN_TRADITIONAL.has(name)) cn.push(name)
  }

  return {
    festivalsCn: [...new Set(cn)],
    festivalsIntl: [...new Set(intl)],
  }
}

/* ------------------------------------------------------------------ */
/* 基础数据（缓存的是「原始事实」，与筛选无关）                          */
/* ------------------------------------------------------------------ */

const cache = new Map<string, DayInfo>()

function build(key: string): DayInfo {
  const d = parseKey(key)
  const solar = Solar.fromYmd(d.getFullYear(), d.getMonth() + 1, d.getDate())
  const lunar = solar.getLunar()

  const jieQi = lunar.getJieQi() || ''
  const { festivalsCn, festivalsIntl } = classify(
    [...(solar.getFestivals() as string[]), ...(lunar.getFestivals() as string[])],
    [...(solar.getOtherFestivals() as string[]), ...(lunar.getOtherFestivals() as string[])],
  )

  const holiday = HolidayUtil.getHoliday(d.getFullYear(), d.getMonth() + 1, d.getDate())
  const holidayName = holiday ? holiday.getName() : ''
  const isWork = !!holiday && holiday.isWork()
  const isRest = !!holiday && !holiday.isWork()

  const lunarDay = lunar.getDayInChinese()
  const lunarMonth = lunar.getMonthInChinese() + '月'
  const weekday = d.getDay()

  return {
    key,
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    weekday,
    weekdayCN: '星期' + solar.getWeekInChinese(),
    lunarMonthDay: lunarMonth + lunarDay,
    lunarDay,
    lunarMonth,
    ganzhiYear: lunar.getYearInGanZhi(),
    zodiac: lunar.getYearShengXiao(),
    jieQi,
    festivalsCn,
    festivalsIntl,
    holidayName,
    isRest,
    isWork,
    isWeekend: weekday === 0 || weekday === 6,
    lunarFallback: d.getDate() === 1 ? lunarMonth : lunarDay,
  }
}

export function getDayInfo(key: string): DayInfo {
  let v = cache.get(key)
  if (!v) {
    v = build(key)
    cache.set(key, v)
  }
  return v
}

/** 6 行 × 7 列的日历数据 */
export function getMonthDays(year: number, month: number): DayInfo[][] {
  return monthMatrixKeys(year, month).map((row) => row.map(getDayInfo))
}

/* ------------------------------------------------------------------ */
/* 展示逻辑（跟随「显示设置」，切换后立即生效）                          */
/* ------------------------------------------------------------------ */

export interface DayLabel {
  text: string
  type: 'term' | 'festival' | 'lunar'
}

/** 当前设置下，这一天要显示的节日（完整名称，不截断） */
export function getVisibleFestivals(info: DayInfo, filter: FestivalFilter): string[] {
  switch (filter) {
    case 'domestic':
      return info.festivalsCn
    case 'foreign':
      return info.festivalsIntl
    case 'both':
      return [...info.festivalsCn, ...info.festivalsIntl]
    default:
      return []
  }
}

/** 日历格子里那行小字：节气优先，其次节日，最后农历（译文在展示层生成，不进缓存） */
export function getDayLabel(info: DayInfo, filter: FestivalFilter): DayLabel {
  if (info.jieQi) return { text: tf(info.jieQi), type: 'term' }

  if (filter === 'statutory') {
    if (info.isRest || info.isWork) {
      return {
        text: info.holidayName ? tf(info.holidayName) : info.isRest ? t('cal.holiday') : t('cal.makeup'),
        type: 'festival',
      }
    }
    return { text: info.lunarFallback, type: 'lunar' }
  }

  const festivals = getVisibleFestivals(info, filter)
  if (festivals.length) return { text: tf(festivals[0]), type: 'festival' }
  return { text: info.lunarFallback, type: 'lunar' }
}

/** 硬截断：中文最多 4 字（绝不越界），英文放宽到 12；CSS 省略号兜底 */
export function clipText(text: string, max?: number): string {
  const limit = max ?? (locale.value === 'en' ? 12 : 4)
  return text.length > limit ? text.slice(0, limit) + '…' : text
}

export interface DayHighlight {
  info: DayInfo
  tag: { text: string; type: 'term' | 'festival' | 'holiday' }
}

/** 某月里「有内容」的日子：节气 / 节日 / 休 / 班 */
export function getMonthHighlights(year: number, month: number, filter: FestivalFilter): DayHighlight[] {
  const out: DayHighlight[] = []
  for (const info of getMonthDays(year, month).flat()) {
    if (info.month !== month) continue

    let tag: DayHighlight['tag'] | null = null
    if (info.jieQi) {
      tag = { text: tf(info.jieQi), type: 'term' }
    } else {
      const festivals = getVisibleFestivals(info, filter)
      if (festivals.length) {
        tag = { text: tf(festivals[0]), type: 'festival' }
      } else if (info.isRest || info.isWork) {
        tag = {
          text: info.holidayName ? tf(info.holidayName) : info.isRest ? t('cal.rest') : t('cal.work'),
          type: 'holiday',
        }
      }
    }

    if (!tag && (info.isRest || info.isWork)) {
      tag = {
        text: info.holidayName ? tf(info.holidayName) : info.isRest ? t('cal.rest') : t('cal.work'),
        type: 'holiday',
      }
    }
    if (tag) out.push({ info, tag })
  }
  return out
}

/* ------------------------------------------------------------------ */
/* 全年法定假期 / 调休                                                  */
/* ------------------------------------------------------------------ */

export interface HolidayRange {
  name: string
  /** true = 调休上班，false = 放假 */
  isWork: boolean
  start: string
  end: string
  days: number
}

/** 一整年的法定假期与调休，按假期名 + 是否上班合并成区间 */
export function getYearHolidays(year: number): HolidayRange[] {
  type Rec = { key: string; name: string; isWork: boolean }
  const records: Rec[] = []

  for (let m = 1; m <= 12; m++) {
    const dim = new Date(year, m, 0).getDate()
    for (let d = 1; d <= dim; d++) {
      const h = HolidayUtil.getHoliday(year, m, d)
      if (!h) continue
      const key = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      records.push({ key, name: h.getName(), isWork: h.isWork() })
    }
  }

  const groups: HolidayRange[] = []
  for (const r of records) {
    const last = groups[groups.length - 1]
    if (last && last.name === r.name && last.isWork === r.isWork) {
      // 上一条记录的日期 + 1 天正好是今天，则并入同一区间
      const prev = parseKey(last.end)
      prev.setDate(prev.getDate() + 1)
      const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`
      if (prevKey === r.key) {
        last.end = r.key
        last.days += 1
        continue
      }
    }
    groups.push({ name: r.name, isWork: r.isWork, start: r.key, end: r.key, days: 1 })
  }

  return groups
}
