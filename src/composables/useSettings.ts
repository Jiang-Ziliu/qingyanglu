import { reactive, watch } from 'vue'
import type { FestivalFilter } from '@/utils/lunar'

const STORAGE_KEY = 'qyl.settings'

export const FESTIVAL_FILTER_OPTIONS: {
  value: FestivalFilter
  labelKey: string
  descKey: string
}[] = [
  { value: 'domestic', labelKey: 'settings.filter.domestic.label', descKey: 'settings.filter.domestic.desc' },
  { value: 'foreign', labelKey: 'settings.filter.foreign.label', descKey: 'settings.filter.foreign.desc' },
  { value: 'both', labelKey: 'settings.filter.both.label', descKey: 'settings.filter.both.desc' },
  { value: 'statutory', labelKey: 'settings.filter.statutory.label', descKey: 'settings.filter.statutory.desc' },
]

const VALID: FestivalFilter[] = ['domestic', 'foreign', 'both', 'statutory']

function load(): FestivalFilter {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { festivalFilter?: string }
      if (parsed?.festivalFilter && VALID.includes(parsed.festivalFilter as FestivalFilter)) {
        return parsed.festivalFilter as FestivalFilter
      }
    }
  } catch {
    /* 忽略损坏的本地数据 */
  }
  return 'domestic'
}

export const settings = reactive({
  festivalFilter: load(),
})

watch(
  settings,
  () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ festivalFilter: settings.festivalFilter }))
  },
  { deep: true },
)

export function setFestivalFilter(value: FestivalFilter) {
  settings.festivalFilter = value
}
