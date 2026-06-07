import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db, storage, functions } from '@/firebase'
import {
  ref as dbRef,
  update,
  onValue,
  query,
  orderByChild,
  equalTo,
  limitToLast,
} from 'firebase/database'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { httpsCallable } from 'firebase/functions'
import { useAuthStore } from './auth'
import {
  LIFE_GRID_ACTIVITY_ID,
  LIFE_GRID_MAX_USES,
  TASK_LIST_SEQUENCE,
  FALLBACK_ACTIVITY_CONFIG,
  DEV_FORCE_LIFE_GRID_ACTIVE,
  LIFE_GRID_START_AT,
  LIFE_GRID_END_AT,
  MAX_UPLOAD_IMAGE_BYTES,
} from '@/config/constants'
import { mergeActivityConfig, sanitizeText } from '@/utils/helpers'

export const useActivityStore = defineStore('activity', () => {
  const activityConfig = ref({ ...FALLBACK_ACTIVITY_CONFIG })
  const activityUnlock = ref(null)
  const userTasks = ref({})
  const userAchievements = ref({})
  const feedItems = ref([])

  const unsubscribers = []

  const isUnlocked = computed(() => Boolean(activityUnlock.value?.unlocked_at))

  const completedTasks = computed(() =>
    TASK_LIST_SEQUENCE.filter((id) => userTasks.value[id]?.status === 'completed'),
  )

  const completedCount = computed(() => completedTasks.value.length)

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
      return task.custom_title || `${taskId} 自訂任務`
    }
    return def?.title || `官方任務 ${taskId}`
  }

  function getTaskDescription(taskId) {
    const task = getUserTask(taskId)
    const def = getTaskDefinition(taskId)
    return isUserEditableTask(taskId) ? task.custom_description || '' : def?.description || ''
  }

  function attachListeners() {
    detachListeners()
    const authStore = useAuthStore()
    const uid = authStore.user?.uid
    if (!uid) return

    unsubscribers.push(onValue(
      dbRef(db, `activities/${LIFE_GRID_ACTIVITY_ID}`),
      (snapshot) => { activityConfig.value = mergeActivityConfig(snapshot.val()) },
    ))

    unsubscribers.push(onValue(
      dbRef(db, `users/${uid}/activity_unlocks/${LIFE_GRID_ACTIVITY_ID}`),
      (snapshot) => { activityUnlock.value = snapshot.val() },
    ))

    unsubscribers.push(onValue(
      dbRef(db, `users/${uid}/activities/${LIFE_GRID_ACTIVITY_ID}/tasks`),
      (snapshot) => { userTasks.value = snapshot.val() || {} },
    ))

    unsubscribers.push(onValue(
      dbRef(db, `users/${uid}/achievements/${LIFE_GRID_ACTIVITY_ID}`),
      (snapshot) => { userAchievements.value = snapshot.val() || {} },
    ))

    const feedQuery = query(
      dbRef(db, `activity_feeds/${LIFE_GRID_ACTIVITY_ID}`),
      orderByChild('created_at'),
      limitToLast(10),
    )
    unsubscribers.push(onValue(feedQuery, (snapshot) => {
      const raw = snapshot.val() || {}
      feedItems.value = Object.values(raw).sort(
        (a, b) => (b.created_at || 0) - (a.created_at || 0),
      )
    }))
  }

  function detachListeners() {
    unsubscribers.forEach((unsub) => unsub())
    unsubscribers.length = 0
  }

  async function unlockActivity(code) {
    const authStore = useAuthStore()
    if (!authStore.user?.uid) throw new Error('請先登入')
    if (isUnlocked.value) throw new Error('你已經解鎖這個活動')

    const fn = httpsCallable(functions, 'unlockActivity')
    const result = await fn({ code })
    return result.data
  }

  async function saveTaskPlan(taskId, title, description) {
    if (!isLifeGridActive()) throw new Error('活動尚未開始或已結束，現在不能編輯任務')
    const authStore = useAuthStore()
    const uid = authStore.user?.uid
    if (!uid) throw new Error('請先登入')

    const task = getUserTask(taskId)
    if (task.locked_at || task.status === 'completed') {
      throw new Error('任務規劃已鎖定或已完成，不能再修改')
    }
    if (!sanitizeText(title, 50)) {
      throw new Error('請輸入任務標題')
    }

    const taskRef = dbRef(db, `users/${uid}/activities/${LIFE_GRID_ACTIVITY_ID}/tasks/${taskId}`)
    await update(taskRef, {
      task_id: taskId,
      level: taskId[0],
      custom_title: sanitizeText(title, 50),
      custom_description: sanitizeText(description, 300),
      status: task.status || 'open',
      locked_at: Date.now(),
      updated_at: Date.now(),
    })
  }

  async function completeTask(taskId, imageBlob) {
    if (!isLifeGridActive()) throw new Error('活動尚未開始或已結束，現在不能完成任務')
    const authStore = useAuthStore()
    const uid = authStore.user?.uid
    if (!uid) throw new Error('請先登入')

    if (imageBlob.size > MAX_UPLOAD_IMAGE_BYTES) {
      throw new Error('照片檔案太大，請壓縮到 3MB 以下再上傳')
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

  async function adminUpdateActivityCode(code, maxUses) {
    const fn = httpsCallable(functions, 'adminUpdateActivityCode')
    return (await fn({ code, maxUses })).data
  }

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

  function attachAdminListeners() {
    detachListeners()

    const codeQuery = query(
      dbRef(db, 'activity_code_hashes'),
      orderByChild('activity_id'),
      equalTo(LIFE_GRID_ACTIVITY_ID),
    )
    unsubscribers.push(onValue(codeQuery, (snapshot) => {
      const latestCode = Object.values(snapshot.val() || {})
        .sort((a, b) => Number(b.updated_at || 0) - Number(a.updated_at || 0))[0] || {}
      activityConfig.value = {
        ...activityConfig.value,
        _codeUsed: Number(latestCode.used_count || 0),
        _codeMax: Number(latestCode.max_uses || LIFE_GRID_MAX_USES),
      }
    }))

    unsubscribers.push(onValue(
      dbRef(db, `activities/${LIFE_GRID_ACTIVITY_ID}`),
      (snapshot) => { activityConfig.value = mergeActivityConfig(snapshot.val()) },
    ))
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
    activityConfig,
    activityUnlock,
    userTasks,
    userAchievements,
    feedItems,
    isUnlocked,
    completedTasks,
    completedCount,
    isLifeGridActive,
    getTaskDefinition,
    getUserTask,
    isUserEditableTask,
    getTaskTitle,
    getTaskDescription,
    getTaskPhotoURL,
    attachListeners,
    attachAdminListeners,
    detachListeners,
    unlockActivity,
    saveTaskPlan,
    completeTask,
    adminUpdateActivityCode,
    adminUpdateNTask,
    adminResetTask,
    adminDeleteUser,
    $reset,
  }
})
