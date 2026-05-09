<script setup>
import { ref, watch, computed } from 'vue'
import { useActivityStore } from '@/stores/activity'
import { useToastStore } from '@/stores/toast'
import { LEVEL_NAMES } from '@/config/constants'
import { formatFullDate } from '@/utils/helpers'
import ImageCropper from './ImageCropper.vue'

const props = defineProps({
  taskId: { type: String, default: null },
})
const emit = defineEmits(['close'])

const activityStore = useActivityStore()
const toast = useToastStore()

const titleInput = ref('')
const descriptionInput = ref('')
const saving = ref(false)
const completing = ref(false)
const photoUrl = ref(null)
const cropperRef = ref(null)

const task = computed(() => props.taskId ? activityStore.getUserTask(props.taskId) : {})
const def = computed(() => props.taskId ? activityStore.getTaskDefinition(props.taskId) : null)
const editable = computed(() => props.taskId ? activityStore.isUserEditableTask(props.taskId) : false)
const completed = computed(() => task.value.status === 'completed')
const locked = computed(() => Boolean(task.value.locked_at))
const title = computed(() => props.taskId ? activityStore.getTaskTitle(props.taskId) : '')
const description = computed(() => props.taskId ? activityStore.getTaskDescription(props.taskId) : '')
const isActive = computed(() => activityStore.isLifeGridActive())
const canComplete = computed(() => !editable.value || locked.value)
const showUploader = computed(
  () => activityStore.isUnlocked && isActive.value && !completed.value,
)

const statusText = computed(() => {
  if (completed.value) return `已完成：${formatFullDate(task.value.completed_at)}`
  if (!isActive.value) return '活動已結束，只能查看。'
  return '尚未完成'
})

watch(
  () => props.taskId,
  async (id) => {
    photoUrl.value = null
    if (!id) return
    titleInput.value = title.value.startsWith(id) ? '' : title.value
    descriptionInput.value = description.value

    if (completed.value && task.value.image_path) {
      try {
        photoUrl.value = await activityStore.getTaskPhotoURL(task.value.image_path)
      } catch {
        photoUrl.value = null
      }
    }
  },
  { immediate: true },
)

async function lockTask() {
  saving.value = true
  try {
    await activityStore.saveTaskPlan(props.taskId, titleInput.value, descriptionInput.value)
    toast.show('任務內容已鎖定。')
  } catch (err) {
    toast.show(err.message || '儲存任務失敗。')
  } finally {
    saving.value = false
  }
}

async function complete() {
  if (!cropperRef.value) return
  completing.value = true
  try {
    const blob = await cropperRef.value.getCroppedBlob()
    if (!blob) {
      toast.show('完成任務需要上傳一張 4:5 照片。')
      return
    }
    const result = await activityStore.completeTask(props.taskId, blob)
    toast.show('任務已完成。')
    const achievements = result?.unlockedAchievements || []
    achievements.forEach((a) => toast.show(`解鎖成就：${a.title}`))
    emit('close')
  } catch (err) {
    toast.show(err.message || '完成任務失敗，請稍後再試。')
  } finally {
    completing.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="taskId" class="overlay" @click="emit('close')" />
    <aside
      class="task-panel"
      :class="{ open: !!taskId }"
      :aria-hidden="String(!taskId)"
    >
      <div class="task-panel-header">
        <div>
          <p class="eyebrow">{{ taskId }} · {{ LEVEL_NAMES[taskId?.[0]] }}</p>
          <h2>{{ title }}</h2>
        </div>
        <button class="close-button" type="button" aria-label="關閉" @click="emit('close')">×</button>
      </div>

      <div v-if="taskId" class="task-panel-body">
        <!-- 狀態 -->
        <div class="task-status">{{ statusText }}</div>

        <!-- 可編輯欄位 (S/A/B/C 未鎖定) -->
        <section v-if="editable && !locked && !completed" class="profile-form">
          <label class="task-field">
            <span>任務標題</span>
            <input v-model="titleInput" type="text" maxlength="50" />
          </label>
          <label class="task-field">
            <span>任務描述</span>
            <textarea v-model="descriptionInput" maxlength="300" />
          </label>
          <button class="primary-btn" type="button" :disabled="saving" @click="lockTask">
            填寫完成並鎖定
          </button>
        </section>

        <!-- 已鎖定 / N 任務唯讀 -->
        <div v-else class="task-status">
          <strong>{{ title }}</strong>
          <p>{{ description || '尚無描述。' }}</p>
          <p v-if="editable">任務內容已鎖定，如需修改請向管理員申請。</p>
        </div>

        <!-- 已完成照片 -->
        <div v-if="completed && photoUrl" class="task-status">
          <img class="completed-photo" :src="photoUrl" alt="完成任務照片" />
        </div>

        <!-- 上傳 + 裁切 + 完成按鈕 -->
        <ImageCropper
          v-if="showUploader"
          ref="cropperRef"
          :can-complete="canComplete"
          :completing="completing"
          @complete="complete"
        />
      </div>
    </aside>
  </Teleport>
</template>
