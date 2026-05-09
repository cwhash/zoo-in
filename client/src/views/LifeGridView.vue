<script setup>
import { ref } from 'vue'
import { useActivityStore } from '@/stores/activity'
import TaskGrid from '@/components/life-grid/TaskGrid.vue'
import TaskPanel from '@/components/life-grid/TaskPanel.vue'
import AchievementList from '@/components/life-grid/AchievementList.vue'
import ActivityFeed from '@/components/life-grid/ActivityFeed.vue'
import Countdown from '@/components/life-grid/Countdown.vue'

const activityStore = useActivityStore()
const selectedTaskId = ref(null)
</script>

<template>
  <section class="life-grid-view">
    <!-- Hero -->
    <section class="activity-hero">
      <div>
        <p class="eyebrow">Life Grid 2027</p>
        <h2>Life Grid</h2>
        <p class="muted-text">2026/07/01 - 2027/12/31</p>
      </div>
      <div class="progress-pill">
        <strong>{{ activityStore.completedCount }} / 25</strong>
        <span>已完成</span>
      </div>
    </section>

    <!-- 倒數 -->
    <Countdown />

    <!-- 九宮格 -->
    <TaskGrid @select-task="selectedTaskId = $event" />

    <!-- 成就 -->
    <AchievementList />

    <!-- 動態 -->
    <ActivityFeed />

    <!-- 任務面板 -->
    <TaskPanel
      :task-id="selectedTaskId"
      @close="selectedTaskId = null"
    />
  </section>
</template>
