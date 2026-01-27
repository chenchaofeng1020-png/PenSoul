const hasChinese = (s) => /[\u4e00-\u9fff]/.test(s || '')
const normalize = (s) => String(s || '').toLowerCase().trim()
const patterns = [
  { includes: ['invalid login credentials', 'invalid_grant'], text: '账号或密码错误' },
  { includes: ['email not confirmed', 'email confirmation required'], text: '邮箱尚未验证，请先完成邮箱验证' },
  { includes: ['already registered', 'already exists'], text: '该邮箱已注册，请直接登录' },
  { includes: ['user not found'], text: '用户不存在' },
  { includes: ['password should be at least 6', 'password must be at least 6'], text: '密码长度至少 6 位' },
  { includes: ['signups not allowed', 'signup disabled'], text: '当前不允许注册' },
  { includes: ['rate limit'], text: '请求过于频繁，请稍后再试' },
  { includes: ['network error', 'fetch failed', 'failed to fetch', 'timeout', 'aborted', 'connection refused', 'network request failed'], text: '网络错误，请稍后重试' },
]
export function translateAuthError(message) {
  const m = normalize(message)
  if (!m) return '发生未知错误，请稍后重试'
  if (hasChinese(message)) return message
  for (const p of patterns) {
    for (const inc of p.includes) {
      if (m.includes(inc)) return p.text
    }
  }
  return `发生未知错误: ${message}`
}
