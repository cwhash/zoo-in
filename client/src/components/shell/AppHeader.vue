<script setup>
import { useAuthStore } from '@/stores/auth'
import { useRoute } from 'vue-router'
import AnimatedLogo from './AnimatedLogo.vue'

defineEmits(['openNav', 'openProfile'])

const authStore = useAuthStore()
const route = useRoute()
</script>

<template>
  <header class="topbar">
    <button
      class="icon-button"
      type="button"
      aria-label="開啟選單"
      @click="$emit('openNav')"
    >
      <span /><span /><span />
    </button>

    <div class="brand">
      <AnimatedLogo :size="32" />
      <h1>{{ route.meta.title || 'ZOO-IN' }}</h1>
    </div>

    <button
      class="avatar-button"
      type="button"
      aria-label="會員資料"
      @click="$emit('openProfile')"
    >
      <img
        class="google-avatar"
        :src="authStore.user?.photoURL || ''"
        :alt="authStore.user?.displayName || ''"
      />
    </button>
  </header>
</template>
