<script setup>
import { computed } from 'vue'
import { useActivityStore } from '@/stores/activity'
import { formatFullDate } from '@/utils/helpers'

const activityStore = useActivityStore()

const entries = computed(() =>
  Object.entries(activityStore.userAchievements || {}).sort(
    ([, a], [, b]) => (b.earned_at || 0) - (a.earned_at || 0),
  ),
)
</script>

<template>
  <section class="achievement-panel" aria-labelledby="achievementsTitle">
    <div class="section-head">
      <div>
        <p class="eyebrow">隱藏成就</p>
        <h2 id="achievementsTitle">已解鎖成就</h2>
      </div>
      <span class="small-pill">{{ entries.length }}</span>
    </div>

    <div class="achievement-list">
      <article
        v-for="[id, earned] in entries"
        :key="id"
        class="achievement-item"
      >
        <h3>{{ earned.title || id }}</h3>
        <p class="muted-text">{{ earned.description || '' }}</p>
        <p class="muted-text">{{ formatFullDate(earned.earned_at) }} 解鎖</p>
      </article>
    </div>

    <p v-if="entries.length === 0" class="empty-text">尚未解鎖成就。</p>
  </section>
</template>
