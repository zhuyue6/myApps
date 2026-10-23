import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { login as loginApi, logout as logoutApi } from '@/api/auth'
import type { AdminSession } from '@/types/auth'

const TOKEN_KEY = 'cmg_admin_token'
const PROFILE_KEY = 'cmg_admin_profile'

function readProfile(): AdminSession | null {
  const raw = localStorage.getItem(PROFILE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as AdminSession
    if (!parsed || !parsed.userName) return null
    return parsed
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) || '')
  const profile = ref<AdminSession | null>(readProfile())
  const userName = computed(() => profile.value?.userName || '')

  function clear() {
    token.value = ''
    profile.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(PROFILE_KEY)
  }

  function save(session: AdminSession) {
    token.value = session.token
    profile.value = session
    localStorage.setItem(TOKEN_KEY, session.token)
    localStorage.setItem(PROFILE_KEY, JSON.stringify({
      id: session.id,
      userName: session.userName,
      role: session.role,
      status: session.status,
    }))
  }

  async function login(userNameValue: string, password: string) {
    const session = await loginApi(userNameValue, password)
    if (!session?.token) {
      throw new Error('登录失败')
    }
    save(session)
  }

  async function logout() {
    try {
      await logoutApi()
    } catch {
      // 接口失败也清掉本地登录态
    }
    clear()
  }

  return { token, profile, userName, login, logout, clear }
})
