<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProfileStore } from '@/stores/profile'
import { useActivityStore } from '@/stores/activity'
import AppHeader from '@/components/shell/AppHeader.vue'
import NavDrawer from '@/components/shell/NavDrawer.vue'
import ProfileDrawer from '@/components/shell/ProfileDrawer.vue'
import AppToast from '@/components/ui/AppToast.vue'

const router = useRouter()
const authStore = useAuthStore()
const profileStore = useProfileStore()
const activityStore = useActivityStore()

const navOpen = ref(false)
const profileOpen = ref(false)

watch(
  () => authStore.user,
  async (user) => {
    if (user) {
      await profileStore.load()
      activityStore.attachListeners()
    } else {
      profileStore.$reset()
      activityStore.$reset()
      router.push({ name: 'login' })
    }
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="authStore.loading" class="login-screen">
    <p style="color: var(--muted)">載入中...</p>
  </div>
  <template v-else>
    <template v-if="authStore.isAuthenticated">
      <div class="app">
        <AppHeader
          @open-nav="navOpen = true"
          @open-profile="profileOpen = true"
        />
        <main>
          <RouterView />
        </main>
      </div>
      <NavDrawer v-model="navOpen" />
      <ProfileDrawer v-model="profileOpen" />
    </template>
    <RouterView v-else />
  </template>
  <AppToast />
</template>
