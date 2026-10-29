import { postData } from './http'
import type { AdminSession } from '@/types/auth'

export function login(userName: string, password: string) {
  return postData<AdminSession>('/admin/auth/login', { userName, password })
}

export function logout() {
  return postData<unknown>('/admin/auth/logout')
}
