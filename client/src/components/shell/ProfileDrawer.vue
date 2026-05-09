<script setup>
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useProfileStore } from '@/stores/profile'
import { useToastStore } from '@/stores/toast'

const open = defineModel({ default: false })
const authStore = useAuthStore()
const profileStore = useProfileStore()
const toast = useToastStore()

const nickName = ref('')
const realName = ref('')
const address = ref('')
const saving = ref(false)
const message = ref('')
const isError = ref(false)

watch(
  () => profileStore.profile,
  (p) => {
    if (!p) return
    nickName.value = p.public?.nick_name || '匿名'
    realName.value = p.private?.real_name || ''
    address.value = p.private?.address || ''
  },
  { immediate: true },
)

async function save() {
  saving.value = true
  message.value = '儲存中...'
  isError.value = false
  try {
    await profileStore.save({
      nickName: nickName.value,
      realName: realName.value,
      address: address.value,
    })
    message.value = '已儲存。'
  } catch (err) {
    console.error(err)
    message.value = '儲存失敗，請稍後再試。'
    isError.value = true
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="overlay" @click="open = false" />
    <aside
      class="side-drawer right-drawer"
      :class="{ open }"
      :aria-hidden="String(!open)"
    >
      <div class="drawer-header">
        <h2>會員資料</h2>
        <button class="close-button" type="button" aria-label="關閉" @click="open = false">×</button>
      </div>

      <div class="account-identity">
        <img
          class="profile-avatar"
          :src="authStore.user?.photoURL || ''"
          alt=""
        />
        <div>
          <p class="eyebrow">Google 帳號</p>
          <h3>{{ authStore.user?.displayName || '-' }}</h3>
          <p class="muted-text">{{ authStore.user?.email || '-' }}</p>
        </div>
      </div>

      <div class="profile-form">
        <label>
          <span>公開暱稱</span>
          <input v-model="nickName" type="text" maxlength="10" placeholder="匿名" />
        </label>
        <label>
          <span>真實姓名</span>
          <input v-model="realName" type="text" autocomplete="name" />
        </label>
        <label>
          <span>地址</span>
          <input v-model="address" type="text" autocomplete="street-address" />
        </label>
        <button class="primary-btn" type="button" :disabled="saving" @click="save">
          儲存會員資料
        </button>
        <p class="form-message" :class="{ error: isError }">{{ message }}</p>
        <button class="ghost-btn" type="button" @click="authStore.logout()">登出</button>
      </div>
    </aside>
  </Teleport>
</template>
