import fs from 'node:fs'
import path from 'node:path'
import { Client } from 'pg'

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

const dbUrl = process.env.SUPABASE_DB_URL
if (!dbUrl) {
  console.error('缺少 SUPABASE_DB_URL 环境变量')
  process.exit(1)
}

const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', 'create_agents_table.sql')
if (!fs.existsSync(sqlPath)) {
  console.error('缺少 create_agents_table.sql 文件')
  process.exit(1)
}

const sql = fs.readFileSync(sqlPath, 'utf-8')
const client = new Client({ connectionString: dbUrl })

async function main() {
  try {
    await client.connect()
    await client.query(sql)
    console.log('Agents 表初始化完成')
  } catch (e) {
    console.error('Agents 表初始化失败:', e.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()