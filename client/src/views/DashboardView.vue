<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useActivityStore } from '@/stores/activity'
import { useToastStore } from '@/stores/toast'

const router = useRouter()
const activityStore = useActivityStore()
const toast = useToastStore()

const code = ref('')
const unlocking = ref(false)
const unlockMessage = ref('')
const isError = ref(false)

async function unlock(event) {
  event.preventDefault()
  if (!code.value.trim()) {
    unlockMessage.value = '請輸入活動代碼。'
    isError.value = true
    return
  }

  unlocking.value = true
  unlockMessage.value = '驗證活動代碼中...'
  isError.value = false

  try {
    const result = await activityStore.unlockActivity(code.value)
    const name = result?.activityName || 'Life Grid 2027'
    code.value = ''
    unlockMessage.value = `已解鎖 ${name}。`
    toast.show(`已解鎖 ${name}`)
  } catch (err) {
    console.error(err)
    unlockMessage.value = err?.message || '解鎖失敗，請稍後再試。'
    isError.value = true
  } finally {
    unlocking.value = false
  }
}

function goLifeGrid() {
  router.push({ name: 'life-grid' })
}
</script>

<template>
  <section class="dashboard-view">
    <!-- 解鎖面板 -->
    <section class="unlock-panel" aria-labelledby="unlockTitle">
      <p class="eyebrow">活動代碼</p>
      <h2 id="unlockTitle">解鎖活動</h2>
      <form class="unlock-form" @submit="unlock">
        <input
          v-model="code"
          type="text"
          autocomplete="off"
          placeholder="輸入活動代碼"
        />
        <button class="primary-btn" type="submit" :disabled="unlocking">
          解鎖
        </button>
      </form>
      <p class="form-message" :class="{ error: isError }" aria-live="polite">
        {{ unlockMessage }}
      </p>
    </section>

    <!-- 活動列表 -->
    <section class="activity-panel" aria-labelledby="myActivitiesTitle">
      <div class="section-head">
        <div>
          <p class="eyebrow">我的活動</p>
          <h2 id="myActivitiesTitle">已解鎖</h2>
        </div>
      </div>

      <div v-if="activityStore.isUnlocked" class="activity-cards">
        <article class="activity-card">
          <div>
            <p class="eyebrow">進行中</p>
            <h3>Life Grid 2027</h3>
            <p class="muted-text">
              已完成 {{ activityStore.completedCount }} / 25，已解鎖
              {{ Object.keys(activityStore.userAchievements || {}).length }} 個成就
            </p>
          </div>
          <div class="activity-card-footer">
            <span class="small-pill">{{ activityStore.completedCount }}/25</span>
            <button class="primary-btn" type="button" @click="goLifeGrid">
              進入活動
            </button>
          </div>
        </article>
      </div>

      <p v-else class="empty-text">尚未解鎖任何活動。</p>
    </section>
  </section>
</template>
