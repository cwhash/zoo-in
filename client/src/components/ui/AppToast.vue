<script setup>
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="toast.visible"
      class="toast"
      role="status"
      aria-live="polite"
    >
      {{ toast.message }}
    </div>
  </Teleport>
</template>
