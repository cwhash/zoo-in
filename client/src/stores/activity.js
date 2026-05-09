import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db, storage, functions } from '@/firebase'
import {
  ref as dbRef,
  get,
  update,
  onValue,
  query,
  orderByChild,
  limitToLast,
} from 'firebase/database'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { httpsCallable } from 'firebase/functions'
import { useAuthStore } from './auth'
import {
  LIFE_GRID_ACTIVITY_ID,
  TASK_LIST_SEQUENCE,
  GRID_SEQUENCE,
  FALLBACK_ACTIVITY_CONFIG,
  DEV_FORCE_LIFE_GRID_ACTIVE,
  LIFE_GRID_START_AT,
  LIFE_GRID_END_AT,
  LEVEL_NAMES,
} from '@/config/constants'
import { mergeActivityConfig, sanitizeText } from '@/utils/helpers'

export const useActivityStore = defineStore('activity', () => {
  const activityConfig = ref({ ...FALLBACK_ACTIVITY_CONFIG })
  const activityUnlock = ref(null)
  const userTasks = ref({})
  const userAchievements = ref({})
  const feedItems = ref([])

  const unsubscribers = []

  // --- Computed ---
  const isUnlocked = computed(() => Boolean(activityUnlock.value?.unlocked_at))

  const completedTasks = computed(() =>
    TASK_LIST_SEQUENCE.filter((id) => userTasks.value[id]?.status === 'completed'),
  )

  const completedCount = computed(() => completedTasks.value.length)

  // --- Helpers ---
  function isLifeGridActive() {
    if (DEV_FORCE_LIFE_GRID_ACTIVE) return true
    const time = Date.now()
    const status = activityConfig.value?.status || 'active'
    return status === 'active' && time >= LIFE_GRID_START_AT && time < LIFE_GRID_END_AT
  }

  function getTaskDefinition(taskId) {
    return activityConfig.value.tasks?.[taskId] || FALLBACK_ACTIVITY_CONFIG.tasks[taskId]
  }

  function getUserTask(taskId) {
    return userTasks.value?.[taskId] || {}
  }

  function isUserEditableTask(taskId) {
    return taskId[0] !== 'N'
  }

  function getTaskTitle(taskId) {
    const task = getUserTask(taskId)
    const def = getTaskDefinition(taskId)
    if (isUserEditableTask(taskId)) {
      return task.custom_title || `${taskId} 尚未填寫`
    }
    return def?.title || `官方任務 ${taskId}`
  }

  function getTaskDescription(taskId) {
    const task = getUserTask(taskId)
    const def = getTaskDefinition(taskId)
    return isUserEditableTask(taskId) ? task.custom_description || '' : def?.description || ''
  }

  // --- Listeners ---
  function attachListeners() {
    detachListeners()
    const authStore = useAuthStore()
    const uid = authStore.user?.uid
    if (!uid) return

    const unsub1 = onValue(
      dbRef(db, `activities/${LIFE_GRID_ACTIVITY_ID}`),
      (snapshot) => { activityConfig.value = mergeActivityConfig(snapshot.val()) },
    )
    unsubscribers.push(unsub1)

    const unsub2 = onValue(
      dbRef(db, `users/${uid}/activity_unlocks/${LIFE_GRID_ACTIVITY_ID}`),
      (snapshot) => { activityUnlock.value = snapshot.val() },
    )
    unsubscribers.push(unsub2)

    const unsub3 = onValue(
      dbRef(db, `users/${uid}/activities/${LIFE_GRID_ACTIVITY_ID}/tasks`),
      (snapshot) => { userTasks.value = snapshot.val() || {} },
    )
    unsubscribers.push(unsub3)

    const unsub4 = onValue(
      dbRef(db, `users/${uid}/achievements/${LIFE_GRID_ACTIVITY_ID}`),
      (snapshot) => { userAchievements.value = snapshot.val() || {} },
    )
    unsubscribers.push(unsub4)

    const feedQuery = query(
      dbRef(db, `activity_feeds/${LIFE_GRID_ACTIVITY_ID}`),
      orderByChild('created_at'),
      limitToLast(10),
    )
    const unsub5 = onValue(feedQuery, (snapshot) => {
      const raw = snapshot.val() || {}
      feedItems.value = Object.values(raw).sort(
        (a, b) => (b.created_at || 0) - (a.created_at || 0),
      )
    })
    unsubscribers.push(unsub5)
  }

  function detachListeners() {
    unsubscribers.forEach((unsub) => unsub())
    unsubscribers.length = 0
  }

  // --- Actions ---
  async function unlockActivity(code) {
    const authStore = useAuthStore()
    const uid = authStore.user?.uid
    if (!uid) throw new Error('請先登入')

    // DEV HARDCODE bypass
    const DEV_HARDCODE_CODE = '2027-LIFE-GRID'
    if (code.toUpperCase() === DEV_HARDCODE_CODE) {
      const unlockPath = `users/${uid}/activity_unlocks/${LIFE_GRID_ACTIVITY_ID}`
      const existing = await get(dbRef(db, unlockPath))
      if (!existing.exists()) {
        const time = Date.now()
        const defaultTasks = Object.fromEntries(
          TASK_LIST_SEQUENCE.map((taskId) => [taskId, {
            task_id: taskId,
            level: taskId[0],
            status: 'open',
            created_at: time,
            updated_at: time,
          }]),
        )
        await update(dbRef(db), {
          [unlockPath]: {
            activity_id: LIFE_GRID_ACTIVITY_ID,
            unlocked_at: time,
            code: DEV_HARDCODE_CODE,
          },
          [`users/${uid}/activities/${LIFE_GRID_ACTIVITY_ID}/joined_at`]: time,
          [`users/${uid}/activities/${LIFE_GRID_ACTIVITY_ID}/updated_at`]: time,
          [`users/${uid}/activities/${LIFE_GRID_ACTIVITY_ID}/tasks`]: defaultTasks,
        })
      }
      return { activityName: 'Life Grid 2027' }
    }

    const callUnlock = httpsCallable(functions, 'unlockActivity')
    const result = await callUnlock({ code })
    return result.data
  }

  async function saveTaskPlan(taskId, title, description) {
    if (!isLifeGridActive()) throw new Error('活動已結束，目前只能查看紀錄。')
    const authStore = useAuthStore()
    const uid = authStore.user?.uid
    if (!uid) throw new Error('請先登入')

    const task = getUserTask(taskId)
    if (task.locked_at || task.status === 'completed') {
      throw new Error('任務內容已鎖定，如需修改請向管理員申請。')
    }
    if (!sanitizeText(title, 50)) {
      throw new Error('請先填寫任務標題。')
    }

    const updates = {
      task_id: taskId,
      level: taskId[0],
      custom_title: sanitizeText(title, 50),
      custom_description: sanitizeText(description, 300),
      status: task.status || 'open',
      locked_at: Date.now(),
      updated_at: Date.now(),
    }

    const taskRef = dbRef(
      db,
      `users/${uid}/activities/${LIFE_GRID_ACTIVITY_ID}/tasks/${taskId}`,
    )
    await update(taskRef, updates)
  }

  async function completeTask(taskId, imageBlob) {
    if (!isLifeGridActive()) throw new Error('活動已結束，目前只能查看紀錄。')
    const authStore = useAuthStore()
    const uid = authStore.user?.uid
    if (!uid) throw new Error('請先登入')

    if (imageBlob.size > 3 * 1024 * 1024) {
      throw new Error('照片壓縮後仍超過 3MB，請換一張較小的照片。')
    }

    const imagePath = `submissions/${LIFE_GRID_ACTIVITY_ID}/${uid}/${taskId}.jpg`
    const imgRef = storageRef(storage, imagePath)
    await uploadBytes(imgRef, imageBlob, {
      contentType: 'image/jpeg',
      customMetadata: { activity_id: LIFE_GRID_ACTIVITY_ID, task_id: taskId },
    })

    const callComplete = httpsCallable(functions, 'completeTask')
    const result = await callComplete({
      activityId: LIFE_GRID_ACTIVITY_ID,
      taskId,
      imagePath,
    })
    return result.data
  }

  async function getTaskPhotoURL(imagePath) {
    if (!imagePath) return null
    const imgRef = storageRef(storage, imagePath)
    return getDownloadURL(imgRef)
  }

  // --- Admin Actions ---
  async function adminUpdateNTask(taskId, title, description) {
    const fn = httpsCallable(functions, 'adminUpdateNTask')
    return (await fn({ taskId, title, description })).data
  }

  async function adminResetTask(uid, taskId) {
    const fn = httpsCallable(functions, 'adminResetTaskCompletion')
    return (await fn({ uid, taskId })).data
  }

  async function adminDeleteUser(targetUid) {
    const fn = httpsCallable(functions, 'adminDeleteUserData')
    return (await fn({ uid: targetUid })).data
  }

  // --- Admin Listeners ---
  function attachAdminListeners() {
    detachListeners()

    const unsub1 = onValue(
      dbRef(db, `activity_codes/${LIFE_GRID_ACTIVITY_ID}`),
      (snapshot) => {
        const code = snapshot.val() || {}
        activityConfig.value = {
          ...activityConfig.value,
          _codeUsed: Number(code.used_count || 0),
          _codeMax: Number(code.max_uses || 999),
        }
      },
    )
    unsubscribers.push(unsub1)

    const unsub2 = onValue(
      dbRef(db, `activities/${LIFE_GRID_ACTIVITY_ID}`),
      (snapshot) => { activityConfig.value = mergeActivityConfig(snapshot.val()) },
    )
    unsubscribers.push(unsub2)
  }

  function $reset() {
    detachListeners()
    activityConfig.value = { ...FALLBACK_ACTIVITY_CONFIG }
    activityUnlock.value = null
    userTasks.value = {}
    userAchievements.value = {}
    feedItems.value = []
  }

  return {
    // State
    activityConfig,
    activityUnlock,
    userTasks,
    userAchievements,
    feedItems,
    // Computed
    isUnlocked,
    completedTasks,
    completedCount,
    // Helpers
    isLifeGridActive,
    getTaskDefinition,
    getUserTask,
    isUserEditableTask,
    getTaskTitle,
    getTaskDescription,
    getTaskPhotoURL,
    // Listeners
    attachListeners,
    attachAdminListeners,
    detachListeners,
    // Actions
    unlockActivity,
    saveTaskPlan,
    completeTask,
    adminUpdateNTask,
    adminResetTask,
    adminDeleteUser,
    $reset,
  }
})
