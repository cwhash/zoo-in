import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import '@/assets/styles/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const authStore = useAuthStore()

authStore.init().then(async () => {
  await authStore.completeRedirectLogin()

  // Router guard — must run after auth is resolved
  router.beforeEach((to) => {
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      return { name: 'login' }
    }
    if (to.name === 'login' && authStore.isAuthenticated) {
      return { name: 'dashboard' }
    }
  })

  app.mount('#app')
})
