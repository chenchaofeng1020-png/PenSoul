import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import dotenv from 'dotenv'

// 加载 .env 或 .env.local 文件
const envPath = path.join(process.cwd(), '.env')
const envLocalPath = path.join(process.cwd(), '.env.local')

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath })
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const { Client } = pg

const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL
if (!dbUrl) {
  console.error('缺少 SUPABASE_DB_URL 或 DATABASE_URL 环境变量')
  process.exit(1)
}

const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20260307_create_smart_material_generator_tables.sql')
if (!fs.existsSync(sqlPath)) {
  console.error('缺少 migration SQL 文件:', sqlPath)
  process.exit(1)
}

const sql = fs.readFileSync(sqlPath, 'utf-8')
const client = new Client({ connectionString: dbUrl })

async function main() {
  try {
    console.log('Connecting to database...')
    await client.connect()
    console.log('Executing SQL migration...')
    await client.query(sql)
    console.log('Smart Material Generator 表初始化完成')
  } catch (e) {
    console.error('Smart Material Generator 表初始化失败:', e.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
