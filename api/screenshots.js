import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = url && serviceKey ? createClient(url, serviceKey) : null

export default async function handler(req, res) {
  if (!supabase) {
    res.status(500).json({ success: false, message: 'Supabase 未配置' })
    return
  }
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) {
    res.status(401).json({ success: false, message: '未授权' })
    return
  }
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) {
    res.status(401).json({ success: false, message: '令牌无效' })
    return
  }
  if (req.method === 'POST') {
    const productId = req.query.productId
    const competitorId = req.query.competitorId
    if (!productId || !competitorId) {
      res.status(400).json({ success: false, message: '缺少 productId 或 competitorId' })
      return
    }
    const file = req.body?.file
    res.status(400).json({ success: false, message: '本地开发不支持 multipart，建议前端直接调用 Supabase Storage 上传或使用 Vercel 上传表单' })
    return
  }
  res.status(405).json({ success: false, message: 'Method Not Allowed' })
}