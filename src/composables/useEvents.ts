import { computed, reactive } from 'vue'
import {
  getAllEvents,
  putEvent,
  type CalendarEvent,
} from '@/utils/db'
import { genId } from '@/utils/id'
import { t } from '@/composables/useI18n'

export const eventState = reactive({
  ready: false,
  list: [] as CalendarEvent[],
})

export async function loadEvents(): Promise<void> {
  try {
    const all = await getAllEvents()
    eventState.list = all.filter((e) => !e.deletedAt)
  } catch (err) {
    console.error('[青阳录] 读取日程失败', err)
    eventState.list = []
  }
  eventState.ready = true
}

/** 同一天内的排序：全天在前，然后按开始时间先后，没填时间的排最后 */
export function sortEvents(list: CalendarEvent[]): CalendarEvent[] {
  return [...list].sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1
    const ta = a.startTime || '99:99'
    const tb = b.startTime || '99:99'
    if (ta !== tb) return ta < tb ? -1 : 1
    return a.createdAt - b.createdAt
  })
}

/** 日期 -> 当天的日程（已排序） */
export const eventsByDate = computed(() => {
  const map: Record<string, CalendarEvent[]> = {}
  for (const e of eventState.list) {
    if (!map[e.date]) map[e.date] = []
    map[e.date].push(e)
  }
  for (const key of Object.keys(map)) map[key] = sortEvents(map[key])
  return map
})

/** 日历圆点标记：有日程的日期显示一个强调色圆点 */
export const eventMarks = computed(() => {
  const marks: Record<string, string[]> = {}
  for (const e of eventState.list) marks[e.date] = ['var(--qyl-accent)']
  return marks
})

export function eventsOf(date: string): CalendarEvent[] {
  return eventsByDate.value[date] ?? []
}

export function createEventDraft(date: string): CalendarEvent {
  const now = Date.now()
  return {
    id: genId(),
    title: '',
    date,
    allDay: false,
    startTime: '09:00',
    endTime: '',
    note: '',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
}

export async function persistEvent(event: CalendarEvent): Promise<void> {
  // 与日记同一套路：不要改传入的对象，写出副本再替换列表项
  const stored: CalendarEvent = { ...event, updatedAt: Date.now() }
  try {
    await putEvent(stored)
  } catch (err) {
    console.error('[青阳录] 保存日程失败', err)
    return
  }
  const i = eventState.list.findIndex((e) => e.id === stored.id)
  if (i >= 0) eventState.list[i] = stored
  else eventState.list.push(stored)
}

/** 用户删除日程：进回收站（软删除），可在「数据 · 备份 · 回收站」里恢复 */
export async function removeEvent(id: string): Promise<void> {
  const e = eventState.list.find((x) => x.id === id)
  if (e) {
    const trashed: CalendarEvent = { ...e, deletedAt: Date.now() }
    try {
      await putEvent(trashed)
    } catch (err) {
      console.error('[青阳录] 移入回收站失败', err)
      return
    }
  }
  eventState.list = eventState.list.filter((x) => x.id !== id)
}

/** 把某一天的日程整份复制到另一天（用于「复制昨天」），返回复制条数 */
export async function copyEventsTo(fromDate: string, toDate: string): Promise<number> {
  const src = eventsOf(fromDate)
  if (src.length === 0) return 0
  const now = Date.now()
  for (const e of src) {
    const copy: CalendarEvent = {
      ...e,
      id: genId(),
      date: toDate,
      createdAt: now,
      updatedAt: now,
    }
    await persistEvent(copy)
  }
  return src.length
}

/** HH:mm 的小时数，用于时间轴定位；不是时间格式则返回 -1 */
export function hourOf(time: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time || '')
  if (!m) return -1
  const h = Number(m[1])
  return h >= 0 && h <= 23 ? h : -1
}

/** 界面上的时间显示：09:00 - 10:30 / 09:00 / 全天 */
export function eventTimeText(e: CalendarEvent): string {
  if (e.allDay || !e.startTime) return t('common.allDay')
  return e.endTime ? `${e.startTime} - ${e.endTime}` : e.startTime
}
