<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { closeSearch, openBirthdayEditor, openDiaryEditor, openEventEditor, openTodoEditor, ui } from '@/composables/useUi'
import { diaryState } from '@/composables/useDiaries'
import { eventState, eventTimeText } from '@/composables/useEvents'
import { todoState } from '@/composables/useTodos'
import { birthdayState, nextBirthday } from '@/composables/useBirthdays'
import { selectDate, setView } from '@/composables/useCalendar'
import { formatCN, weekdayMed } from '@/utils/date'
import { plainExcerpt } from '@/utils/markdown'
import { t } from '@/composables/useI18n'

const router = useRouter()
const inputEl = ref<HTMLInputElement | null>(null)
const q = ref('')

const query = computed(() => q.value.trim())
const lower = computed(() => query.value.toLowerCase())

watch(
  () => ui.searchOpen,
  (open) => {
    if (open) {
      q.value = ''
      nextTick(() => inputEl.value?.focus())
    }
  },
)

/* ------------------------- 日期跳转 ------------------------- */

function mkDate(y: number, mo: number, d: number): string | null {
  const dt = new Date(y, mo - 1, d)
  if (dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const dateJump = computed<string | null>(() => {
  const s = query.value
  if (!s) return null
  let m = /^(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})[日号]?$/.exec(s)
  if (m) return mkDate(+m[1], +m[2], +m[3])
  m = /^(\d{1,2})月(\d{1,2})[日号]?$/.exec(s)
  if (m) return mkDate(new Date().getFullYear(), +m[1], +m[2])
  m = /^(\d{1,2})[-/](\d{1,2})$/.exec(s)
  if (m) return mkDate(new Date().getFullYear(), +m[1], +m[2])
  return null
})

function jumpToDate(key: string) {
  selectDate(key)
  setView('month')
  closeSearch()
  router.push('/schedule')
}

/* ------------------------- 高亮 ------------------------- */

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function hl(text: string): string {
  const kw = query.value
  if (!kw) return esc(text)
  const low = text.toLowerCase()
  const lq = kw.toLowerCase()
  const parts: string[] = []
  let i = 0
  while (i < text.length) {
    const hit = low.indexOf(lq, i)
    if (hit < 0) {
      parts.push(esc(text.slice(i)))
      break
    }
    if (hit > i) parts.push(esc(text.slice(i, hit)))
    parts.push('<mark>' + esc(text.slice(hit, hit + kw.length)) + '</mark>')
    i = hit + kw.length
  }
  return parts.join('')
}

/* ------------------------- 四类搜索结果 ------------------------- */

interface Hit {
  id: string
  title: string
  sub: string
  /** 点击后怎么打开 */
  open: () => void
}

const LIMIT = 8

function makeHit(title: string, sub: string, open: () => void): Hit {
  return { id: title + '|' + sub, title, sub, open }
}

const diaryHits = computed<Hit[]>(() => {
  if (!lower.value) return []
  const out: Hit[] = []
  for (const d of diaryState.list) {
    const hay = (d.title + '\n' + d.content + '\n' + d.tags.join(' ') + '\n' + d.mood).toLowerCase()
    if (!hay.includes(lower.value)) continue
    const excerpt = plainExcerpt(d.content, 46)
    out.push(
      makeHit(d.title || t('common.noTitle'), `${formatCN(d.date)}${excerpt ? ' · ' + excerpt : ''}`, () => {
        closeSearch()
        openDiaryEditor({ id: d.id, date: d.date })
      }),
    )
  }
  return out.slice(0, LIMIT)
})

const diaryMore = computed(() => {
  if (!lower.value) return 0
  let n = 0
  for (const d of diaryState.list) {
    const hay = (d.title + '\n' + d.content + '\n' + d.tags.join(' ') + '\n' + d.mood).toLowerCase()
    if (hay.includes(lower.value)) n++
  }
  return Math.max(0, n - LIMIT)
})

const eventHits = computed<Hit[]>(() => {
  if (!lower.value) return []
  const out: Hit[] = []
  for (const e of eventState.list) {
    const hay = (e.title + '\n' + e.note).toLowerCase()
    if (!hay.includes(lower.value)) continue
    out.push(
      makeHit(e.title, `${formatCN(e.date)} · ${eventTimeText(e)}`, () => {
        closeSearch()
        openEventEditor({ id: e.id, date: e.date })
      }),
    )
  }
  return out.slice(0, LIMIT)
})

const todoHits = computed<Hit[]>(() => {
  if (!lower.value) return []
  const out: Hit[] = []
  for (const item of todoState.list) {
    const hay = (item.title + '\n' + item.note).toLowerCase()
    if (!hay.includes(lower.value)) continue
    const state = item.done ? t('search.done') : item.due ? formatCN(item.due) : t('todo.notScheduled')
    out.push(
      makeHit(item.title, state, () => {
        closeSearch()
        openTodoEditor({ id: item.id })
      }),
    )
  }
  return out.slice(0, LIMIT)
})

const birthdayHits = computed<Hit[]>(() => {
  if (!lower.value) return []
  const out: Hit[] = []
  for (const b of birthdayState.list) {
    const hay = (b.name + '\n' + b.note).toLowerCase()
    if (!hay.includes(lower.value)) continue
    const hit = nextBirthday(b)
    const rel = hit ? (hit.daysUntil === 0 ? t('search.isToday') : t('search.inDays', { n: hit.daysUntil })) : ''
    const when = hit ? `${formatCN(hit.date)} · ${rel}` : ''
    const typeName = b.type === 'lunar' ? t('common.lunar') : t('common.solar')
    out.push(
      makeHit(b.name, `${t('search.bdType', { type: typeName })}${when ? ' · ' + when : ''}`, () => {
        closeSearch()
        openBirthdayEditor({ id: b.id })
      }),
    )
  }
  return out.slice(0, LIMIT)
})

const totalHits = computed(() => diaryHits.value.length + eventHits.value.length + todoHits.value.length + birthdayHits.value.length)

const groups = computed(() =>
  [
    { key: 'diary', label: t('search.diary'), icon: '📝', hits: diaryHits.value, more: diaryMore.value },
    { key: 'event', label: t('search.event'), icon: '🗓', hits: eventHits.value, more: 0 },
    { key: 'todo', label: t('search.todo'), icon: '✓', hits: todoHits.value, more: 0 },
    { key: 'birthday', label: t('search.birthday'), icon: '🎂', hits: birthdayHits.value, more: 0 },
  ].filter((g) => g.hits.length > 0),
)
</script>

<template>
  <Transition name="fade">
    <div v-if="ui.searchOpen" class="search-wrap" @click.self="closeSearch">
      <div class="panel">
        <div class="bar">
          <button class="icon-btn" :title="t('common.close')" @click="closeSearch">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 5.5l-7 6.5 7 6.5" />
            </svg>
          </button>
          <input ref="inputEl" v-model="q" class="input" :placeholder="t('search.placeholder')" maxlength="60" />
          <button v-if="query" class="icon-btn" :title="t('search.clear')" @click="q = ''">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
            </svg>
          </button>
          <span v-else class="ph"></span>
        </div>

        <div class="results">
          <!-- 日期跳转 -->
          <button v-if="dateJump" class="date-row" @click="jumpToDate(dateJump)">
            <span class="g-ico">📅</span>
            <span class="g-txt">
              <b>{{ t('search.jump', { date: formatCN(dateJump) }) }}</b>
              <small>{{ formatCN(dateJump) }} · {{ weekdayMed(dateJump) }}</small>
            </span>
            <span class="go">›</span>
          </button>

          <!-- 空状态 -->
          <div v-if="!query" class="hint-box">
            <span class="big">🔍</span>
            {{ t('search.hint1a') }}<br />
            {{ t('search.hint1b') }}
          </div>
          <div v-else-if="totalHits === 0 && !dateJump" class="hint-box">
            <span class="big">🗒</span>
            {{ t('search.noResult', { q: query }) }}
          </div>

          <!-- 分组结果 -->
          <template v-for="g in groups" :key="g.key">
            <p class="group-title">
              <span>{{ g.icon }} {{ g.label }}</span>
              <span>{{ t('search.countN', { n: g.hits.length }) }}<template v-if="g.more">{{ t('search.more', { n: g.more }) }}</template></span>
            </p>
            <button v-for="h in g.hits" :key="g.key + h.id" class="row" @click="h.open()">
              <span class="r-txt">
                <b v-html="hl(h.title)"></b>
                <small v-html="hl(h.sub)"></small>
              </span>
              <span class="go">›</span>
            </button>
          </template>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.search-wrap {
  position: fixed;
  inset: 0;
  z-index: 72;
  background: var(--qyl-overlay);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 0 10px;
}

.panel {
  width: 100%;
  max-width: var(--qyl-max-width);
  margin-top: 12px;
  max-height: 82dvh;
  background: var(--qyl-surface);
  border-radius: var(--qyl-radius-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.bar {
  flex: none;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 8px;
  border-bottom: 1px solid var(--qyl-line);
}

.input {
  flex: 1;
  min-width: 0;
  padding: 9px 6px;
  border: none;
  background: transparent;
  font-size: 15.5px;
  outline: none;
}

.input::placeholder {
  color: var(--qyl-text-3);
}

.ph {
  width: 34px;
}

.results {
  flex: 1;
  overflow-y: auto;
  padding: 6px 10px calc(16px + env(safe-area-inset-bottom));
}

.date-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 8px;
  border-radius: var(--qyl-radius-sm);
  background: var(--qyl-primary-soft);
  margin-top: 6px;
  text-align: left;
}

.date-row:active {
  opacity: 0.8;
}

.g-ico {
  flex: none;
  font-size: 18px;
}

.g-txt {
  flex: 1;
  min-width: 0;
}

.g-txt b {
  display: block;
  font-size: 14px;
  color: var(--qyl-primary);
}

.g-txt small {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--qyl-text-3);
}

.hint-box {
  padding: 34px 10px;
  text-align: center;
  font-size: 13px;
  color: var(--qyl-text-3);
  line-height: 1.9;
}

.hint-box .big {
  display: block;
  font-size: 26px;
  margin-bottom: 8px;
}

.group-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 4px 4px;
  font-size: 12px;
  color: var(--qyl-text-3);
}

.row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 8px;
  border-radius: var(--qyl-radius-sm);
  text-align: left;
}

.row + .row {
  border-top: 1px solid var(--qyl-line);
}

.row:active {
  background: var(--qyl-surface-2);
}

.r-txt {
  flex: 1;
  min-width: 0;
}

.r-txt b {
  display: block;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.r-txt small {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--qyl-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.r-txt :deep(mark) {
  background: var(--qyl-pink-soft);
  color: var(--qyl-pink);
  border-radius: 3px;
  padding: 0 1px;
}

.go {
  flex: none;
  color: var(--qyl-text-3);
  font-size: 18px;
  line-height: 1;
}
</style>
