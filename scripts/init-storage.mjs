import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8')
    content.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^([^#=]+)=\s*(.*)\s*$/)
      if (m) {
        const key = m[1].trim()
        const val = m[2].trim()
        if (!process.env[key]) process.env[key] = val
      }
    })
  }
}

loadEnv()

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('缺少 VITE_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 环境变量')
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

async function main() {
  try {
    const { data: buckets, error: listErr } = await supabase.storage.listBuckets()
    if (listErr) throw listErr
    const exists = (buckets || []).some((b) => b.name === 'screenshots')
    if (!exists) {
      const { error } = await supabase.storage.createBucket('screenshots', { public: false })
      if (error) throw error
      console.log('已创建 Storage 桶 screenshots')
    } else {
      console.log('Storage 桶 screenshots 已存在')
    }
  } catch (e) {
    console.error('存储初始化失败:', e.message)
    process.exit(1)
  }
}

main()