export interface AdminSession {
  token: string
  id: number
  userName: string
  role?: string
  status?: number
}
