<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AnimatedLogo from '@/components/shell/AnimatedLogo.vue'

const authStore = useAuthStore()
const router = useRouter()
const errorMsg = ref('')

async function login() {
  errorMsg.value = ''
  try {
    await authStore.login()
    router.push({ name: 'dashboard' })
  } catch (err) {
    console.error(err)
    errorMsg.value = err?.message || '登入失敗。'
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
      <button class="google-signin-btn" type="button" @click="login">
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt=""
          width="20"
          height="20"
        />
        Google 登入
      </button>
      <p class="login-error" role="alert">{{ errorMsg }}</p>
    </section>
  </div>
</template>
