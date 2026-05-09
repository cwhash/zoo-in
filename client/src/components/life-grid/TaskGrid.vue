<script setup>
import { useActivityStore } from '@/stores/activity'
import { GRID_SEQUENCE, LEVEL_NAMES } from '@/config/constants'
import { formatFullDate } from '@/utils/helpers'

const emit = defineEmits(['selectTask'])
const activityStore = useActivityStore()
</script>

<template>
  <section class="grid-section" aria-label="Life Grid 任務格">
    <div class="level-legend" aria-hidden="true">
      <div class="legend-item level-S">S 1</div>
      <div class="legend-item level-A">A 2</div>
      <div class="legend-item level-B">B 4</div>
      <div class="legend-item level-C">C 8</div>
      <div class="legend-item level-N">N 10</div>
    </div>

    <div class="task-grid">
      <button
        v-for="taskId in GRID_SEQUENCE"
        :key="taskId"
        type="button"
        class="task-cell"
        :class="[
          `level-${taskId[0]}`,
          {
            completed: activityStore.getUserTask(taskId).status === 'completed',
            locked: Boolean(activityStore.getUserTask(taskId).locked_at) || !activityStore.isUserEditableTask(taskId),
          },
        ]"
        :aria-label="`${taskId} ${activityStore.getTaskTitle(taskId)}`"
        :data-completed-date="
          activityStore.getUserTask(taskId).status === 'completed'
            ? formatFullDate(activityStore.getUserTask(taskId).completed_at)
            : undefined
        "
        @click="emit('selectTask', taskId)"
      >
        {{ taskId }}
      </button>
    </div>
  </section>
</template>
