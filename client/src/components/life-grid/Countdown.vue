<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { LIFE_GRID_END_AT } from '@/config/constants'

const display = ref('載入中...')
let timer = null

function draw() {
  const diff = LIFE_GRID_END_AT - Date.now()
  if (diff <= 0) {
    display.value = '活動已結束，只能查看紀錄。'
    if (timer) { clearInterval(timer); timer = null }
    return
  }
  const total = Math.floor(diff / 1000)
  const d = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  display.value = `${d} 天 ${h} 小時 ${m} 分 ${s} 秒`
}

onMounted(() => {
  draw()
  timer = setInterval(draw, 1000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <section class="countdown-section" aria-label="活動倒數">
    <p class="countdown-title">活動倒數</p>
    <p class="countdown-value" aria-live="polite">{{ display }}</p>
  </section>
</template>
