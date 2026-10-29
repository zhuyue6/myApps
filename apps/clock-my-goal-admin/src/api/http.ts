import axios from 'axios'

const TOKEN_KEY = 'cmg_admin_token'

let onUnauthorized = () => {}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

interface ApiBody<T> {
  code: number
  message: string
  data: T
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 10000,
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function unwrap<T>(body: unknown): T {
  const payload = body as Partial<ApiBody<T>> | null
  if (!payload || typeof payload.code !== 'number') {
    throw new Error('服务暂不可用')
  }
  if (payload.code === 10004 || payload.code === 10005 || payload.code === 15001) {
    onUnauthorized()
    throw new Error(payload.message || '请先登录')
  }
  if (payload.code !== 0) {
    throw new Error(payload.message || '操作失败')
  }
  return payload.data as T
}

function toRequestError(error: unknown) {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    onUnauthorized()
    return new Error('请先登录')
  }
  if (error instanceof Error && error.message && !axios.isAxiosError(error)) {
    return error
  }
  return new Error('网络异常，请稍后重试')
}

export async function getData<T>(url: string, params?: object) {
  try {
    const response = await http.get(url, { params })
    return unwrap<T>(response.data)
  } catch (error) {
    throw toRequestError(error)
  }
}

export async function postData<T>(url: string, data?: object, params?: object) {
  try {
    const response = await http.post(url, data, { params })
    return unwrap<T>(response.data)
  } catch (error) {
    throw toRequestError(error)
  }
}
