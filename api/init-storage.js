import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = url && serviceKey ? createClient(url, serviceKey) : null

export default async function handler(req, res) {
  if (!supabase) {
    res.status(500).json({ success: false, message: 'Supabase 未配置' })
    return
  }
  try {
    const { data: buckets } = await supabase.storage.listBuckets()
    const exists = (buckets || []).some((b) => b.name === 'screenshots')
    if (!exists) {
      const { error } = await supabase.storage.createBucket('screenshots', { public: false })
      if (error) throw error
    }
    res.status(200).json({ success: true, message: 'Storage 初始化完成', bucket: 'screenshots' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}