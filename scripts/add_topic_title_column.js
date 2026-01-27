import pg from 'pg'
import fs from 'fs'
import path from 'path'

async function main(){
  let url = process.env.SUPABASE_DB_URL || process.env.SUPABASE_POSTGRES_URL || process.env.DATABASE_URL
  if (!url) {
    try {
      const envPath = path.resolve(process.cwd(), '.env.local')
      if (fs.existsSync(envPath)) {
        const text = fs.readFileSync(envPath, 'utf-8')
        text.split(/\r?\n/).forEach(line => {
          const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
          if (m) {
            const key = m[1]
            let val = m[2]
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
            process.env[key] = val
          }
        })
        url = process.env.SUPABASE_DB_URL || process.env.SUPABASE_POSTGRES_URL || process.env.DATABASE_URL
      }
    } catch { /* noop */ }
  }
  if (!url) {
    console.error('缺少数据库连接字符串，请在环境变量中设置 SUPABASE_DB_URL 或 SUPABASE_POSTGRES_URL 或 DATABASE_URL')
    process.exit(1)
  }
  const client = new pg.Client({ connectionString: url })
  try {
    await client.connect()
    console.log('已连接数据库')
    await client.query('BEGIN')
    await client.query('ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS topic_title TEXT')
    console.log('已添加/存在列: public.content_items.topic_title')
    await client.query('UPDATE public.content_items SET topic_title = title WHERE topic_title IS NULL')
    console.log('已回填历史数据: 将空的 topic_title 使用 title 填充')
    await client.query('COMMIT')
    console.log('完成')
  } catch (e) {
    try { await client.query('ROLLBACK') } catch { /* noop */ }
    console.error('执行失败:', e?.message || e)
    process.exit(2)
  } finally {
    try { await client.end() } catch { /* noop */ }
  }
}

main()
