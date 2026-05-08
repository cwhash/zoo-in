<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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
        <svg viewBox="0 0 24 24" role="img">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4.5 4.5" />
        </svg>
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
