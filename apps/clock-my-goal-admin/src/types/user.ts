export interface MiniUser {
  id: number
  userName: string
  sex: number
  age: number
  avatarUrl: string
  status: 0 | 1
  createTime: string
  updateTime: string
}

export interface MiniUserPlan {
  id: number
  name: string
  cycle: number
  clockInCount: number
  targetClockInCount: number
  status: number
  expireTime: string
  createTime: string
  updateTime?: string
}

export interface MiniUserDetail extends MiniUser {
  ongoing: number
  completed: number
  expired: number
  labelCount: number
  plans: MiniUserPlan[]
}

export interface MiniUserPage {
  pageSize: number
  pageNum: number
  total: number
  data: MiniUser[]
}
