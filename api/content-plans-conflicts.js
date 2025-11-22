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
    const { datetime, platform, product_id } = req.query
    
    if (!datetime || !platform || !product_id) {
      res.status(400).json({ success: false, message: '缺少必要参数' })
      return
    }
    
    try {
      const targetTime = new Date(datetime)
      const timeWindowStart = new Date(targetTime.getTime() - 2 * 60 * 60 * 1000) // 2小时前
      const timeWindowEnd = new Date(targetTime.getTime() + 2 * 60 * 60 * 1000) // 2小时后
      
      // 检查指定时间段内的冲突内容
      const { data, error } = await supabase
        .from('content_items')
        .select('id, title, schedule_at, platform')
        .eq('product_id', product_id)
        .eq('platform', platform)
        .gte('schedule_at', timeWindowStart.toISOString())
        .lte('schedule_at', timeWindowEnd.toISOString())
        .order('schedule_at', { ascending: true })
      
      if (error) {
        res.status(500).json({ success: false, message: error.message })
        return
      }
      
      // 格式化冲突信息
      const conflicts = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        schedule_at: item.schedule_at,
        time_diff_hours: Math.round((new Date(item.schedule_at) - targetTime) / (1000 * 60 * 60))
      }))
      
      res.status(200).json({ 
        success: true, 
        data: { 
          conflicts,
          has_conflict: conflicts.length > 0,
          target_time: datetime,
          time_window: `${timeWindowStart.toISOString()} - ${timeWindowEnd.toISOString()}`
        } 
      })
      return
      
    } catch (error) {
      res.status(500).json({ success: false, message: '检查冲突时出错' })
      return
    }
  }
  
  res.status(405).json({ success: false, message: 'Method Not Allowed' })
}