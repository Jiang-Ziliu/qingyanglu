import { computed, reactive } from 'vue'
import { getAllTodos, putTodo, type Todo } from '@/utils/db'
import { genId } from '@/utils/id'
import { todayKey } from '@/utils/date'

export const todoState = reactive({
  ready: false,
  list: [] as Todo[],
})

export async function loadTodos(): Promise<void> {
  try {
    const all = await getAllTodos()
    todoState.list = all.filter((t) => !t.deletedAt)
  } catch (err) {
    console.error('[青阳录] 读取待办失败', err)
    todoState.list = []
  }
  todoState.ready = true
}

/** 未完成在前；未完成里按日期由近到远（没定日期的排最后） */
export function sortTodos(list: Todo[]): Todo[] {
  return [...list].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    if (a.done) return (b.doneAt ?? 0) - (a.doneAt ?? 0)
    const da = a.due || '9999-99-99'
    const dd = b.due || '9999-99-99'
    if (da !== dd) return da < dd ? -1 : 1
    return a.createdAt - b.createdAt
  })
}

export const openTodos = computed(() => sortTodos(todoState.list.filter((t) => !t.done)))

export const doneTodos = computed(() => sortTodos(todoState.list.filter((t) => t.done)))

export const overdueTodos = computed(() => {
  const today = todayKey()
  return openTodos.value.filter((t) => t.due && t.due < today)
})

/** 没定日期的待办 */
export const somedayTodos = computed(() => openTodos.value.filter((t) => !t.due))

/** 日历圆点标记：未完成且定了日期的待办 */
export const todoMarks = computed(() => {
  const marks: Record<string, string[]> = {}
  for (const t of todoState.list) {
    if (t.done || !t.due) continue
    marks[t.due] = ['var(--qyl-warn)']
  }
  return marks
})

/** 某天到期的待办（含当天已完成的） */
export function todosOn(date: string): Todo[] {
  return sortTodos(todoState.list.filter((t) => t.due === date))
}

/** 「我的一天」用：今天到期的 + 逾期未完成的 */
export const todayTodos = computed(() => {
  const today = todayKey()
  return sortTodos([...todosOn(today), ...overdueTodos.value])
})

export function createTodoDraft(due: string): Todo {
  const now = Date.now()
  return {
    id: genId(),
    title: '',
    note: '',
    due,
    done: false,
    doneAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
}

export async function persistTodo(todo: Todo): Promise<void> {
  const stored: Todo = { ...todo, updatedAt: Date.now() }
  try {
    await putTodo(stored)
  } catch (err) {
    console.error('[青阳录] 保存待办失败', err)
    return
  }
  const i = todoState.list.findIndex((t) => t.id === stored.id)
  if (i >= 0) todoState.list[i] = stored
  else todoState.list.push(stored)
}

export async function toggleTodo(id: string): Promise<void> {
  const t = todoState.list.find((x) => x.id === id)
  if (!t) return
  const done = !t.done
  await persistTodo({ ...t, done, doneAt: done ? Date.now() : null })
}

/** 用户删除待办：进回收站（软删除），可在「数据 · 备份 · 回收站」里恢复 */
export async function removeTodo(id: string): Promise<void> {
  const t = todoState.list.find((x) => x.id === id)
  if (t) {
    const trashed: Todo = { ...t, deletedAt: Date.now() }
    try {
      await putTodo(trashed)
    } catch (err) {
      console.error('[青阳录] 移入回收站失败', err)
      return
    }
  }
  todoState.list = todoState.list.filter((x) => x.id !== id)
}
