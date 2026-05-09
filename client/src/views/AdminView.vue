<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useActivityStore } from '@/stores/activity'
import { useToastStore } from '@/stores/toast'
import { db } from '@/firebase'
import { ref as dbRef, get } from 'firebase/database'
import { N_TASKS } from '@/config/constants'

const authStore = useAuthStore()
const activityStore = useActivityStore()
const toast = useToastStore()

const isAdmin = ref(false)
const loading = ref(true)

// N Task editor state
const nTaskForms = ref({})

// Reset task
const resetUid = ref('')
const resetTaskId = ref('')
const resetMsg = ref('')
const resetError = ref(false)
const resetting = ref(false)

// Delete user
const deleteUid = ref('')
const deleteMsg = ref('')
const deleteError = ref(false)
const deleting = ref(false)

// Code usage
const codeUsed = ref(0)
const codeMax = ref(999)

onMounted(async () => {
  const uid = authStore.user?.uid
  if (!uid) { loading.value = false; return }

  const snap = await get(dbRef(db, `admins/${uid}`))
  isAdmin.value = snap.val() === true

  if (isAdmin.value) {
    activityStore.attachAdminListeners()
    initNTaskForms()
  }
  loading.value = false
})

onBeforeUnmount(() => {
  activityStore.detachListeners()
})

function initNTaskForms() {
  const tasks = activityStore.activityConfig?.tasks || {}
  const forms = {}
  N_TASKS.forEach((id) => {
    const t = tasks[id] || {}
    forms[id] = {
      title: t.title || `官方任務 ${id}`,
      description: t.description || '',
    }
  })
  nTaskForms.value = forms
}

async function saveNTask(taskId) {
  const form = nTaskForms.value[taskId]
  if (!form?.title?.trim()) {
    toast.show('N 任務標題必填。')
    return
  }
  try {
    await activityStore.adminUpdateNTask(taskId, form.title.trim(), form.description.trim())
    toast.show(`${taskId} 已儲存。`)
  } catch (err) {
    toast.show(err?.message || '儲存失敗。')
  }
}

async function resetTask(event) {
  event.preventDefault()
  if (!resetUid.value.trim() || !resetTaskId.value.trim()) {
    resetMsg.value = '請填寫 UID 與任務代號。'
    resetError.value = true
    return
  }
  resetting.value = true
  resetMsg.value = '處理中...'
  resetError.value = false
  try {
    await activityStore.adminResetTask(resetUid.value.trim(), resetTaskId.value.trim().toUpperCase())
    resetMsg.value = '已取消完成狀態，相關成就也會重新檢查。'
  } catch (err) {
    resetMsg.value = err?.message || '操作失敗。'
    resetError.value = true
  } finally {
    resetting.value = false
  }
}

async function deleteUser(event) {
  event.preventDefault()
  if (!deleteUid.value.trim()) {
    deleteMsg.value = '請填寫會員 UID。'
    deleteError.value = true
    return
  }
  if (!confirm('確定刪除這位會員的 Zoo-In 資料、照片、動態與成就嗎？Firebase Auth 帳號不會刪除。')) return

  deleting.value = true
  deleteMsg.value = '刪除中...'
  deleteError.value = false
  try {
    await activityStore.adminDeleteUser(deleteUid.value.trim())
    deleteMsg.value = '會員資料已刪除。'
    deleteUid.value = ''
  } catch (err) {
    deleteMsg.value = err?.message || '刪除失敗。'
    deleteError.value = true
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <section v-if="loading" class="dashboard-view">
    <p class="muted-text">載入中...</p>
  </section>

  <section v-else-if="!isAdmin" class="dashboard-view">
    <section class="unlock-panel">
      <p class="muted-text">這個 Google 帳號沒有管理員權限。</p>
    </section>
  </section>

  <section v-else class="admin-grid">
    <!-- N 任務編輯 -->
    <section class="admin-panel">
      <p class="eyebrow">N 任務編輯</p>
      <h2>官方任務管理</h2>
      <p class="muted-text">
        使用次數：{{ activityStore.activityConfig?._codeUsed || 0 }} /
        {{ activityStore.activityConfig?._codeMax || 999 }}
      </p>

      <div class="n-task-editor">
        <article
          v-for="taskId in N_TASKS"
          :key="taskId"
          class="admin-task-row"
        >
          <h3>{{ taskId }}</h3>
          <label>
            <span>標題</span>
            <input
              v-model="nTaskForms[taskId].title"
              type="text"
              maxlength="60"
            />
          </label>
          <label>
            <span>描述</span>
            <textarea
              v-model="nTaskForms[taskId].description"
              maxlength="300"
            />
          </label>
          <button class="primary-btn" type="button" @click="saveNTask(taskId)">
            儲存 {{ taskId }}
          </button>
        </article>
      </div>
    </section>

    <!-- 取消完成 -->
    <section class="admin-panel">
      <p class="eyebrow">管理</p>
      <h2>取消任務完成</h2>
      <form @submit="resetTask">
        <label class="task-field">
          <span>會員 UID</span>
          <input v-model="resetUid" type="text" />
        </label>
        <label class="task-field">
          <span>任務代號（如 C1, N3）</span>
          <input v-model="resetTaskId" type="text" />
        </label>
        <button class="primary-btn" type="submit" :disabled="resetting" style="margin-top: 8px">
          取消完成
        </button>
        <p class="form-message" :class="{ error: resetError }">{{ resetMsg }}</p>
      </form>
    </section>

    <!-- 刪除會員 -->
    <section class="admin-panel">
      <h2>刪除會員資料</h2>
      <form @submit="deleteUser">
        <label class="task-field">
          <span>會員 UID</span>
          <input v-model="deleteUid" type="text" />
        </label>
        <button
          class="primary-btn"
          type="submit"
          :disabled="deleting"
          style="margin-top: 8px; background: var(--danger); border-color: var(--danger)"
        >
          刪除會員資料
        </button>
        <p class="form-message" :class="{ error: deleteError }">{{ deleteMsg }}</p>
      </form>
    </section>
  </section>
</template>
