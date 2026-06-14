<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useActivityStore } from '@/stores/activity'
import { useToastStore } from '@/stores/toast'
import { auth, db } from '@/firebase'
import { ref as dbRef, get } from 'firebase/database'
import { LIFE_GRID_MAX_USES, N_TASKS } from '@/config/constants'

const authStore = useAuthStore()
const activityStore = useActivityStore()
const toast = useToastStore()

const isAdmin = ref(false)
const loading = ref(true)
const loadError = ref('')
const nTaskForms = ref({})

const activityCode = ref('')
const activityCodeMaxUses = ref(LIFE_GRID_MAX_USES)
const activityCodeMsg = ref('')
const activityCodeError = ref(false)
const savingActivityCode = ref(false)

const syncClaimsMsg = ref('')
const syncClaimsError = ref(false)
const syncingClaims = ref(false)

const resetUid = ref('')
const resetTaskId = ref('')
const resetMsg = ref('')
const resetError = ref(false)
const resetting = ref(false)

const deleteUid = ref('')
const deleteMsg = ref('')
const deleteError = ref(false)
const deleting = ref(false)

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
      initNTaskForms()
    }
  } catch (err) {
    console.error('Admin permission check failed', err)
    loadError.value = err?.message || '管理員權限檢查失敗'
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  activityStore.detachListeners()
})

function initNTaskForms() {
  const tasks = activityStore.activityConfig?.tasks || {}
  const forms = {}
  N_TASKS.forEach((id) => {
    const task = tasks[id] || {}
    forms[id] = {
      title: task.title || `官方任務 ${id}`,
      description: task.description || '',
    }
  })
  nTaskForms.value = forms
}

async function saveActivityCode(event) {
  event.preventDefault()
  if (!activityCode.value.trim()) {
    activityCodeMsg.value = '請輸入活動代碼'
    activityCodeError.value = true
    return
  }

  const maxUses = Number(activityCodeMaxUses.value)
  if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > LIFE_GRID_MAX_USES) {
    activityCodeMsg.value = `使用人數上限必須介於 1 到 ${LIFE_GRID_MAX_USES}`
    activityCodeError.value = true
    return
  }

  savingActivityCode.value = true
  activityCodeMsg.value = '儲存中...'
  activityCodeError.value = false
  try {
    const result = await activityStore.adminUpdateActivityCode(activityCode.value.trim(), maxUses)
    activityCode.value = ''
    activityCodeMsg.value = `活動代碼已更新，目前已使用 ${result.usedCount || 0} / ${result.maxUses || maxUses}`
  } catch (err) {
    activityCodeMsg.value = err?.message || '活動代碼更新失敗'
    activityCodeError.value = true
  } finally {
    savingActivityCode.value = false
  }
}

async function syncMyClaims() {
  const uid = authStore.user?.uid
  if (!uid) {
    syncClaimsMsg.value = '找不到目前登入者 UID'
    syncClaimsError.value = true
    return
  }

  syncingClaims.value = true
  syncClaimsMsg.value = '同步中...'
  syncClaimsError.value = false
  try {
    await activityStore.adminSyncClaims(uid)
    await auth.currentUser?.getIdToken(true)
    syncClaimsMsg.value = '管理員 claim 已同步，登入 token 已重新整理'
  } catch (err) {
    syncClaimsMsg.value = err?.message || '同步失敗'
    syncClaimsError.value = true
  } finally {
    syncingClaims.value = false
  }
}

async function syncAllClaims() {
  if (!confirm('確定要依照 admins/{uid} 同步所有使用者的 admin claim 嗎？')) return

  syncingClaims.value = true
  syncClaimsMsg.value = '同步所有使用者中...'
  syncClaimsError.value = false
  try {
    const result = await activityStore.adminSyncAllClaims()
    syncClaimsMsg.value = `已掃描 ${result.scannedCount || 0} 位使用者，更新 ${result.updatedCount || 0} 筆 claim。受影響使用者需重新登入或重新整理 token。`
  } catch (err) {
    syncClaimsMsg.value = err?.message || '同步失敗'
    syncClaimsError.value = true
  } finally {
    syncingClaims.value = false
  }
}

async function saveNTask(taskId) {
  const form = nTaskForms.value[taskId]
  if (!form?.title?.trim()) {
    toast.show('N 任務標題不能空白')
    return
  }
  try {
    await activityStore.adminUpdateNTask(taskId, form.title.trim(), form.description.trim())
    toast.show(`${taskId} 已儲存`)
  } catch (err) {
    toast.show(err?.message || '儲存失敗')
  }
}

async function resetTask(event) {
  event.preventDefault()
  if (!resetUid.value.trim() || !resetTaskId.value.trim()) {
    resetMsg.value = '請填寫 UID 與任務代號'
    resetError.value = true
    return
  }
  resetting.value = true
  resetMsg.value = '重設中...'
  resetError.value = false
  try {
    await activityStore.adminResetTask(resetUid.value.trim(), resetTaskId.value.trim().toUpperCase())
    resetMsg.value = '任務已重設，提交紀錄與相關成就已重新整理'
  } catch (err) {
    resetMsg.value = err?.message || '重設失敗'
    resetError.value = true
  } finally {
    resetting.value = false
  }
}

async function deleteUser(event) {
  event.preventDefault()
  if (!deleteUid.value.trim()) {
    deleteMsg.value = '請填寫使用者 UID'
    deleteError.value = true
    return
  }
  if (!confirm('確定要刪除這位使用者在 Zoo-In 的資料嗎？這不會刪除 Firebase Auth 帳號。')) return

  deleting.value = true
  deleteMsg.value = '刪除中...'
  deleteError.value = false
  try {
    await activityStore.adminDeleteUser(deleteUid.value.trim())
    deleteMsg.value = '使用者資料已刪除'
    deleteUid.value = ''
  } catch (err) {
    deleteMsg.value = err?.message || '刪除失敗'
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
    <section class="admin-panel">
      <p class="eyebrow">管理員權限</p>
      <h2>同步 Storage 權限</h2>
      <p class="muted-text">
        Storage rules 使用 Firebase Auth custom claims。變更 admins 名單後，需要同步 claim，受影響使用者再重新登入或重新整理 token。
      </p>
      <div class="action-row">
        <button class="primary-btn" type="button" :disabled="syncingClaims" @click="syncMyClaims">
          同步我的管理員 claim
        </button>
        <button class="primary-btn" type="button" :disabled="syncingClaims" @click="syncAllClaims">
          同步所有管理員 claims
        </button>
      </div>
      <p class="form-message" :class="{ error: syncClaimsError }">{{ syncClaimsMsg }}</p>
    </section>

    <section class="admin-panel">
      <p class="eyebrow">Life Grid 活動代碼</p>
      <h2>設定活動代碼</h2>
      <p class="muted-text">
        使用次數：{{ activityStore.activityConfig?._codeUsed || 0 }} /
        {{ activityStore.activityConfig?._codeMax || LIFE_GRID_MAX_USES }}
      </p>
      <form @submit="saveActivityCode">
        <label class="task-field">
          <span>新活動代碼</span>
          <input
            v-model="activityCode"
            type="text"
            autocomplete="off"
            placeholder="輸入後會由後端轉成 SHA-256 hash"
          />
        </label>
        <label class="task-field">
          <span>使用人數上限</span>
          <input
            v-model.number="activityCodeMaxUses"
            type="number"
            min="1"
            :max="LIFE_GRID_MAX_USES"
          />
        </label>
        <button class="primary-btn" type="submit" :disabled="savingActivityCode" style="margin-top: 8px">
          儲存活動代碼
        </button>
        <p class="form-message" :class="{ error: activityCodeError }">{{ activityCodeMsg }}</p>
      </form>
    </section>

    <section class="admin-panel">
      <p class="eyebrow">N 任務管理</p>
      <h2>官方任務內容</h2>

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

    <section class="admin-panel">
      <p class="eyebrow">管理操作</p>
      <h2>重設任務完成狀態</h2>
      <form @submit="resetTask">
        <label class="task-field">
          <span>使用者 UID</span>
          <input v-model="resetUid" type="text" />
        </label>
        <label class="task-field">
          <span>任務代號，例如 C1 或 N3</span>
          <input v-model="resetTaskId" type="text" />
        </label>
        <button class="primary-btn" type="submit" :disabled="resetting" style="margin-top: 8px">
          重設任務
        </button>
        <p class="form-message" :class="{ error: resetError }">{{ resetMsg }}</p>
      </form>
    </section>

    <section class="admin-panel">
      <h2>刪除使用者資料</h2>
      <form @submit="deleteUser">
        <label class="task-field">
          <span>使用者 UID</span>
          <input v-model="deleteUid" type="text" />
        </label>
        <button
          class="primary-btn"
          type="submit"
          :disabled="deleting"
          style="margin-top: 8px; background: var(--danger); border-color: var(--danger)"
        >
          刪除使用者資料
        </button>
        <p class="form-message" :class="{ error: deleteError }">{{ deleteMsg }}</p>
      </form>
    </section>
  </section>
</template>
