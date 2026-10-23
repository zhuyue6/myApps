import { getData, postData } from './http'
import type { MiniUserDetail, MiniUserPage } from '@/types/user'

export function getUserList(data: {
  keyword?: string
  status?: 0 | 1
  pageNum: number
  pageSize: number
}) {
  return postData<MiniUserPage>('/admin/getUserList', data)
}

export function getUser(id: number) {
  return getData<MiniUserDetail>(`/admin/getUserInfo/${id}`)
}

export function updateUserStatus(id: number, status: 0 | 1) {
  return postData<null>('/admin/updateUserStatus', { id, status })
}
