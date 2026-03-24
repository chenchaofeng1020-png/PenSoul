// 数据迁移脚本：将本地 db.json 中的 smart_notes 迁移到 Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 读取环境变量
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('错误：缺少 Supabase 配置');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 读取本地 db.json
const DB_FILE = path.join(__dirname, '../server/db.json');

async function migrate() {
  try {
    console.log('开始迁移 smart_notes 数据...\n');

    // 检查文件是否存在
    if (!fs.existsSync(DB_FILE)) {
      console.log('本地 db.json 不存在，无需迁移');
      return;
    }

    const fileData = fs.readFileSync(DB_FILE, 'utf8');
    const db = JSON.parse(fileData);

    if (!db.smart_notes || db.smart_notes.length === 0) {
      console.log('没有需要迁移的笔记数据');
      return;
    }

    console.log(`找到 ${db.smart_notes.length} 条笔记需要迁移\n`);

    // 转换数据格式
    const notesToInsert = db.smart_notes.map(note => ({
      id: note.id.startsWith('note-') ? undefined : note.id, // 让数据库生成新ID
      product_id: note.product_id,
      title: note.title || '未命名笔记',
      content: note.content,
      type: note.type,
      is_pinned: note.is_pinned || false,
      source_refs: note.source_refs || [],
      created_at: note.created_at,
      updated_at: note.updated_at
    }));

    // 批量插入数据
    const { data, error } = await supabase
      .from('smart_notes')
      .insert(notesToInsert)
      .select();

    if (error) {
      console.error('迁移失败:', error);
      return;
    }

    console.log(`✅ 成功迁移 ${data.length} 条笔记到 Supabase`);
    console.log('\n迁移完成！');

  } catch (error) {
    console.error('迁移过程出错:', error);
  }
}

migrate();
