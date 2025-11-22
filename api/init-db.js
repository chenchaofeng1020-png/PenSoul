import fs from 'node:fs'
import path from 'node:path'
import { Client } from 'pg'

export default async function handler(req, res) {
  const dbUrl = process.env.SUPABASE_DB_URL
  if (!dbUrl) {
    res.status(500).json({ success: false, message: '缺少 SUPABASE_DB_URL 环境变量' })
    return
  }
  const sqlPath = path.join(process.cwd(), 'supabase', 'init.sql')
  if (!fs.existsSync(sqlPath)) {
    res.status(500).json({ success: false, message: '缺少 supabase/init.sql 文件' })
    return
  }
  const sql = fs.readFileSync(sqlPath, 'utf-8')
  const client = new Client({ connectionString: dbUrl })
  try {
    await client.connect()
    await client.query(sql)
    res.status(200).json({ success: true, message: '数据库初始化完成' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  } finally {
    await client.end()
  }
}