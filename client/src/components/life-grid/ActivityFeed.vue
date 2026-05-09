<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { useActivityStore } from '@/stores/activity'
import { formatFeedItem } from '@/utils/helpers'

const activityStore = useActivityStore()
const currentIndex = ref(0)
let timer = null

function startRotation() {
  stopRotation()
  if (activityStore.feedItems.length <= 1) return
  timer = setInterval(() => {
    currentIndex.value =
      (currentIndex.value + 1) % activityStore.feedItems.length
  }, 4000)
}

function stopRotation() {
  if (timer) { clearInterval(timer); timer = null }
}

watch(
  () => activityStore.feedItems.length,
  () => {
    currentIndex.value = 0
    startRotation()
  },
  { immediate: true },
)

onBeforeUnmount(() => stopRotation())
</script>

<template>
  <section class="feed-panel" aria-labelledby="feedTitle">
    <div class="section-head">
      <div>
        <p class="eyebrow">公開動態</p>
        <h2 id="feedTitle">近期完成與成就</h2>
      </div>
    </div>

    <div
      v-if="activityStore.feedItems.length"
      class="activity-feed"
      aria-live="polite"
      @mouseenter="stopRotation"
      @mouseleave="startRotation"
    >
      <article class="feed-item">
        <p>{{ formatFeedItem(activityStore.feedItems[currentIndex]) }}</p>
      </article>
    </div>

    <p v-else class="empty-text">目前還沒有公開動態。</p>
  </section>
</template>
