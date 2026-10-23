export function sexText(sex: number) {
  if (sex === 1) return '男'
  if (sex === 2) return '女'
  return '保密'
}

export function ageText(age: number | null | undefined) {
  if (age == null || age <= 0) return '—'
  return String(age)
}

export function timeText(value: string | null | undefined) {
  if (!value) return '—'
  return value.length >= 16 ? value.slice(0, 16) : value
}

export function cycleText(cycle: number) {
  if (cycle === 1) return '日'
  if (cycle === 2) return '周'
  if (cycle === 3) return '月'
  return '—'
}

export function planStatusText(status: number) {
  if (status === 1) return '进行中'
  if (status === 2) return '已完成'
  if (status === 3) return '已过期'
  return '—'
}

export function planStatusType(status: number) {
  if (status === 2) return 'success'
  if (status === 3) return 'warning'
  return 'primary'
}

export function avatarSrc(url: string | null | undefined) {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  const path = url.startsWith('/') ? url : `/static/${url.replace(/^\//, '')}`
  const base = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '')
  return `${base}${path}`
}
