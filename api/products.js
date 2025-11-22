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
  const userId = userData.user.id
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
    if (error) {
      res.status(500).json({ success: false, message: error.message })
      return
    }
    res.status(200).json({ success: true, data: { products: data || [] } })
    return
  }
  if (req.method === 'POST') {
    const body = req.body || {}
    const insert = {
      owner_id: userId,
      name: body.name,
      description: body.description || '',
      website_url: body.website_url || '',
      logo_url: body.logo_url || '',
    }
    const { data, error } = await supabase.from('products').insert(insert).select('*').single()
    if (error) {
      res.status(500).json({ success: false, message: error.message })
      return
    }
    res.status(200).json({ success: true, data: { product: data } })
    return
  }
  res.status(405).json({ success: false, message: 'Method Not Allowed' })
}