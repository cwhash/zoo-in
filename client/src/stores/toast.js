import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useToastStore = defineStore('toast', () => {
  const message = ref('')
  const visible = ref(false)
  let timer = null

  function show(msg, duration = 4200) {
    message.value = msg
    visible.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      visible.value = false
      timer = null
    }, duration)
  }

  return { message, visible, show }
})
