import { computed, reactive } from 'vue'
import { addDays, formatCN, MONTH_EN, parseKey, todayKey, weekKeys } from '@/utils/date'
import { locale, t } from '@/composables/useI18n'
import { showToast } from './useUi'
import router from '@/router'

export type ViewMode = 'year' | 'month' | 'week' | 'day' | 'agenda'

export const VIEW_TABS: { value: ViewMode; labelKey: string }[] = [
  { value: 'year', labelKey: 'cal.tab.year' },
  { value: 'month', labelKey: 'cal.tab.month' },
  { value: 'week', labelKey: 'cal.tab.week' },
  { value: 'day', labelKey: 'cal.tab.day' },
  { value: 'agenda', labelKey: 'cal.tab.agenda' },
]

const now = new Date()

export const calendar = reactive({
  view: 'month' as ViewMode,
  /** 当前选中日期 YYYY-MM-DD */
  selected: todayKey(),
  cursorYear: now.getFullYear(),
  /** 1 - 12 */
  cursorMonth: now.getMonth() + 1,
})

export function selectDate(key: string) {
  calendar.selected = key
  const d = parseKey(key)
  calendar.cursorYear = d.getFullYear()
  calendar.cursorMonth = d.getMonth() + 1
}

export function setView(view: ViewMode) {
  calendar.view = view
}

export function goToday() {
  selectDate(todayKey())
}

/** 悬浮按钮 / 快捷键 T 共用：回到今天、切回月历、跳到日程页、提示 */
export function backToToday() {
  goToday()
  if (calendar.view === 'year' || calendar.view === 'agenda') setView('month')
  if (router.currentRoute.value.path !== '/schedule') router.push('/schedule')
  showToast(t('toast.backToday'))
}

export function navigate(dir: -1 | 1) {
  switch (calendar.view) {
    case 'year':
      calendar.cursorYear += dir
      break
    case 'week':
      selectDate(addDays(calendar.selected, dir * 7))
      break
    case 'day':
      selectDate(addDays(calendar.selected, dir))
      break
    default: {
      let m = calendar.cursorMonth + dir
      let y = calendar.cursorYear
      if (m < 1) {
        m = 12
        y -= 1
      } else if (m > 12) {
        m = 1
        y += 1
      }
      calendar.cursorYear = y
      calendar.cursorMonth = m
    }
  }
}

export const cursorTitle = computed(() => {
  const y = calendar.cursorYear
  const m = calendar.cursorMonth
  switch (calendar.view) {
    case 'year':
      return t('cal.title.year', { y })
    case 'week': {
      const days = weekKeys(calendar.selected)
      const a = parseKey(days[0])
      const b = parseKey(days[6])
      if (locale.value === 'en') {
        return t('cal.title.week', {
          mon1: MONTH_EN[a.getMonth()],
          d1: a.getDate(),
          mon2: MONTH_EN[b.getMonth()],
          d2: b.getDate(),
        })
      }
      return t('cal.title.week', {
        m1: a.getMonth() + 1,
        d1: a.getDate(),
        m2: b.getMonth() + 1,
        d2: b.getDate(),
      })
    }
    case 'day':
      return formatCN(calendar.selected)
    case 'agenda':
    default:
      return locale.value === 'en'
        ? t('cal.title.month', { mon: MONTH_EN[m - 1], y })
        : t('cal.title.month', { y, m })
  }
})
