<script setup lang="ts">
import { ref } from 'vue'
import { backToToday } from '@/composables/useCalendar'
import { openCreateSheet } from '@/composables/useUi'
import { locale, t } from '@/composables/useI18n'

/** 拖动位移（相对右下角默认位置的偏移）；不写 localStorage，重开即回默认位置 */
const offset = ref({ x: 0, y: 0 })
const dragging = ref(false)

let startX = 0
let startY = 0
let baseX = 0
let baseY = 0
let bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 }
let moved = false
let blockClick = false

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max)
}

function onDown(e: PointerEvent) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  const el = (e.currentTarget as HTMLElement).closest('.float-btns') as HTMLElement | null
  if (!el) return
  const rect = el.getBoundingClientRect()
  bounds = {
    minX: -rect.left + 6,
    maxX: window.innerWidth - rect.right - 6,
    minY: -rect.top + 6,
    maxY: window.innerHeight - rect.bottom - 6,
  }
  dragging.value = true
  moved = false
  startX = e.clientX
  startY = e.clientY
  baseX = offset.value.x
  baseY = offset.value.y
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
}

function onMove(e: PointerEvent) {
  if (!dragging.value) return
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  if (!moved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return
  moved = true
  offset.value = {
    x: clamp(baseX + dx, bounds.minX, bounds.maxX),
    y: clamp(baseY + dy, bounds.minY, bounds.maxY),
  }
}

function onUp() {
  if (!dragging.value) return
  dragging.value = false
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', onUp)
  if (moved) {
    blockClick = true
    window.setTimeout(() => {
      blockClick = false
    }, 80)
  }
}

function onToday() {
  if (blockClick) return
  backToToday()
}

function onCreate() {
  if (blockClick) return
  openCreateSheet()
}
</script>

<template>
  <div
    class="float-btns"
    :class="{ dragging }"
    :style="{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }"
    @pointerdown="onDown"
  >
    <button class="fab small" :title="t('float.backToday')" @click="onToday">
      {{ locale === 'en' ? 'T' : '今' }}
    </button>
    <button class="fab big" :title="t('float.quickCreate')" @click="onCreate">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <path d="M12 5.5v13M5.5 12h13" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.float-btns {
  position: fixed;
  right: 16px;
  bottom: calc(var(--qyl-nav-h) + 18px + env(safe-area-inset-bottom));
  z-index: 45;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  /* 半透明 */
  opacity: 0.85;
  touch-action: none;
  transition: transform 0.22s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.16s ease;
}

/* 拖动时关掉过渡，保证跟手 */
.float-btns.dragging {
  transition: none;
}

.fab {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--qyl-shadow-lift);
  transition: transform 0.16s ease;
}

.fab:active {
  transform: scale(0.92);
}

.fab.small {
  width: 48px;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  background: var(--qyl-surface);
  color: var(--qyl-primary);
  border: 1px solid var(--qyl-line);
}

.fab.big {
  width: 62px;
  height: 62px;
  background: var(--qyl-primary);
  color: #fff;
}
</style>
