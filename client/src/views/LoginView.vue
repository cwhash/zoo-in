<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AnimatedLogo from '@/components/shell/AnimatedLogo.vue'

const authStore = useAuthStore()
const router = useRouter()
const errorMsg = ref('')
const signingIn = ref(false)

watch(
  () => authStore.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      router.replace({ name: 'dashboard' })
    }
  },
  { immediate: true },
)

async function login() {
  errorMsg.value = ''
  signingIn.value = true
  try {
    await authStore.login()
  } catch (err) {
    console.error(err)
    errorMsg.value = err?.message || '登入失敗。'
    signingIn.value = false
  }
}
</script>

<template>
  <div class="login-screen">
    <section class="login-card" aria-labelledby="loginTitle">
      <div class="brand-mark" aria-hidden="true">
        <AnimatedLogo :size="64" />
      </div>
      <h1 id="loginTitle">ZOO-IN</h1>
      <button class="google-signin-btn" type="button" :disabled="signingIn" @click="login">
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt=""
          width="20"
          height="20"
        />
        {{ signingIn ? '正在前往 Google...' : 'Google 登入' }}
      </button>
      <p class="login-error" role="alert">{{ errorMsg }}</p>
    </section>
  </div>
</template>
