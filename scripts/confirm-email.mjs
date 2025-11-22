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

const targetEmail = process.argv.find((a) => a.startsWith('--email='))?.split('=')[1]

async function confirmEmail(email) {
  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({ type: 'email_confirmation', email })
  if (linkErr) throw linkErr
  const actionLink = linkData?.properties?.action_link
  if (!actionLink) throw new Error('未生成有效的确认链接')
  const r = await fetch(actionLink, { redirect: 'follow' })
  if (!r.ok) throw new Error(`确认请求失败 ${r.status}`)
}

async function main() {
  try {
    if (targetEmail) {
      await confirmEmail(targetEmail)
      console.log(`已确认邮箱: ${targetEmail}`)
      return
    }
    const { data: users, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
    if (error) throw error
    for (const u of users?.users || []) {
      if (!u.email_confirmed_at && u.email) {
        await confirmEmail(u.email)
        console.log(`已确认邮箱: ${u.email}`)
      }
    }
    console.log('邮箱确认处理完成')
  } catch (e) {
    console.error('邮箱确认失败:', e.message)
    process.exit(1)
  }
}

main()