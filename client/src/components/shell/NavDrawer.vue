<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useActivityStore } from '@/stores/activity'
import { useToastStore } from '@/stores/toast'

const open = defineModel({ default: false })
const router = useRouter()
const activityStore = useActivityStore()
const toast = useToastStore()

function go(name) {
  if (name === 'life-grid' && !activityStore.isUnlocked) {
    toast.show('請先輸入活動代碼解鎖 Life Grid。')
    open.value = false
    return
  }
  router.push({ name })
  open.value = false
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="overlay" @click="open = false" />
    <aside
      class="side-drawer left-drawer"
      :class="{ open }"
      :aria-hidden="String(!open)"
    >
      <div class="drawer-header">
        <h2>選單</h2>
        <button class="close-button" type="button" aria-label="關閉" @click="open = false">×</button>
      </div>
      <nav class="drawer-nav">
        <button type="button" @click="go('dashboard')">活動中心</button>
        <button v-if="activityStore.isUnlocked" type="button" @click="go('life-grid')">Life Grid 2027</button>
      </nav>
    </aside>
  </Teleport>
</template>
