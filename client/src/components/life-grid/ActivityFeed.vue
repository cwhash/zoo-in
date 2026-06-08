<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useActivityStore } from '@/stores/activity'
import { getFeedItemDisplay } from '@/utils/helpers'

const activityStore = useActivityStore()
const currentIndex = ref(0)
let timer = null

const displayItems = computed(() =>
  activityStore.feedItems.map((item, index) => ({
    ...getFeedItemDisplay(item),
    feedKey: `${item.created_at || index}-${item.type || 'feed'}-${item.achievement_id || item.task_id || index}`,
  })),
)

const featuredItems = computed(() => {
  const achievements = displayItems.value.filter((item) => item.isAchievement)
  return achievements.length ? achievements : displayItems.value
})

const featuredItem = computed(() => {
  if (!featuredItems.value.length) return null
  return featuredItems.value[currentIndex.value % featuredItems.value.length]
})

const tickerItems = computed(() =>
  displayItems.value.length > 1 ? [...displayItems.value, ...displayItems.value] : displayItems.value,
)

const hasMultipleTickerItems = computed(() => displayItems.value.length > 1)

function startRotation() {
  stopRotation()
  if (featuredItems.value.length <= 1) return
  timer = setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % featuredItems.value.length
  }, 4000)
}

function stopRotation() {
  if (timer) { clearInterval(timer); timer = null }
}

watch(
  () => activityStore.feedItems
    .map((item) => `${item.created_at || ''}-${item.type || ''}-${item.achievement_id || item.task_id || ''}`)
    .join('|'),
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
      v-if="displayItems.length"
      class="activity-feed feed-arcade"
      @mouseenter="stopRotation"
      @mouseleave="startRotation"
      @focusin="stopRotation"
      @focusout="startRotation"
    >
      <article
        v-if="featuredItem"
        class="feed-feature"
        :class="[featuredItem.toneClass, { 'feed-feature-achievement': featuredItem.isAchievement }]"
        aria-live="polite"
      >
        <div class="feed-feature-badge" aria-hidden="true">
          <span>{{ featuredItem.badge }}</span>
        </div>
        <div class="feed-feature-copy">
          <p class="eyebrow">{{ featuredItem.eyebrow }}</p>
          <h3>{{ featuredItem.title }}</h3>
          <p>{{ featuredItem.body }}</p>
        </div>
      </article>

      <div
        class="feed-ticker"
        :class="{ 'is-static': !hasMultipleTickerItems }"
        aria-hidden="true"
      >
        <div class="feed-ticker-track">
          <span
            v-for="(item, index) in tickerItems"
            :key="`${item.feedKey}-${index}`"
            class="feed-chip"
            :class="item.toneClass"
            :title="item.sentence"
          >
            <strong>{{ item.badge }}</strong>
            <span>{{ item.shortText }}</span>
          </span>
        </div>
      </div>

      <ul class="feed-accessible-list">
        <li
          v-for="item in displayItems.slice(0, 10)"
          :key="item.feedKey"
        >
          {{ item.sentence }}
        </li>
      </ul>
    </div>

    <p v-else class="empty-text">目前還沒有公開動態。</p>
  </section>
</template>
