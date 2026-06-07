import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { auth } from '@/firebase'
import {
  onAuthStateChanged,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithRedirect,
  signOut,
} from 'firebase/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const loading = ref(true)
  const isAuthenticated = computed(() => !!user.value)

  function init() {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, (firebaseUser) => {
        user.value = firebaseUser
        loading.value = false
        resolve(firebaseUser)
      })
    })
  }

  async function login() {
    const provider = new GoogleAuthProvider()
    await signInWithRedirect(auth, provider)
  }

  async function completeRedirectLogin() {
    const result = await getRedirectResult(auth)
    if (result?.user) {
      user.value = result.user
    }
    return result
  }

  async function logout() {
    await signOut(auth)
    user.value = null
  }

  return { user, loading, isAuthenticated, init, login, completeRedirectLogin, logout }
})
