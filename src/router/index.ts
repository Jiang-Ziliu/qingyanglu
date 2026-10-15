import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/schedule' },
  {
    path: '/schedule',
    name: 'schedule',
    component: () => import('@/views/ScheduleView.vue'),
    meta: { title: '日程' },
  },
  {
    path: '/my-day',
    name: 'my-day',
    component: () => import('@/views/MyDayView.vue'),
    meta: { title: '我的一天' },
  },
  {
    path: '/todo',
    name: 'todo',
    component: () => import('@/views/TodoView.vue'),
    meta: { title: '待办' },
  },
  {
    path: '/stats',
    name: 'stats',
    component: () => import('@/views/StatsView.vue'),
    meta: { title: '统计' },
  },
  {
    path: '/data',
    name: 'data',
    component: () => import('@/views/DataView.vue'),
    meta: { title: '数据 · 备份 · 回收站' },
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

export default router
