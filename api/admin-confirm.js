import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = url && serviceKey ? createClient(url, serviceKey) : null

export default async function handler(req, res) {
  if (!supabase) {
    res.status(500).json({ success: false, message: 'Supabase 未配置' })
    return
  }
  const email = (req.query.email || '').trim()
  if (!email) {
    res.status(400).json({ success: false, message: '缺少 email 参数' })
    return
  }
  try {
    const { data: users, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
    if (listErr) throw listErr
    const user = (users?.users || []).find((u) => (u.email || '').toLowerCase() === email.toLowerCase())
    if (!user) {
      res.status(404).json({ success: false, message: '未找到用户' })
      return
    }
    // 如果用户未确认，生成确认链接并在服务端直接请求该链接以完成确认
    if (!user.email_confirmed_at) {
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({ type: 'email_confirmation', email })
      if (linkErr) throw linkErr
      const actionLink = linkData?.properties?.action_link
      if (!actionLink) throw new Error('未生成有效的确认链接')
      const resp = await fetch(actionLink, { redirect: 'follow' })
      if (!resp.ok) throw new Error(`确认链接请求失败 ${resp.status}`)
    }
    res.status(200).json({ success: true })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}