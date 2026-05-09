<script setup>
import { ref, onBeforeUnmount } from 'vue'
import { OUTPUT_IMAGE_WIDTH, OUTPUT_IMAGE_HEIGHT } from '@/config/constants'

const props = defineProps({
  canComplete: { type: Boolean, default: false },
  completing: { type: Boolean, default: false },
})
const emit = defineEmits(['complete'])

const selectedImage = ref(null)
const selectedImageUrl = ref(null)
const cropVisible = ref(false)
const cropState = ref({ zoom: 1, x: 0, y: 0 })

function handleFileChange(event) {
  const file = event.target.files?.[0]
  if (!file) return
  resetCrop()

  selectedImageUrl.value = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => {
    selectedImage.value = img
    cropVisible.value = true
  }
  img.src = selectedImageUrl.value
}

function resetCrop() {
  if (selectedImageUrl.value) URL.revokeObjectURL(selectedImageUrl.value)
  selectedImage.value = null
  selectedImageUrl.value = null
  cropVisible.value = false
  cropState.value = { zoom: 1, x: 0, y: 0 }
}

onBeforeUnmount(() => {
  if (selectedImageUrl.value) URL.revokeObjectURL(selectedImageUrl.value)
})

function getImageStyle() {
  const img = selectedImage.value
  const frame = document.querySelector('.crop-frame')
  if (!img || !frame) return {}

  const rect = frame.getBoundingClientRect()
  const baseScale =
    Math.max(rect.width / img.naturalWidth, rect.height / img.naturalHeight) *
    cropState.value.zoom
  const dw = img.naturalWidth * baseScale
  const dh = img.naturalHeight * baseScale
  const maxX = Math.max(0, (dw - rect.width) / 2)
  const maxY = Math.max(0, (dh - rect.height) / 2)

  return {
    width: `${dw}px`,
    height: `${dh}px`,
    transform: `translate(calc(-50% + ${(cropState.value.x / 100) * maxX}px), calc(-50% + ${(cropState.value.y / 100) * maxY}px))`,
  }
}

function getCroppedBlob() {
  return new Promise((resolve, reject) => {
    const img = selectedImage.value
    if (!img) { resolve(null); return }

    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_IMAGE_WIDTH
    canvas.height = OUTPUT_IMAGE_HEIGHT
    const ctx = canvas.getContext('2d')

    const sourceScale =
      Math.max(OUTPUT_IMAGE_WIDTH / img.naturalWidth, OUTPUT_IMAGE_HEIGHT / img.naturalHeight) *
      cropState.value.zoom
    const sw = OUTPUT_IMAGE_WIDTH / sourceScale
    const sh = OUTPUT_IMAGE_HEIGHT / sourceScale
    const rangeX = Math.max(0, (img.naturalWidth - sw) / 2)
    const rangeY = Math.max(0, (img.naturalHeight - sh) / 2)
    const cx = img.naturalWidth / 2 - (cropState.value.x / 100) * rangeX
    const cy = img.naturalHeight / 2 - (cropState.value.y / 100) * rangeY
    const sx = Math.max(0, Math.min(img.naturalWidth - sw, cx - sw / 2))
    const sy = Math.max(0, Math.min(img.naturalHeight - sh, cy - sh / 2))

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUTPUT_IMAGE_WIDTH, OUTPUT_IMAGE_HEIGHT)
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Image export failed'))),
      'image/jpeg',
      0.85,
    )
  })
}

defineExpose({ getCroppedBlob })
</script>

<template>
  <section class="cropper">
    <label class="task-field">
      <span>完成照片，僅本人與管理員可見</span>
      <input type="file" accept="image/*" :disabled="!canComplete" @change="handleFileChange" />
    </label>

    <div v-if="cropVisible" class="cropper">
      <div class="crop-frame">
        <img :src="selectedImageUrl" alt="" :style="getImageStyle()" />
      </div>
      <div class="crop-controls">
        <label>
          縮放
          <input v-model.number="cropState.zoom" type="range" min="1" max="2.4" step="0.01" />
        </label>
        <label>
          左右
          <input v-model.number="cropState.x" type="range" min="-100" max="100" step="1" />
        </label>
        <label>
          上下
          <input v-model.number="cropState.y" type="range" min="-100" max="100" step="1" />
        </label>
      </div>
    </div>

    <button
      class="primary-btn"
      type="button"
      :disabled="!canComplete || completing"
      @click="emit('complete')"
    >
      {{ completing ? '處理中...' : '完成任務' }}
    </button>
    <p v-if="!canComplete" class="muted-text">請先填寫並鎖定任務內容。</p>
  </section>
</template>
