<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useActivityStore } from '@/stores/activity'
import { db } from '@/firebase'
import { ref as dbRef, get } from 'firebase/database'

const router = useRouter()
const authStore = useAuthStore()
const activityStore = useActivityStore()

const isAdmin = ref(false)
const loading = ref(true)
const loadError = ref('')

onMounted(async () => {
  try {
    if (authStore.loading) {
      await authStore.init()
    }

    const uid = authStore.user?.uid
    if (!uid) return

    const snap = await get(dbRef(db, `admins/${uid}`))
    isAdmin.value = snap.val() === true

    if (isAdmin.value) {
      activityStore.attachAdminListeners()
    }
  } catch (err) {
    console.error('Admin activity center failed', err)
    loadError.value = err?.message || '管理員權限檢查失敗'
  } finally {
    loading.value = false
  }
})

function openLifeGrid() {
  router.push({ name: 'admin-life-grid-2027' })
}
</script>

<template>
  <section v-if="loading" class="dashboard-view">
    <p class="muted-text">載入中...</p>
  </section>

  <section v-else-if="loadError" class="dashboard-view">
    <section class="unlock-panel">
      <p class="muted-text">{{ loadError }}</p>
    </section>
  </section>

  <section v-else-if="!isAdmin" class="dashboard-view">
    <section class="unlock-panel">
      <p class="muted-text">此 Google 帳號沒有管理員權限。</p>
    </section>
  </section>

  <section v-else class="admin-grid">
    <button class="admin-activity-card" type="button" @click="openLifeGrid">
      <span class="eyebrow">Life Grid</span>
      <span class="admin-activity-card-title">Life Grid 2027</span>
      <span class="muted-text">
        使用次數：{{ activityStore.activityConfig?._codeUsed || 0 }} /
        {{ activityStore.activityConfig?._codeMax || 999 }}
      </span>
      <span class="admin-activity-card-action">進入活動設定</span>
    </button>
  </section>
</template>
