<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import BottomNav from '@/components/BottomNav.vue'
import FloatButtons from '@/components/FloatButtons.vue'
import QuickCreateSheet from '@/components/QuickCreateSheet.vue'
import SettingsSheet from '@/components/SettingsSheet.vue'
import DiaryEditor from '@/components/DiaryEditor.vue'
import EventEditor from '@/components/EventEditor.vue'
import TodoEditor from '@/components/TodoEditor.vue'
import BirthdayEditor from '@/components/BirthdayEditor.vue'
import SearchSheet from '@/components/SearchSheet.vue'
import { loadDiaries } from '@/composables/useDiaries'
import { loadEvents } from '@/composables/useEvents'
import { loadTodos } from '@/composables/useTodos'
import { loadBirthdays } from '@/composables/useBirthdays'
import { ui } from '@/composables/useUi'
import { useShortcuts } from '@/composables/useShortcuts'

useShortcuts()

onMounted(() => {
  void loadDiaries()
  void loadEvents()
  void loadTodos()
  void loadBirthdays()
})
</script>

<template>
  <div class="app-root">
    <RouterView v-slot="{ Component, route }">
      <Transition name="page" mode="out-in">
        <component :is="Component" :key="route.path" />
      </Transition>
    </RouterView>

    <BottomNav />
    <FloatButtons />
    <QuickCreateSheet />
    <SettingsSheet />
    <DiaryEditor />
    <EventEditor />
    <TodoEditor />
    <BirthdayEditor />
    <SearchSheet />

    <Transition name="fade">
      <div v-if="ui.toast" class="toast">{{ ui.toast }}</div>
    </Transition>
  </div>
</template>

<style scoped>
.toast {
  position: fixed;
  left: 50%;
  bottom: calc(var(--qyl-nav-h) + 30px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  max-width: 80vw;
  padding: 10px 18px;
  border-radius: 999px;
  background: var(--qyl-text);
  color: var(--qyl-bg);
  font-size: 13.5px;
  line-height: 1.5;
  box-shadow: var(--qyl-shadow-lift);
  /* 必须高于所有弹层（弹层 z-index 为 70~80），否则提示会被遮住看不见 */
  z-index: 200;
  text-align: center;
  pointer-events: none;
}
</style>
