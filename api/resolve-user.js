import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = url && serviceKey ? createClient(url, serviceKey) : null

export default async function handler(req, res) {
  if (!supabase) {
    res.status(500).json({ success: false, message: 'Supabase 未配置' })
    return
  }
  const q = (req.query.q || '').trim()
  if (!q) {
    res.status(400).json({ success: false, message: '缺少查询参数 q' })
    return
  }
  // 支持用户名或邮箱解析为 auth.users.email
  try {
    // Supabase 不允许直接查询 auth.users，使用 profiles 维护映射
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email')
      .or(`email.eq.${q}`)
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (!data) {
      res.status(404).json({ success: false, message: '未找到用户' })
      return
    }
    res.status(200).json({ success: true, data: { email: data.email } })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}