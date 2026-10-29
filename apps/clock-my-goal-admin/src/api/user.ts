import { getData, postData } from './http'
import type { MiniUserDetail, MiniUserPage } from '@/types/user'

export function getUserList(data: {
  keyword?: string
  status?: 0 | 1
  pageNum: number
  pageSize: number
}) {
  return getData<MiniUserPage>('/admin/users', data)
}

export function getUser(id: number) {
  return getData<MiniUserDetail>(`/admin/users/${id}`)
}

export function updateUserStatus(id: number, status: 0 | 1) {
  return postData<null>(`/admin/users/${id}/status`, { status })
}
