const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // Increase limit for large context

// --- Local File DB Persistence ---
const fs = require('fs');
const DB_FILE = process.env.VERCEL ? '/tmp/db.json' : path.join(__dirname, 'db.json');

let db = {
  products: [],
  competitors: [],
  product_members: {}, 
  invitations: {}
};

// Load DB
try {
  if (fs.existsSync(DB_FILE)) {
    const fileData = fs.readFileSync(DB_FILE, 'utf8');
    db = JSON.parse(fileData);
  } else {
    // Initial Seed
    db.products = [{
      id: 'prod-default',
      name: '示例产品',
      description: '这是一个本地持久化的示例产品',
      owner_id: 'mock-user-1',
      created_at: new Date().toISOString()
    }];
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  }
} catch (e) {
  console.error('Failed to load DB:', e);
}

// Ensure fields exist
if (!db.products) db.products = [];
if (!db.competitors) db.competitors = [];
if (!db.product_members) db.product_members = {};
if (!db.invitations) db.invitations = {};
if (!db.users) db.users = [];
if (!db.trends) db.trends = { items: [], last_updated: null }; // 热点缓存（持久化）
if (!db.inspiration_inbox) db.inspiration_inbox = []; // 灵感素材库
// Force clear cluster cache to ensure re-analysis
db.trend_clusters = { items: [], last_updated: null }; 

if (!db.system_invitation_codes) {
  db.system_invitation_codes = [
    {
      id: 'code-default',
      code: 'WELCOME2024',
      type: 'unlimited',
      max_uses: 9999,
      used_count: 0,
      created_at: new Date().toISOString()
    }
  ];
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('Failed to save DB:', e);
  }
}

// Re-assign legacy in-memory variables to use DB (if code below uses them)
const productMembers = db.product_members;
const invitations = db.invitations;
// Note: We need to call saveDb() when these are modified in legacy code.
// For new APIs, we will operate on db object and call saveDb().

// Supabase (service role) client for local dev when configured
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('--- Supabase Config Check ---');
console.log('VITE_SUPABASE_URL:', SUPABASE_URL ? '✅ Found' : '❌ Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✅ Found' : '❌ Missing');

const supabase = (SUPABASE_URL && SUPABASE_SERVICE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

if (!supabase) {
  console.warn('⚠️  Supabase client NOT initialized. Backend will run in offline mode (Local DB only).');
} else {
  console.log('✅ Supabase client initialized successfully.');
  // Test connection
  supabase.from('products').select('count', { count: 'exact', head: true })
    .then(({ count, error }) => {
      if (error) console.error('❌ Supabase connection test failed:', error.message);
      else console.log('✅ Supabase connection confirmed. Product count:', count);
    })
    .catch(e => console.error('❌ Supabase connection exception:', e.message));
}

// Initialize OpenAI
const apiKey = process.env.VOLCENGINE_API_KEY || process.env.OPENAI_API_KEY || 'sk-mock-key';
const baseURL = process.env.VOLCENGINE_BASE_URL || (process.env.VOLCENGINE_API_KEY 
  ? 'https://ark.cn-beijing.volces.com/api/v3' 
  : (process.env.OPENAI_BASE_URL || undefined));

const openai = new OpenAI({
  apiKey,
  baseURL
});

// --- Agents Cache ---
let agentCache = {};
// --- Research Cache & Throttle ---
let researchCache = { lastCall: 0, entries: {} };

async function loadAgents() {
  console.log('[Agents] Loading agents configuration...');
  try {
    if (supabase) {
      const { data, error } = await supabase.from('agents').select('*');
      if (!error && data) {
        data.forEach(agent => {
          agentCache[agent.id] = agent;
        });
        console.log(`[Agents] Loaded ${Object.keys(agentCache).length} agents from Supabase`);
      } else {
        console.warn('[Agents] Failed to load from Supabase, using local DB fallback if available');
      }
    }
    
    // Fallback to local DB if empty
    if (Object.keys(agentCache).length === 0) {
       // TODO: Implement local DB for agents if needed. For now, we rely on Supabase.
       console.warn('[Agents] No agents loaded. System will fail if prompts are missing.');
    } else {
        // Ensure idea_mentor is updated with new prompt if it exists but is old
        // This is a simple migration logic for the "idea_mentor" agent
        const mentor = agentCache['idea_mentor'];
        if (mentor && mentor.system_prompt && (mentor.system_prompt.includes('严厉的创业导师') || mentor.system_prompt.includes('富有洞察力的产品教练'))) {
             console.log('[Agents] Detected outdated prompt for idea_mentor, updating...');
             const newPrompt = `
你是一位**充满激情的创新孵化官**，也是用户最值得信赖的**产品谋士**。
你的目标不是“考核”用户，而是与用户**共同创造**，通过“Yes, and...”的思维模式，将一个模糊的火花通过不断的肯定与叠加，变成燎原之火。

请严格遵循以下沟通原则：
1. **热情与共鸣（First YES）**：
   - 开场必须先肯定用户的想法！寻找哪怕一个微小的闪光点进行赞美。
   - 使用温暖、充满活力的语调。可以使用 emoji（如 💡, 🚀, ✨）来活跃气氛。
   - 比如：“哇，这个想法太棒了！特别是xx这一点，非常有洞察力！”

2.  **建设性叠加（Then AND）**：
   - 不要直接指出缺点，而是用“如果我们能...会怎么样？”的方式提出改进。
   - 在用户的想法上做加法，提供具体的灵感碎片，帮助用户打开脑洞。
   - 比如：“顺着这个思路，如果我们把目标用户扩展到xx群体，会不会有新的机会？”

3. **温和的现实检验**：
   - 当遇到明显的逻辑漏洞时，不要直接否定。
   - 试着站在用户的角度，用好奇的口吻提问：“这里我有个小疑问，如果遇到xx情况，我们该怎么应对呢？”
   - 把“风险”包装成“待解决的有趣挑战”。

4. **聚焦与推进**：
   - 虽然发散很重要，但每轮对话最后都要收束到一个核心问题上，确保方案在落地。
   - 引导用户完成：用户画像 -> 痛点确认 -> 解决方案 -> 商业模式 的闭环。

【输出格式要求】
1. 首先直接输出回复内容（Reply），支持 Markdown。保持对话感，不要像写论文。
2. 回复结束后，必须另起一行，输出分隔符 "<<<EXTRACTED_INFO>>>"。`;
             
             if (supabase) {
                 await supabase.from('agents').update({
                     system_prompt: newPrompt,
                     updated_at: new Date().toISOString()
                 }).eq('id', 'idea_mentor');
                 console.log('[Agents] Automatically updated idea_mentor prompt in Supabase');
                 // Refresh cache
                 const { data } = await supabase.from('agents').select('*').eq('id', 'idea_mentor').single();
                 if (data) agentCache['idea_mentor'] = data;
             }
        }

        // --- Init topic_generator Agent ---
        const topicAgent = agentCache['topic_generator'];
        const topicPrompt = `你是一位资深内容主编，擅长基于事实进行深度选题策划。
你的任务是基于提供的【素材】，生成 3 个不同角度的选题方案。

【重要原则】
1. **忠实于素材**：核心事实、数据、观点必须源自提供的素材，**严禁捏造**不存在的细节。
2. **逻辑自洽**：如果素材信息量不足，请基于常识进行合理的逻辑推演，但必须在“推荐理由”中注明。
3. **拒绝空泛**：避免生成“万金油”式的废话，每个选题都必须有具体的切入点。

【加工模式】
{{mode_instruction}}

【素材列表】
{{materials_list}}

【输出要求】
1. 生成 3 个选题方案。
2. 每个方案包含：
   - title: 标题（极具吸引力，符合小红书/公众号爆款调性）
   - core_view: 核心观点（一句话总结）
   - rationale: 推荐理由（为什么要这么写？符合什么用户心理？）
   - source_quote: 引用原文（该观点主要源自素材中的哪句话或哪个信息点，如无明确引用请留空）
3. 严格返回 JSON 数组格式。`;

        if (!topicAgent || (supabase && (topicAgent.system_prompt !== topicPrompt || topicAgent.model_config?.model === 'doubao-pro-1.5'))) {
             console.log('[Agents] Initializing/Updating topic_generator agent...');
             if (supabase) {
                 const { data, error } = await supabase.from('agents').upsert({
                     id: 'topic_generator',
                     name: '智能选题助手',
                     description: '基于素材生成多角度选题方案',
                     system_prompt: topicPrompt,
                     model_config: { model: 'gpt-3.5-turbo', temperature: 0.7 },
                     updated_at: new Date().toISOString()
                 }).select().single();
                 
                 if (!error && data) {
                    agentCache['topic_generator'] = data;
                    console.log('[Agents] topic_generator synced to Supabase with correct model');
                 } else {
                    console.error('[Agents] Failed to sync topic_generator:', error);
                 }
             } else {
                 // Local Mock
                 agentCache['topic_generator'] = {
                     id: 'topic_generator',
                     name: '智能选题助手',
                     system_prompt: topicPrompt,
                     model_config: { model: 'gpt-3.5-turbo', temperature: 0.7 }
                 };
             }
        }
    }
  } catch (e) {
    console.error('[Agents] Failed to load agents:', e);
  }
}

// Initial load
loadAgents();

function getAgentPrompt(id, variables = {}) {
  const agent = agentCache[id];
  if (!agent) {
    console.warn(`[Agents] Agent '${id}' not found, using empty prompt.`);
    return '';
  }
  let prompt = agent.system_prompt;
  
  // Simple variable substitution {{var}}
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    prompt = prompt.replace(regex, value);
  }
  return prompt;
}

function getAgentConfig(id) {
  return agentCache[id]?.model_config || {};
}

// --- Agents API ---

app.get('/api/agents', async (req, res) => {
  if (supabase) {
    const { data, error } = await supabase.from('agents').select('*').order('id');
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ data });
  }
  // Local fallback (read from cache for now)
  res.json({ data: Object.values(agentCache) });
});

app.put('/api/agents/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  if (supabase) {
    const { data, error } = await supabase.from('agents').update({
      ...updates,
      updated_at: new Date().toISOString()
    }).eq('id', id).select().single();
    
    if (error) return res.status(500).json({ error: error.message });
    
    // Update cache
    if (data) {
      agentCache[id] = data;
      console.log(`[Agents] Updated cache for agent '${id}'`);
    }
    return res.json({ data });
  }
  
  res.status(501).json({ error: 'Local update not implemented yet' });
});

app.post('/api/agents/test', async (req, res) => {
  const { system_prompt, user_message, model_config } = req.body;
  
  try {
    // 1. Determine Model ID
    // Priority: Custom Config > Env Var > Default
    let model = model_config?.model || process.env.VOLCENGINE_MODEL_ID || "gpt-3.5-turbo";
    const temp = model_config?.temperature || 0.7;

    // Special handling for Volcengine: Map standard model names to Endpoint ID
    if (process.env.VOLCENGINE_API_KEY && process.env.VOLCENGINE_MODEL_ID) {
        if (['gpt-3.5-turbo', 'gpt-4o', 'doubao-pro-1.5'].includes(model)) {
             console.log(`[Proxy] Mapping model '${model}' to Volcengine Endpoint '${process.env.VOLCENGINE_MODEL_ID}'`);
             model = process.env.VOLCENGINE_MODEL_ID;
        }
    }

    // Update: Hardcoded override for "Zhuge" (Ideation Conference)
    if (system_prompt && (system_prompt.includes('诸葛') || system_prompt.includes('选题会议室'))) {
        console.log('[Zhuge] Detecting Zhuge agent, switching to doubao-seed-1-6-251015');
        model = 'doubao-seed-1-6-251015';
    }

    // 2. Determine Client Configuration
    let client = openai; // Default client
    
    // If custom API Key or Base URL is provided in config, create a temporary client
    // Update: Also apply hardcoded key for Zhuge
    if (model_config?.apiKey || model_config?.baseURL || model === 'doubao-seed-1-6-251015') {
        const apiKey = (model === 'doubao-seed-1-6-251015') 
            ? "90783e84-ddc8-4bbe-be93-01c5be6cfc43"
            : (model_config.apiKey || process.env.VOLCENGINE_API_KEY || process.env.OPENAI_API_KEY || 'sk-mock-key');
            
        const baseURL = model_config?.baseURL || process.env.VOLCENGINE_BASE_URL || (process.env.VOLCENGINE_API_KEY 
          ? 'https://ark.cn-beijing.volces.com/api/v3' 
          : (process.env.OPENAI_BASE_URL || undefined));
        
        client = new OpenAI({
            apiKey,
            baseURL
        });
    }
    
    const completion = await client.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: system_prompt },
        { role: "user", content: user_message }
      ],
      temperature: temp,
    });
    
    res.json({ reply: completion.choices[0]?.message?.content });
  } catch (error) {
    console.error('Agent Test Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Zhuowei Research Agent ---
app.post('/api/agents/research', async (req, res) => {
  const { query, model: reqModel } = req.body;
  
  try {
    // Throttle: 15s cooldown (best-effort)
    const now = Date.now();
    if (researchCache.lastCall && now - researchCache.lastCall < 15000) {
      const hit = researchCache.entries[query];
      if (hit && now - hit.ts < 5 * 60 * 1000) {
        return res.json({ report: hit.report, sources: hit.sources });
      }
    }

    // 1. Determine Model ID (Prefer Browsing Model)
    // Priority: Request Body > Env Browsing ID > Env Model ID > Default
    // Update: Hardcoded fix for Zhuowei research as per user request
    let model = reqModel || "doubao-seed-1-6-251015";
    
    console.log(`[Zhuowei] Starting research on: "${query}" using model: ${model}`);

    // 2. Client Config
    // Update: Hardcoded fix for Zhuowei research as per user request
    const apiKey = "90783e84-ddc8-4bbe-be93-01c5be6cfc43";
    const baseURL = "https://ark.cn-beijing.volces.com/api/v3";

    const client = new OpenAI({ apiKey, baseURL });

    // 3. System Prompt for Zhuowei
    const currentDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    const systemPrompt = `你叫卓伟，是一个专业的全网信息调研员。
今天是 ${currentDate}。
你的任务是根据用户的调研需求，通过网络搜索获取**最新**（尤其是2025年-2026年）、最准确的信息，并整理成一份简明扼要的调研报告。

重要提示：
- 用户的需求通常涉及最新的时事热点或行业动态。
- 请务必**优先检索最近的信息**，不要依赖过时的训练数据。
- 如果是关于未来的预测，请基于最新的（2025-2026年）数据进行分析。

要求：
1. **深度挖掘**：不要只看表面，尝试挖掘事件背后的原因、数据支撑和多方观点。
2. **客观真实**：只陈述搜索到的事实，不进行主观臆测。
3. **结构清晰**：请按照以下格式输出：
   - **核心结论**：一句话总结最重要的发现。
   - **详细情报**：分点陈述，包含数据、时间、关键人物等细节。
   - **参考来源**：列出你参考的主要网页链接，请严格使用 Markdown 链接格式 \`[标题](URL)\`。
4. **针对性强**：只回答调研需求相关的内容，不要废话。`;

    // 4. Call Model
    const completion = await client.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `请全网搜索关于以下内容的最新信息（2025-2026）：${query}` }
      ],
      temperature: 0.3, // Lower temperature for factual reporting
    });

    const report = completion.choices[0]?.message?.content;
    console.log(`[Zhuowei] Research complete. Report length: ${report?.length}`);

    // 5. Extract Sources (Best Effort)
    // Volcengine browsing model usually returns markdown links like [Title](url)
    const sources = [];
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(report)) !== null) {
        sources.push({ title: match[1], url: match[2] });
    }

    // Cache result (TTL 5 min)
    researchCache.entries[query] = { report, sources, ts: now };
    researchCache.lastCall = now;

    res.json({ report, sources });
  } catch (error) {
    console.error('Research Agent Error:', error);
    // Fallback: If browsing fails, return a mock or error
    res.status(500).json({ error: error.message });
  }
});

// --- Ideas API ---

app.get('/api/ideas', async (req, res) => {
  const owner_id = req.query.owner_id;
  let list = [];

  // 1. Try Supabase
  if (supabase) {
    let shouldQuery = true;
    let query = supabase.from('ideas').select('*').order('updated_at', { ascending: false });
    
    if (owner_id) {
      // Only filter by owner_id if it's a valid UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(owner_id);
      if (isUUID) {
        query = query.eq('owner_id', owner_id);
      } else {
        // If owner_id is provided but not UUID (e.g. legacy username), Supabase won't have matches
        shouldQuery = false;
      }
    }

    if (shouldQuery) {
      const { data, error } = await query;
      if (!error && data) {
        list = data;
      } else if (error) {
        console.error('Supabase error:', error);
      }
    }
  }

  // 2. Try Local DB (Fallback & Merge)
  let localList = db.ideas || [];
  if (owner_id) {
    localList = localList.filter(idea => idea.owner_id === owner_id);
  }

  // Merge lists (deduplicate by ID)
  // We prioritize Supabase data if ID exists in both
  const mergedList = [...list];
  localList.forEach(localItem => {
    if (!mergedList.find(i => i.id === localItem.id)) {
      mergedList.push(localItem);
    }
  });
  
  // Sort merged list
  mergedList.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  // --- Optimize: Batch fetch user info ---
  const uniqueOwnerIds = [...new Set(mergedList.map(idea => idea.owner_id))];
  const userMap = {};

  // 1. Load from Cache (db.users)
  if (db.users) {
    uniqueOwnerIds.forEach(uid => {
      const u = db.users.find(user => user.id === uid);
      if (u) {
        userMap[uid] = {
          username: u.user_metadata?.username || u.email || 'Unknown',
          avatar_url: u.user_metadata?.avatar_url
        };
      }
    });
  }

  // 2. Load from db.product_members (Local DB Fallback)
  if (db.product_members) {
     uniqueOwnerIds.forEach(uid => {
        if (userMap[uid]) return; // Already found
        for (const pid in db.product_members) {
            const members = db.product_members[pid];
            const member = members.find(m => m.user_id === uid || m.id === uid);
            if (member) {
                userMap[uid] = {
                    username: member.username || member.full_name || 'Unknown',
                    avatar_url: member.avatar_url
                };
                break;
            }
        }
     });
  }

  // 3. Mock User Fallback
  uniqueOwnerIds.forEach(uid => {
      if (!userMap[uid] && uid === 'mock-user-1') {
          userMap[uid] = { username: 'Demo User' };
      }
  });

  // 4. Fetch missing from Supabase (Batch/Parallel but deduped)
  const missingIds = uniqueOwnerIds.filter(uid => !userMap[uid]);
  
  if (missingIds.length > 0 && supabase) {
      // Fetch in parallel (but now max requests = missingIds.length, usually 1)
      await Promise.all(missingIds.map(async (uid) => {
          // Skip if it doesn't look like a UUID to avoid 500 errors
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid);
          if (!isUUID) {
              userMap[uid] = { username: uid }; // Use ID as username if not UUID
              return;
          }

          try {
              const { data: { user }, error } = await supabase.auth.admin.getUserById(uid);
              if (user) {
                  userMap[uid] = {
                      username: user.user_metadata?.username || user.email || 'Unknown',
                      avatar_url: user.user_metadata?.avatar_url
                  };
                  // Update Cache
                  if (!db.users) db.users = [];
                  if (!db.users.find(u => u.id === user.id)) {
                      db.users.push(user);
                      saveDb(); // Persist to local JSON for future speed
                  }
              }
          } catch (e) {
              console.warn(`Failed to fetch user ${uid}:`, e.message);
              userMap[uid] = { username: 'Unknown' };
          }
      }));
  }

  // Enrich list using map
  const enrichedList = mergedList.map(idea => ({
      ...idea,
      owner_username: userMap[idea.owner_id]?.username || (idea.owner_id.startsWith('user-') ? idea.owner_id : 'Unknown'),
      owner_avatar_url: userMap[idea.owner_id]?.avatar_url
  }));
  
  res.json({ data: enrichedList });
});

app.get('/api/ideas/:id', async (req, res) => {
  const { id } = req.params;
  
  if (supabase) {
    const { data, error } = await supabase.from('ideas').select('*').eq('id', id).single();
    if (!error && data) {
      return res.json({ data });
    }
  }

  const idea = (db.ideas || []).find(i => i.id === id);
  if (!idea) {
    return res.status(404).json({ error: 'Idea not found' });
  }
  res.json({ data: idea });
});

app.post('/api/ideas/:id/share', async (req, res) => {
  const { id } = req.params;
  const { is_public } = req.body;
  
  let idea = null;
  let useSupabase = false;

  // 1. Try Supabase
  if (supabase) {
    // Check if id is likely UUID, but let supabase handle it anyway or check regex
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUUID) {
      const { data, error } = await supabase.from('ideas').select('*').eq('id', id).single();
      if (!error && data) {
        idea = data;
        useSupabase = true;
      }
    }
  }

  // 2. Local Fallback
  if (!idea) {
    const idx = (db.ideas || []).findIndex(i => i.id === id);
    if (idx !== -1) idea = db.ideas[idx];
  }

  if (!idea) {
    return res.status(404).json({ error: 'Idea not found' });
  }

  // Update
  if (useSupabase) {
    const { error } = await supabase.from('ideas').update({ 
      is_public,
      updated_at: new Date().toISOString()
    }).eq('id', id);
    
    if (error) return res.status(500).json({ error: error.message });
  } else {
    idea.is_public = is_public;
    idea.updated_at = new Date().toISOString();
    saveDb();
  }

  res.json({ success: true, is_public });
});

app.post('/api/ideas', async (req, res) => {
  const { title, owner_id } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  if (supabase) {
    try {
      const newIdea = {
        owner_id: owner_id,
        title,
        status: 'incubating',
        messages: [],
        structured_data: {}
      };
      const { data, error } = await supabase.from('ideas').insert(newIdea).select().single();
      if (error) throw error;
      return res.json({ data });
    } catch (e) {
      console.error('Supabase create idea failed:', e);
      // If it's a UUID error, it might be because of mock-user-1. 
      // We could fallback to local db in that case, but user said "don't use mock".
      // We will let it fail if it's a real error.
      // However, if the error is about invalid input syntax for type uuid, it means we are in a transition state.
      if (!e.message.includes('invalid input syntax for type uuid')) {
         return res.status(500).json({ error: e.message });
      }
      // If invalid uuid, maybe fallback to local?
      console.log('Falling back to local DB for non-UUID owner');
    }
  }

  const newIdea = {
    id: 'idea-' + Date.now(),
    owner_id: owner_id || 'mock-user-1',
    title,
    status: 'incubating',
    messages: [],
    structured_data: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (!db.ideas) db.ideas = [];
  db.ideas.unshift(newIdea);
  saveDb();

  res.json({ data: newIdea });
});

app.put('/api/ideas/:id', async (req, res) => {
  const { id } = req.params;
  const { title, status, structured_data } = req.body;
  
  if (supabase) {
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (status !== undefined) updateData.status = status;
    if (structured_data !== undefined) updateData.structured_data = structured_data;
    
    // Check if id is UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUUID) {
       const { data, error } = await supabase.from('ideas').update(updateData).eq('id', id).select().single();
       if (!error && data) {
         return res.json({ data });
       }
    }
  }

  const ideaIndex = (db.ideas || []).findIndex(i => i.id === id);
  if (ideaIndex === -1) {
    return res.status(404).json({ error: 'Idea not found' });
  }

  const idea = db.ideas[ideaIndex];
  if (title !== undefined) idea.title = title;
  if (status !== undefined) idea.status = status;
  if (structured_data !== undefined) idea.structured_data = structured_data;
  
  idea.updated_at = new Date().toISOString();
  saveDb();

  res.json({ data: idea });
});

app.delete('/api/ideas/:id', async (req, res) => {
  const { id } = req.params;
  
  if (supabase) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUUID) {
      const { error } = await supabase.from('ideas').delete().eq('id', id);
      if (!error) return res.json({ success: true });
    }
  }

  const initialLength = (db.ideas || []).length;
  db.ideas = (db.ideas || []).filter(i => i.id !== id);
  
  if (db.ideas.length === initialLength) {
    return res.status(404).json({ error: 'Idea not found' });
  }
  
  saveDb();
  res.json({ success: true });
});

app.post('/api/inbox/:id/analyze', async (req, res) => {
  const { id } = req.params;

  let material = null;
  // 1. Fetch Material
  if (supabase) {
    const { data, error } = await supabase.from('inspiration_inbox').select('*').eq('id', id).single();
    if (error) return res.status(500).json({ error: error.message });
    material = data;
  } else {
    material = (db.inspiration_inbox || []).find(i => i.id === id);
  }

  if (!material) {
    return res.status(404).json({ error: 'Material not found' });
  }

  // 2. AI Analysis
  const analysisPrompt = getAgentPrompt('inbox_analyst', {
    content: material.content,
    full_text: material.meta_data?.full_text ? `(全文摘要: ${material.meta_data.full_text.substring(0, 500)}...)` : ''
  }) || `
你是一位资深内容分析师。请对以下素材进行深度拆解分析。

【素材内容】
${material.content}
${material.meta_data?.full_text ? `(全文摘要: ${material.meta_data.full_text.substring(0, 500)}...)` : ''}

【分析维度】
请严格按照以下 JSON 格式输出分析结果：
{
  "phenomenon": "表达的现象",
  "core_view": "核心观点",
  "logic": "分析逻辑",
  "arguments": "论据/案例",
  "conclusion": "结论",
  "technique": "写作手法",
  "emotion_points": "用户情绪点",
  "why_good": "为什么好？（标题/切入点/共鸣等）",
  "shortcomings": "不足之处（可以避免的点）"
}
`;

  try {
    const model = process.env.VOLCENGINE_MODEL_ID || "gpt-3.5-turbo";
    console.log(`[Inbox] Starting manual AI analysis for ${id}...`);
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: "你是一个精准的内容分析助手。请只返回 JSON 格式结果。" },
        { role: "user", content: analysisPrompt }
      ],
      temperature: 0.7,
    });

    const analysisContent = completion.choices[0]?.message?.content;
    let ai_analysis = null;
    
    if (analysisContent) {
        const cleanJson = analysisContent.replace(/```json/g, '').replace(/```/g, '').trim();
        try {
            ai_analysis = JSON.parse(cleanJson);
        } catch (e) {
            console.warn('[Inbox] AI analysis JSON parse failed', e);
            return res.status(500).json({ error: 'AI response parsing failed' });
        }
    }

    if (!ai_analysis) {
        return res.status(500).json({ error: 'AI analysis failed' });
    }

    // 3. Update DB
    const updatedMetaData = {
        ...material.meta_data,
        ai_analysis
    };

    if (supabase) {
        const { data, error } = await supabase.from('inspiration_inbox')
            .update({ meta_data: updatedMetaData })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return res.json({ data });
    } else {
        material.meta_data = updatedMetaData;
        saveDb();
        return res.json({ data: material });
    }

  } catch (error) {
    console.error('[Inbox] Manual AI analysis failed:', error);
    if (error.response) {
        console.error('AI API Response:', error.response.data);
    }
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.post('/api/ideas/:id/chat', async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  
  let idea = null;
  let useSupabaseForUpdate = false;

  // 1. Try Supabase
  if (supabase) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUUID) {
      const { data, error } = await supabase.from('ideas').select('*').eq('id', id).single();
      if (!error && data) {
        idea = data;
        useSupabaseForUpdate = true;
      }
    }
  }

  // 2. Try Local DB if not found
  if (!idea) {
    const ideaIndex = (db.ideas || []).findIndex(i => i.id === id);
    if (ideaIndex !== -1) {
      idea = db.ideas[ideaIndex];
    }
  }

  if (!idea) {
    return res.status(404).json({ error: 'Idea not found' });
  }

  // 1. Append user message
  const userMsg = { role: 'user', content: message, created_at: new Date().toISOString() };
  if (!idea.messages) idea.messages = [];
  idea.messages.push(userMsg);
  
  // IMMEDIATE SAVE: Persist user message first to prevent data loss
  try {
    if (useSupabaseForUpdate) {
       await supabase.from('ideas').update({
         messages: idea.messages,
         updated_at: new Date().toISOString()
       }).eq('id', id);
    } else {
       saveDb();
    }
  } catch (err) {
    console.error('Failed to save user message:', err);
    // Continue anyway, but this is risky
  }

  // 2. Prepare context (Last 20 messages)
  const history = idea.messages.slice(-20).map(m => ({
    role: m.role === 'ai' ? 'assistant' : m.role,
    content: m.content
  }));

  // 3. System Prompt
  const SYSTEM_PROMPT = getAgentPrompt('idea_mentor') || `
你是一位**充满激情的创新孵化官**，也是用户最值得信赖的**产品谋士**。
你的目标不是“考核”用户，而是与用户**共同创造**，通过“Yes, and...”的思维模式，将一个模糊的火花通过不断的肯定与叠加，变成燎原之火。

请严格遵循以下沟通原则：
1. **热情与共鸣（First YES）**：
   - 开场必须先肯定用户的想法！寻找哪怕一个微小的闪光点进行赞美。
   - 使用温暖、充满活力的语调。可以使用 emoji（如 💡, 🚀, ✨）来活跃气氛。
   - 比如：“哇，这个想法太棒了！特别是xx这一点，非常有洞察力！”

2.  **建设性叠加（Then AND）**：
   - 不要直接指出缺点，而是用“如果我们能...会怎么样？”的方式提出改进。
   - 在用户的想法上做加法，提供具体的灵感碎片，帮助用户打开脑洞。
   - 比如：“顺着这个思路，如果我们把目标用户扩展到xx群体，会不会有新的机会？”

3. **温和的现实检验**：
   - 当遇到明显的逻辑漏洞时，不要直接否定。
   - 试着站在用户的角度，用好奇的口吻提问：“这里我有个小疑问，如果遇到xx情况，我们该怎么应对呢？”
   - 把“风险”包装成“待解决的有趣挑战”。

4. **聚焦与推进**：
   - 虽然发散很重要，但每轮对话最后都要收束到一个核心问题上，确保方案在落地。
   - 引导用户完成：用户画像 -> 痛点确认 -> 解决方案 -> 商业模式 的闭环。

【输出格式要求】
1. 首先直接输出回复内容（Reply），支持 Markdown。保持对话感，不要像写论文。
2. 回复结束后，必须另起一行，输出分隔符 "<<<EXTRACTED_INFO>>>"。
3. 在分隔符之后，输出严格的 JSON 格式数据（Extracted Info），结构如下：
{
  "product_name": "...", 
  "target_users": ["..."], 
  "core_features": ["..."], 
  "value_proposition": "..."
}
注意：extracted_info 中只填写从当前对话中能明确确认或推断出的信息；如果某些字段之前已确认且本次无修改，可以不返回或返回原值；如果尚未涉及，请留空或不返回该字段。
`;

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Keep-Alive Interval: Send a comment every 15s to keep connection open
  const keepAliveInterval = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 15000);

  try {
    const model = process.env.VOLCENGINE_MODEL_ID || "gpt-3.5-turbo";
    const stream = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history
      ],
      temperature: 0.7,
      stream: true,
    });

    let fullResponse = '';
    let buffer = '';
    let isExtracting = false;
    const SEPARATOR = '<<<EXTRACTED_INFO>>>';

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (!content) continue;

      fullResponse += content;

      if (isExtracting) continue;

      buffer += content;

      // 1. Check if we have the full separator in buffer
      const separatorIndex = buffer.indexOf(SEPARATOR);
      if (separatorIndex !== -1) {
        isExtracting = true;
        // Send everything before separator
        const safeContent = buffer.substring(0, separatorIndex);
        if (safeContent) {
           res.write(`data: ${JSON.stringify({ type: 'content', text: safeContent })}\n\n`);
        }
        buffer = ''; // Clear buffer as we don't need to stream anymore
        continue;
      }

      // 2. Check for partial match at the end of buffer
      // We need to keep enough chars at the end that *could* be the start of SEPARATOR
      // Max match length is SEPARATOR.length - 1
      let matchLength = 0;
      for (let i = 1; i < SEPARATOR.length; i++) {
         // Check if buffer ends with first i chars of SEPARATOR
         if (buffer.endsWith(SEPARATOR.substring(0, i))) {
           matchLength = i;
         }
      }

      if (matchLength > 0) {
        // We have a partial match. 
        // Send everything UP TO the match.
        // Keep the match in buffer.
        const sendLength = buffer.length - matchLength;
        if (sendLength > 0) {
          const safeContent = buffer.substring(0, sendLength);
          res.write(`data: ${JSON.stringify({ type: 'content', text: safeContent })}\n\n`);
          buffer = buffer.substring(sendLength);
        }
      } else {
        // No partial match, safe to send all
        res.write(`data: ${JSON.stringify({ type: 'content', text: buffer })}\n\n`);
        buffer = '';
      }
    }
    
    clearInterval(keepAliveInterval);

    // Process the full response
    const parts = fullResponse.split(SEPARATOR);
    const replyText = parts[0].trim();
    const jsonText = parts.length > 1 ? parts[1].trim() : '{}';
    
    let extractedInfo = {};
    try {
        // Find the first '{' and last '}'
        const firstBrace = jsonText.indexOf('{');
        const lastBrace = jsonText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            extractedInfo = JSON.parse(jsonText.substring(firstBrace, lastBrace + 1));
        }
    } catch (e) {
        console.error('Failed to parse extracted info:', e);
    }

    // 4. Update Idea - RE-FETCH PATTERN to avoid race conditions
    let latestIdea = idea;
    if (useSupabaseForUpdate) {
        const { data } = await supabase.from('ideas').select('*').eq('id', id).single();
        if (data) latestIdea = data;
    } else {
        const idx = (db.ideas || []).findIndex(i => i.id === id);
        if (idx !== -1) latestIdea = db.ideas[idx];
    }
    
    const aiMsg = { 
      role: 'ai', 
      content: replyText, 
      created_at: new Date().toISOString() 
    };
    
    if (!latestIdea.messages) latestIdea.messages = [];
    latestIdea.messages.push(aiMsg);

    if (Object.keys(extractedInfo).length > 0) {
      latestIdea.structured_data = {
        ...latestIdea.structured_data,
        ...extractedInfo
      };
      
      // Send meta event
      res.write(`data: ${JSON.stringify({ type: 'meta', info: extractedInfo })}\n\n`);
    }
    
    latestIdea.updated_at = new Date().toISOString();
    
    if (useSupabaseForUpdate) {
       await supabase.from('ideas').update({
         messages: latestIdea.messages,
         structured_data: latestIdea.structured_data,
         updated_at: latestIdea.updated_at
       }).eq('id', id);
    } else {
       saveDb();
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    clearInterval(keepAliveInterval);
    console.error('AI Chat Error:', error);
    
    // Send explicit error to client
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'AI 生成失败: ' + (error.message || 'Unknown error') })}\n\n`);
    res.end();
  }
});

app.post('/api/ideas/:id/convert', async (req, res) => {
  const { id } = req.params;
  const { product_name } = req.body;
  
  let idea = null;
  let useSupabase = false;

  // 1. Try Supabase
  if (supabase) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUUID) {
      const { data, error } = await supabase.from('ideas').select('*').eq('id', id).single();
      if (!error && data) {
        idea = data;
        useSupabase = true;
      }
    }
  }

  // 2. Local Fallback
  if (!idea) {
    const ideaIndex = (db.ideas || []).findIndex(i => i.id === id);
    if (ideaIndex !== -1) idea = db.ideas[ideaIndex];
  }

  if (!idea) {
    return res.status(404).json({ error: 'Idea not found' });
  }

  if (idea.status === 'converted') {
     return res.status(400).json({ error: 'Idea already converted', productId: idea.converted_product_id });
  }

  let productId;

  if (useSupabase) {
      // Create product in Supabase
      const sd = idea.structured_data || {};
      
      // Normalize target audience
      const ta = sd.target_users || sd.target_audience;
      const targetAudience = Array.isArray(ta) ? ta.join(', ') : (ta || '');
      
      // Normalize pain points
      const pp = sd.pain_points || [];
      const painPointsStr = Array.isArray(pp) ? pp.join('\n') : (pp || '');
      
      // Normalize features
      const features = sd.core_features || sd.features || [];

      const newProduct = {
          name: product_name || sd.product_name || idea.title,
          description: painPointsStr || sd.description || '', // Use pain points as initial description if no desc
          target_audience: targetAudience,
          owner_id: idea.owner_id,
          // New fields mapping
          value_proposition: sd.value_proposition || '',
          tagline: sd.unique_selling_point || '',
          pain_point: painPointsStr,
          key_features: Array.isArray(features) ? features : [],
          status: 'active'
      };
      
      // Remove undefined or null fields to avoid Supabase errors if columns don't exist yet (though they should)
      // Actually Supabase ignores unknown columns usually in some clients, but let's be safe.
      // We know these columns exist from migrations.
      
      const { data: prod, error: prodError } = await supabase.from('products').insert(newProduct).select().single();
      if (prodError) {
          console.error('Supabase create product error:', prodError);
          return res.status(500).json({ error: prodError.message });
      }
      
      productId = prod.id;

      // Add owner as member
      await supabase.from('product_members').insert({
        product_id: productId,
        user_id: newProduct.owner_id,
        role: 'owner'
      });

      // Update Idea
      await supabase.from('ideas').update({
          status: 'converted',
          converted_product_id: productId,
          updated_at: new Date().toISOString()
      }).eq('id', id);

  } else {
    // Create Product
    const newProduct = {
      id: 'prod-' + Date.now(),
      name: product_name || idea.structured_data?.product_name || idea.title,
      description: (idea.structured_data?.pain_points || []).join(', '),
      target_audience: idea.structured_data?.target_audience,
      owner_id: idea.owner_id,
      created_at: new Date().toISOString()
    };

    if (!db.products) db.products = [];
    db.products.push(newProduct);

    // Update Idea
    idea.status = 'converted';
    idea.converted_product_id = newProduct.id;
    idea.updated_at = new Date().toISOString();
    
    saveDb();
    productId = newProduct.id;
  }

  res.json({ productId });
});

// --- Products API ---

app.get('/api/products', async (req, res) => {
  const user = String(req.query.user || '').trim()
  const uid = String(req.query.uid || '').trim()
  
  if (supabase && uid) {
    // 1. Get products owned by user
    const { data: owned, error: err1 } = await supabase.from('products').select('*').eq('owner_id', uid);
    
    // 2. Get products where user is member
    const { data: memberRows, error: err2 } = await supabase.from('product_members').select('product_id').eq('user_id', uid);
    
    let memberProductIds = [];
    if (memberRows) memberProductIds = memberRows.map(r => r.product_id);
    
    let memberProducts = [];
    if (memberProductIds.length > 0) {
      const { data: mp, error: err3 } = await supabase.from('products').select('*').in('id', memberProductIds);
      if (mp) memberProducts = mp;
    }
    
    if (!err1) {
      // Merge and dedup
      const all = [...(owned || []), ...memberProducts];
      const seen = new Set();
      const unique = [];
      for (const p of all) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          unique.push(p);
        }
      }
      // Sort
      unique.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return res.json({ data: unique });
    }
  }

  let list = db.products
  if (user || uid) {
    const allowed = new Set(
      Object.entries(productMembers)
        .filter(([, members]) => Array.isArray(members) && members.some(m => {
          const mu = String(m.username || '').trim()
          const me = String(m.email || '').trim()
          const mf = String(m.full_name || '').trim()
          const mid = String(m.id || '').trim()
          return (user && (mu === user || me === user || mf === user)) || (uid && mid === uid)
        }))
        .map(([pid]) => pid)
    )
    list = db.products.filter(p => allowed.has(p.id))
  }
  res.json({ data: list })
});

app.post('/api/products', async (req, res) => {
  const { owner_info, ...productData } = req.body;
  
  if (supabase) {
    // Ensure owner_id is set. In Supabase mode, it should be passed from frontend.
    // If not, we can't insert (not null constraint).
    if (!productData.owner_id) {
       return res.status(400).json({ error: 'owner_id is required' });
    }

    const { data: prod, error } = await supabase.from('products').insert(productData).select().single();
    if (error) return res.status(500).json({ error: error.message });
    
    // Add owner as member
    if (prod) {
      await supabase.from('product_members').insert({
        product_id: prod.id,
        user_id: prod.owner_id,
        role: 'owner'
      });
    }
    return res.json({ data: prod });
  }

  const newProduct = {
    id: 'prod-' + Date.now(),
    created_at: new Date().toISOString(),
    ...productData
  };
  // Ensure owner_id if not provided (mock-user-1 is default)
  if (!newProduct.owner_id) newProduct.owner_id = 'mock-user-1';
  
  db.products.unshift(newProduct);
  
  // Initialize members with owner
  if (!db.product_members) db.product_members = {};
  
  const ownerMember = {
    id: 'mem-' + Date.now(),
    user_id: newProduct.owner_id,
    username: owner_info?.username || 'Owner',
    email: owner_info?.email || '',
    full_name: owner_info?.full_name || owner_info?.username || 'Owner',
    role: 'owner',
    joined_at: new Date().toISOString(),
    last_active: new Date().toISOString()
  };
  
  db.product_members[newProduct.id] = [ownerMember];

  saveDb();
  res.json({ data: newProduct });
});

app.post('/api/ideas/:id/summarize', async (req, res) => {
  const { id } = req.params;
  
  let idea = null;
  let useSupabaseForUpdate = false;

  // 1. Try Supabase
  if (supabase) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUUID) {
      const { data, error } = await supabase.from('ideas').select('*').eq('id', id).single();
      if (!error && data) {
        idea = data;
        useSupabaseForUpdate = true;
      }
    }
  }

  // 2. Local
  if (!idea) {
    const ideaIndex = (db.ideas || []).findIndex(i => i.id === id);
    if (ideaIndex !== -1) {
      idea = db.ideas[ideaIndex];
    }
  }
  
  if (!idea) {
    return res.status(404).json({ error: 'Idea not found' });
  }

  // Prepare context (All messages)
  const history = idea.messages.map(m => ({
    role: m.role === 'ai' ? 'assistant' : m.role,
    content: m.content
  }));

  const SUMMARIZE_PROMPT = getAgentPrompt('product_summarizer') || `
你是一位资深产品经理。请仔细阅读上述所有对话历史，从中提炼出完整的产品蓝图信息。
请以严格的 JSON 格式输出，不要包含任何 Markdown 标记或额外说明。
JSON 结构如下：
{
  "product_name": "建议的产品名称",
  "target_users": ["目标用户1", "目标用户2"],
  "core_features": ["核心功能1", "核心功能2", "核心功能3"],
  "value_proposition": "一句话描述产品的核心价值和独特卖点"
}
如果某个字段在对话中完全没有提及，请根据上下文进行合理的推断和建议。
`;

  try {
    const model = process.env.VOLCENGINE_MODEL_ID || "gpt-3.5-turbo";
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        ...history,
        { role: "system", content: SUMMARIZE_PROMPT }
      ],
      temperature: 0.5,
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    let extractedInfo = {};
    try {
        // Find the first '{' and last '}'
        const firstBrace = responseText.indexOf('{');
        const lastBrace = responseText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            extractedInfo = JSON.parse(responseText.substring(firstBrace, lastBrace + 1));
        }
    } catch (e) {
        console.error('Failed to parse summarized info:', e);
    }

    if (Object.keys(extractedInfo).length > 0) {
      idea.structured_data = {
        ...idea.structured_data,
        ...extractedInfo
      };
      idea.updated_at = new Date().toISOString();
      
      if (useSupabaseForUpdate) {
         await supabase.from('ideas').update({
             structured_data: idea.structured_data,
             updated_at: idea.updated_at
         }).eq('id', id);
      } else {
         saveDb();
      }
    }

    res.json({ data: idea.structured_data });

  } catch (error) {
    console.error('Summarize Error:', error);
    res.status(500).json({ error: 'Failed to summarize' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  
  if (supabase) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUUID) {
      const { data, error } = await supabase.from('products').update({
        ...req.body,
        updated_at: new Date().toISOString()
      }).eq('id', id).select().single();
      
      if (!error) {
        return res.json({ data });
      } else {
        console.error('Supabase update product error:', error);
      }
    }
  }

  const idx = db.products.findIndex(p => p.id === id);
  if (idx > -1) {
    db.products[idx] = { ...db.products[idx], ...req.body };
    saveDb();
    res.json({ data: db.products[idx] });
  } else {
    res.status(404).json({ error: 'Product not found' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  const { id } = req.params;

  if (supabase) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUUID) {
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
      if (!error && data) {
        return res.json({ data });
      }
    }
  }

  const p = db.products.find(x => x.id === id);
  res.json({ data: p || null });
});

 

function resolveAppBase(req) {
  const clientBase = String(req.body?.client_base || '').trim();
  if (clientBase) return clientBase.replace(/\/+$/, '');
  const explicit = process.env.APP_BASE_URL;
  if (explicit && typeof explicit === 'string') {
    return explicit.replace(/\/+$/, '');
  }
  const fProto = req.headers['x-forwarded-proto'];
  const fHost = req.headers['x-forwarded-host'] || req.headers['x-forwarded-server'];
  if (fHost) {
    return `${(fProto || 'https').replace(/:$/, '')}://${fHost}`.replace(/\/+$/, '');
  }
  const origin = req.headers.origin;
  if (origin) {
    return String(origin).replace(/\/+$/, '');
  }
  const referer = req.headers.referer;
  if (referer) {
    try {
      const u = new URL(String(referer));
      return `${u.protocol}//${u.host}`.replace(/\/+$/, '');
    } catch {}
  }
  const host = req.get('host');
  const proto = (req.protocol || 'http').replace(/:$/, '');
  return `${proto}://${host}`.replace(/\/+$/, '');
}

// --- Members API ---

app.get('/api/products/:id/members', (req, res) => {
  const { id } = req.params;
  (async () => {
    try {
      let list = [];
      let usedSupabase = false;

      // 1. Try Supabase if configured
      if (supabase) {
        try {
          const { data: rows, error } = await supabase
            .from('product_members')
            .select('user_id, role')
            .eq('product_id', id);
            
          if (!error && rows) {
            usedSupabase = true;
            // Optimize: Fetch all users in parallel instead of sequential to avoid N+1 problem
            const userPromises = rows.map(async (r) => {
              try {
                const { data: u } = await supabase.auth.admin.getUserById(r.user_id);
                const user = u?.user || {};
                return {
                  id: r.user_id,
                  user_id: r.user_id,
                  email: user.email || '',
                  username: user.user_metadata?.username || '',
                  full_name: user.user_metadata?.full_name || user.user_metadata?.username || '',
                  role: r.role || 'member',
                  joined_at: user.created_at || new Date().toISOString(),
                  last_active: new Date().toISOString(),
                  avatar_url: user.user_metadata?.avatar_url || ''
                };
              } catch (e) {
                // Fallback for user fetch fail
                return {
                  id: r.user_id,
                  user_id: r.user_id,
                  role: r.role || 'member',
                  joined_at: new Date().toISOString(),
                  last_active: new Date().toISOString()
                };
              }
            });
            
            list = await Promise.all(userPromises);
          }
        } catch (e) {
          console.warn('Supabase members fetch failed, falling back to local DB', e);
        }
      }
      
      // 2. If Supabase yielded no results (or failed/not configured), use Local DB
      if (list.length === 0) {
        if (db.product_members && db.product_members[id]) {
          list = db.product_members[id];
        }
      }

      // 3. Ensure owner is in the list
      // Even if the list is not empty (e.g. invited members joined), we must ensure the owner is present.
      let product = null;
      let ownerId = null;

      console.log(`[Members] Fetching members for product ${id}. Current list size: ${list.length}`);

      if (supabase && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
           try {
             const { data: p } = await supabase.from('products').select('owner_id, created_at').eq('id', id).single();
             if (p) {
                 product = p;
                 ownerId = p.owner_id || 'mock-user-1';
                 console.log('[Members] Found product in Supabase. Owner:', ownerId);
             } else {
                 console.log('[Members] Product not found in Supabase.');
                 // Try to fetch from local DB as fallback even if ID looks like UUID
                 product = db.products.find(p => p.id === id);
                 if (product) {
                     ownerId = product.owner_id || 'mock-user-1';
                     console.log('[Members] Found product in Local DB (Fallback). Owner:', ownerId);
                 }
             }
           } catch (e) {
             console.warn('[Members] Supabase product lookup failed:', e.message);
           }
      } 
      
      if (!product) {
          product = db.products.find(p => p.id === id);
          if (product) {
              ownerId = product.owner_id || 'mock-user-1';
              console.log('[Members] Found product in Local DB. Owner:', ownerId);
          } else {
              console.log('[Members] Product NOT found in Local DB either.');
          }
      }
      
      const hasOwner = list.some(m => m.role === 'owner' || (ownerId && m.user_id === ownerId));
      
      if (!hasOwner && product && ownerId) {
             console.log('[Members] Auto-generating owner member...');
             // We will create a default owner member.
             const ownerMember = {
                id: ownerId,
                user_id: ownerId,
                role: 'owner',
                joined_at: product.created_at || new Date().toISOString(),
                last_active: new Date().toISOString(),
                full_name: 'Product Owner', 
                username: 'Owner',
                email: '',
                avatar_url: ''
             };
             
             // Check if we can get better info from Supabase if available
             if (supabase && ownerId) {
                try {
                    const { data: u } = await supabase.auth.admin.getUserById(ownerId);
                    if (u?.user) {
                        ownerMember.email = u.user.email;
                        ownerMember.username = u.user.user_metadata?.username;
                        ownerMember.full_name = u.user.user_metadata?.full_name;
                        ownerMember.avatar_url = u.user.user_metadata?.avatar_url;
                    }
                } catch {}
             }

             list.unshift(ownerMember); // Add to beginning
             
             // CRITICAL: Persist this auto-generated owner so we can add more members later without losing the owner
             if (supabase && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
                  try {
                      await supabase.from('product_members').insert({
                          product_id: id,
                          user_id: ownerId,
                          role: 'owner'
                      });
                  } catch {}
             } else {
                 if (!db.product_members) db.product_members = {};
                 if (!db.product_members[id]) db.product_members[id] = [];
                 
                 // Avoid duplicates if logic runs multiple times
                 if (!db.product_members[id].some(m => m.id === ownerId)) {
                     db.product_members[id].unshift(ownerMember);
                     saveDb();
                 }
             }
      }

      res.json({ data: list });
    } catch (e) {
      console.error('Get members error:', e);
      res.status(500).json({ error: e.message });
    }
  })();
});

app.post('/api/products/:id/members', async (req, res) => {
  const { id } = req.params;
  
  if (supabase) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUUID && req.body.user_id) {
       const { data, error } = await supabase.from('product_members').insert({
           product_id: id,
           user_id: req.body.user_id,
           role: req.body.role || 'member'
       }).select().single();
       
       if (!error) return res.json({ data });
       // If error (e.g. duplicate), fall through or return error
       if (error.code === '23505') return res.status(400).json({ error: 'Member already exists' });
    }
  }

  const newMember = {
    id: 'mem-' + Date.now(),
    joined_at: new Date().toISOString(),
    role: 'member',
    last_active: new Date().toISOString(),
    ...req.body
  };
  
  if (!db.product_members) db.product_members = {};
  if (!db.product_members[id]) {
    db.product_members[id] = [];
  }
  
  // Check if already exists
  const exists = db.product_members[id].some(m => 
    (m.email && m.email === newMember.email) || 
    (m.username && m.username === newMember.username)
  );
  
  if (exists) {
    return res.status(400).json({ error: 'Member already exists' });
  }

  db.product_members[id].push(newMember);
  saveDb();
  res.json({ data: newMember });
});

app.delete('/api/products/:id/members/:memberId', async (req, res) => {
  const { id, memberId } = req.params;
  
  if (supabase) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUUID) {
        // memberId corresponds to user_id in our GET implementation
        const { error } = await supabase.from('product_members')
          .delete()
          .eq('product_id', id)
          .eq('user_id', memberId);
        
        if (!error) return res.json({ success: true });
    }
  }

  if (db.product_members && db.product_members[id]) {
    db.product_members[id] = db.product_members[id].filter(m => m.id !== memberId);
    saveDb();
  }
  res.json({ success: true });
});

app.put('/api/products/:id/members/:memberId/role', async (req, res) => {
    const { id, memberId } = req.params;
    const { role } = req.body;
    
    if (supabase) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUUID) {
          const { data, error } = await supabase.from('product_members')
            .update({ role })
            .eq('product_id', id)
            .eq('user_id', memberId)
            .select().single();
            
          if (!error) return res.json({ data });
      }
    }

    if (db.product_members && db.product_members[id]) {
        const member = db.product_members[id].find(m => m.id === memberId);
        if (member) {
            member.role = role;
            saveDb();
            return res.json({ data: member });
        }
    }
    res.status(404).json({ error: 'Member not found' });
});


// --- Invitations API ---

app.post('/api/products/:id/members/invite', async (req, res) => {
  const { id } = req.params;
  const { role = 'member', expires_in_days = 7, product_name, client_base } = req.body;
  
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + Number(expires_in_days));

  // Try to get inviter name from headers or default
  const invitedBy = req.headers['x-user-name'] 
    ? decodeURIComponent(req.headers['x-user-name']) 
    : '管理员';
  const invitedById = req.headers['x-user-id'] || null;

  if (supabase) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUUID) {
          // Attempt to insert into Supabase
          try {
            const { error } = await supabase.from('invitations').insert({
                code: token,
                product_id: id,
                role,
                invited_by: invitedById && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invitedById) ? invitedById : null,
                product_name: product_name || 'Product',
                expires_at: expiresAt.toISOString(),
                status: 'pending'
            });
            if (error) console.error('Supabase invite creation error:', error);
          } catch(e) {
            console.error('Supabase invite exception:', e);
          }
      }
  }

  const invite = {
    token,
    product_id: id,
    product_name: product_name || 'Product',
    role,
    invited_by: invitedBy,
    expires_at: expiresAt.toISOString(),
    created_at: new Date().toISOString()
  };

  if (!db.invitations) db.invitations = {};
    db.invitations[token] = invite;
    saveDb();
    
    // Use the client_base passed from frontend (window.location.origin) or infer from request
    const baseUrl = client_base || resolveAppBase(req) || 'http://localhost:5173';
    // Ensure no trailing slash
    const cleanBase = baseUrl.replace(/\/+$/, '');
    // Use query parameter format to match App.jsx routing logic
    const inviteUrl = `${cleanBase}/?invitation=${token}&pid=${id}&product=${encodeURIComponent(product_name || '')}&role=${role}`;
    
    res.json({
      data: {
        invite_url: inviteUrl,
        share_text: `邀请加入【${invite.product_name}】团队（角色：${role === 'admin' ? '管理员' : '成员'}），点击链接加入：${inviteUrl} （有效期${expires_in_days}天）`,
        expires_at: invite.expires_at,
        token
      }
    });
});

app.get('/api/invitations/:token', async (req, res) => {
  const { token } = req.params;
  
  if (supabase) {
      const { data, error } = await supabase.from('invitations').select('*').eq('code', token).maybeSingle();
      if (!error && data) {
           if (new Date(data.expires_at) < new Date()) {
                return res.status(400).json({ message: '邀请已过期' });
           }
           return res.json({ data: {
               ...data,
               token: data.code,
               product_id: data.product_id
           }});
      }
  }

  const invite = db.invitations ? db.invitations[token] : null;
  
  if (!invite) {
    return res.status(404).json({ message: '邀请不存在或已失效' });
  }
  
  if (new Date(invite.expires_at) < new Date()) {
    return res.status(400).json({ message: '邀请已过期' });
  }

  // Optional: Fetch product logo or details if needed
  // const product = db.products.find(p => p.id === invite.product_id);
  // invite.product_logo = ...

  res.json({ data: invite });
});

app.post('/api/invitations/:token/accept', async (req, res) => {
  const { token } = req.params;
  const { username, email, user_id } = req.body;
  
  let invite = null;
  let useSupabase = false;
  
  if (supabase) {
      const { data, error } = await supabase.from('invitations').select('*').eq('code', token).maybeSingle();
      if (!error && data) {
          invite = data;
          useSupabase = true;
      }
  }
  
  if (!invite) {
     invite = db.invitations ? db.invitations[token] : null;
  }
  
  if (!invite) return res.status(404).json({ message: '邀请不存在' });
  
  if (new Date(invite.expires_at) < new Date()) {
    return res.status(400).json({ message: '邀请已过期' });
  }

  const productId = invite.product_id;

  if (useSupabase && user_id) {
       const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);
       if (isUUID) {
          const { error: memError } = await supabase.from('product_members').insert({
              product_id: productId,
              user_id: user_id,
              role: invite.role
          });
          
          if (!memError || memError.code === '23505') { 
              return res.json({ success: true, product_id: productId });
          } else {
              console.error('Supabase join product error:', memError);
              // Fallback to local if error? No, if supabase failed for valid UUID, it's a real error.
              // But maybe we should try local logic anyway for consistency if it's hybrid?
              // No, return error to debug.
              return res.status(400).json({ message: memError.message });
          }
       }
  }

  if (!db.product_members) db.product_members = {};
  if (!db.product_members[productId]) db.product_members[productId] = [];
  
  // Check duplicates
  const existing = db.product_members[productId].find(m => 
      (email && m.email === email) || (username && m.username === username)
  );

  if (!existing) {
      const newMember = {
          id: 'mem-' + Date.now(),
          user_id: user_id || ('user-' + Date.now()), 
          username: username || 'Member',
          email: email || '',
          full_name: username || 'Member',
          role: invite.role,
          joined_at: new Date().toISOString(),
          last_active: new Date().toISOString(),
          avatar_url: '' 
      };
      db.product_members[productId].push(newMember);
      saveDb();
  }

  res.json({ success: true, product_id: productId });
});

app.post('/api/invitations/:token/decline', (req, res) => {
    // We don't necessarily need to delete it, just acknowledge
    res.json({ success: true });
});



app.post('/api/auth/register', async (req, res) => {
  const { email, password, username, inviteCode } = req.body;

  if (!inviteCode) {
      return res.status(400).json({ error: '请输入邀请码' });
  }

  // 1. Validate Invite Code (Hybrid: Try Supabase first if available, else Local DB)
  let codeValid = false;
  let codeRecord = null;
  let useSupabaseForCode = false;

  if (supabase) {
      try {
          const { data, error } = await supabase
              .from('system_invitation_codes')
              .select('*')
              .eq('code', inviteCode)
              .maybeSingle();
          
          if (!error && data) {
              codeRecord = data;
              useSupabaseForCode = true;
          }
      } catch (e) {
          console.warn('Supabase code check failed, falling back to local', e);
      }
  }

  if (!codeRecord) {
      // Fallback to local DB
      const codes = db.system_invitation_codes || [];
      codeRecord = codes.find(c => c.code === inviteCode);
  }

  if (!codeRecord) {
      return res.status(400).json({ error: '邀请码无效' });
  }

  if (codeRecord.type === 'one_time' && codeRecord.used_count >= codeRecord.max_uses) {
      return res.status(400).json({ error: '邀请码已被使用' });
  }

  if (codeRecord.expires_at && new Date(codeRecord.expires_at) < new Date()) {
      return res.status(400).json({ error: '邀请码已过期' });
  }

  // 2. Create User & Update Code
  try {
      // A. Supabase Mode
      if (supabase) {
          // Create User
          const { data, error } = await supabase.auth.admin.createUser({
              email,
              password,
              user_metadata: { username },
              email_confirm: true
          });

          if (error) throw error;

          // Update Code Usage
          if (useSupabaseForCode) {
               await supabase
                  .from('system_invitation_codes')
                  .update({ used_count: (codeRecord.used_count || 0) + 1 })
                  .eq('id', codeRecord.id);
          } else {
               // Update local if it was a local code (even if we created user in Supabase)
               // This handles case where we use Supabase for Auth but haven't migrated codes table yet
               if (db.system_invitation_codes) {
                   const localCode = db.system_invitation_codes.find(c => c.code === inviteCode);
                   if (localCode) {
                       localCode.used_count = (localCode.used_count || 0) + 1;
                       saveDb();
                   }
               }
          }
          
          // Cache user locally for quick lookup
          if (!db.users) db.users = [];
          const existing = db.users.find(u => u.id === data.user.id);
          if (!existing) {
             db.users.push(data.user);
             saveDb();
          }
          
          return res.json({ user: data.user });
      } 
      // B. Local Mode
      else {
          const newUser = { 
              id: 'user-' + Date.now(), 
              email, 
              password, 
              user_metadata: { username },
              created_at: new Date().toISOString()
          };
          
          // Update local code
          const localCode = db.system_invitation_codes.find(c => c.code === inviteCode);
          if (localCode) {
               localCode.used_count = (localCode.used_count || 0) + 1;
               saveDb(); // Will be saved again below, but fine
          }

          // Save to db.users
          if (!db.users) db.users = [];
          db.users.push(newUser);
          saveDb();

          return res.json({ user: newUser });
      }
  } catch (e) {
      console.error('Registration error:', e);
      return res.status(400).json({ error: e.message || '注册失败' });
  }
});


function getClient(model) {
  const isDeepseek = model === 'deepseek'
  // 优先检测是否配置了官方 DeepSeek Key，如果没有，则假设 DeepSeek 也是托管在火山引擎上
  const hasDeepseekKey = !!process.env.DEEPSEEK_API_KEY
  
  if (isDeepseek && hasDeepseekKey) {
    return new OpenAI({ 
      apiKey: process.env.DEEPSEEK_API_KEY, 
      baseURL: 'https://api.deepseek.com' 
    })
  }

  // 检查火山引擎 API Key
  if (!process.env.VOLCENGINE_API_KEY) {
    console.warn('Missing VOLCENGINE_API_KEY environment variable. Using Mock Client.');
    // Return a mock client that mimics OpenAI structure
    return {
      chat: {
        completions: {
          create: async (params) => {
            console.log('[Mock Client] Generating response for:', params.messages?.[0]?.content?.slice(0, 20));
            await new Promise(r => setTimeout(r, 1000)); // Simulate delay
            return {
              choices: [{
                message: {
                  content: `【演示模式】由于未配置 API Key，这是系统自动生成的演示内容。
                  
如果您看到了这段文字，说明后端服务连接正常！

请在项目根目录的 .env 文件中配置 VOLCENGINE_API_KEY 以启用真实的 AI 生成功能。

以下是基于您的请求生成的模拟大纲：
1. 痛点分析：深入挖掘用户需求...
2. 解决方案：本产品如何解决问题...
3. 核心优势：对比竞品的差异化...
4. 呼吁行动：立即试用...`
                }
              }]
            };
          }
        }
      }
    };
  }

  // 默认走火山引擎 (Doubao 或 火山版 DeepSeek)
  const baseURL = process.env.VOLCENGINE_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
  console.log(`[Client] Creating Volcengine client for model: ${model} | Endpoint: ${baseURL}`);
  return new OpenAI({ 
    apiKey: process.env.VOLCENGINE_API_KEY, 
    baseURL: baseURL,
    timeout: 120000 // 120s timeout for R1 models
  })
}

function getModelId(model) {
  // 1. Try specific model ID first
  if (model === 'deepseek') {
    const dsId = process.env.DEEPSEEK_MODEL || process.env.DEEPSEEK_MODEL_ID;
    if (dsId) return dsId;
  }
  
  // 2. Fallback to Volcengine ID (User might use Volcengine for DeepSeek)
  const veId = process.env.VOLCENGINE_MODEL || process.env.VOLCENGINE_MODEL_ID;
  
  if (model === 'deepseek' && veId) {
    console.log('[Model] Using Volcengine Model ID for DeepSeek request fallback');
    return veId;
  }

  return veId;
}

function generateFallbackTopics(context = {}, preferences = {}) {
  const {
    productBasic = {},
    personas = [],
    messaging = [],
    features = [],
    competitors = []
  } = context || {}
  const {
    item_limit = 5,
    platforms = ['wechat_mp'],
    creativity = 'balance'
  } = preferences || {}

  const primaryPersona = personas.find(p => p.is_primary) || personas[0] || {}
  const personaName = primaryPersona.who || primaryPersona.role_tag || '核心受众'
  const pain = (messaging[0]?.pain) || primaryPersona.max_pain || '效率低/成本高/协作不畅'
  const topFeatures = (features || []).slice(0, 3)
  const topCompetitor = (competitors || [])[0] || {}
  const platform = platforms[0] || 'wechat_mp'
  const prodName = productBasic?.name || '本产品'

  const ideas = []
  for (let i = 0; i < Math.max(3, item_limit); i++) {
    const feat = topFeatures[i % Math.max(1, topFeatures.length)] || {}
    const featName = feat.name || '关键功能'
    const angle = i % 2 === 0 ? '场景化解决痛点' : '数据化价值证明'
    ideas.push({
      title: `${personaName}的真实困境：${pain}，用${featName}如何破局？`,
      angle,
      platform,
      persona: personaName,
      outline: [
        `问题背景：${pain}的常见触发场景`,
        `解决思路：${featName}在业务流程中的落位`,
        `价值证据：效率提升/成本降低的量化指标`,
        `实操建议：落地步骤与风险控制`
      ],
      schedule_hint: '工作日早上9:30-10:30，适合B端受众',
      predicted_effect: '互动率: 中 | 难度: 低'
    })
  }

  // 附加一条“竞品对比”视角
  ideas.push({
    title: `别为溢价买单：从${topCompetitor?.name || '某竞品'}的槽点看更优解`,
    angle: '竞品反向教育',
    platform,
    persona: personaName,
    outline: [
      '竞品常见槽点与误区',
      '为什么容易踩坑：供需与流程失配',
      `替代方案：${prodName}的组合优势`,
      '选型清单：避免踩雷的四个关键指标'
    ],
    schedule_hint: '周三中午12:00或周五下午5:00，互动更好',
    predicted_effect: '互动率: 高 | 难度: 中'
  })

  return ideas.slice(0, item_limit)
}

app.post('/api/ai/suggest-topics', async (req, res) => {
    try {
        const { context, preferences, model } = req.body;
        
        if (!context) {
            return res.status(400).json({ error: 'Missing context data' });
        }

        const { 
            productBasic, 
            personas, 
            messaging, 
            features, 
            competitors,
            githubReadme
        } = context;

        const {
            item_limit = 5,
            platforms = [],
            target_personas = [],
            creativity = 'balance', // conservative, balance, open
            custom_keywords = ''
        } = preferences || {};

        // Construct System Prompt
        let systemPrompt = getAgentPrompt('topic_generator', {
          item_limit: item_limit,
          platforms: platforms.join(', ') || '通用',
          target_personas: target_personas.join(', ') || '所有用户'
        }) || `你不是AI助手，你是拥有10年经验的顶级增长黑客和爆款文案策划。
根据提供的产品规划信息，生成${item_limit}个高质量的内容选题。
所有输出必须是严格的JSON数组格式。
        
请遵循以下核心原则：
1. **多角度发散**：不要局限于“产品介绍”，必须结合行业痛点、职场情绪、生活场景进行类比。
2. **平台适配**：针对不同平台（${platforms.join(', ') || '通用'}）生成符合调性的标题。例如小红书要用emoji和情绪化表达，公众号要深度和干货。
3. **受众匹配**：重点针对（${target_personas.join(', ') || '所有用户'}）画像。
4. **反呆板机制**：绝对禁止使用“XX功能上线”、“XX产品介绍”等平铺直叙的标题。如果标题看起来像说明书，视为失败。请使用“反直觉”、“制造焦虑”、“利益承诺”等手法。
5. **格式要求**：只返回一个JSON数组，不要包含Markdown代码块标记。
6. **语言要求**：所有文本内容必须严格使用中文。

JSON对象结构：
{
  "topic_direction": "选题方向/核心主题 (例如：产品功能解析、行业痛点分析、用户故事等)",
  "title": "吸引人的标题 (必须足够吸引眼球)",
  "angle": "选题切入角度 (如: 情绪共鸣/数据佐证/反直觉)",
  "platform": "推荐平台",
  "persona": "目标受众",
  "outline": ["要点1", "要点2", "要点3"],
  "schedule_hint": "建议发布时间/理由",
  "predicted_effect": "预估效果 (e.g., '互动率: 高 | 难度: 中')"
}`;

        // Construct User Prompt (Context)
        let userPrompt = `【产品上下文】
1. 产品定义：${JSON.stringify(productBasic)}
2. 目标画像：${JSON.stringify(personas)}
3. 核心消息：${JSON.stringify(messaging)}
4. 近期功能：${JSON.stringify(features)}
5. 竞品分析：${JSON.stringify(competitors)}
${githubReadme ? `6. GitHub参考项目README (仅作参考)：\n${githubReadme}` : ''}

【生成要求】
- 数量：${item_limit}
- 创意程度：${creativity} (open=脑洞大开, balance=平衡, conservative=稳健)
- 自定义关键词：${custom_keywords}

请直接生成JSON数组：`;

        console.log('Calling Volcengine API...');
        
        // Determine model ID
        const modelId = getModelId(model);

        let topics = []
        try {
          const completion = await getClient(model).chat.completions.create({
              messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userPrompt }
              ],
              model: modelId,
              temperature: creativity === 'open' ? 0.9 : (creativity === 'conservative' ? 0.3 : 0.6),
          });

          const content = completion.choices[0].message.content;
          const cleanContent = String(content || '').replace(/```json/g, '').replace(/```/g, '').trim();
          topics = JSON.parse(cleanContent);
        } catch (err) {
          // 限流/配额/暂停等情况降级为本地生成，保证流程不中断
          const msg = String(err?.message || '')
          const status = err?.status || 500
          const isQuota = status === 429 || /SetLimitExceeded|TooManyRequests|limit/i.test(msg)
          if (isQuota) {
            console.warn('Quota exceeded, using fallback topics')
            topics = generateFallbackTopics(context, preferences)
          } else {
            throw err
          }
        }

        res.json({ topics });

    } catch (error) {
        console.error('API Error:', error);
        const msg = String(error?.message || 'Unknown error')
        res.status(500).json({ error: msg });
    }
});

app.post('/api/ai/suggest-positioning', async (req, res) => {
    try {
        const { mode, currentContent, guideData, model } = req.body;

        let systemPrompt = getAgentPrompt('positioning_expert') || `你是一个资深的产品战略专家和定位顾问，擅长像 Geoffrey Moore 一样思考。你的任务是帮助产品经理撰写精准、有穿透力的产品定位陈述。请严格按照 JSON 格式返回结果。所有文本内容必须使用中文。
JSON 结构示例：
[
  {
    "type": "风格类型 (如: 专业严谨 / 通俗易懂 / 愿景驱动 / 经典范式)",
    "content": "具体的定位内容",
    "desc": "适用场景说明"
  }
]`;

        let userPrompt = '';

        if (mode === 'optimize') {
            userPrompt = `请对我提供的以下产品定位草稿进行多维度润色优化，生成 4 个不同风格的版本（专业严谨、通俗易懂、愿景驱动、Geoffrey Moore 经典范式）：
【当前草稿】：${currentContent || '（空）'}`;
        } else {
            const { targetAudience, painPoint, category, keyBenefit, competitor, differentiation } = guideData || {};
            userPrompt = `请根据以下关键信息，生成 2 个高质量的产品定位陈述：
1. 目标客户：${targetAudience || '未提供'}
2. 核心痛点：${painPoint || '未提供'}
3. 产品品类：${category || '未提供'}
4. 核心利益：${keyBenefit || '未提供'}
5. 主要竞品：${competitor || '未提供'}
6. 差异化优势：${differentiation || '未提供'}

请生成以下两个版本：
1. "标准定位陈述"：严格遵循 Geoffrey Moore 《跨越鸿沟》的经典填空模板，不要随意发挥。模板格式为：
   对于 [目标客户]，他们 [核心痛点]，我们的 [产品名称] 是一个 [产品品类]，它可以 [核心利益]。不像 [主要竞品]，我们 [差异化优势]。
2. "一句话价值主张"：用一句话精炼地传达核心价值，控制在 30 字以内。`;
        }

        console.log('Calling Volcengine API for positioning...');
        
        // Determine model ID
        const modelId = getModelId(model);

        const completion = await getClient(model).chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            model: modelId,
            temperature: 0.7,
        });

        const content = completion.choices[0].message.content;
        const cleanContent = String(content || '').replace(/```json/g, '').replace(/```/g, '').trim();
        
        let options = [];
        try {
            options = JSON.parse(cleanContent);
        } catch (e) {
            console.error('Failed to parse JSON:', cleanContent);
            // Fallback simple parsing or return error
            throw new Error('AI response format error');
        }

        res.json({ options });

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: String(error.message) });
    }
});

// AI 对话接口 (专家咨询模式)
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages = [], model = 'doubao' } = req.body || {}
    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: 'Missing messages' })
    }

    const modelId = getModelId(model)
    console.log(`[Chat] Requesting model: ${model} -> ID: ${modelId}`);

    const systemPrompt = getAgentPrompt('general_consultant') || [
      '你是一位拥有10年经验的资深产品专家，擅长商业化落地和产品战略。',
      '你的角色不是简单的问答机器，而是一位富有洞察力的顾问。',
      '你的目标是通过对话，帮助用户将模糊的想法打磨成清晰的产品概念。',
      '请遵循以下原则：',
      '1. **引导而非直接给答案**：多问“为什么”、“针对谁”、“怎么赚钱”，迫使用户深度思考。',
      '2. **犀利但建设性**：如果用户的想法天马行空且不切实际，请礼貌地指出潜在风险（如市场天花板、巨头竞争、变现困难）。',
      '3. **逐步深入**：不要一次性抛出所有问题，每次关注1-2个核心点（如先聊用户，再聊痛点，最后聊商业模式）。',
      '4. **保持对话简洁**：每次回复不要过长，留给用户互动的空间。',
      '5. **语言要求**：请全程使用中文回答。',
      '6. **内容要求**：请保持专业、有深度且可落地的回答，避免回答不切实际的答案。',
      '当前阶段：用户正在构思一个新产品，请帮助他厘清愿景和定位。'
    ].join('\n')

    // 构建完整的消息链，包含 System Prompt
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ]

    const completion = await getClient(model).chat.completions.create({
      messages: fullMessages,
      model: modelId,
      temperature: 0.7, // 稍微高一点，保持灵活性
    })

    const reply = completion.choices[0].message.content
    res.json({ reply })

  } catch (error) {
    console.error('Chat API Error:', error);
    const lastUser = Array.isArray(req.body?.messages) ? req.body.messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '' : ''
    const fallback = [
      '我暂时无法连接到云端模型，但我仍会作为产品专家继续与你对话。',
      '先聚焦三件事：目标用户是谁？他们最痛的点是什么？你打算如何变现？',
      lastUser ? `基于你刚提到的：${lastUser}` : '请先用一句话描述你的产品设想和目标人群。'
    ].join('\n')
    res.json({ reply: fallback })
  }
})

// AI 产品规划生成
app.post('/api/ai/product-planning/generate', async (req, res) => {
  try {
    const { idea = '', messages = [], scope = 'all', context = {}, model = 'doubao', mode = 'planning' } = req.body || {}
    
    // 如果是聊天模式生成，idea 可能为空，但 messages 不为空
    if (!String(idea || '').trim() && (!messages || messages.length === 0)) {
      return res.status(400).json({ error: 'Missing idea or chat history' })
    }

    const modelId = getModelId(model)
    
    let systemPrompt = ''
    let userPrompt = ''

    if (messages && messages.length > 0) {
        // 基于对话历史生成
        systemPrompt = [
            '你是一位资深产品经理，擅长从杂乱的会议记录或对话中提炼结构化的产品规划方案。',
            '请仔细阅读用户与产品专家之间的对话记录，从中提取关键信息，生成一份完整的产品规划。',
            '如果对话中某些信息缺失（例如用户未明确提到竞品），请根据已知信息和你的行业知识进行合理的推断和补全。',
            '严格返回JSON，字段包含：basic、personas、competitors、features、messaging、metadata。',
            '字段含义：',
            '- basic: 数组，包含3个不同的产品定义方案，每个方案包含: { target_audience, product_category, core_competitor, positioning, pain_point, key_benefit, differentiation }',
            '- personas: [{ who, role_tag, user_goal, max_pain, existing_solution, our_solution, is_primary }]',
            '- competitors: { summary, highlights, suggested_list: [{ name, positioning, slogan }] }',
            '- features: [{ name, module, launch_date, intro_source, intro_scenario, intro_problem, intro_solution, intro_effect }]',
            '- messaging: [{ persona, channel, pain, anchor_message }]',
            '- metadata: { confidence, warnings, sources }',
            '注意：所有生成的文本内容必须严格使用中文（JSON字段名保持英文）。',
            '只返回JSON，禁止使用Markdown代码块。'
        ].join('\n')

        userPrompt = '【对话记录】\n' + JSON.stringify(messages) + '\n\n请基于以上对话总结生成产品规划JSON。'

    } else if (mode === 'brainstorm') {
       // 保留旧的 brainstorming 逻辑作为降级或特定用途，但目前用户想替换它
       // 既然用户想替换，我们可以暂时保留代码兼容性，或者让 brainstorm 模式也走结构化生成（如果前端传参变了）
       // 为了稳妥，这里保留原有的 brainstorm 逻辑，防止其他地方调用出错
      systemPrompt = [
        '你是资深产品顾问和创新专家，擅长通过发散思维帮助用户探索产品可能性。',
        '你的任务是针对用户的模糊想法，提供3个不同维度的产品方向洞察，而不是具体的落地执行方案。',
        '请严格返回JSON数组格式，包含3个洞察对象，每个对象结构如下：',
        '{',
        '  "title": "洞察标题（如：蓝海市场切入、用户心理重构、技术降维打击）",',
        '  "insight": "深度分析（解释为什么这个方向有机会，背后的逻辑是什么，不少于50字）",',
        '  "opportunity": "机会点（具体的切入场景或未被满足的需求）",',
        '  "risk": "潜在挑战（需要注意的坑或门槛）",',
        '  "keywords": ["关键词1", "关键词2"]',
        '}',
        '注意：所有生成的文本内容必须严格使用中文（JSON字段名保持英文）。',
        '只返回JSON数组，禁止使用Markdown代码块。'
      ].join('\n')
      userPrompt = '【用户想法】\n' + idea + '\n【现有上下文】\n' + JSON.stringify(context) + '\n【生成范围】' + scope
    } else {
      systemPrompt = [
        '你是资深产品经理，负责把用户的粗略想法结构化为产品规划。',
        '严格返回JSON，字段包含：basic、personas、competitors、features、messaging、metadata。',
        '字段含义：',
        '- basic: 数组，包含3个不同的产品定义方案，每个方案包含: { target_audience, product_category, core_competitor, positioning, pain_point, key_benefit, differentiation }',
        '- personas: [{ who, role_tag, user_goal, max_pain, existing_solution, our_solution, is_primary }]',
        '- competitors: { summary, highlights, suggested_list: [{ name, positioning, slogan }] }',
        '- features: [{ name, module, launch_date, intro_source, intro_scenario, intro_problem, intro_solution, intro_effect }]',
        '- messaging: [{ persona, channel, pain, anchor_message }]',
        '- metadata: { confidence, warnings, sources }',
        '注意：所有生成的文本内容必须严格使用中文（JSON字段名保持英文）。',
        '只返回JSON，禁止使用Markdown代码块。'
      ].join('\n')
      userPrompt = '【用户想法】\n' + idea + '\n【现有上下文】\n' + JSON.stringify(context) + '\n【生成范围】' + scope
    }
    
    // ... 后续逻辑保持不变 ...

    let out = null
    try {
      const completion = await getClient(model).chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: modelId,
        temperature: mode === 'brainstorm' ? 0.8 : 0.6, // 头脑风暴模式温度更高
      })
      const content = completion.choices[0].message.content
      // 去除 DeepSeek 的思考过程标签 <think>...</think>
      const cleanThinking = String(content || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
      const clean = cleanThinking.replace(/```json/g, '').replace(/```/g, '').trim()
      out = JSON.parse(clean)
      
      // 适配 brainstorm 模式的返回结构
      if (mode === 'brainstorm') {
        out = { brainstorm: out }
      }
    } catch (err) {
      console.error('AI Generation Error:', err)
      if (mode === 'brainstorm') {
        out = {
          brainstorm: [
            {
              title: '示例洞察：垂直场景切入',
              insight: '在通用SaaS竞争激烈的当下，专注于细分垂直领域（如牙科诊所、宠物店）往往能避开巨头锋芒。这类用户痛点具体且刚需，付费意愿强。',
              opportunity: '针对特定行业的定制化解决方案',
              risk: '市场天花板较低，需要快速验证',
              keywords: ['垂直SaaS', '长尾市场']
            },
            {
              title: '示例洞察：AI驱动的自动化',
              insight: '用户不再需要“更好的工具”，而是需要“直接的结果”。通过AI Agent自动完成全流程工作，从辅助决策转变为代替执行。',
              opportunity: '完全自动化的工作流',
              risk: '技术成熟度与用户信任成本',
              keywords: ['Agent', '自动化']
            },
            {
              title: '示例洞察：情感化连接',
              insight: '功能同质化严重的今天，品牌的情感价值成为护城河。通过社区运营和价值观输出，建立用户归属感。',
              opportunity: '构建高粘性用户社区',
              risk: '运营成本高，见效慢',
              keywords: ['社区驱动', '品牌价值']
            }
          ],
          metadata: { confidence: 0.3, warnings: ['使用本地回退结果'], sources: [] }
        }
      } else {
        const name = (context?.productBasic?.name) || '未命名产品'
        out = {
          basic: {
            name,
            tagline: '一句话传达核心价值',
            positioning: '针对特定人群解决核心痛点的产品定位',
            target_audience: '核心受众',
            overview_short: '产品简述',
            industry: '所属行业',
            category: '产品品类'
          },
          personas: [
            { who: '核心角色A', role_tag: '职能', user_goal: '目标A', max_pain: '痛点A', existing_solution: '当前做法', our_solution: '改进方案', is_primary: true }
          ],
          competitors: { summary: '竞品概览', highlights: '我们的优势', suggested_list: [] },
          features: [
            { name: '关键功能一', module: '核心模块', launch_date: '', intro_source: '来源', intro_scenario: '场景', intro_problem: '问题', intro_solution: '解决', intro_effect: '量化效果' }
          ],
          messaging: [
            { persona: '画像A', channel: '官网', pain: '痛点A', anchor_message: '标准话术A' }
          ],
          metadata: { confidence: 0.3, warnings: ['使用本地回退结果'], sources: [] }
        }
      }
    }

    res.json(out)
  } catch (error) {
    res.status(500).json({ error: String(error?.message || 'Unknown error') })
  }
})

// GitHub README 获取接口
app.post('/api/github/readme', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'Missing URL' });

    // Extract owner and repo
    const match = url.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
    if (!match) return res.status(400).json({ error: 'Invalid GitHub URL' });

    const owner = match[1];
    const repo = match[2];

    console.log(`Fetching README for ${owner}/${repo}`);

    // Node 18+ supports fetch natively
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers: {
        'Accept': 'application/vnd.github.raw+json',
        'User-Agent': 'ProductDuck/1.0'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'README not found or repository is private' });
      }
      const errText = await response.text();
      throw new Error(`GitHub API Error: ${response.status} ${errText}`);
    }

    const content = await response.text();
    // 简单的截断保护，防止 README 过大
    const maxLength = 50000; // 50k characters should be enough for context
    const truncated = content.length > maxLength ? content.slice(0, maxLength) + '\n...(truncated)' : content;

    res.json({ content: truncated, owner, repo });
  } catch (error) {
    console.error('GitHub API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI 文风分析接口
app.post('/api/ai/analyze-style', async (req, res) => {
  try {
    const { content, model = 'deepseek' } = req.body
    
    if (!content || content.length < 50) {
      return res.status(400).json({ error: '请提供至少50字的样文以便分析' })
    }

    const systemPrompt = `你是一位专业的文学评论家和语言风格分析师。
请分析用户提供的文本，提取其核心写作风格特征。
请从以下维度进行分析并总结：
1. **语调情感**：(例如：幽默诙谐、严肃专业、亲切温暖、犀利批判...)
2. **句式结构**：(例如：多用短句、喜欢长难句、排比句多...)
3. **词汇习惯**：(例如：喜欢用成语、喜欢用网络热梗、专业术语多...)
4. **结构布局**：(例如：总分总结构、故事引入...)

请输出一段约100-200字的风格画像描述，这段描述将用于指导AI模仿该风格进行写作。
格式要求：直接输出风格描述，不要包含"好的"、"分析如下"等前缀。`

    const userPrompt = `【样文内容】：\n${content.slice(0, 3000)}` // Limit length

    const modelId = getModelId(model);

    const completion = await getClient(model).chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: modelId,
      temperature: 0.5,
    })

    const styleDescription = completion.choices[0].message.content
    const cleanStyle = String(styleDescription || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim()

    res.json({ style: cleanStyle })

  } catch (error) {
    console.error('Style Analysis Error:', error)
    res.status(500).json({ error: error.message })
  }
})

// AI 生成初稿接口
app.post('/api/ai/generate-draft', async (req, res) => {
  try {
    const { topic, platform, outline, context, model, userStyle } = req.body
    
    console.log('Generating draft for platform:', platform, 'using model:', model)

    const platformPrompts = {
      wechat_mp: `你是一位擅长打造10w+爆款文章的公众号主理人。请根据提供的主题和大纲，撰写一篇观点犀利、故事感强且极具传播力的文章。
      要求：
      1. **拒绝论文风**：严禁使用“综上所述”、“首先/其次/最后”等教科书式连接词。多用短句，多用“你/我”拉近距离。
      2. **黄金开头**：第一段必须用一个扎心的提问、一个反直觉的现象或一个具体的场景切入，3秒内抓住用户注意力。
      3. **情绪价值**：文章不仅仅是传递信息，更要传递情绪（焦虑、共鸣、爽感、治愈）。
      4. **排版友好**：段落不超过3行，适当使用金句（加粗）。
      5. **强力结尾**：结尾要有金句升华，并引导转发/在看。`,
      
      xiaohongshu: `你是一位深谙小红书流量密码的爆款博主（KOL）。请根据提供的主题和大纲，创作一篇一眼吸睛、容易上热门的笔记。
      要求：
      1. **标题党**：标题必须包含Emoji，采用“痛点+解决方案”或“情绪+反差”公式，让人忍不住点击。
      2. **视觉化写作**：正文大量使用Emoji（如✨、💡、🔥、👇），排版要像诗一样，多换行，不要大段文字堆砌。
      3. **闺蜜语气**：严禁说教！要像跟闺蜜喝下午茶一样聊天，多用“宝子们”、“集美”、“真的绝绝子”、“听劝”等口语。
      4. **干货+情绪**：在提供价值的同时，要照顾读者的情绪。
      5. **标签**：结尾必须包含10个精准的流量标签。`,
      
      douyin: `你是一位短视频脚本鬼才。请根据提供的主题和大纲，创作一个完播率极高的短视频脚本。
      要求：
      1. **黄金3秒**：开头第一句台词必须是“钩子”（Hook），用悬念、反差或痛点死死钩住观众，严禁啰嗦的开场白。
      2. **视听语言**：不仅写台词，必须详细描述【画面】、【景别】、【音效/BGM】。
      3. **快节奏**：每句话不超过15个字，信息密度要高，情绪起伏要大。
      4. **互动**：结尾设计一个具体的互动问题，引导评论。`,
      
      weibo: `你是一位观点犀利的微博大V。请撰写一条能引发热议的微博。
      要求：
      1. **短平快**：直击要害，不废话，每句话都要有信息量或情绪点。
      2. **金句频出**：至少包含一句能被截图转发的金句。
      3. **话题感**：包含2-3个能蹭上热搜的话题标签。
      4. **情绪共鸣**：引发群体的强烈共鸣或讨论欲望。`,
      
      bilibili: `你是一位深懂Z世代梗文化的B站百大UP主。请撰写一个中长视频的文案脚本。
      要求：
      1. **玩梗**：语言风格极度年轻化，自然融入B站热梗（如“下次一定”、“要素察觉”），但不要尴尬硬融。
      2. **硬核+有趣**：逻辑要严密（硬核），但表达要风趣（整活）。
      3. **互动设计**：在关键节点设计“弹幕护体”、“扣1”、“三连”的互动点。
      4. **个性化**：打造独特的人设标签。`,
      
      linkedin: `You are a LinkedIn Top Voice. Write a professional yet engaging thought leadership post.
      Requirements:
      1. **Conversational Professionalism**: Professional but not stiff. Write like you are speaking to a peer, not writing a textbook.
      2. **Hook**: Start with a counter-intuitive insight or a personal story.
      3. **Value-Add**: Use bullet points to deliver actionable takeaways.
      4. **Engagement**: End with a specific question to spark debate in the comments.
      (Output in Chinese unless the input implies English, but strictly follow the professional yet engaging style)`,
      
      twitter: `You are a viral Twitter/X Thread writer. Write a thread that hooks instantly.
      Requirements:
      1. **The Hook**: The first tweet must be impossible to scroll past.
      2. **One Idea Per Tweet**: Keep it punchy. No walls of text.
      3. **Rhythm**: Vary sentence length to create a reading rhythm.
      4. **CTA**: End with a summary and a request to RT/Follow.`,
      
      zhihu: `你是一位知乎高赞答主（谢邀体）。请根据主题撰写一篇高赞回答。
      要求：
      1. **故事起手**：不要直接讲道理，先讲一个“我朋友”或“亲身经历”的故事作为切入点。
      2. **硬核干货**：中间部分逻辑要极度严密，可以引用理论或数据，展现专业度。
      3. **降维打击**：用通俗易懂的类比来解释复杂概念。
      4. **金句收尾**：结尾要有一句耐人寻味的总结，引发思考。`
    }

    // 优先处理用户风格，将其作为最高指令
    let styleInstruction = '';
    if (userStyle && userStyle.trim()) {
        styleInstruction = `
【🚨 最高优先级指令：文风复刻 🚨】
用户希望你严格模仿以下写作风格（User Style）。
请忽略任何与该风格冲突的常规写作规则，**无条件优先满足**该风格的断句习惯、用词偏好、语气助词和情感浓度。

待模仿的风格样本/描述：
"""
${userStyle}
"""

请在生成时，时刻自检：“这句话像【${userStyle.substring(0, 10)}...】这种风格写出来的吗？”如果不是，请重写。
`;
    }

    const systemPrompt = `
      ${platformPrompts[platform] || platformPrompts.wechat_mp}
      
      ${styleInstruction}

      【通用写作禁令】（除非用户风格特别指定，否则必须遵守）：
      ❌ 严禁使用“AI味”浓重的词汇：如“总之”、“综上所述”、“不可或缺”、“关键作用”、“全方位”、“多维度”。
      ❌ 严禁使用长难句：能用两个短句说完的，绝不写成一个长句。
      ❌ 严禁说教：不要像老师教学生，要像朋友分享。

      请确保输出内容完全符合该平台的调性和格式规范。
      直接输出正文内容，不要包含"好的"、"标题："等任何非正文的解释性语言。
    `

    const userPrompt = `
      主题：${topic}
      平台：${platform}
      
      大纲：
      ${outline}
      
      相关背景信息：
      产品名称：${context?.productBasic?.name || '未知产品'}
      ${context?.githubReadme ? `GitHub README参考：\n${context.githubReadme.slice(0, 1000)}...` : ''}
    `

    const modelId = getModelId(model);
    
    const completion = await getClient(model).chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: modelId,
      temperature: 0.8, // 创作需要一定的发散度
    })

    const content = completion.choices[0]?.message?.content || ''
    
    if (!content) {
        throw new Error('AI returned empty content');
    }

    // 清理可能存在的 deepseek 思考标签
    const cleanContent = String(content).replace(/<think>[\s\S]*?<\/think>/gi, '').trim()

    res.json({ content: cleanContent })

  } catch (error) {
    console.error('Draft Generation Error:', error)
    // 区分 API 错误和代码错误
    if (error.response) {
       return res.status(error.response.status || 500).json({ error: `AI Provider Error: ${JSON.stringify(error.response.data)}` })
    }
    res.status(500).json({ error: error.message })
  }
})

// AI 润色接口 (编辑角色)
app.post('/api/ai/refine-draft', async (req, res) => {
  try {
    const { content, platform, model = 'deepseek', userStyle } = req.body
    
    if (!content || content.length < 10) {
      return res.status(400).json({ error: '内容太短，无法润色' })
    }

    console.log('Refining draft for platform:', platform, 'using model:', model)

    const systemPrompt = `你是一位拥有20年经验的资深${platform === 'xiaohongshu' ? '小红书' : (platform === 'wechat_mp' ? '公众号' : '媒体')}主编。
你的任务是对用户提供的初稿进行“大师级润色”。

【润色原则】：
1. **信**：保留原意的核心观点和事实，不要随意篡改数据。
2. **达**：优化语句的流畅度，去除冗余词汇，修正语病。
3. **雅**：提升文采，使用更精准、更有感染力的词汇。
4. **调性适配**：
   - 如果是小红书：增加emoji，强化情绪价值，使用“集美体”或“干货体”，增加互动感。
   - 如果是公众号：增加深度，优化段落节奏，增加金句。
   
${userStyle ? `\n【特别注意】：用户指定了以下个人风格，请在润色时尽量向此风格靠拢：\n${userStyle}` : ''}

请直接输出润色后的正文内容，不要包含任何解释性语言。`

    const userPrompt = `【待润色初稿】：\n${content}`

    const modelId = getModelId(model);

    const completion = await getClient(model).chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: modelId,
      temperature: 0.6, // 润色稍微收敛一点，避免过度发挥
    })

    const refinedContent = completion.choices[0].message.content
    const cleanContent = String(refinedContent || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim()

    res.json({ content: cleanContent })

  } catch (error) {
    console.error('Refine Draft Error:', error)
    res.status(500).json({ error: error.message })
  }
})

// AI 纠错接口 (校对员角色)
app.post('/api/ai/proofread', async (req, res) => {
  try {
    const { content, model = 'deepseek' } = req.body
    
    if (!content || content.length < 5) {
      return res.status(400).json({ error: '内容太短，无法校对' })
    }

    console.log('Proofreading content using model:', model)

    const systemPrompt = `你是一位拥有30年经验的资深文字校对专家。
    你的任务是检查用户提供的文本，修正其中的错别字、标点符号错误、地得混用和明显的语法错误。

    【校对原则】：
    1. **只改错误**：仅修正客观存在的错误，绝对不要修改原意的表达方式，不要润色，不要改变文风。
    2. **标点规范**：修正误用的标点符号（如中英文标点混用）。
    3. **地得分辨**：准确修正“的、地、得”的用法。
    4. **完整输出**：直接输出修正后的完整正文，不要输出修改列表，不要包含任何解释性语言。`

    const userPrompt = `【待校对内容】：\n${content}`

    const modelId = getModelId(model);

    const completion = await getClient(model).chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: modelId,
      temperature: 0.1, // 校对需要极低的温度，确保严谨
    })

    const proofreadContent = completion.choices[0].message.content
    const cleanContent = String(proofreadContent || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim()

    res.json({ content: cleanContent })

  } catch (error) {
    console.error('Proofread Error:', error)
    res.status(500).json({ error: error.message })
  }
})

// 获取产品成员列表 (Mock)
app.get('/api/products/:productId/members', (req, res) => {
  const { productId } = req.params;
  
  let list = productMembers[productId] && productMembers[productId].length > 0
    ? productMembers[productId] 
    : null;

  const xName = req.headers['x-user-name'];
  const xEmail = req.headers['x-user-email'];
  const xAvatar = req.headers['x-user-avatar'];

  if (!list) {
    // 如果没有成员数据，尝试使用请求头中的当前用户信息初始化为 Owner
    if (xName || xEmail) {
      const username = xName ? decodeURIComponent(xName) : 'User';
      const email = xEmail || 'user@example.com';
      const avatar = xAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;

      const newOwner = {
        id: 'user-' + Math.random().toString(36).substring(2, 9),
        full_name: username,
        username: username,
        email: email,
        role: 'owner',
        avatar_url: avatar,
        joined_at: new Date().toISOString(),
        last_active: new Date().toISOString()
      };
      
      // Initialize members list
      productMembers[productId] = [newOwner];
      
      // Update product owner_id to match
      const product = db.products.find(p => p.id === productId);
      if (product) {
        product.owner_id = newOwner.id;
      }
      
      saveDb();
      list = productMembers[productId];
    } else {
      // Fallback to mock admin only if no user info available
      list = [
        {
          id: 'mock-user-1',
          full_name: '系统管理员',
          username: 'admin',
          email: 'admin@productduck.com',
          role: 'owner',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
          joined_at: new Date().toISOString(),
          last_active: new Date().toISOString()
        }
      ];
    }
  } else {
    // Sync avatar for current user if changed
    if ((xName || xEmail) && xAvatar) {
        const username = xName ? decodeURIComponent(xName) : '';
        const email = xEmail || '';
        let changed = false;
        
        // Find member matching current user
        const member = list.find(m => (email && m.email === email) || (username && m.username === username));
        
        if (member) {
            if (member.avatar_url !== xAvatar) {
                member.avatar_url = xAvatar;
                changed = true;
            }
        }
        
        if (changed) {
            saveDb();
        }
    }
  }

  res.json({ data: { members: list } });
});

// 邀请成员接口 (Mock)
app.post('/api/products/:productId/members/invite', (req, res) => {
  const { productId } = req.params;
  const { role, validDays, expires_in_days, product_name } = req.body;
  console.log(`Inviting member to product ${productId}, role: ${role}`);

  const days = Number(validDays || expires_in_days || 7);
  const inviteCode = Math.random().toString(36).substring(2, 15);
  const base = String(req.body?.client_base || '').trim() || resolveAppBase(req);
  const pn = encodeURIComponent(product_name || '产品');
  const rl = encodeURIComponent(role || 'member');
  const inviteUrl = `${base}/?invitation=${inviteCode}&pid=${encodeURIComponent(productId)}&product=${pn}&role=${rl}&days=${days}`;
  invitations[inviteCode] = {
    product_id: String(productId),
    role: String(role || 'member'),
    product_name: req.body.product_name || '产品',
    expires_at: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
    invited_by: 'Admin'
  };
  saveDb();
  const roleText = role === 'admin' ? '管理员' : role === 'viewer' ? '查看者' : '成员';
  const displayName = product_name || '该产品';
  const shareText = `邀请加入【${displayName}】团队（角色：${roleText}）。点击链接加入：${inviteUrl}（有效期${days}天）`;

  res.json({
    data: {
      invite_url: inviteUrl,
      code: inviteCode,
      expires_at: invitations[inviteCode].expires_at,
      share_text: shareText
    },
    message: '邀请链接已生成'
  });
});

// 获取邀请记录列表 (Mock)
app.get('/api/products/:productId/invitations', (req, res) => {
  const { productId } = req.params;
  console.log(`Fetching invitations for product ${productId}`);

  res.json({
    data: {
      invitations: [
        {
          id: 'inv_mock_001',
          role: 'member',
          status: 'pending',
          invite_url: `${resolveAppBase(req)}/invite/mock-code-123`,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]
    }
  });
});

app.get('/api/invitations/:code', (req, res) => {
  const { code } = req.params;
  const inv = invitations[code];
  if (!inv) {
    return res.status(404).json({ message: '邀请不存在或已过期' });
  }
  res.json({ data: inv });
});

app.post('/api/invitations/:code/accept', (req, res) => {
  const { code } = req.params;
  const inv = invitations[code];
  if (!inv) {
    return res.status(404).json({ message: '邀请不存在或已过期' });
  }
  const username = String(req.body?.username || 'user');
  const email = String(req.body?.email || `${username}@example.com`);
  const member = {
    id: `user-${Math.random().toString(36).slice(2)}`,
    full_name: username,
    username,
    email,
    role: inv.role,
    joined_at: new Date().toISOString(),
    last_active: new Date().toISOString()
  };
  const pid = inv.product_id;
  if (!productMembers[pid]) productMembers[pid] = [];

  // Fix: If this is the first explicit member, ensure the Owner is preserved
  // Otherwise, the implicit owner logic in GET /members will be bypassed, and the owner disappears/loses admin rights.
  if (productMembers[pid].length === 0) {
    productMembers[pid].push({
      id: 'mock-user-1',
      full_name: 'Owner',
      username: 'owner',
      email: 'owner@example.com',
      role: 'owner',
      joined_at: new Date().toISOString(),
      last_active: new Date().toISOString()
    });
  }

  const existingMember = productMembers[pid].find(m => m.username === username || String(m.email || '').trim() === email);
  if (existingMember) {
    // 字段纠正：如果之前写入了占位值，使用本次的真实信息纠正
    const placeholderEmail = !existingMember.email || /@example\.com$/i.test(String(existingMember.email || ''))
    const placeholderName = !existingMember.username || existingMember.username === 'user' || String(existingMember.full_name || '') === '用户'
    if (placeholderEmail || placeholderName) {
      existingMember.username = username
      existingMember.full_name = username
      existingMember.email = email
      saveDb()
    }
    // If member exists, update role only if the new role is 'admin' (upgrade)
    // or if they are currently just a 'viewer' and becoming 'member'.
    // Don't downgrade an admin to member.
    const roles = { 'owner': 4, 'admin': 3, 'member': 2, 'viewer': 1 };
    const currentLevel = roles[existingMember.role] || 0;
    const newLevel = roles[inv.role] || 0;
    
    if (newLevel > currentLevel && existingMember.role !== 'owner') {
      existingMember.role = inv.role;
      saveDb();
    }
    // If they are already owner/admin, do nothing (preserve status)
  } else {
    productMembers[pid].push(member);
    saveDb();
  }
  res.json({ success: true });
});

// 更新成员角色接口
app.put('/api/products/:productId/members/:memberId/role', (req, res) => {
  const { productId, memberId } = req.params;
  const { role } = req.body;
  
  if (!productMembers[productId]) {
    return res.status(404).json({ message: '产品不存在或无成员' });
  }

  const member = productMembers[productId].find(m => m.id === memberId);
  if (!member) {
    // Try finding by username if ID match fails (compatibility)
    // But memberId passed from frontend is usually the ID.
    return res.status(404).json({ message: '成员不存在' });
  }

  // Prevent changing owner role
  if (member.role === 'owner') {
    return res.status(403).json({ message: '无法修改拥有者角色' });
  }

  member.role = role;
  saveDb();
  res.json({ success: true, data: member });
});

// 移除成员接口
app.delete('/api/products/:productId/members/:memberId', (req, res) => {
  const { productId, memberId } = req.params;
  
  if (!productMembers[productId]) {
    return res.status(404).json({ message: '产品不存在或无成员' });
  }

  const idx = productMembers[productId].findIndex(m => m.id === memberId);
  if (idx === -1) {
    return res.status(404).json({ message: '成员不存在' });
  }

  // Prevent removing owner
  if (productMembers[productId][idx].role === 'owner') {
    return res.status(403).json({ message: '无法移除拥有者' });
  }

  productMembers[productId].splice(idx, 1);
  saveDb();
  res.json({ success: true });
});

app.post('/api/invitations/:code/decline', (req, res) => {
  res.json({ success: true });
});

// Mock Roadmap Items Storage
let mockRoadmapItems = [
  {
    id: 1,
    title: '用户注册与登录',
    description: '支持手机号/邮箱注册，微信扫码登录',
    type: 'Feature',
    status: 'completed',
    priority: 'high',
    owner_id: 1,
    owner_name: 'Product Owner',
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    progress: 100,
    tags: ['用户中心', 'MVP']
  },
  {
    id: 2,
    title: 'AI写作助手V1.0',
    description: '基于DeepSeek模型的内容生成',
    type: 'Epic',
    status: 'in_progress',
    priority: 'high',
    owner_id: 1,
    owner_name: 'Product Owner',
    start_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    progress: 60,
    tags: ['AI', '核心功能']
  },
  {
    id: 3,
    title: '多平台发布支持',
    description: '一键发布到公众号、小红书',
    type: 'Feature',
    status: 'planned',
    priority: 'medium',
    owner_id: 1,
    owner_name: 'Product Owner',
    start_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    progress: 0,
    tags: ['渠道', '增长']
  }
];

// 获取路线图项目列表 (Mock)
app.get('/api/products/:productId/roadmap/items', (req, res) => {
  const { productId } = req.params;
  console.log(`Fetching roadmap items for product ${productId}`);
  res.json({
    success: true,
    data: { items: mockRoadmapItems }
  });
});

// 获取路线图标签 (Mock)
app.get('/api/products/:productId/roadmap/tags', (req, res) => {
  const tags = [...new Set(mockRoadmapItems.flatMap(item => item.tags))];
  res.json({
    success: true,
    data: tags
  });
});

// 创建路线图项目 (Mock)
app.post('/api/products/:productId/roadmap/items', (req, res) => {
  const newItem = {
    id: Date.now(),
    ...req.body,
    progress: req.body.progress || 0
  };
  mockRoadmapItems.push(newItem);
  res.json({
    success: true,
    data: newItem
  });
});

// 更新路线图项目 (Mock)
app.put('/api/products/:productId/roadmap/items/:itemId', (req, res) => {
  const { itemId } = req.params;
  const index = mockRoadmapItems.findIndex(item => item.id == itemId);
  if (index !== -1) {
    mockRoadmapItems[index] = { ...mockRoadmapItems[index], ...req.body };
    res.json({
      success: true,
      data: mockRoadmapItems[index]
    });
  } else {
    res.status(404).json({ success: false, message: 'Item not found' });
  }
});

// 删除路线图项目 (Mock)
app.delete('/api/products/:productId/roadmap/items/:itemId', (req, res) => {
  const { itemId } = req.params;
  mockRoadmapItems = mockRoadmapItems.filter(item => item.id != itemId);
  res.json({
    success: true,
    message: 'Item deleted'
  });
});

// 导出 PDF (Mock)
app.get('/api/products/:productId/roadmap/export/pdf', (req, res) => {
  res.json({
    success: true,
    data: { download_url: '#' }
  });
});

// --- Trend Radar API ---

async function fetchZhihuHot() {
  try {
    const { data } = await axios.get('https://www.zhihu.com/billboard', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 3000 // Short timeout to fail fast
    });
    const $ = cheerio.load(data);
    const list = [];
    $('.HotList-item').each((i, el) => {
      const title = $(el).find('.HotList-itemTitle').text().trim();
      const excerpt = $(el).find('.HotList-itemExcerpt').text().trim();
      const metrics = $(el).find('.HotList-itemMetrics').text().trim();
      const link = $(el).find('a.HotList-itemBody').attr('href');
      const img = $(el).find('.HotList-itemImgContainer img').attr('src');
      
      if (title) {
        list.push({
          id: `zh-${i}`,
          title,
          summary: excerpt,
          hot_score: metrics,
          url: link,
          image: img,
          source: 'zhihu',
          materials: [{
            type: 'depth',
            content: excerpt,
            source: '知乎热榜',
            url: link
          }]
        });
      }
    });
    
    if (list.length > 0) return list;
    throw new Error('No items found');
  } catch (e) {
    console.warn('Fetch Zhihu failed:', e.message);
    // Return empty array to rely on other sources instead of showing old data
    return [];
  }
}

async function fetchWeiboHot() {
  try {
    const { data } = await axios.get('https://s.weibo.com/top/summary', {
      headers: {
        'Cookie': 'SUB=_2AkMSb-aCf8NxqwJRmP4SzGvfZY51yw_EieKjgjNJJRMxHRl-yT9jqkAstRB6PzXqqR_5QjJ8J8XqqR_5QjJ8J8Xq;',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 3000
    });
    const $ = cheerio.load(data);
    const list = [];
    $('tr').each((i, el) => {
      if (i === 0) return;
      const title = $(el).find('.td-02 a').text().trim();
      const hot = $(el).find('.td-02 span').text().trim();
      const link = 'https://s.weibo.com' + $(el).find('.td-02 a').attr('href');
      
      if (title) {
        list.push({
          id: `wb-${i}`,
          title,
          hot_score: hot,
          url: link,
          source: 'weibo',
          materials: [{
            type: 'emotion',
            content: `微博热搜话题：${title}，热度：${hot}`,
            source: '微博热搜',
            url: link
          }]
        });
      }
    });
    if (list.length > 0) return list;
    throw new Error('No items found');
  } catch (e) {
    console.warn('Fetch Weibo failed:', e.message);
    return [];
  }
}

async function fetch36KrHot() {
  try {
    const { data } = await axios.get('https://36kr.com/hot-list/catalog', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 5000
    });
    const $ = cheerio.load(data);
    const list = [];
    
    $('.article-wrapper').each((i, el) => {
      const title = $(el).find('.article-item-title').text().trim();
      const summary = $(el).find('.article-item-description').text().trim();
      const link = 'https://36kr.com' + $(el).find('.article-item-title').closest('a').attr('href');
      // Try to find image if available
      const img = $(el).find('img').attr('src');

      if (title) {
        list.push({
          id: `36kr-${i}`,
          title,
          summary: summary || title,
          hot_score: `Top ${i + 1}`,
          source: '36kr',
          image: img,
          url: link,
          materials: [{
            type: 'news',
            content: summary || title,
            source: '36Kr',
            url: link
          }]
        });
      }
    });

    if (list.length > 0) return list.slice(0, 20); // Top 20
    throw new Error('No items found');
  } catch (e) {
    console.warn('Fetch 36Kr failed, using mock data:', e.message);
    // Fallback Mock Data
    return [
        { 
          id: '36kr-mock-1', 
          title: 'AI 应用爆发前夜：谁是下一个字节跳动？', 
          summary: 'AI 原生应用正在重塑互联网格局...', 
          hot_score: 'Top 1', 
          source: '36kr',
          materials: [{ type: 'news', content: 'AI 原生应用正在重塑互联网格局', source: '36Kr', url: 'https://36kr.com' }]
        }
    ];
  }
}

async function fetchBaiduHot() {
  try {
    const { data } = await axios.get('https://top.baidu.com/board?tab=realtime', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 5000
    });
    const $ = cheerio.load(data);
    const list = [];
    
    $('.category-wrap_iQLoo').each((i, el) => {
      const title = $(el).find('.c-single-text-ellipsis').text().trim();
      const summary = $(el).find('.hot-desc_1m_jR.large_nSuFU').text().trim() || $(el).find('.hot-desc_1m_jR.small_Uvkd3').text().trim();
      const hot = $(el).find('.hot-index_1Bl1a').text().trim();
      const link = $(el).find('.content_1YWBm > a').attr('href');
      const img = $(el).find('.img-wrapper_29V76 img').attr('src');

      if (title) {
        list.push({
          id: `baidu-${i}`,
          title,
          summary: summary || title,
          hot_score: hot,
          source: 'baidu',
          image: img,
          url: link,
          materials: [{
            type: 'news',
            content: summary || title,
            source: '百度热搜',
            url: link
          }]
        });
      }
    });

    if (list.length > 0) return list;
    return [];
  } catch (e) {
    console.warn('Fetch Baidu failed:', e.message);
    return [];
  }
}

// 智能聚类算法 (LLM-Based)
async function clusterTrends(allTrends) {
  console.log(`Starting LLM clustering for ${allTrends.length} trends...`);
  
  // 1. Simplify data to save tokens and avoid context overflow
  // Pick top 15 from each source to ensure diversity
  const sources = [...new Set(allTrends.map(t => t.source))];
  let limitedTrends = [];
  sources.forEach(s => {
      limitedTrends.push(...allTrends.filter(t => t.source === s).slice(0, 15));
  });
  const simpleTrends = limitedTrends.map(t => ({
    id: t.id,
    title: t.title,
    summary: t.summary || t.title,
    source: t.source
  }));

  const systemPrompt = `你是一位资深的新闻主编。你的任务是分析全网热点（知乎、微博、36Kr），将相关联的内容聚合为“核心话题”，并**重写标题**。

输入数据: 包含 id, title, summary, source 的原始热点列表。

任务要求:
1. **深度聚合**: 必须将讨论同一事件、同一现象或紧密相关的话题归为一个Cluster。不要只看关键词匹配，要理解语义。
2. **重写标题 (关键)**: 
   - 原始标题往往包含情绪化表达、提问或诱导点击成分（如“此情此景你共情了吗？”）。
   - **请务必**将其重写为简练、客观、陈述事实的标题。
   - 示例输入: "19 岁女大学生独自来京，登长城后哽咽背诗走红，此情此景你与她共情了吗？"
   - 示例输出: "19岁女大学生登长城后哽咽背诗走红"
3. **提炼摘要**: 为每个Cluster撰写一个【深度摘要】，概括事件全貌。
4. **精准分类**: 打上最准确的分类标签。
5. **JSON输出**: 严格遵守输出格式。

输出格式示例:
[
  {
    "title": "19岁女大学生登长城后哽咽背诗走红",
    "summary": "近日，一名19岁女大学生独自赴京并在长城朗诵诗歌的视频在网络走红，引发关于青年情感与文化共鸣的广泛讨论。",
    "category": "社会民生",
    "trend_ids": ["id1", "id2"]
  }
]`;

  try {
    const model = 'doubao'; // Default model
    const modelId = getModelId(model);
    
    // Check if we can make the call
    const client = getClient(model);
    
    const completion = await client.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(simpleTrends) }
      ],
      model: modelId,
      temperature: 0.4, // Slightly higher for better summary generation
    }, { timeout: 20000 }); // Increase timeout to 20s for better analysis

    const content = completion.choices[0].message.content;
    const cleanContent = String(content || '').replace(/```json/g, '').replace(/```/g, '').trim();
    
    let clustersData;
    try {
        clustersData = JSON.parse(cleanContent);
    } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.log('Raw Content:', content);
        throw parseError;
    }

    // Rehydrate clusters
    const clusters = clustersData.map(c => {
      const trends = allTrends.filter(t => c.trend_ids.includes(t.id));
      if (trends.length === 0) return null;

      return {
        id: `cluster-${trends[0].id}`, // Use first trend ID as base
        title: c.title,
        summary: c.summary,
        category: c.category || '热点', // Add category
        platforms: [...new Set(trends.map(t => t.source))],
        materials: trends.flatMap(t => t.materials || []),
        raw_trends: trends,
        // Promote image and url
        image: trends.find(t => t.image)?.image || null,
        url: trends[0].url,
      };
    }).filter(Boolean);

    return clusters;

  } catch (error) {
    console.error('LLM Clustering Failed:', error);
    // Fallback: Return raw trends as individual clusters
    return allTrends.map(t => ({
      id: t.id,
      title: t.title,
      summary: t.summary || t.title,
      category: t.source === '36kr' ? '科技' : (t.source === 'zhihu' ? '社会' : '娱乐'),
      platforms: [t.source],
      materials: t.materials || [],
      raw_trends: [t],
      image: t.image || null,
      url: t.url,
    }));
  }
}

// --- 聚合/缓存辅助工具 ---
function ensureFetchedAt(list) {
  const now = new Date().toISOString();
  return list.map(item => ({
    fetched_at: now,
    ...item,
    fetched_at: item.fetched_at || now
  }));
}

function mergeTrendsIntoStore(newList) {
  const store = db.trends;
  if (!store.items) store.items = [];
  const existingIds = new Set(store.items.map(i => i.id));
  let added = 0;
  newList.forEach(item => {
    if (!existingIds.has(item.id)) {
      store.items.push(item);
      added++;
    }
  });
  store.last_updated = new Date().toISOString();
  saveDb();
  return added;
}

function computeClusterTime(cluster) {
  const times = (cluster.raw_trends || []).map(t => t.fetched_at).filter(Boolean);
  const max = times.sort((a, b) => new Date(b) - new Date(a))[0];
  return max || new Date().toISOString();
}

async function recomputeClusters() {
  const all = db.trends.items || [];
  const clusters = await clusterTrends(all);
  // attach cluster_time and sort by time desc
  const enriched = clusters.map(c => ({
    ...c,
    cluster_time: computeClusterTime(c)
  })).sort((a, b) => new Date(b.cluster_time) - new Date(a.cluster_time));
  db.trend_clusters.items = enriched;
  db.trend_clusters.last_updated = new Date().toISOString();
  saveDb();
  return enriched;
}

app.get('/api/trends/aggregated', async (req, res) => {
  try {
    // 若缓存为空，进行一次初始化抓取并聚类
    if (!db.trends.items || db.trends.items.length === 0) {
      const [zhihu, weibo, kr, baidu] = await Promise.all([
        fetchZhihuHot().catch(e => []), // Graceful fail
        fetchWeiboHot(),
        fetch36KrHot(),
        fetchBaiduHot()
      ]);
      // If zhihu is empty, baidu fills the gap for social news
      const all = ensureFetchedAt([...zhihu, ...weibo, ...kr, ...baidu]);
      mergeTrendsIntoStore(all);
      await recomputeClusters();
    }
    // 若聚类缓存为空或未初始化，补一次聚类
    if (!db.trend_clusters.items || db.trend_clusters.items.length === 0) {
      await recomputeClusters();
    }
    res.json({ data: db.trend_clusters.items || [] });
  } catch (error) {
    console.error('Aggregated Trends Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 增量刷新：抓取新数据并合并缓存，返回新增数量与最新聚类
app.post('/api/trends/refresh', async (req, res) => {
  try {
    const [zhihu, weibo, kr, baidu] = await Promise.all([
      fetchZhihuHot().catch(e => []),
      fetchWeiboHot(),
      fetch36KrHot(),
      fetchBaiduHot()
    ]);
    const incoming = ensureFetchedAt([...zhihu, ...weibo, ...kr, ...baidu]);
    const added = mergeTrendsIntoStore(incoming);
    const aggregated = await recomputeClusters();
    res.json({ new_count: added, data: aggregated });
  } catch (error) {
    console.error('Refresh Trends Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fetch Custom Trends
app.post('/api/trends/fetch-custom', async (req, res) => {
  const { platform, category } = req.body;
  if (!platform) return res.status(400).json({ error: 'Missing platform' });

  try {
    let rawTrends = [];
    
    // 1. Fetch based on platform & category (Mapping)
    if (platform === 'zhihu') {
      let url = 'https://www.zhihu.com/billboard';
      if (category === '科技' || category === '数码') url = 'https://www.zhihu.com/billboard/science';
      if (category === '体育') url = 'https://www.zhihu.com/billboard/sport';
      if (category === '娱乐') url = 'https://www.zhihu.com/billboard/culture'; // culture is close to entertainment in Zhihu map sometimes
      
      console.log(`Fetching Zhihu Custom: ${url}`);
      // Reuse logic from fetchZhihuHot but with custom URL
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        timeout: 5000
      });
      const $ = cheerio.load(data);
      $('.HotList-item').each((i, el) => {
        const title = $(el).find('.HotList-itemTitle').text().trim();
        const excerpt = $(el).find('.HotList-itemExcerpt').text().trim();
        const link = $(el).find('a.HotList-itemBody').attr('href');
        const img = $(el).find('.HotList-itemImgContainer img').attr('src');
        if (title) {
          rawTrends.push({
            id: `zh-${category || 'all'}-${i}-${Date.now()}`,
            title,
            summary: excerpt,
            hot_score: 'Custom Fetch',
            url: link,
            image: img,
            source: 'zhihu',
            materials: [{ type: 'depth', content: excerpt, source: '知乎', url: link }]
          });
        }
      });
    } else if (platform === 'weibo') {
       // Weibo custom fetch simulation (hard to scrape specific cats without login sometimes)
       // We will fetch top summary and filter OR simulate with Mock if category is specific
       let url = 'https://s.weibo.com/top/summary';
       if (category === '娱乐') url = 'https://s.weibo.com/top/summary?cate=entrank';
       if (category === '社会') url = 'https://s.weibo.com/top/summary?cate=socialevent';

       console.log(`Fetching Weibo Custom: ${url}`);
       const { data } = await axios.get(url, {
          headers: { 
            'Cookie': 'SUB=_2AkMSb-aCf8NxqwJRmP4SzGvfZY51yw_EieKjgjNJJRMxHRl-yT9jqkAstRB6PzXqqR_5QjJ8J8XqqR_5QjJ8J8Xq;',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
          },
          timeout: 5000
       });
       const $ = cheerio.load(data);
       $('tr').each((i, el) => {
         if (i === 0) return;
         const title = $(el).find('.td-02 a').text().trim();
         const link = 'https://s.weibo.com' + $(el).find('.td-02 a').attr('href');
         if (title) {
           rawTrends.push({
             id: `wb-${category || 'all'}-${i}-${Date.now()}`,
             title,
             hot_score: 'Custom Fetch',
             url: link,
             source: 'weibo',
             materials: [{ type: 'emotion', content: `微博话题：${title}`, source: '微博', url: link }]
           });
         }
       });
    } else if (platform === '36kr') {
      // Mock for 36Kr custom
      rawTrends = await fetch36KrHot();
      // Add randomness for demo
      rawTrends = rawTrends.map((t, idx) => ({ ...t, id: `36kr-${idx}-${Date.now()}`, title: `[${category || '精选'}] ${t.title}` }));
    }

    if (rawTrends.length === 0) {
      return res.json({ data: [], message: 'No items found for this criteria' });
    }

    // 2. Cluster
    const newClusters = await clusterTrends(rawTrends);

    // 3. Merge into DB (Append to existing)
    // We put them at the top
    const existingIds = new Set(db.trend_clusters.items.map(c => c.title));
    const uniqueNewClusters = newClusters.filter(c => !existingIds.has(c.title));
    
    if (uniqueNewClusters.length > 0) {
       db.trend_clusters.items = [...uniqueNewClusters, ...db.trend_clusters.items];
       db.trend_clusters.last_updated = new Date().toISOString();
       saveDb();
    }

    res.json({ data: uniqueNewClusters, total_added: uniqueNewClusters.length });

  } catch (error) {
    console.error('Fetch Custom Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Real Search Helpers ---

async function searchWeibo(keyword) {
  try {
    const url = `https://s.weibo.com/weibo?q=${encodeURIComponent(keyword)}`;
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cookie': 'SUB=_2AkMSb-aCf8NxqwJRmP4SzGvfZY51yw_EieKjgjNJJRMxHRl-yT9jqkAstRB6PzXqqR_5QjJ8J8XqqR_5QjJ8J8Xq;' // Minimal cookie
      },
      timeout: 5000
    });
    const $ = cheerio.load(data);
    const list = [];
    
    $('.card-wrap').each((i, el) => {
      const content = $(el).find('.txt').text().trim();
      const link = $(el).find('.from a').first().attr('href');
      if (content && !content.includes('展开全文')) {
        list.push({
          id: `wb-search-${Date.now()}-${i}`,
          source: 'weibo',
          content: content.replace(/\s+/g, ' '),
          type: 'emotion',
          url: link?.startsWith('http') ? link : `https:${link}`,
          tags: ['微博热议']
        });
      }
    });
    return list.slice(0, 5);
  } catch (e) {
    console.warn('Weibo search failed:', e.message);
    return [];
  }
}

app.post('/api/trends/fetch-materials', async (req, res) => {
  const { keyword, platforms = ['zhihu', 'weibo'] } = req.body;
  if (!keyword) return res.status(400).json({ error: 'Missing keyword' });

  console.log(`Deep fetching materials for: ${keyword} on [${platforms.join(',')}]`);
  
  try {
    let allMaterials = [];
    const searchPromises = [];

    // 1. Real Search
    if (platforms.includes('weibo')) {
      searchPromises.push(searchWeibo(keyword));
    }
    // 知乎目前较难爬取，暂时只做占位或尝试，主要依赖 LLM 补全知乎部分
    // if (platforms.includes('zhihu')) searchPromises.push(searchZhihu(keyword));

    const results = await Promise.all(searchPromises);
    results.forEach(list => allMaterials = allMaterials.concat(list));

    // 2. LLM Fallback / Supplement
    // 如果总数太少，或者缺少某些平台的数据，用 LLM 补全
    if (allMaterials.length < 5) {
      console.log('Real search yielded few results, using LLM fallback...');
      
      const systemPrompt = `你是一个全网内容采集助手。
用户给出一个热点关键词，你需要模拟从知乎、微博、36Kr、公众号等平台采集到了更多相关的深度素材。
请生成 5-8 条与该热点高度相关的素材，内容要丰富、有深度，覆盖不同视角（深度分析、大众情绪、行业数据等）。

输入关键词: ${keyword}
已有的真实素材数: ${allMaterials.length} (请补充更多，不要重复)

输出格式: JSON 数组
[
  {
    "id": "gen-1",
    "source": "知乎/微博/36Kr/公众号",
    "content": "素材正文...",
    "type": "depth/emotion/news",
    "url": "https://www.baidu.com/s?wd=关键词",
    "tags": ["标签1", "标签2"]
  }
]
注意：url 字段必须是 http 或 https 开头的有效链接。如果无法获取真实链接，请生成一个指向百度或谷歌搜索该关键词的链接。`;

      const model = 'doubao'; 
      const modelId = getModelId(model);
      const client = getClient(model);
      
      const completion = await client.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请为热点“${keyword}”采集更多素材。` }
        ],
        model: modelId,
        temperature: 0.7,
      });

      const content = completion.choices[0].message.content;
      const cleanContent = String(content || '').replace(/```json/g, '').replace(/```/g, '').trim();
      try {
        const genMaterials = JSON.parse(cleanContent);
        // 赋予唯一ID防止冲突
        genMaterials.forEach((m, i) => m.id = `gen-${Date.now()}-${i}`);
        allMaterials = allMaterials.concat(genMaterials);
      } catch (e) {
        console.error('Material Gen Parse Error', e);
      }
    }

    res.json({ data: allMaterials });

  } catch (error) {
    console.error('Fetch Materials Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/trends/analyze-material', async (req, res) => {
  const { material, productContext, model = 'doubao' } = req.body;
  
  // productContext is optional now for pure material analysis, but good to have context if we want to tailor the angle label
  if (!material) {
    return res.status(400).json({ error: 'Missing material' });
  }

  const systemPrompt = `你是一位资深的内容拆解专家。
你的任务是对提供的【原始素材】进行深度解构，还原作者的写作思路和核心亮点。
**请注意：你不需要将素材与任何产品强行关联，只需要客观分析素材本身。**

【分析维度】
1. **Core View (核心观点)**: 作者通过这篇文章主要想表达什么观点或态度？（一句话概括，引用式）
2. **Angle (切入角度)**: 作者是从什么角度切入这个热点的？
   - 例如：宏观行业分析、微观个体故事、反直觉/冷知识、情绪宣泄、实操干货、数据盘点等。
3. **Highlights (亮点/手法)**: 这篇素材有哪些值得借鉴的写作手法或亮点？
   - 例如：数据详实、金句频出、比喻形象、情感共鸣强、逻辑严密等。
4. **Summary (摘要)**: 简要概括素材内容。

【输出格式】
严格返回 JSON 格式，不要包含 Markdown 标记。
{
  "core_view": "...",
  "angle": "...", // 短语，如 "行业视角" 或 "情绪共鸣"
  "highlights": ["...", "..."], // 2-3个亮点
  "summary": "..."
}`;

  const userPrompt = `【原始素材】\n${material.content || material.summary || material.title}`;

  try {
    const modelId = getModelId(model);
    const completion = await getClient(model).chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: modelId,
      temperature: 0.5,
    });

    const content = completion.choices[0].message.content;
    const cleanContent = String(content || '').replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanContent);
    
    res.json({ data: result });
  } catch (error) {
    console.error('Analyze Material Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/trends/generate-idea', async (req, res) => {
  const { analyses, productContext, model = 'doubao', tone } = req.body;
  
  if (!analyses || !Array.isArray(analyses) || analyses.length === 0) {
    return res.status(400).json({ error: 'Missing analyses data' });
  }

  const systemPrompt = `你是一位首席内容官 (CCO)，服务于产品 "${productContext?.name || '用户产品'}"。
你的任务是基于用户提供的【参考素材分析】，为用户策划 3 个高质量的内容选题。

【背景信息】
- 产品名称: ${productContext?.name || '未知'}
- 产品定位: ${productContext?.positioning || '未知'}
- 目标受众: ${productContext?.target_audience || '未知'}
- 选题基调: ${tone === 'depth' ? '深度/科普' : tone === 'emotion' ? '情绪/共鸣' : '商业/行业'}

【参考策略】
你收到了一组参考素材的分析结果（核心观点、切入角度、亮点）。
1. **如果只有一个参考素材**: 请**借鉴**该素材的切入角度和写作亮点，将其**迁移**到用户产品的语境下。即“照着它的思路写一个关于我们产品的文章”。
2. **如果有多个参考素材**: 请**融合**这些素材的不同观点或角度，提炼出一个更全面或更新颖的选题。

【策划要求】
1. **关联性**: 选题必须围绕“热点”展开，并巧妙结合用户产品/行业（如果提供了产品信息）。
2. **吸引力**: 标题要符合新媒体传播规律。
3. **差异化**: 3 个选题应有不同的侧重点。

【输出格式】
严格返回 JSON 数组，不要包含 Markdown 标记。
[
  {
    "title": "...",
    "type": "...", // e.g. 观点迁移 / 角度借鉴 / 综合盘点
    "core_view": "...", // 本选题的核心观点
    "outline": ["...", "..."], // 简要大纲
    "reason": "..." // 推荐理由，例如：参考了素材A的XX角度，结合了产品的YY特点
  }
]`;

  const userPrompt = `【素材分析集合】\n${JSON.stringify(analyses)}`;

  try {
    const modelId = getModelId(model);
    const completion = await getClient(model).chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: modelId,
      temperature: 0.7,
    });

    const content = completion.choices[0].message.content;
    const cleanContent = String(content || '').replace(/```json/g, '').replace(/```/g, '').trim();
    let result = [];
    try {
      result = JSON.parse(cleanContent);
    } catch (e) {
       // If it's not an array, maybe it's wrapped in an object?
       console.warn('JSON parse warning', e);
    }
    
    res.json({ data: result });
  } catch (error) {
    console.error('Generate Idea Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Smart Topic / Content Domain API ---

// 1. Inspiration Inbox API
app.post('/api/inbox/add', async (req, res) => {
  const { type, content, source, user_id, meta_data } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  let finalContent = content;
  let finalMetaData = { ...meta_data };

  // Check if content is a URL
  const isUrl = /^(http|https):\/\/[^ "]+$/.test(content.trim());

  if (type === 'article' || isUrl) {
    try {
      const url = content.trim();
      console.log(`[Inbox] Fetching content for URL: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      let title = '';
      let textContent = '';
      
      // WeChat Official Account logic
      if (url.includes('mp.weixin.qq.com')) {
         title = $('#activity-name').text().trim() || $('meta[property="og:title"]').attr('content');
         // Use a more robust selector for content if possible, or cleanup text
         const $content = $('#js_content');
         // Remove scripts and styles
         $content.find('script, style').remove();
         textContent = $content.text().trim();
         // Normalize whitespace
         textContent = textContent.replace(/\s+/g, ' ').trim();
      } else {
         // Generic Logic
         title = $('title').text().trim() || $('meta[property="og:title"]').attr('content') || $('h1').first().text().trim();
         // Try to find main content
         const $body = $('body');
         $body.find('script, style, nav, footer, header').remove();
         const mainText = $('article').text() || $('main').text() || $body.text();
         textContent = mainText.replace(/\s+/g, ' ').trim().substring(0, 10000); // Limit length
      }

      if (title) {
        finalContent = title;
        finalMetaData.url = url;
        finalMetaData.full_text = textContent;
        finalMetaData.fetched_at = new Date().toISOString();
        
        // Try to get cover image
        const coverImage = $('meta[property="og:image"]').attr('content');
        if (coverImage) {
            finalMetaData.image = coverImage;
        }
      }
    } catch (err) {
      console.error('[Inbox] Failed to fetch URL content:', err.message);
      // Fallback: keep original content (URL)
    }
  }

  // AI Analysis Step
  try {
    const analysisPrompt = `
你是一位资深内容分析师。请对以下素材进行深度拆解分析。

【素材内容】
${finalContent}
${finalMetaData.full_text ? `(全文摘要: ${finalMetaData.full_text.substring(0, 500)}...)` : ''}

【分析维度】
请严格按照以下 JSON 格式输出分析结果：
{
  "phenomenon": "表达的现象",
  "core_view": "核心观点",
  "logic": "分析逻辑",
  "arguments": "论据/案例",
  "conclusion": "结论",
  "technique": "写作手法",
  "emotion_points": "用户情绪点",
  "why_good": "为什么好？（标题/切入点/共鸣等）",
  "shortcomings": "不足之处（可以避免的点）"
}
`;

    const model = process.env.VOLCENGINE_MODEL_ID || "gpt-3.5-turbo";
    console.log('[Inbox] Starting AI analysis...');
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: "你是一个精准的内容分析助手。请只返回 JSON 格式结果。" },
        { role: "user", content: analysisPrompt }
      ],
      temperature: 0.7,
    });

    const analysisContent = completion.choices[0]?.message?.content;
    if (analysisContent) {
        const cleanJson = analysisContent.replace(/```json/g, '').replace(/```/g, '').trim();
        try {
            finalMetaData.ai_analysis = JSON.parse(cleanJson);
            console.log('[Inbox] AI analysis success');
        } catch (e) {
            console.warn('[Inbox] AI analysis JSON parse failed', e);
        }
    }
  } catch (error) {
    console.error('[Inbox] AI analysis failed:', error.message);
    // Continue without analysis
  }

  // Use Supabase if available
  if (supabase) {
    try {
      const { data, error } = await supabase.from('inspiration_inbox').insert({
        user_id: user_id || 'mock-user-1', // Default for dev
        type,
        content: finalContent,
        source,
        meta_data: finalMetaData,
        tags: []
      }).select().single();
      
      if (error) throw error;
      return res.json({ data });
    } catch (e) {
      console.error('Supabase inbox add error:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  // Local DB Fallback (Mock)
  const newInspiration = {
    id: `insp-${Date.now()}`,
    user_id: user_id || 'mock-user-1',
    type,
    content: finalContent,
    source,
    meta_data: finalMetaData,
    tags: [],
    created_at: new Date().toISOString()
  };
  
  if (!db.inspiration_inbox) db.inspiration_inbox = [];
  db.inspiration_inbox.push(newInspiration);
  saveDb();
  
  res.json({ data: newInspiration });
});

app.get('/api/inbox/list', async (req, res) => {
  const user_id = req.query.user_id;

  if (supabase) {
    try {
      let query = supabase.from('inspiration_inbox')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: false });
        
      if (user_id) {
         // Only filter if valid UUID, otherwise it might be legacy user ID
         const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user_id);
         if (isUUID) {
            query = query.eq('user_id', user_id);
         }
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return res.json({ data: data || [] });
    } catch (e) {
      console.error('Supabase inbox list error:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  // Local DB Fallback
  const list = (db.inspiration_inbox || []).filter(i => !i.is_archived);
  res.json({ data: list });
});

app.delete('/api/inbox/:id', async (req, res) => {
  const { id } = req.params;

  if (supabase) {
    try {
      const { error } = await supabase.from('inspiration_inbox').delete().eq('id', id);
      if (error) throw error;
      return res.json({ success: true });
    } catch (e) {
      console.error('Supabase inbox delete error:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  // Local DB Fallback
  if (db.inspiration_inbox) {
    db.inspiration_inbox = db.inspiration_inbox.filter(i => i.id !== id);
    saveDb();
  }
  res.json({ success: true });
});


// 2. Topic & Framework Generation API

app.post('/api/trends/generate-topic', async (req, res) => {
  const { inspiration_ids, mode, user_id } = req.body;

  if (!inspiration_ids || !Array.isArray(inspiration_ids) || inspiration_ids.length === 0) {
    return res.status(400).json({ error: 'Inspiration IDs are required' });
  }

  // 1. Fetch Inspiration Content
  let materials = [];
  if (supabase) {
    const { data } = await supabase.from('inspiration_inbox').select('*').in('id', inspiration_ids);
    materials = data || [];
  } else {
    materials = (db.inspiration_inbox || []).filter(i => inspiration_ids.includes(i.id));
  }

  if (materials.length === 0) {
    return res.status(404).json({ error: 'Materials not found' });
  }

  // 2. Construct Prompt based on Mode
  const modePrompts = {
    'counter_intuitive': '生成反常识、挑战大众认知的观点。例如“为什么我不建议...”。',
    'niche': '针对特定细分人群或场景进行切入。例如“30岁职场宝妈...”。',
    'listicle': '盘点类、清单类，提供高密度信息增量。例如“这5个工具...”。',
    'emotion': '侧重情感共鸣，宣泄情绪或抚慰心灵。',
    'hotspot': '强行关联当下热点，借势营销。'
  };

  const modeInstruction = modePrompts[mode] || '综合分析，提炼最有价值的角度';
  const materialsList = materials.map((m, i) => `${i+1}. [${m.type}] ${m.content} ${m.meta_data?.full_text ? `(详细内容: ${m.meta_data.full_text.substring(0, 300)}...)` : ''}`).join('\n');

  // Try to get prompt from DB Agent
  let systemPrompt = getAgentPrompt('topic_generator', {
      mode_instruction: modeInstruction,
      materials_list: materialsList
  });
  
  let modelConfig = getAgentConfig('topic_generator');

  // Fallback if DB agent not found or prompt is empty (should not happen after init)
  if (!systemPrompt) {
       systemPrompt = `你是一位资深内容主编，擅长基于事实进行深度选题策划。
你的任务是基于提供的【素材】，生成 3 个不同角度的选题方案。

【重要原则】
1. **忠实于素材**：核心事实、数据、观点必须源自提供的素材，**严禁捏造**不存在的细节。
2. **逻辑自洽**：如果素材信息量不足，请基于常识进行合理的逻辑推演，但必须在“推荐理由”中注明。
3. **拒绝空泛**：避免生成“万金油”式的废话，每个选题都必须有具体的切入点。

【加工模式】
${modeInstruction}

【素材列表】
${materialsList}

【输出要求】
1. 生成 3 个选题方案。
2. 每个方案包含：
   - title: 标题（极具吸引力，符合小红书/公众号爆款调性）
   - core_view: 核心观点（一句话总结）
   - rationale: 推荐理由（为什么要这么写？符合什么用户心理？）
   - source_quote: 引用原文（该观点主要源自素材中的哪句话或哪个信息点，如无明确引用请留空）
3. 严格返回 JSON 数组格式。
`;
  }

  try {
    let model = modelConfig?.model || "doubao-pro-1.5";
    const temperature = modelConfig?.temperature || 0.7;

    // Map friendly model names to actual Volcengine Endpoint IDs
    // If we are using Volcengine (which we are), we must use the Endpoint ID from env
    if (process.env.VOLCENGINE_API_KEY && (model === 'doubao-pro-1.5' || model === 'gpt-3.5-turbo')) {
        model = process.env.VOLCENGINE_MODEL_ID || model;
    }

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt }
      ],
      temperature: temperature,
    });

    const content = completion.choices[0]?.message?.content || '[]';
    const cleanContent = String(content).replace(/```json/g, '').replace(/```/g, '').trim();
    let candidates = [];
    try {
      candidates = JSON.parse(cleanContent);
    } catch (e) {
      console.warn('JSON parse error', e);
    }

    // 3. Save Draft to DB
    let topicId = null;
    if (supabase) {
      const { data, error } = await supabase.from('content_topics').insert({
        user_id: user_id || 'mock-user-1',
        status: 'draft',
        generation_mode: mode,
        source_inspiration_ids: inspiration_ids,
        candidates: candidates
      }).select().single();
      
      if (!error) topicId = data.id;
    } else {
      topicId = `topic-${Date.now()}`;
      if (!db.content_topics) db.content_topics = [];
      db.content_topics.push({
        id: topicId,
        user_id: user_id || 'mock-user-1',
        status: 'draft',
        generation_mode: mode,
        source_inspiration_ids: inspiration_ids,
        candidates: candidates,
        created_at: new Date().toISOString()
      });
      saveDb();
    }

    res.json({ topicId, candidates });

  } catch (error) {
    console.error('Generate Topic Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/trends/generate-framework', async (req, res) => {
  const { topicId, selectedCandidateIndex, selectedCandidate } = req.body;
  
  // Use passed candidate object directly if provided (stateless), or fetch from DB
  let candidate = selectedCandidate;
  
  if (!candidate && topicId) {
     // Fetch from DB... (省略，优先信任前端传递的确定性数据)
  }
  
  if (!candidate) return res.status(400).json({ error: 'Candidate info required' });

  const systemPrompt = `你是一位专业的内容创作者。
请为以下选题生成一份深度的【成文大纲】。

【选题信息】
标题：${candidate.title}
核心观点：${candidate.core_view}

【大纲要求】
1. **开篇 (Hook)**: 设计一个能在3秒内抓住眼球的开头（提问/金句/反差）。
2. **正文 (Body)**: 规划 3 个分论点。每个论点下必须简要说明可以用什么案例、数据或逻辑来支撑。
3. **结尾 (Call to Action)**: 升华主题，金句收尾，引导互动。

【输出格式】
请直接输出 Markdown 格式的大纲，不要包含 \`\`\`markdown 代码块标记。
结构如下：

# ${candidate.title}

## Hook
(内容)

## Body
- 论点1
  > 支持案例/数据
- 论点2
  > 支持案例/数据
- 论点3
  > 支持案例/数据

## Conclusion
(内容)
`;

  try {
     const model = process.env.VOLCENGINE_MODEL_ID || "gpt-3.5-turbo";
     const completion = await openai.chat.completions.create({
        model: model,
        messages: [{ role: "system", content: systemPrompt }],
        temperature: 0.7,
     });
     
     const content = completion.choices[0]?.message?.content || '';
     const outline = String(content).trim();

     // Update DB
     if (supabase && topicId) {
        await supabase.from('content_topics').update({
           title: candidate.title,
           status: 'planned',
           selected_candidate_index: selectedCandidateIndex,
           outline: outline,
           updated_at: new Date().toISOString()
        }).eq('id', topicId);
     } else if (topicId) {
        // Local DB
        if (db.content_topics) {
           const t = db.content_topics.find(t => t.id === topicId);
           if (t) {
              t.title = candidate.title;
              t.status = 'planned';
              t.selected_candidate_index = selectedCandidateIndex;
              t.outline = outline;
              saveDb();
           }
        }
     }
     
     res.json({ outline });

  } catch (error) {
     console.error('Generate Framework Error:', error);
     res.status(500).json({ error: error.message });
  }
});

// Export the Express API
module.exports = app;

// Start the server if not running on Vercel
if (!process.env.VERCEL) {
  console.log('Attempting to start server on port', port);
  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    if (process.env.VOLCENGINE_API_KEY) {
      console.log('✅ VOLCENGINE_API_KEY found');
    } else {
      console.log('⚠️ VOLCENGINE_API_KEY not found');
    }
  });
  
  // Keep process alive just in case (though app.listen should do it)
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
    });
  });
}
