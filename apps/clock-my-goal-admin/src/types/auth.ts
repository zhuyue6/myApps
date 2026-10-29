export interface AdminSession {
  token: string
  id: number
  userName: string
  role?: number
  status?: number
}
