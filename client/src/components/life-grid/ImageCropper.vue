<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import {
  OUTPUT_IMAGE_WIDTH,
  OUTPUT_IMAGE_HEIGHT,
  OUTPUT_IMAGE_QUALITY,
  MAX_UPLOAD_IMAGE_BYTES,
  MAX_SOURCE_IMAGE_BYTES,
} from '@/config/constants'

const props = defineProps({
  canComplete: { type: Boolean, default: false },
  completing: { type: Boolean, default: false },
})
const emit = defineEmits(['complete'])

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ACCEPTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']
const ACCEPTED_IMAGE_INPUT =
  'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'
const MIN_ZOOM = 1
const MAX_ZOOM = 3
const IMAGE_ASPECT_RATIO = OUTPUT_IMAGE_WIDTH / OUTPUT_IMAGE_HEIGHT

const cropperRef = ref(null)
const fileInputRef = ref(null)
const selectedImageUrl = ref(null)
const selectedImageName = ref('')
const cropError = ref('')
const loadingImage = ref(false)
const imageReady = ref(false)
const zoomValue = ref(MIN_ZOOM)
const baseCropWidth = ref(null)

const hasImage = computed(() => Boolean(selectedImageUrl.value))
const completeDisabled = computed(
  () => !props.canComplete || props.completing || loadingImage.value || Boolean(cropError.value),
)

const stencilProps = {
  aspectRatio: IMAGE_ASPECT_RATIO,
  handlers: {},
  movable: false,
  resizable: false,
}

const cropCanvasOptions = {
  width: OUTPUT_IMAGE_WIDTH,
  height: OUTPUT_IMAGE_HEIGHT,
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'high',
  fillColor: '#ffffff',
}

const resizeImageOptions = {
  wheel: true,
  touch: true,
  adjustStencil: false,
}

const moveImageOptions = {
  mouse: true,
  touch: true,
}

function getStencilSize({ boundaries }) {
  const maxWidth = Math.min(boundaries.width * 0.86, boundaries.height * IMAGE_ASPECT_RATIO * 0.9, 280)
  return {
    width: maxWidth,
    height: maxWidth / IMAGE_ASPECT_RATIO,
  }
}

function formatFileSize(bytes) {
  const mb = bytes / (1024 * 1024)
  if (mb >= 1) return `${Math.round(mb)}MB`
  return `${Math.round(bytes / 1024)}KB`
}

function isSupportedImage(file) {
  const type = file.type.toLowerCase()
  const name = file.name.toLowerCase()
  return (
    ACCEPTED_IMAGE_TYPES.includes(type) ||
    ACCEPTED_IMAGE_EXTENSIONS.some((extension) => name.endsWith(extension))
  )
}

function getUnsupportedImageMessage(file) {
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  if (type.includes('heic') || type.includes('heif') || name.endsWith('.heic') || name.endsWith('.heif')) {
    return '目前不支援 HEIC/HEIF，請改用 JPG、PNG 或 WebP。'
  }
  return '請選擇 JPG、PNG 或 WebP 圖片。'
}

function openFilePicker() {
  if (!props.canComplete || props.completing) return
  fileInputRef.value?.click()
}

function handleFileChange(event) {
  const input = event.target
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  if (!isSupportedImage(file)) {
    resetCrop({ clearInput: false })
    cropError.value = getUnsupportedImageMessage(file)
    return
  }
  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    resetCrop({ clearInput: false })
    cropError.value = `照片原始檔超過 ${formatFileSize(MAX_SOURCE_IMAGE_BYTES)}，請先壓縮或換一張照片。`
    return
  }

  resetCrop({ clearInput: false })
  cropError.value = ''
  loadingImage.value = true
  imageReady.value = false
  selectedImageName.value = file.name
  selectedImageUrl.value = URL.createObjectURL(file)
}

function resetCrop({ clearInput = true } = {}) {
  if (selectedImageUrl.value) URL.revokeObjectURL(selectedImageUrl.value)
  selectedImageUrl.value = null
  selectedImageName.value = ''
  loadingImage.value = false
  imageReady.value = false
  zoomValue.value = MIN_ZOOM
  baseCropWidth.value = null
  if (clearInput && fileInputRef.value) fileInputRef.value.value = ''
}

function resetEditor() {
  cropperRef.value?.reset()
  zoomValue.value = MIN_ZOOM
  baseCropWidth.value = null
}

function rotateImage(angle) {
  if (!imageReady.value) return
  baseCropWidth.value = null
  zoomValue.value = MIN_ZOOM
  cropperRef.value?.rotate(angle)
}

function handleCropperReady() {
  loadingImage.value = false
  imageReady.value = true
  cropError.value = ''
}

function handleCropperError() {
  resetCrop()
  cropError.value = '照片無法讀取，請改用 JPG、PNG 或 WebP。'
}

function handleCropperChange({ coordinates }) {
  if (!coordinates?.width || !imageReady.value) return
  if (!baseCropWidth.value) baseCropWidth.value = coordinates.width
  const currentZoom = baseCropWidth.value / coordinates.width
  zoomValue.value = Number(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, currentZoom)).toFixed(2))
}

function handleZoomInput(event) {
  const nextZoom = Number(event.target.value)
  if (!Number.isFinite(nextZoom) || !cropperRef.value || !imageReady.value) return

  const factor = nextZoom / zoomValue.value
  zoomValue.value = nextZoom
  if (Number.isFinite(factor) && factor > 0) cropperRef.value.zoom(factor)
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('照片輸出失敗，請重新選擇照片。'))),
      'image/jpeg',
      quality,
    )
  })
}

async function getCroppedBlob() {
  if (!selectedImageUrl.value) return null
  if (!imageReady.value || loadingImage.value) {
    throw new Error('照片仍在讀取中，請稍後再試。')
  }

  const result = cropperRef.value?.getResult()
  const canvas = result?.canvas
  if (!canvas) throw new Error('照片裁切失敗，請重新選擇照片。')

  const qualitySteps = [OUTPUT_IMAGE_QUALITY, 0.8, 0.72, 0.64]
  for (const quality of qualitySteps) {
    const blob = await canvasToBlob(canvas, quality)
    if (blob.size <= MAX_UPLOAD_IMAGE_BYTES) return blob
  }

  throw new Error('照片壓縮後仍超過 3MB，請先壓縮或換一張照片。')
}

onBeforeUnmount(() => {
  resetCrop()
})

defineExpose({ getCroppedBlob })
</script>

<template>
  <section class="cropper">
    <div class="upload-field">
      <input
        ref="fileInputRef"
        class="file-input-control"
        type="file"
        :accept="ACCEPTED_IMAGE_INPUT"
        :disabled="!canComplete || completing"
        @change="handleFileChange"
      />
      <button
        class="ghost-btn upload-select-btn"
        type="button"
        :disabled="!canComplete || completing"
        @click="openFilePicker"
      >
        {{ hasImage ? '重新選圖' : '選擇照片' }}
      </button>
      <span class="upload-meta">JPG / PNG / WebP · 4:5</span>
    </div>

    <p v-if="cropError" class="form-message error">{{ cropError }}</p>

    <div v-if="hasImage" class="cropper-editor">
      <div class="cropper-stage">
        <Cropper
          ref="cropperRef"
          class="advanced-cropper"
          :src="selectedImageUrl"
          :stencil-props="stencilProps"
          :stencil-size="getStencilSize"
          :canvas="cropCanvasOptions"
          :resize-image="resizeImageOptions"
          :move-image="moveImageOptions"
          :check-orientation="true"
          :auto-zoom="true"
          :transitions="true"
          image-restriction="stencil"
          default-boundaries="fill"
          @ready="handleCropperReady"
          @error="handleCropperError"
          @change="handleCropperChange"
        />
        <div v-if="loadingImage" class="cropper-loading">讀取照片...</div>
      </div>

      <div class="crop-toolbar" aria-label="照片編輯工具">
        <button
          class="crop-tool-btn"
          type="button"
          aria-label="向左旋轉 90 度"
          :disabled="!imageReady"
          @click="rotateImage(-90)"
        >
          ↶
        </button>
        <button
          class="crop-tool-btn"
          type="button"
          aria-label="向右旋轉 90 度"
          :disabled="!imageReady"
          @click="rotateImage(90)"
        >
          ↷
        </button>
        <button
          class="crop-tool-btn crop-tool-btn-wide"
          type="button"
          :disabled="!imageReady"
          @click="resetEditor"
        >
          重設
        </button>
      </div>

      <label class="crop-zoom-control">
        <span>縮放</span>
        <input
          :value="zoomValue"
          type="range"
          :min="MIN_ZOOM"
          :max="MAX_ZOOM"
          step="0.01"
          :disabled="!imageReady"
          @input="handleZoomInput"
        />
      </label>

      <p v-if="selectedImageName" class="upload-filename">{{ selectedImageName }}</p>
    </div>

    <button
      class="primary-btn"
      type="button"
      :disabled="completeDisabled"
      @click="emit('complete')"
    >
      {{ completing ? '處理中...' : loadingImage ? '讀取照片...' : '完成任務' }}
    </button>
    <p v-if="!canComplete" class="muted-text">請先填寫並鎖定任務內容。</p>
  </section>
</template>
