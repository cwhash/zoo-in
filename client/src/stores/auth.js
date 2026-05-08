import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { auth } from '@/firebase'
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
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
    await signInWithPopup(auth, provider)
  }

  async function logout() {
    await signOut(auth)
    user.value = null
  }

  return { user, loading, isAuthenticated, init, login, logout }
})
