import { computed } from 'vue'
import { diaryMarks } from './useDiaries'
import { eventMarks } from './useEvents'
import { todoMarks } from './useTodos'
import { birthdayMarks } from './useBirthdays'

/**
 * 日历上的合并圆点标记。
 * 日记 = 主色，日程 = 强调色，待办 = 橙黄色，生日 = 粉色；同一天最多显示 3 个（由格子自己截断）。
 */
export const allMarks = computed(() => {
  const out: Record<string, string[]> = {}
  const merge = (src: Record<string, string[]>) => {
    for (const key of Object.keys(src)) {
      if (!out[key]) out[key] = []
      for (const color of src[key]) {
        if (!out[key].includes(color)) out[key].push(color)
      }
    }
  }
  merge(diaryMarks.value)
  merge(eventMarks.value)
  merge(todoMarks.value)
  merge(birthdayMarks.value)
  return out
})
