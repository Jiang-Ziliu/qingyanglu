<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: number
    min?: number
    max?: number
    unit?: string
    rowHeight?: number
    visible?: number
  }>(),
  { min: 1, max: 3650, unit: '', rowHeight: 38, visible: 3 },
)
const emit = defineEmits<{ (e: 'update:modelValue', v: number): void }>()

const ROW_H = props.rowHeight
const VISIBLE = props.visible
const total = props.max - props.min + 1
const pad = ((VISIBLE - 1) * ROW_H) / 2

const viewport = ref<HTMLElement | null>(null)
const scrollY = ref(0)
let snapTO = 0

const selectedIndex = computed(() => {
  const i = Math.round(scrollY.value / ROW_H)
  return Math.min(Math.max(i, 0), total - 1)
})
const selectedValue = computed(() => props.min + selectedIndex.value)

// 只渲染滚动位置附近的一窗口数字，避免 1~3650 全部渲染
const BUFFER = 24
const startIndex = computed(() => Math.max(0, Math.floor(scrollY.value / ROW_H) - BUFFER))
const offsetY = computed(() => startIndex.value * ROW_H + pad)
const items = computed(() => {
  const end = Math.min(total, startIndex.value + BUFFER * 2 + VISIBLE + 2)
  const arr: number[] = []
  for (let i = startIndex.value; i < end; i++) arr.push(i)
  return arr
})

function onScroll() {
  if (!viewport.value) return
  scrollY.value = viewport.value.scrollTop
  if (snapTO) clearTimeout(snapTO)
  // 松手 120ms 后吸附到最近的整数
  snapTO = window.setTimeout(snap, 120)
}

function snap() {
  if (!viewport.value) return
  const target = selectedIndex.value * ROW_H
  viewport.value.scrollTo({ top: target, behavior: 'smooth' })
  emit('update:modelValue', selectedValue.value)
}

watch(
  () => props.modelValue,
  (v) => {
    if (!viewport.value) return
    const target = (v - props.min) * ROW_H
    if (Math.abs(viewport.value.scrollTop - target) > ROW_H / 2) {
      viewport.value.scrollTop = target
    }
  },
)

onMounted(() => {
  if (!viewport.value) return
  viewport.value.scrollTop = (props.modelValue - props.min) * ROW_H
})

onBeforeUnmount(() => {
  if (snapTO) clearTimeout(snapTO)
})
</script>

<template>
  <div class="wheel-picker" :style="{ height: VISIBLE * ROW_H + 'px', '--row-h': ROW_H + 'px' }">
    <div ref="viewport" class="wp-viewport" @scroll.passive="onScroll">
      <div class="wp-spacer" :style="{ height: pad * 2 + total * ROW_H + 'px' }"></div>
      <div class="wp-items" :style="{ transform: `translateY(${offsetY}px)` }">
        <div
          v-for="i in items"
          :key="i"
          class="wp-item"
          :class="{ active: i === selectedIndex }"
          :style="{ height: ROW_H + 'px', lineHeight: ROW_H + 'px' }"
        >{{ props.min + i }}{{ unit }}</div>
      </div>
    </div>
    <div class="wp-indicator"></div>
    <div class="wp-mask wp-mask-top"></div>
    <div class="wp-mask wp-mask-bottom"></div>
  </div>
</template>

<style scoped>
.wheel-picker {
  position: relative;
  width: 120px;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent);
  mask-image: linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent);
}

.wp-viewport {
  position: relative;
  height: 100%;
  overflow-y: scroll;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.wp-viewport::-webkit-scrollbar {
  display: none;
}

.wp-spacer {
  position: relative;
}

.wp-items {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}

.wp-item {
  text-align: center;
  font-size: 15px;
  color: var(--qyl-text-3);
  transition: color 0.15s ease, font-size 0.15s ease;
}

.wp-item.active {
  color: var(--qyl-review);
  font-weight: 700;
  font-size: 17px;
}

.wp-indicator {
  position: absolute;
  left: 8px;
  right: 8px;
  top: 50%;
  height: var(--row-h);
  transform: translateY(-50%);
  border-top: 1px solid var(--qyl-line);
  border-bottom: 1px solid var(--qyl-line);
  border-radius: 10px;
  pointer-events: none;
  background: color-mix(in srgb, var(--qyl-primary) 5%, transparent);
}

.wp-mask {
  position: absolute;
  left: 0;
  right: 0;
  pointer-events: none;
  z-index: 2;
}

.wp-mask-top {
  top: 0;
  height: calc(50% - var(--row-h) / 2);
  background: linear-gradient(to bottom, var(--qyl-surface-2), transparent);
}

.wp-mask-bottom {
  bottom: 0;
  height: calc(50% - var(--row-h) / 2);
  background: linear-gradient(to top, var(--qyl-surface-2), transparent);
}
</style>
