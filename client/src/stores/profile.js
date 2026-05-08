import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '@/firebase'
import { ref as dbRef, get, set } from 'firebase/database'
import { useAuthStore } from './auth'
import { normalizeProfile } from '@/utils/helpers'

export const useProfileStore = defineStore('profile', () => {
  const profile = ref(null)

  async function load() {
    const authStore = useAuthStore()
    const uid = authStore.user?.uid
    if (!uid) return

    const profileRef = dbRef(db, `users/${uid}/profile`)
    const snapshot = await get(profileRef)
    profile.value = normalizeProfile(snapshot.val())

    if (!snapshot.exists()) {
      await set(profileRef, profile.value)
    }
  }

  async function save({ nickName, realName, address }) {
    const authStore = useAuthStore()
    const uid = authStore.user?.uid
    if (!uid) throw new Error('請先登入')

    const next = normalizeProfile({
      ...profile.value,
      public: { nick_name: nickName },
      private: { real_name: realName, address },
      updated_at: Date.now(),
      schema_version: 1,
    })

    await set(dbRef(db, `users/${uid}/profile`), next)
    profile.value = next
  }

  function $reset() {
    profile.value = null
  }

  return { profile, load, save, $reset }
})
