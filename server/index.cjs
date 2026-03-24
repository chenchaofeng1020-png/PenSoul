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
const port = process.env.PORT || 3002;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Connection'],
  credentials: true
}));
// app.options('*', cors()); // Enable pre-flight for all routes (commented out due to path-to-regexp issue)

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
// NEW: Smart Generator Tables
if (!db.smart_sources) db.smart_sources = [];
if (!db.smart_notes) db.smart_notes = [];
if (!db.smart_chats) db.smart_chats = [];
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

    // 2. Determine Client Configuration
    let client = openai; // Default client
    
    // If custom API Key or Base URL is provided in config, create a temporary client
    if (model_config?.apiKey || model_config?.baseURL || process.env.VOLCENGINE_API_KEY) {
        const apiKey = model_config?.apiKey || process.env.VOLCENGINE_API_KEY || process.env.OPENAI_API_KEY || 'sk-mock-key';
            
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
    const envBrowsingModel = process.env.VOLCENGINE_BROWSING_MODEL_ID;
    const envModel = process.env.VOLCENGINE_MODEL_ID;
    let model = reqModel || envBrowsingModel || envModel || "gpt-3.5-turbo";
    
    console.log(`[Zhuowei] Starting research on: "${query}" using model: ${model}`);

    // 2. Client Config
    const apiKey = process.env.VOLCENGINE_API_KEY || process.env.OPENAI_API_KEY;
    const baseURL = process.env.VOLCENGINE_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";

    if (!apiKey) {
        throw new Error("Missing VOLCENGINE_API_KEY");
    }

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
    // Volcengine expects 'function' key even if empty when using 'web_search' type?
    // Or maybe we should use type: 'function' but specify web_search in a different way?
    // Based on user feedback, the format is tools=[{"type": "web_search"}].
    // If that fails with "missing function", maybe we need to use 'function' type but with a dummy function?
    // NO, the user's example was clear. 
    // However, the error comes from Volcengine. 
    // Let's try to remove tools for now to restore functionality (fallback to non-search) 
    // OR try to see if we can use a different format.
    // Wait, Volcengine docs say:
    // tools: [{type: 'function', function: {...}}] OR tools: [{type: 'web_search'}] 
    // BUT only if the model supports it.
    // If the model supports it but errors with "missing function", maybe the SDK is transforming it?
    // Let's try to bypass the OpenAI SDK validation by casting or using 'any'.
    // But the error is from the SERVER.
    
    // Let's try to add a dummy function to satisfy the validator, or maybe the type should be 'function' and name 'web_search'?
    // No, that's not standard.

    // Let's TRY to use the EXACT format the user provided, but verify if OpenAI SDK modifies it.
    // OpenAI SDK enforces type to be 'function'.
    // Maybe we need to use `tools` as an extra body parameter?
    
    const completion = await client.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `请全网搜索关于以下内容的最新信息（2025-2026）：${query}` }
      ],
      // tools: [{ type: 'web_search' }], // This caused 400
      // Try to pass it as an extra parameter if the SDK allows, or assume the model endpoint has auto-search enabled?
      // If the user says "you need to enable it in code", then we must send it.
      // Let's try to send it as `tools` directly, as the user's Python example shows it in `tools`.
      // The Python SDK example: tools=[{"type": "web_search", "max_keyword": 2}]
      // The JS SDK might validate `type` to be 'function'.
      // If we use `extra_body`, we bypass validation.
      // But maybe we should try `tools` in `extra_body` BUT with the exact structure from the screenshot.
      
      // According to user screenshot:
      // tools=[{ "type": "web_search" }]
      
      // Let's update extra_body to match exactly.
      extra_body: {
        tools: [{ type: 'web_search' }]
      },
      stream: false, // Ensure stream is disabled or enabled explicitly based on requirement. 
      // If we use stream: true, we need to handle stream chunks. The current code expects a full response.
      // So let's keep it false (default).
      temperature: 0.1, // Lower temperature to 0.1 to reduce hallucination
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
      
      // Fallback: If no sources found via regex, check if Volcengine returned tool_calls or citations
      // Or if the content is empty, maybe the model returned tool calls for US to execute?
      // Wait, for 'web_search' tool, the model usually executes it internally and returns the result in content.
      // But if it returns tool_calls, we might need to handle it?
      // Actually, Volcengine 'web_search' plugin is usually server-side executed.
      
      // If content is empty or looks like a refusal, maybe we should log the raw response.
      console.log(`[Zhuowei] Full response:`, JSON.stringify(completion, null, 2));

      if (sources.length === 0 && completion.choices[0]?.message?.tool_calls) {
           // Sometimes sources are in tool_calls or other fields, but usually for browsing model it's in content.
           // Let's log full response for debugging if needed, but for now stick to content.
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
  // 支持多种 DeepSeek 模型标识：'deepseek', 'deepseek-r1', 'deepseek-r1-250528' 等
  const isDeepseek = model && (model === 'deepseek' || model.startsWith('deepseek-'));
  // 支持多种 Gemini 模型标识：'gemini', 'gemini-3-pro-preview', 'gemini-2.5-pro' 等
  const isGemini = model && model.startsWith('gemini-');
  
  // 优先检测是否配置了官方 DeepSeek Key，如果没有，则假设 DeepSeek 也是托管在火山引擎上
  const hasDeepseekKey = !!process.env.DEEPSEEK_API_KEY
  
  if (isDeepseek && hasDeepseekKey) {
    return new OpenAI({ 
      apiKey: process.env.DEEPSEEK_API_KEY, 
      baseURL: 'https://api.deepseek.com' 
    })
  }

  // Gemini 使用 LemonAPI 代理
  if (isGemini) {
    return new OpenAI({ 
      apiKey: process.env.GEMINI_API_KEY || 'sk-fBJZgmUcDzYi7UB555He0wFgg8VApt7R0CFFuFk5pZsiq6Sp', 
      baseURL: 'https://new.lemonapi.site/v1',
      timeout: 120000
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
  // 支持多种 DeepSeek 模型标识：'deepseek', 'deepseek-r1', 'deepseek-r1-250528' 等
  const isDeepseek = model && (model === 'deepseek' || model.startsWith('deepseek-'));
  // 支持多种 Gemini 模型标识
  const isGemini = model && model.startsWith('gemini-');
  
  // Gemini 模型直接返回模型ID
  if (isGemini) {
    // 如果是完整的模型ID（如 [L]gemini-3-pro-preview），直接返回
    if (model.startsWith('[L]')) {
      return model;
    }
    // 否则添加 [L] 前缀
    return `[L]${model}`;
  }
  
  // 1. Try specific model ID first
  if (isDeepseek) {
    const dsId = process.env.DEEPSEEK_MODEL || process.env.DEEPSEEK_MODEL_ID;
    if (dsId) return dsId;
  }
  
  // 2. Fallback to Volcengine ID (User might use Volcengine for DeepSeek)
  const veId = process.env.VOLCENGINE_MODEL || process.env.VOLCENGINE_MODEL_ID;
  
  if (isDeepseek && veId) {
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

// --- Smart Material Generator API ---

// 1. Sources Management
app.get('/api/smart/sources', (req, res) => {
  const { productId } = req.query;
  const sources = (db.smart_sources || []).filter(s => s.product_id === productId);
  res.json({ data: sources });
});

app.post('/api/smart/sources', (req, res) => {
  const { productId, fileName, fileType, content, displayTitle, displaySubtitle } = req.body;
  const newSource = {
    id: `src-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    product_id: productId,
    file_name: fileName,
    file_type: fileType,
    content: content,
    display_title: displayTitle || fileName,
    display_subtitle: displaySubtitle || '',
    status: 'processed',
    created_at: new Date().toISOString()
  };
  if (!db.smart_sources) db.smart_sources = [];
  db.smart_sources.push(newSource);
  saveDb();
  res.json({ data: newSource });
});

app.delete('/api/smart/sources/:id', (req, res) => {
  const { id } = req.params;
  if (!db.smart_sources) return res.json({ success: true });
  const index = db.smart_sources.findIndex(s => s.id === id);
  if (index !== -1) {
    db.smart_sources.splice(index, 1);
    saveDb();
  }
  res.json({ success: true });
});

// 2. Notes Management - 使用 Supabase
app.get('/api/smart/notes', async (req, res) => {
  const { productId } = req.query;
  try {
    const { data, error } = await supabase
      .from('smart_notes')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) {
    console.error('Failed to fetch notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

app.post('/api/smart/notes', async (req, res) => {
  const { productId, title, content, type, sourceRefs, sourceType } = req.body;
  try {
    const { data, error } = await supabase
      .from('smart_notes')
      .insert([{
        product_id: productId,
        title: title || '未命名笔记',
        content: content,
        type: type,
        is_pinned: false,
        source_refs: sourceRefs || []
      }])
      .select()
      .single();
    
    if (error) throw error;
    res.json({ data });
  } catch (error) {
    console.error('Failed to create note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

app.put('/api/smart/notes/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const { data, error } = await supabase
      .from('smart_notes')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json({ data });
  } catch (error) {
    console.error('Failed to update note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

app.delete('/api/smart/notes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('smart_notes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// Helper to fetch and format product data based on config
async function fetchProductDataAsMarkdown(productId, config) {
  let markdown = '';
  const { modules } = config || {};
  if (!modules) return '';

  try {
    // 1. Basic Info
    if (modules.basic_info && modules.basic_info.length > 0) {
      let product;
      if (supabase) {
        const { data } = await supabase.from('products').select('*').eq('id', productId).single();
        product = data;
      } else {
        product = db.products.find(p => p.id === productId);
      }
      
      if (product) {
        markdown += `\n# 产品基础信息\n`;
        markdown += `- 名称: ${product.name}\n`;
        markdown += `- Slogan: ${product.slogan || '无'}\n`;
        markdown += `- 定位: ${product.positioning || '无'}\n`;
        markdown += `- 描述: ${product.description || '无'}\n\n`;
      }
    }

    // 2. Selling Points
    if (modules.selling_points && modules.selling_points.length > 0) {
      let items = [];
      if (supabase) {
        let query = supabase.from('product_selling_points').select('*').eq('product_id', productId);
        if (!modules.selling_points.includes('all')) {
          query = query.in('id', modules.selling_points);
        }
        const { data } = await query;
        items = data || [];
      } else {
        items = db.product_selling_points?.filter(i => i.product_id === productId) || []; // Assume local DB structure
        // Mock fallback for local demo if table missing
        if (!db.product_selling_points) items = []; 
      }
      
      if (items.length > 0) {
        markdown += `# 核心卖点\n`;
        items.forEach((item, idx) => {
          markdown += `${idx + 1}. **${item.selling_point}**: ${item.description || ''}\n`;
        });
        markdown += '\n';
      }
    }

    // 3. Features
    if (modules.features && modules.features.length > 0) {
      let items = [];
      if (supabase) {
        let query = supabase.from('product_features').select('*').eq('product_id', productId);
        if (!modules.features.includes('all')) {
          query = query.in('id', modules.features);
        }
        const { data } = await query;
        items = data || [];
      }
      
      if (items.length > 0) {
        markdown += `# 功能特性\n`;
        items.forEach((item, idx) => {
          markdown += `- **${item.name}**: ${item.description || ''} (价值: ${item.user_value || ''})\n`;
        });
        markdown += '\n';
      }
    }

    // 4. User Stories
    if (modules.stories && modules.stories.length > 0) {
      let items = [];
      if (supabase) {
        let query = supabase.from('product_stories').select('*').eq('product_id', productId);
        if (!modules.stories.includes('all')) {
          query = query.in('id', modules.stories);
        }
        const { data } = await query;
        items = data || [];
      }
      
      if (items.length > 0) {
        markdown += `# 用户故事\n`;
        items.forEach((item, idx) => {
          markdown += `${idx + 1}. 作为 **${item.role}**，我想要 **${item.activity}**，以便于 **${item.value}**。\n`;
        });
        markdown += '\n';
      }
    }

    // 5. FAQs
    if (modules.faqs && modules.faqs.length > 0) {
      let items = [];
      if (supabase) {
        let query = supabase.from('product_faqs').select('*').eq('product_id', productId);
        if (!modules.faqs.includes('all')) {
          query = query.in('id', modules.faqs);
        }
        const { data } = await query;
        items = data || [];
      }
      
      if (items.length > 0) {
        markdown += `# 常见问题 (FAQ)\n`;
        items.forEach((item, idx) => {
          markdown += `Q: ${item.question}\nA: ${item.answer}\n\n`;
        });
      }
    }

  } catch (e) {
    console.error('[SmartGen] Failed to fetch product data:', e);
    markdown += `\n[系统提示: 获取部分产品资料失败 - ${e.message}]\n`;
  }

  return markdown;
}

function getStoredSmartSources(sourceIds = []) {
  if (!Array.isArray(sourceIds) || sourceIds.length === 0) {
    return [];
  }

  return (db.smart_sources || []).filter(source => sourceIds.includes(source.id));
}

async function resolveSmartSourceContent(productId, source) {
  const sourceTitle = source.display_title || source.file_name || '未命名资料';

  if (source.file_type === 'live_product_data') {
    try {
      const config = JSON.parse(source.content || '{}');
      const liveText = await fetchProductDataAsMarkdown(productId, config);
      return liveText
        ? `--- [实时] ${sourceTitle} ---\n${liveText}`
        : `--- [实时] ${sourceTitle} ---\n[未获取到可用的产品资料]`;
    } catch (error) {
      console.error('[SmartGen] Failed to parse live product data source:', error);
      return `--- [实时] ${sourceTitle} ---\n[资料配置解析失败]`;
    }
  }

  if (source.file_type === 'image') {
    return `--- ${sourceTitle} ---\n[图片资料已选中。当前模型无法直接读取图片二进制，请结合文件名和用户问题回答。]`;
  }

  if (['pdf', 'xlsx', 'xls'].includes(source.file_type)) {
    return `--- ${sourceTitle} ---\n[${source.file_type.toUpperCase()} 文件已选中。当前仅提供文件名和上传记录，请结合已有上下文回答。]`;
  }

  return `--- ${sourceTitle} ---\n${source.content || ''}`;
}

async function buildSmartSourceContext(productId, sourceIds = []) {
  const sources = getStoredSmartSources(sourceIds);
  if (sources.length === 0) {
    return '';
  }

  const contextParts = [];
  for (const source of sources) {
    const content = await resolveSmartSourceContent(productId, source);
    if (content) {
      contextParts.push(content);
    }
  }

  if (contextParts.length === 0) {
    return '';
  }

  return `以下是当前选中的参考资料，请优先基于这些资料回答：\n\n${contextParts.join('\n\n')}`;
}

function isRequirementReferenceSource(source = {}) {
  const title = `${source.display_title || ''} ${source.file_name || ''}`.toLowerCase();
  return /需求文档模板|prd模板|模板|需求文档|prd/.test(title);
}

function sanitizeOutlineSection(section = {}, index = 0) {
  const title = String(section.title || `章节${index + 1}`).trim();
  const subsections = Array.isArray(section.subsections)
    ? section.subsections.map(item => String(item).trim()).filter(Boolean)
    : [];
  const writingPoints = Array.isArray(section.writingPoints)
    ? section.writingPoints.map(item => String(item).trim()).filter(Boolean)
    : [];

  return {
    title,
    subsections,
    needFlowchart: Boolean(section.needFlowchart),
    needPrototype: Boolean(section.needPrototype),
    objective: String(section.objective || '').trim(),
    writingPoints
  };
}

function sanitizeOutline(outline = {}) {
  const sections = Array.isArray(outline.sections)
    ? outline.sections.map((section, index) => sanitizeOutlineSection(section, index))
    : [];

  return {
    documentTitle: String(outline.documentTitle || '需求文档').trim() || '需求文档',
    summary: String(outline.summary || '').trim(),
    sections
  };
}

function hasStandardTemplateConsent(...texts) {
  const mergedText = texts
    .flat()
    .filter(Boolean)
    .map(item => typeof item === 'string' ? item : JSON.stringify(item))
    .join('\n')
    .toLowerCase()
    .replace(/\s+/g, ' ');

  const consentPatterns = [
    /(按|用|采用|使用).{0,8}(行业标准模板|标准模板|默认模板|通用模板)/,
    /(可以|可|行|好的|好).{0,8}(行业标准模板|标准模板|默认模板|通用模板)/,
    /(没有模板|无模板).{0,8}(按|用|采用|使用).{0,8}(行业标准模板|标准模板|默认模板|通用模板)/
  ];

  return consentPatterns.some(pattern => pattern.test(mergedText));
}

function getIndustryStandardTemplateStructure() {
  return {
    sections: [
      { title: '文档信息', subsections: ['版本记录', '适用范围', '关联资料'] },
      { title: '概述', subsections: ['背景', '目标', '功能范围', '名词术语'] },
      { title: '总体流程与业务闭环', subsections: ['核心流程', '参与角色', '关键状态流转'] },
      { title: '页面与功能需求', subsections: ['页面清单', '页面流转', '页面功能详述'] },
      { title: '数据与接口', subsections: ['关键数据对象', '字段与口径', '接口摘要'] },
      { title: '非功能性需求', subsections: ['性能', '安全与权限', '兼容性', '埋点与监控'] },
      { title: '验收标准', subsections: ['验收范围', '验收场景', '边界与异常'] },
      { title: '待确认事项', subsections: ['未决问题', '风险与依赖'] }
    ],
    styleNotes: [
      '采用 page-driven PRD 写法，以页面流转和业务闭环组织功能，而不是只按抽象模块堆砌',
      '复杂功能先给提纲，再拆章节逐段撰写；每个页面型章节都需要原型、交互、后台逻辑和数据流转',
      '只描述展示内容、位置、交互、规则、状态和数据，不写颜色、字号、圆角、阴影、视觉风格等 UI 样式',
      '避免联系人、审批流、邮件抄送、签字流转、会议纪要尾注等行政信息'
    ]
  };
}

const REQUIREMENT_ANALYZER_SKILL_GUIDE = `
你现在严格遵循《需求分析助手 (Requirement Analyzer)》的工作方式。

核心原则：
1. 先验证需求合理性：先判断需求是否逻辑自洽、符合法律与安全边界、技术上可行、业务上值得做；如果明显不合理、有害、违规或与现有目标冲突，必须直接指出问题并给出调整建议，不能盲目继续。
2. 先澄清，后输出：在业务闭环、Happy Path、异常流程、系统交互、数据来源与去向没有基本讲清之前，不要急着产出正式文档。
3. 提纲先行，分块执行：复杂需求必须先出提纲，确认后再逐章撰写；不要一次性把整份文档写成黑箱结果。
4. 功能优先，剥离 UI 样式：只描述展示什么、在哪里展示、如何交互、如何校验、状态如何变化、后台如何处理；禁止写颜色、字号、圆角、阴影、玻璃拟态等视觉风格细节。
5. 页面驱动功能逻辑：除纯后台服务外，PRD 应以页面/入口/流程为主线。页面型内容必须遵循“页面原型 -> 界面元素 -> 交互动作 -> 后台逻辑/数据流转 -> 异常与约束”的顺序。

写作要求：
- 优先吸收参考资料中的章节结构、颗粒度和措辞习惯，但不要照搬其中与当前需求无关的行政信息。
- 对于信息不足但又需要继续推进的地方，用“待确认”明确标记，不要擅自虚构关键规则。
- 对于页面型内容，必须覆盖字段/区域、触发动作、前置校验、状态变化、异常处理、权限限制、数据来源与结果去向。
- 如果用户或资料没有明确给出具体数值，不要擅自补充文件大小上限、数量限制、保留时长、响应时延、并发值、成功率、百分比、SLA 或其他硬性指标；这类内容一律写成“待确认”或“需产品/技术确认”。
- 只要涉及界面，就必须按页面分别写；每个页面、弹窗、抽屉、详情层、配置面板都必须有独立原型。
- 原型必须是真正的 ASCII 线框图，放在 \`\`\`text 代码块中，画出区域边界、模块位置和布局关系；禁止用“左侧导航 / 中间内容 / 右侧详情”这类文字描述代替原型图。
- 如果一个章节涉及多个页面或多个子功能点，必须逐页重复“页面名称/页面定位/页面原型草图/界面元素/交互动作/后台逻辑与数据流转/异常与边界/权限与约束”的结构，不能整章只给一个总原型。
`.trim();

const REQUIREMENT_DOC_ASCII_TEMPLATE = String.raw` +----------------------------------------------------------------------------------+
| 页面标题：XXX页面                                             主要操作：[按钮] [按钮] |
+----------------------------------------------------------------------------------+
| 面包屑/说明区：XXX                                           状态：正常/空态/异常态 |
+----------------------------------------------------------------------------------+
| 筛选区：[筛选项A] [筛选项B] [搜索框] [快捷操作]                                 |
+----------------------------------------------------------------------------------+
| 主内容区                                                                        |
|  - 左侧导航/列表区：XXX                                                         |
|  - 中间主工作区：XXX                                                            |
|  - 右侧详情/配置区：XXX                                                         |
+----------------------------------------------------------------------------------+
| 底部/弹窗/抽屉入口：XXX                                                         |
+----------------------------------------------------------------------------------+`;

function parseModelJson(content, fallback = {}) {
  if (!content || typeof content !== 'string') {
    return fallback;
  }

  const trimmed = content.trim();
  const normalized = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(normalized);
  } catch (error) {
    const jsonStart = normalized.indexOf('{');
    const jsonEnd = normalized.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      return JSON.parse(normalized.slice(jsonStart, jsonEnd + 1));
    }
    throw error;
  }
}

const SMART_ESTIMATION_SKILL_GUIDE = `# 智能人天评估技能

你是一名资深的软件交付经理、产品经理和解决方案顾问。你的职责不是替用户拍板，而是用专业、保守、可复核的方式，辅助用户更快理解需求并给出一版可讨论的人天评估建议。

## 评估原则
- 默认按 5 个角色评估：产品、UI、前端、后端、测试
- 评估必须覆盖：需求本质、涉及页面/角色/接口、潜在低估点、复用/二开判断、建议补充背景
- 简单功能总人天通常为 5-9；中等 12-20；复杂 25-40；高复杂 40-71
- 如出现页面流转、表单校验、权限、状态流转、审批、导入导出、消息通知、第三方对接、数据迁移、回归兼容等因素，不能按简单功能估
- 对“二开/复用”场景不能简单压缩人天，仍需保留差异分析、回归测试、现网兼容、上线验证等成本
- 信息不完整时，应明确写出假设和待补充背景，估算口径宁可偏保守，也不要按最少代码量低估
- 输出要方便人工复核：角色拆解清楚、功能粒度清楚、风险和假设清楚`;

function clampNumber(value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return minimum;
  }
  return Math.min(maximum, Math.max(minimum, numeric));
}

function ensureStringArray(value) {
  return Array.isArray(value)
    ? value.map(item => String(item || '').trim()).filter(Boolean)
    : [];
}

function sanitizeRoleBreakdown(items = []) {
  const roleOrder = ['product', 'ui', 'frontend', 'backend', 'qa'];
  const normalizedMap = new Map(
    (Array.isArray(items) ? items : []).map(item => [
      item?.role,
      {
        role: item?.role,
        days: clampNumber(item?.days, 0, 999),
        rationale: String(item?.rationale || '').trim(),
        workItems: ensureStringArray(item?.workItems)
      }
    ])
  );

  return roleOrder.map((role) => normalizedMap.get(role) || {
    role,
    days: 0,
    rationale: '',
    workItems: []
  });
}

function sanitizeFunctionItems(items = []) {
  return (Array.isArray(items) ? items : []).map((item, index) => {
    const roleDays = {
      product: clampNumber(item?.roleDays?.product, 0, 999),
      ui: clampNumber(item?.roleDays?.ui, 0, 999),
      frontend: clampNumber(item?.roleDays?.frontend, 0, 999),
      backend: clampNumber(item?.roleDays?.backend, 0, 999),
      qa: clampNumber(item?.roleDays?.qa, 0, 999)
    };

    const fallbackTotal = Object.values(roleDays).reduce((sum, value) => sum + value, 0);

    return {
      id: String(item?.id || `function_${index + 1}`),
      name: String(item?.name || `功能 ${index + 1}`),
      module: String(item?.module || '未分类模块'),
      description: String(item?.description || '').trim(),
      essence: String(item?.essence || '').trim(),
      complexity: String(item?.complexity || 'medium').trim(),
      confidence: clampNumber(item?.confidence ?? 0.68, 0, 1),
      totalDays: clampNumber(item?.totalDays ?? fallbackTotal, 0, 999),
      roleDays,
      pages: ensureStringArray(item?.pages),
      interfaces: ensureStringArray(item?.interfaces),
      risks: ensureStringArray(item?.risks),
      reuseHint: String(item?.reuseHint || '').trim(),
      backgroundQuestions: ensureStringArray(item?.backgroundQuestions)
    };
  });
}

function sanitizeSmartEstimationReport(report = {}) {
  const roleBreakdown = sanitizeRoleBreakdown(report.roleBreakdown);
  const functions = sanitizeFunctionItems(report.functions);
  const totalFromRoles = roleBreakdown.reduce((sum, item) => sum + item.days, 0);
  const totalFromFunctions = functions.reduce((sum, item) => sum + item.totalDays, 0);
  const totalDays = clampNumber(
    report?.overview?.totalDays ?? report?.totalDays ?? (totalFromRoles || totalFromFunctions),
    0,
    9999
  );

  return {
    title: String(report?.title || 'AI智能人天评估'),
    overview: {
      essence: String(report?.overview?.essence || '').trim(),
      scopeSummary: String(report?.overview?.scopeSummary || '').trim(),
      scopeLabel: String(report?.overview?.scopeLabel || '').trim(),
      complexity: String(report?.overview?.complexity || 'medium').trim(),
      confidence: clampNumber(report?.overview?.confidence ?? 0.68, 0, 1),
      totalDays,
      scheduleSuggestion: String(report?.overview?.scheduleSuggestion || '').trim(),
      reuseJudgement: String(report?.overview?.reuseJudgement || '').trim(),
      sourceDigest: ensureStringArray(report?.overview?.sourceDigest),
      summary: String(report?.overview?.summary || '').trim()
    },
    roleBreakdown,
    functions,
    risks: ensureStringArray(report?.risks),
    assumptions: ensureStringArray(report?.assumptions),
    missingBackground: ensureStringArray(report?.missingBackground),
    recommendations: ensureStringArray(report?.recommendations)
  };
}

async function analyzeRequirementTemplateStructure(templateContent) {
  if (!templateContent || !String(templateContent).trim()) {
    return null;
  }

  const systemPrompt = `${REQUIREMENT_ANALYZER_SKILL_GUIDE}

你现在要做的是：分析“需求文档模板 / 历史 PRD”的可复用结构，而不是复写具体业务内容。

模板内容：
${templateContent}

分析要求：
1. 重点提取其适合复用的章节结构、页面组织方式、常见的写作颗粒度
2. 如果模板体现出 page-driven 写法，要把这种特征总结进 styleNotes
3. 过滤掉联系人、邮箱、审批流、会议纪要、签字、抄送、日期签署等行政字段
4. 保留真正对当前 PRD 有价值的结构，例如：概述写法、页面层级、数据与接口安排、非功能需求组织方式
5. sections 只保留章节与子章节，不要把具体业务文案原样带出

请输出 JSON：
{
  "sections": [
    {
      "title": "章节标题",
      "subsections": ["子章节1", "子章节2"]
    }
  ],
  "styleNotes": [
    "该模板常见的写作习惯"
  ]
}`;

  const client = getClient('doubao');
  const modelId = getModelId('doubao');

  const completion = await client.chat.completions.create({
    model: modelId,
    messages: [
      { role: 'system', content: systemPrompt }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });

  return parseModelJson(completion.choices[0]?.message?.content || '', { sections: [], styleNotes: [] });
}

async function deriveRequirementTemplateInfo(productId, sourceIds = []) {
  const sources = getStoredSmartSources(sourceIds).filter(isRequirementReferenceSource);
  if (sources.length === 0) {
    return { hasTemplateReference: false, templateStructure: null, templateSourceNames: [] };
  }

  const contentParts = [];
  const templateSourceNames = [];

  for (const source of sources.slice(0, 3)) {
    const resolvedContent = await resolveSmartSourceContent(productId, source);
    const normalizedContent = String(resolvedContent || '').trim();
    if (!normalizedContent) {
      continue;
    }

    templateSourceNames.push(source.display_title || source.file_name || '未命名资料');
    contentParts.push(normalizedContent);
  }

  if (contentParts.length === 0) {
    return { hasTemplateReference: false, templateStructure: null, templateSourceNames };
  }

  const templateStructure = await analyzeRequirementTemplateStructure(
    contentParts.join('\n\n').slice(0, 18000)
  );

  return {
    hasTemplateReference: Boolean(templateStructure?.sections?.length),
    templateStructure,
    templateSourceNames
  };
}

// 3. Generation (Stream)
app.post('/api/smart/generate', async (req, res) => {
  const { productId, prompt, context: userContext, messages, model: requestedModel } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*'); // Ensure CORS for stream

  try {
    // 1. Determine Model
    // Priority: Requested Model > Env Var > Default
    const model = requestedModel || 'doubao';
    const modelId = getModelId(model);
    
    console.log(`[SmartGen] Using model: ${model} -> ID: ${modelId}`);

    // Debug: 打印接收到的参数
    console.log('[SmartGen] Received request:');
    console.log('[SmartGen] - prompt length:', prompt ? prompt.length : 0);
    console.log('[SmartGen] - prompt preview:', prompt ? prompt.substring(0, 200) + '...' : 'undefined');
    console.log('[SmartGen] - context length:', userContext ? userContext.length : 0);
    console.log('[SmartGen] - has messages:', !!(messages && Array.isArray(messages) && messages.length > 0));

    let finalMessages;
    const sourceContext = await buildSmartSourceContext(productId, req.body.sourceIds);

    // 如果前端传了 messages 数组，直接使用（支持多轮对话上下文）
    if (messages && Array.isArray(messages) && messages.length > 0) {
      console.log('[SmartGen] Using messages array from frontend, count:', messages.length);
      finalMessages = [...messages];
      if (sourceContext) {
        if (finalMessages[0]?.role === 'system') {
          finalMessages[0] = {
            ...finalMessages[0],
            content: `${finalMessages[0].content}\n\n${sourceContext}`
          };
        } else {
          finalMessages.unshift({ role: 'system', content: sourceContext });
        }
      }
    } else {
      // 兼容旧逻辑：使用 prompt + context
      let finalContext = userContext || '';
      const normalizedUserContext = userContext || '';

      if (sourceContext) {
         finalContext = `${sourceContext}\n\n${normalizedUserContext.includes('User Question:') ? '' : 'User Question: ' + normalizedUserContext}`;
      } else {
         // Fallback
         finalContext = normalizedUserContext.includes('User Question:') ? normalizedUserContext : 'User Question: ' + normalizedUserContext;
      }

      finalMessages = [
        { role: 'system', content: prompt },
        { role: 'user', content: finalContext }
      ];
    }

    // Debug: 打印最终发送给模型的消息
    console.log('[SmartGen] Final messages to model:');
    console.log('[SmartGen] - System message length:', finalMessages[0]?.content?.length || 0);
    console.log('[SmartGen] - System message preview:', finalMessages[0]?.content?.substring(0, 300) + '...');
    console.log('[SmartGen] - User message length:', finalMessages[finalMessages.length - 1]?.content?.length || 0);

    // 使用 getClient 获取正确的客户端（支持 DeepSeek 和 Volcengine）
    const client = getClient(model);
    const stream = await client.chat.completions.create({
      model: modelId,
      messages: finalMessages,
      stream: true,
      temperature: 0.7
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Generation error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message }) }\n\n`);
    res.end();
  }
});

// 4. Generate Title for Content
app.post('/api/smart/generate-title', async (req, res) => {
  const { content } = req.body;

  if (!content || content.trim().length < 10) {
    return res.status(400).json({ error: '内容太短，无法生成标题' });
  }

  try {
    // 截取内容前 2000 字符作为上下文
    const truncatedContent = content.substring(0, 2000);

    const response = await openai.chat.completions.create({
      model: process.env.VOLCENGINE_MODEL_ID || 'doubao-pro-1.5',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的内容标题生成专家。请根据提供的内容生成一个简洁、准确的标题（不超过 20 个字）。只返回标题文本，不要添加任何解释或引号。'
        },
        {
          role: 'user',
          content: `请为以下内容生成一个标题（不超过 20 个字）：\n\n${truncatedContent}`
        }
      ],
      temperature: 0.7,
      max_tokens: 50
    });

    let title = response.choices[0]?.message?.content?.trim() || '';
    
    // 清理标题（移除可能的引号）
    title = title.replace(/^[""']|[""']$/g, '').trim();
    
    // 如果标题太长，截取前 20 字
    if (title.length > 20) {
      title = title.substring(0, 20);
    }
    
    // 如果 AI 没有返回有效标题，使用默认格式
    if (!title) {
      title = `AI 回复 - ${new Date().toLocaleTimeString()}`;
    }

    res.json({ title });
  } catch (error) {
    console.error('Generate title error:', error);
    // 返回默认标题而不是报错
    res.json({ 
      title: `AI 回复 - ${new Date().toLocaleTimeString()}`,
      fallback: true 
    });
  }
});

// ============================================
// 5. 人天评估功能 API
// ============================================

// 测试路由
app.get('/api/smart/estimation/test', (req, res) => {
  res.json({ message: 'Estimation API is working', timestamp: new Date().toISOString() });
});

// 内存中存储评估任务状态（生产环境建议使用 Redis）
const estimationTasks = new Map();

// 生成唯一任务 ID
function generateTaskId() {
  return 'est_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 5.9 生成产品路线图
app.post('/api/smart/roadmap/generate', async (req, res) => {
  const { data } = req.body;

  if (!data || !data.trim()) {
    return res.status(400).json({ error: '缺少数据源' });
  }

  try {
    console.log('[Roadmap] Generating roadmap from data...');

    // 构建路线图生成Prompt
    const systemPrompt = `你是一位专业的产品经理，擅长根据产品需求和功能清单生成合理的产品路线图。`;
    const userPrompt = `请根据以下数据源，生成一个详细的产品路线图：

${data}

要求：
1. 分析数据源中的功能需求，按照合理的优先级和依赖关系进行版本规划
2. 每个版本需要包含：
   - 版本名称（如 V1.0.0、V1.1.0 等）
   - 时间区间（合理的开发周期，如 2-4 周）
   - 包含的功能（每个功能需要有名称和简要描述）
3. 生成 3-5 个版本的规划
4. 为每个版本分配一个不同的颜色（使用十六进制颜色值）
5. 为每个功能分配状态（completed、in_progress 或 pending）
6. 为每个功能分配优先级（high、medium 或 low）
7. 为每个功能分配负责人（可以使用通用名称如 产品、开发、设计等）
8. 严格按照以下 JSON 格式输出，不要添加其他内容：
{
  "versions": [
    {
      "id": "v1.0.0",
      "name": "V1.0.0",
      "startDate": "2026-04-01",
      "endDate": "2026-04-21",
      "color": "#3B82F6",
      "features": [
        {
          "id": "f1",
          "name": "功能名称",
          "description": "功能描述",
          "owner": "负责人",
          "status": "completed",
          "priority": "high"
        }
      ]
    }
  ],
  "demandPool": []
}`;

    // 调用智谱GLM4.7 API
    const zhipuResponse = await axios.post(
      'https://ark.cn-beijing.volces.com/api/v3/responses',
      {
        "model": "glm-4-7-251222",
        "stream": false,
        "input": [
          {
            "role": "system",
            "content": [
              {
                "type": "input_text",
                "text": systemPrompt
              }
            ]
          },
          {
            "role": "user",
            "content": [
              {
                "type": "input_text",
                "text": userPrompt
              }
            ]
          }
        ]
      },
      {
        headers: {
          "Authorization": "Bearer 90783e84-ddc8-4bbe-be93-01c5be6cfc43",
          "Content-Type": "application/json"
        }
      }
    );

    const aiResponse = zhipuResponse.data.output?.[0]?.content?.[0]?.text || '';
    console.log('[Roadmap] AI response received:', aiResponse);

    // 解析AI响应
    let roadmapData;
    try {
      // 提取JSON - 尝试多种方法
      let jsonStr = aiResponse;
      
      // 方法1: 提取 ```json 代码块
      if (jsonStr.includes('```json')) {
        const match = jsonStr.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) {
          jsonStr = match[1];
        }
      }
      // 方法2: 提取 ``` 代码块（不带json标记）
      else if (jsonStr.includes('```')) {
        const match = jsonStr.match(/```\s*([\s\S]*?)\s*```/);
        if (match) {
          jsonStr = match[1];
        }
      }
      // 方法3: 查找第一个 { 和最后一个 }
      else {
        const startIdx = jsonStr.indexOf('{');
        const endIdx = jsonStr.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          jsonStr = jsonStr.substring(startIdx, endIdx + 1);
        }
      }
      
      jsonStr = jsonStr.trim();
      console.log('[Roadmap] Extracted JSON string:', jsonStr.substring(0, 500) + '...');
      
      roadmapData = JSON.parse(jsonStr);
      console.log('[Roadmap] Successfully parsed roadmap data:', JSON.stringify(roadmapData, null, 2));
    } catch (parseError) {
      console.error('Failed to parse roadmap response:', parseError);
      console.error('AI Response was:', aiResponse);
      // 返回默认路线图结构
      roadmapData = {
        versions: [
          {
            id: 'v1.0.0',
            name: 'V1.0.0',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            color: '#3B82F6',
            features: [
              {
                id: 'f1',
                name: '基础功能',
                description: '实现核心功能',
                owner: '产品',
                status: 'in_progress',
                priority: 'high'
              }
            ]
          }
        ],
        demandPool: []
      };
    }

    res.json(roadmapData);
  } catch (error) {
    console.error('[Roadmap] Generation error:', error);
    res.status(500).json({ error: '生成路线图失败: ' + error.message });
  }
});

// 5.9.1 AI解析产品路线图（用于弹窗展示）
app.post('/api/smart/roadmap/parse', async (req, res) => {
  const { data } = req.body;

  if (!data || !data.trim()) {
    return res.status(400).json({ error: '缺少数据源' });
  }

  try {
    console.log('[Roadmap] Parsing roadmap from data...');
    console.log('[Roadmap] Data length:', data.length);
    console.log('[Roadmap] Data preview:', data.substring(0, 500));

    // 构建解析Prompt
    const systemPrompt = `你是一位专业的产品经理，擅长解析产品需求并生成结构化的产品路线图。你必须直接输出JSON，不要有任何解释、思考过程或markdown格式。`;
    const userPrompt = `请根据以下数据源，解析并生成产品路线图的结构化数据：

${data}

要求：
1. 分析数据源中的功能需求，按照合理的优先级和依赖关系进行版本规划
2. 每个版本需要包含：
   - 版本名称（如 V1.0.0、V1.1.0 等）
   - 时间区间（合理的开发周期，如 2-4 周）
   - 包含的功能（每个功能需要有名称和简要描述）
3. 生成 3-5 个版本的规划
4. 为每个版本分配一个不同的颜色（使用十六进制颜色值）
5. 为每个功能分配状态（completed、in_progress 或 pending）
6. 为每个功能分配优先级（high、medium 或 low）
7. 为每个功能分配负责人（可以使用通用名称如 产品、开发、设计等）
8. 必须只输出JSON，不要有任何其他文字、解释或markdown代码块标记

JSON格式如下：
{"versions":[{"id":"v1.0.0","name":"V1.0.0","startDate":"2026-04-01","endDate":"2026-04-21","color":"#3B82F6","features":[{"id":"f1","name":"功能名称","description":"功能描述","owner":"负责人","status":"completed","priority":"high"}]}],"demandPool":[]}`;

    // 调用智谱GLM4.7 API
    const zhipuResponse = await axios.post(
      'https://ark.cn-beijing.volces.com/api/v3/responses',
      {
        "model": "glm-4-7-251222",
        "stream": false,
        "input": [
          {
            "role": "system",
            "content": [
              {
                "type": "input_text",
                "text": systemPrompt
              }
            ]
          },
          {
            "role": "user",
            "content": [
              {
                "type": "input_text",
                "text": userPrompt
              }
            ]
          }
        ]
      },
      {
        headers: {
          "Authorization": "Bearer 90783e84-ddc8-4bbe-be93-01c5be6cfc43",
          "Content-Type": "application/json"
        }
      }
    );

    console.log('[Roadmap] Full API response structure:', JSON.stringify(zhipuResponse.data, null, 2));
    
    // 检查响应结构
    if (!zhipuResponse.data.output || !zhipuResponse.data.output[0]) {
      console.error('[Roadmap] Invalid API response structure:', zhipuResponse.data);
      throw new Error('API 返回了无效的响应结构');
    }
    
    // 尝试多种可能的内容提取路径
    let aiResponse = '';
    const output = zhipuResponse.data.output[0];
    
    if (output.content && output.content[0] && output.content[0].text) {
      aiResponse = output.content[0].text;
    } else if (output.content && output.content[0] && output.content[0].content) {
      aiResponse = output.content[0].content;
    } else if (output.text) {
      aiResponse = output.text;
    } else if (output.message && output.message.content) {
      aiResponse = output.message.content;
    } else if (output.choices && output.choices[0] && output.choices[0].message) {
      aiResponse = output.choices[0].message.content;
    }
    
    console.log('[Roadmap] Parse response received:', aiResponse);
    console.log('[Roadmap] Response length:', aiResponse.length);
    console.log('[Roadmap] Output structure:', JSON.stringify(output, null, 2));

    // 解析AI响应
    let roadmapData;
    try {
      // 提取JSON
      let jsonStr = aiResponse;
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.replace(/```json\s*([\s\S]*?)\s*```/, '$1');
      }
      jsonStr = jsonStr.trim();
      roadmapData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse roadmap response:', parseError);
      // 返回默认路线图结构
      roadmapData = {
        versions: [
          {
            id: 'v1.0.0',
            name: 'V1.0.0',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            color: '#3B82F6',
            features: [
              {
                id: 'f1',
                name: '基础功能',
                description: '实现核心功能',
                owner: '产品',
                status: 'in_progress',
                priority: 'high'
              }
            ]
          }
        ],
        demandPool: []
      };
    }

    res.json(roadmapData);
  } catch (error) {
    console.error('[Roadmap] Parse error:', error);
    res.status(500).json({ error: '解析路线图失败: ' + error.message });
  }
});

// 5.8 单功能AI评估（人工+AI混合模式）- 必须放在动态路由之前
app.post('/api/smart/estimation/units/suggest', async (req, res) => {
  const { functions = [], scopeConfig = {}, model = 'glm-4-7-251222' } = req.body;

  if (!Array.isArray(functions) || functions.length === 0) {
    return res.status(400).json({ error: '缺少功能清单' });
  }

  try {
    console.log('[Estimation] Unit suggestion requested:', functions.length);
    const suggestion = await requestEstimationUnitSuggestionWithRetry(functions, scopeConfig, model);

    res.json(suggestion);
  } catch (error) {
    console.error('[Estimation] Unit suggestion error:', error);
    res.json(buildFallbackEstimationUnitSuggestion(functions, 'AI整理失败，已回退为规则草案'));
  }
});

app.post('/api/smart/estimation/evaluate-single', async (req, res) => {
  const { functionItem, userContext, config, model = 'glm-4-7-251222' } = req.body;

  if (!functionItem || !functionItem.name) {
    return res.status(400).json({ error: '缺少功能信息' });
  }

  try {
    console.log('[Estimation] Single function evaluation:', functionItem.name);
    console.log('[Estimation] Using model:', model);
    console.log('[Estimation] API Key exists:', !!(process.env.VOLCENGINE_API_KEY || process.env.OPENAI_API_KEY));

    // 构建单功能评估Prompt
    const systemPrompt = getSingleEstimationSystemPrompt();
    const userPrompt = buildSingleEstimationPrompt(functionItem, userContext, config);

    console.log('[Estimation] Prompt built, calling AI...');

    const aiResponse = await callEstimationModel(model, systemPrompt, userPrompt);

    console.log('[Estimation] AI response received');

    // 解析结果
    const evaluationResult = parseSingleEstimationResponse(aiResponse, functionItem, userContext);
    
    console.log('[Estimation] Single evaluation completed:', evaluationResult);

    res.json(evaluationResult);
  } catch (error) {
    console.error('[Estimation] Single evaluation error:', error);
    console.error('[Estimation] Error stack:', error.stack);
    res.status(500).json({ error: 'AI评估失败: ' + error.message });
  }
});

// 5.1 启动评估任务
app.post('/api/smart/estimation/start', async (req, res) => {
  const { productId, functions, config } = req.body;

  if (!productId || !functions || !Array.isArray(functions) || functions.length === 0) {
    return res.status(400).json({ error: '缺少必要参数: productId 或 functions' });
  }

  const taskId = generateTaskId();
  const batchSize = config?.batchSize || 5;
  const totalBatches = Math.ceil(functions.length / batchSize);

  // 创建任务
  const task = {
    id: taskId,
    productId,
    status: 'pending',
    config: config || {},
    functions,
    results: [],
    currentBatch: 0,
    totalBatches,
    progress: 0,
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  estimationTasks.set(taskId, task);

  console.log(`[Estimation] Task created: ${taskId}, functions: ${functions.length}, batches: ${totalBatches}`);

  // 异步启动评估（不等待完成）
  processEstimationTask(taskId);

  res.json({ 
    taskId, 
    status: 'pending',
    totalFunctions: functions.length,
    totalBatches 
  });
});

// 5.2 查询评估进度
app.get('/api/smart/estimation/:taskId/progress', (req, res) => {
  const { taskId } = req.params;
  const task = estimationTasks.get(taskId);

  if (!task) {
    return res.status(404).json({ error: '任务不存在' });
  }

  res.json({
    taskId: task.id,
    status: task.status,
    progress: task.progress,
    currentBatch: task.currentBatch,
    totalBatches: task.totalBatches,
    completedFunctions: task.results.length,
    totalFunctions: task.functions.length,
    results: task.status === 'completed' ? task.results : undefined,
    error: task.error
  });
});

// 5.3 取消评估任务
app.post('/api/smart/estimation/:taskId/cancel', (req, res) => {
  const { taskId } = req.params;
  const task = estimationTasks.get(taskId);

  if (!task) {
    return res.status(404).json({ error: '任务不存在' });
  }

  if (task.status === 'completed' || task.status === 'cancelled') {
    return res.status(400).json({ error: '任务已结束，无法取消' });
  }

  task.status = 'cancelled';
  task.updatedAt = new Date().toISOString();

  res.json({ success: true, message: '任务已取消' });
});

// 5.4 生成评估报告
app.post('/api/smart/estimation/:taskId/report', async (req, res) => {
  const { taskId } = req.params;
  const { format = 'json' } = req.body;
  const task = estimationTasks.get(taskId);

  if (!task) {
    return res.status(404).json({ error: '任务不存在' });
  }

  if (task.status !== 'completed') {
    return res.status(400).json({ error: '任务尚未完成' });
  }

  // 计算统计数据
  const summary = calculateEstimationSummary(task.results);

  const report = {
    id: taskId,
    productId: task.productId,
    createdAt: task.createdAt,
    completedAt: task.updatedAt,
    config: task.config,
    results: task.results,
    summary
  };

  if (format === 'markdown') {
    const markdown = generateEstimationMarkdown(report);
    res.setHeader('Content-Type', 'text/markdown');
    res.send(markdown);
  } else {
    res.json(report);
  }
});

// 5.5 保存评估报告（用于分享和在线查看）
app.post('/api/smart/estimation/report', async (req, res) => {
  const { productId, results, config } = req.body;

  console.log('[Estimation API] Saving report:', { productId, resultsCount: results?.length });

  if (!productId || !results || !Array.isArray(results)) {
    console.error('[Estimation API] Missing required params:', { productId, hasResults: !!results, isArray: Array.isArray(results) });
    return res.status(400).json({ error: '缺少必要参数' });
  }

  try {
    const reportId = generateTaskId();
    const summary = calculateEstimationSummary(results);

    const report = {
      id: reportId,
      productId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      config: config || {},
      results,
      summary
    };

    // 保存到内存（生产环境应该保存到数据库）
    estimationTasks.set(reportId, {
      ...report,
      status: 'completed'
    });

    console.log('[Estimation API] Report saved to memory:', reportId);

    // 同时保存到 smart_notes 表
    const noteBody = {
      productId,
      title: `人天评估报告 - ${new Date().toLocaleDateString()}`,
      content: JSON.stringify({ reportId, type: 'estimation_report' }),
      type: 'estimation_report'
    };

    console.log('[Estimation API] Creating note:', noteBody);

    const noteRes = await fetch('http://localhost:3002/api/smart/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noteBody)
    });

    console.log('[Estimation API] Note response status:', noteRes.status);

    if (!noteRes.ok) {
      const errorText = await noteRes.text();
      console.error('[Estimation API] Note creation failed:', errorText);
      throw new Error(`创建笔记失败: ${noteRes.status}`);
    }

    const noteData = await noteRes.json();
    console.log('[Estimation API] Note created:', noteData);

    res.json({
      reportId,
      reportUrl: `/estimation/${reportId}`,
      note: noteData.data
    });
  } catch (error) {
    console.error('[Estimation API] 保存报告失败:', error);
    res.status(500).json({ error: '保存报告失败: ' + error.message });
  }
});

// 5.6 获取评估报告
app.get('/api/smart/estimation/report/:reportId', (req, res) => {
  const { reportId } = req.params;
  const task = estimationTasks.get(reportId);

  if (!task) {
    return res.status(404).json({ error: '报告不存在或已过期' });
  }

  const { id, productId, createdAt, updatedAt, config, results } = task;
  const summary = calculateEstimationSummary(results);

  res.json({
    id,
    productId,
    createdAt,
    updatedAt,
    config,
    results,
    summary
  });
});

// 5.7 更新评估报告
app.put('/api/smart/estimation/report/:reportId', (req, res) => {
  const { reportId } = req.params;
  const { results, config } = req.body;

  const task = estimationTasks.get(reportId);
  if (!task) {
    return res.status(404).json({ error: '报告不存在或已过期' });
  }

  // 更新报告
  if (results) task.results = results;
  if (config) task.config = { ...task.config, ...config };
  task.updatedAt = new Date().toISOString();

  const summary = calculateEstimationSummary(task.results);

  res.json({
    id: reportId,
    productId: task.productId,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    config: task.config,
    results: task.results,
    summary
  });
});

// 获取单功能评估System Prompt
function getSingleEstimationSystemPrompt() {
  return `# 软件功能人天评估专家

你是经验丰富的项目管理专家，擅长软件项目工作量评估和技术方案设计。

## 评估标准
基于【中级人员水平】，按照 1 个人干活的标准进行评估。

### 交付口径
- 评估的是真实企业项目中的交付工作量，不是理想状态下的纯编码时间
- 评估必须覆盖需求澄清、方案设计、评审沟通、开发实现、联调、自测、测试回归、上线准备、修复缓冲
- 如果需求信息不完整，默认按企业中后台/业务系统的常见复杂度保守估算，不能因为描述简短就给出过低人天

## 评估原则
- 实事求是，根据功能复杂度合理评估
- 包含需求沟通、设计、开发、测试全流程
- 考虑会议、评审、沟通时间
- 复杂功能预留 10-20% 缓冲时间

## 复杂度判断标准
- 只有在“单页面/单表单/单表 CRUD、无权限、无状态流转、无第三方依赖、无复杂校验”的情况下，才可以评为 simple
- 只要涉及以下任一情况，至少评为 medium：列表搜索筛选、详情页、表单校验、角色权限、状态流转、批量操作、导入导出、消息通知、文件上传下载、统计报表、配置页、联调
- 只要涉及以下任一情况，优先评为 complex：审批/工作流、多角色协同、第三方系统集成、支付/银行/企微/短信/邮件等外部接口、复杂规则引擎、异步任务、跨模块依赖、大批量数据处理

## 参考标准（中级人员）
- simple: 产品 0.5-1 天, UI 0.5 天, 前端 1-2 天, 后端 1-2 天, 测试 0.5-1 天
- medium: 产品 1-2 天, UI 1-2 天, 前端 2-4 天, 后端 2-4 天, 测试 1-2 天
- complex: 产品 2-4 天, UI 1.5-3 天, 前端 4-8 天, 后端 4-8 天, 测试 2-4 天

## 额外要求
- 不允许按“最顺利的一次实现”估算，必须考虑真实项目中的反复确认、联调和返工
- 不允许因为功能描述只有一句话，就压缩为 1-2 天级别的理想化实现
- 除非该角色明确不参与，否则不要轻易给 0 天
- 人天请尽量按 0.5 天粒度输出

## 输出格式
必须严格按照以下 JSON 格式输出，不要添加任何其他内容：

{\` +
\`  "complexity": "simple|medium|complex",
  "estimates": {
    "product": 0,
    "ui": 0,
    "frontend": 0,
    "backend": 0,
    "test": 0
  },
  "roleExplanations": {
    "product": "该角色工作说明",
    "ui": "该角色工作说明",
    "frontend": "该角色工作说明",
    "backend": "该角色工作说明",
    "test": "该角色工作说明"
  },
  "implementationApproach": "功能实现思路的简要总结",
  "confidence": 0.85
}\``;
}

// 构建单功能评估Prompt
function buildSingleEstimationPrompt(functionItem, userContext, config = {}) {
  let prompt = `请作为一名资深的全栈开发工程师，基于现实中作为乙方交付的中大型项目，评估以下功能的人天工作量：

功能名称：${functionItem.name}
所属模块：${functionItem.module || '未分类'}
功能描述：${functionItem.description || '无详细描述'}
`;

  const scopePrompt = buildScopeContextPrompt(config?.scopeConfig);
  if (scopePrompt) {
    prompt += `\n本次评估口径：\n${scopePrompt}\n`;
  }

  const reusePrompt = buildReuseAssessmentPrompt(config?.reuseAssessment || functionItem?.reuseAssessment);
  if (reusePrompt) {
    prompt += `\n复用/二开判断：\n${reusePrompt}\n`;
  }

  if (userContext && userContext.trim()) {
    prompt += `\n用户补充的背景信息：\n${userContext}\n`;
  }

  prompt += `
要求：
1. 首先深入分析需求的核心逻辑，梳理出功能的具体实现步骤和关键流程
2. 基于梳理的核心逻辑，给出详细的实现思路，重点分析：
   - 需求的核心逻辑和业务流程
   - 实现这个需求需要做哪些具体事情，即前端涉及到的页面和后端大致需要提供的接口
3. 基于现实中的项目情况，每个角色按照中级人员水平进行评估，要充分考虑以下因素：
   - 需求沟通和讨论的时间（与业务方、技术团队的多次会议）
   - 文档编写的时间（PRD、技术方案、接口文档等，特别注意，编写文档也是非常耗时的）
   - 设计和评审的时间（需求评审、技术评审、UI评审等）
   - 开发和集成的时间（包括第三方系统集成的复杂性）
   - 测试和调试的时间（功能测试、集成测试、回归测试、性能测试等）
   - 部署和上线的时间（环境配置、灰度发布、监控等）
   - 缓冲时间（应对需求变更、技术难题、集成问题等）
4. 给出复杂度判断（simple/medium/complex）
5. 为每个角色给出详细的评估说明，包括具体的工作内容和时间分配
6. 给出置信度（0-1之间，表示你对这个评估的确信程度）
7. 严格按照 JSON 格式输出，不要添加其他内容
8. 人天数字保留 1 位小数
9. 评估要科学合理，充分考虑需求的复杂度、集成风险和工作量，绝对不要低估人天
10. 对于涉及第三方系统集成（如银行API、企业微信等）的功能，要充分考虑集成的复杂性、文档阅读、接口调试和可能的问题排查时间
11. 请给出真实项目中合理的人天评估，不要给出过于乐观的估计
12. 请先判断它属于 simple / medium / complex 哪一档，再参考对应区间评估，不要脱离区间随意压缩
13. 如果描述中出现页面、列表、详情、表单、权限、状态流转、审批、导入导出、消息通知、第三方对接等关键词，不能按简单功能估算
14. 如果信息不完整，请按企业项目的常见实现口径保守估算，不要按“最少代码量”估算`;

  return prompt;
}

function buildReuseAssessmentPrompt(reuseAssessment = {}) {
  if (!reuseAssessment || typeof reuseAssessment !== 'object') return '';

  const fulfillmentLabelMap = {
    r1: '完全满足',
    r2: '基本满足',
    r3: '部分满足',
    r0: '需要定制',
    r4: '需要定制',
    direct_reuse: '完全满足',
    config_customization: '基本满足',
    secondary_development: '部分满足',
    new_build: '需要定制'
  };
  const fulfillmentLabel = fulfillmentLabelMap[reuseAssessment.reuseLevel]
    || fulfillmentLabelMap[reuseAssessment.deliveryType]
    || '需要定制';

  let prompt = `- 已有功能满足情况：${fulfillmentLabel}\n`;
  if (reuseAssessment.notes) {
    prompt += `- 补充说明：${reuseAssessment.notes}\n`;
  }

  prompt += '- 评估时请结合上述满足情况理解工作量：即使是完全满足或基本满足，也要保留验证、适配、回归与上线确认成本；若为部分满足或需要定制，则应充分考虑方案设计、开发改造、联调测试与上线成本。';
  return prompt;
}

function buildScopeContextPrompt(scopeConfig = {}) {
  if (!scopeConfig || typeof scopeConfig !== 'object') return '';

  const projectTypeMap = {
    new_build: '新建项目',
    secondary_dev: '二开项目',
    hybrid: '混合项目'
  };
  const caliberMap = {
    internal: '内部研发口径',
    vendor: '乙方交付口径',
    mvp: 'MVP压缩口径'
  };
  const teamLevelMap = {
    junior: '初级团队',
    middle: '中级团队',
    senior: '高级团队'
  };

  const includedItems = [];
  if (scopeConfig.includeProduct) includedItems.push('产品方案/PRD');
  if (scopeConfig.includeUI) includedItems.push('UI设计');
  if (scopeConfig.includeFrontend) includedItems.push('前端开发');
  if (scopeConfig.includeBackend) includedItems.push('后端开发');
  if (scopeConfig.includeQA) includedItems.push('测试回归');
  if (scopeConfig.includeIntegration) includedItems.push('联调集成');
  if (scopeConfig.includeLaunch) includedItems.push('上线支持');
  if (scopeConfig.includeProjectManagement) includedItems.push('项目沟通');
  if (scopeConfig.includeTraining) includedItems.push('培训交接');
  if (scopeConfig.includeBuffer) includedItems.push('风险缓冲');

  const excludedItems = [];
  if (scopeConfig.includeProduct === false) excludedItems.push('产品方案/PRD');
  if (scopeConfig.includeUI === false) excludedItems.push('UI设计');
  if (scopeConfig.includeFrontend === false) excludedItems.push('前端开发');
  if (scopeConfig.includeBackend === false) excludedItems.push('后端开发');
  if (scopeConfig.includeQA === false) excludedItems.push('测试回归');
  if (scopeConfig.includeIntegration === false) excludedItems.push('联调集成');
  if (scopeConfig.includeLaunch === false) excludedItems.push('上线支持');
  if (scopeConfig.includeProjectManagement === false) excludedItems.push('项目沟通');
  if (scopeConfig.includeTraining === false) excludedItems.push('培训交接');
  if (scopeConfig.includeBuffer === false) excludedItems.push('风险缓冲');

  let prompt = `- 项目类型：${projectTypeMap[scopeConfig.projectType] || '混合项目'}\n`;
  prompt += `- 交付口径：${caliberMap[scopeConfig.deliveryCaliber] || '乙方交付口径'}\n`;
  prompt += `- 团队基准：${teamLevelMap[scopeConfig.teamLevel] || '中级团队'}\n`;
  prompt += `- 本次纳入评估：${includedItems.join('、') || '按默认交付范围评估'}\n`;

  if (excludedItems.length > 0) {
    prompt += `- 本次明确不纳入：${excludedItems.join('、')}\n`;
  }

  prompt += '- 请严格按以上口径评估，不要自行把未纳入项算入结果，也不要遗漏已纳入项。';

  return prompt;
}

async function callEstimationModel(model, systemPrompt, userPrompt) {
  if (model === 'deepseek-r1-250528') {
    const deepseekResponse = await axios.post(
      'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
      {
        model: 'deepseek-r1-250528',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      },
      {
        headers: {
          Authorization: 'Bearer 90783e84-ddc8-4bbe-be93-01c5be6cfc43',
          'Content-Type': 'application/json'
        }
      }
    );

    return deepseekResponse.data.choices?.[0]?.message?.content || '';
  }

  const glmResponse = await axios.post(
    'https://ark.cn-beijing.volces.com/api/v3/responses',
    {
      model: 'glm-4-7-251222',
      stream: false,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: systemPrompt
            }
          ]
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: userPrompt
            }
          ]
        }
      ]
    },
    {
      headers: {
        Authorization: 'Bearer 90783e84-ddc8-4bbe-be93-01c5be6cfc43',
        'Content-Type': 'application/json'
      }
    }
  );

  return glmResponse.data.output?.[0]?.content?.[0]?.text || '';
}

function getEstimationUnitSuggestionSystemPrompt() {
  return `# 交付项整理专家

你是一名资深产品经理和交付经理，擅长将零散功能点整理成可用于人天评估的交付项。

## 你的任务
- 不要按字段、按钮或单个小动作拆分
- 优先按页面、流程、模块、集成边界整理
- 对明显共享页面或共享流程的功能进行合并
- 对明显跨多个子域的粗项提出拆分建议
- 标记潜在风险，如权限、状态流转、第三方集成、联调、回归
- 对疑似已有能力二开、配置型交付、伪复用场景给出复用提示

## 输出要求
- 严格输出 JSON，不要输出任何其他解释
- units 数组中的每个单元必须包含：
  - name
  - module
  - type: "page_flow" | "module" | "backend_capability" | "integration" | "configuration"
  - suggestedReason
  - riskHints: string[]
  - reuseHint: string
  - sourceFunctionIds: string[]
- mergeSuggestions / splitSuggestions / missingCandidates 为可选数组，用于辅助人工确认
- overallSummary 为可选对象，用于帮助用户建立整体认知
- sourceFunctionIds 必须只使用用户输入里已有的 id
- 确保每个原始功能最多只归到 1 个单元
- 如果一个原始功能不适合纳入当前评估，也可以不放入任何单元

## 判断原则
- 如果多个功能共用同一页面、同一数据对象、同一主流程，优先合并
- 如果一个功能同时包含配置、执行、通知、报表、权限多个子域，优先拆分
- 如果涉及对接、同步、外部系统、回调，优先标为 integration
- 如果以配置、规则、模板、权限为主，优先标为 configuration
- 如果是纯服务、任务、归档、计算能力，优先标为 backend_capability
- 如果需求明显像在已有模块基础上加字段、加规则、改流程、接新权限，reuseHint 中明确写出“疑似二开/复用”判断
- 如果你怀疑文档漏了权限、配置、回归、迁移、上线验证等评估必须考虑的内容，把它们写入 missingCandidates`;
}

function buildEstimationUnitSuggestionPrompt(functions, scopeConfig = {}) {
  const scopePrompt = buildScopeContextPrompt(scopeConfig);
  const functionLines = functions.map((item, index) => {
    const description = item.description ? `；描述：${item.description}` : '';
    return `${index + 1}. id=${item.id}；模块=${item.module || '未分类'}；名称=${item.name}${description}`;
  }).join('\n');

  return `请基于以下原始功能清单，整理一版“交付项草案”。

${scopePrompt ? `评估口径：\n${scopePrompt}\n` : ''}
原始功能：
${functionLines}

请输出格式：
{
  "units": [
    {
      "name": "交付项名称",
      "module": "所属模块",
      "type": "page_flow|module|backend_capability|integration|configuration",
      "suggestedReason": "为什么这样整理",
      "riskHints": ["风险1", "风险2"],
      "reuseHint": "复用/二开提示，没有可写空字符串",
      "sourceFunctionIds": ["func_1", "func_2"]
    }
  ],
  "mergeSuggestions": [
    {
      "title": "建议合并说明",
      "sourceFunctionIds": ["func_1", "func_2"],
      "reason": "为什么建议合并"
    }
  ],
  "splitSuggestions": [
    {
      "sourceFunctionId": "func_3",
      "reason": "为什么建议拆分",
      "suggestedUnits": ["建议拆出的单元A", "建议拆出的单元B"]
    }
  ],
  "missingCandidates": [
    {
      "name": "疑似漏掉的交付项",
      "module": "所属模块",
      "reason": "为什么应该补充进评估"
    }
  ],
  "overallSummary": {
    "overview": "一句话说明这次需求整体在交付什么",
    "businessDomains": ["核心业务域1", "核心业务域2"],
    "mergeLogic": ["为什么应合并评估的判断1", "判断2"],
    "riskFocus": ["高风险点1", "高风险点2"],
    "reviewFocus": ["建议用户重点确认的点1", "点2"]
  }
}`;
}

function buildCompactEstimationUnitSuggestionPrompt(functions, scopeConfig = {}) {
  const scopePrompt = buildScopeContextPrompt(scopeConfig);
  const functionLines = functions.map((item, index) => {
    const normalizedDescription = String(item.description || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const description = normalizedDescription ? `；描述：${normalizedDescription}` : '';
    return `${index + 1}. id=${item.id}；模块=${item.module || '未分类'}；名称=${item.name}${description}`;
  }).join('\n');

  return `请把以下功能整理成交付项草案。不要解释，不要输出 markdown，只输出 JSON。

${scopePrompt ? `评估口径：\n${scopePrompt}\n` : ''}
原始功能：
${functionLines}

输出要求：
{
  "units": [
    {
      "name": "交付项名称",
      "module": "所属模块",
      "type": "page_flow|module|backend_capability|integration|configuration",
      "suggestedReason": "一句话说明为什么这样分",
      "riskHints": ["风险提示"],
      "reuseHint": "复用提示，没有可留空字符串",
      "sourceFunctionIds": ["func_1", "func_2"]
    }
  ],
  "overallSummary": {
    "overview": "一句话概括这次需求",
    "businessDomains": ["业务域1", "业务域2"],
    "mergeLogic": ["为什么这样打包"],
    "riskFocus": ["风险点"],
    "reviewFocus": ["建议重点确认点"]
  }
}`;
}

function extractJsonObjectString(raw = '') {
  const text = String(raw || '').trim();
  if (!text) return '';

  if (text.includes('```json')) {
    const fenced = text.replace(/```json\s*([\s\S]*?)\s*```/, '$1').trim();
    if (fenced) return fenced;
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1).trim();
  }

  return text;
}

function parseEstimationUnitSuggestionResponse(response, functions = []) {
  try {
    const jsonStr = extractJsonObjectString(response);
    const data = JSON.parse(jsonStr);
    const availableIds = new Set(functions.map(item => item.id));
    const usedIds = new Set();
    const units = [];
    const assignments = {};

    (data.units || []).forEach((unit, index) => {
      const validSourceIds = Array.isArray(unit.sourceFunctionIds)
        ? unit.sourceFunctionIds.filter(id => availableIds.has(id) && !usedIds.has(id))
        : [];

      if (validSourceIds.length === 0) return;

      const normalizedUnit = {
        id: `ai_unit_${Date.now()}_${index}`,
        name: unit.name || `交付项 ${index + 1}`,
        module: unit.module || '未分类',
        type: unit.type || 'module',
        suggestedReason: unit.suggestedReason || 'AI建议按该交付边界进行评估',
        riskHints: Array.isArray(unit.riskHints) ? unit.riskHints.slice(0, 5) : [],
        reuseHint: typeof unit.reuseHint === 'string' ? unit.reuseHint.slice(0, 120) : '',
        sourceFunctionIds: validSourceIds
      };

      validSourceIds.forEach(id => {
        usedIds.add(id);
        assignments[id] = normalizedUnit.id;
      });

      units.push(normalizedUnit);
    });

    if (units.length === 0) {
      return buildFallbackEstimationUnitSuggestion(functions, 'AI未返回有效单元，已回退为规则草案');
    }

    const mergeSuggestions = Array.isArray(data.mergeSuggestions)
      ? data.mergeSuggestions
        .map(item => ({
          title: item?.title || '建议合并的评估项',
          reason: item?.reason || '这些功能建议按同一交付边界评估',
          sourceFunctionIds: Array.isArray(item?.sourceFunctionIds)
            ? item.sourceFunctionIds.filter(id => availableIds.has(id)).slice(0, 6)
            : []
        }))
        .filter(item => item.sourceFunctionIds.length >= 2)
        .slice(0, 4)
      : [];

    const splitSuggestions = Array.isArray(data.splitSuggestions)
      ? data.splitSuggestions
        .map(item => ({
          sourceFunctionId: availableIds.has(item?.sourceFunctionId) ? item.sourceFunctionId : '',
          reason: item?.reason || '当前项可能过粗，建议人工确认是否需要拆分',
          suggestedUnits: Array.isArray(item?.suggestedUnits) ? item.suggestedUnits.slice(0, 4) : []
        }))
        .filter(item => item.sourceFunctionId)
        .slice(0, 4)
      : [];

    const missingCandidates = Array.isArray(data.missingCandidates)
      ? data.missingCandidates
        .map((item, index) => ({
          id: `missing_${Date.now()}_${index}`,
          name: item?.name || `待补充评估项 ${index + 1}`,
          module: item?.module || '未分类',
          reason: item?.reason || 'AI判断该交付项可能被遗漏，建议人工确认'
        }))
        .slice(0, 6)
      : [];

    const overallSummary = normalizeOverallSummary(data.overallSummary, functions, units);

    return {
      units,
      assignments,
      mergeSuggestions,
      splitSuggestions,
      missingCandidates,
      overallSummary,
      strategy: 'ai',
      warningMessage: ''
    };
  } catch (error) {
    console.error('Failed to parse estimation unit suggestion:', error);
    console.error('Raw response:', response);
    return buildFallbackEstimationUnitSuggestion(functions, 'AI整理结果无法解析，已回退为规则草案');
  }
}

function normalizeOverallSummary(summary = {}, functions = [], units = []) {
  const fallback = buildFallbackOverallSummary(functions, units);
  const safeArray = (value, limit = 4) => Array.isArray(value)
    ? value.filter(Boolean).map(item => String(item).trim()).filter(Boolean).slice(0, limit)
    : [];

  const overview = typeof summary?.overview === 'string' && summary.overview.trim()
    ? summary.overview.trim()
    : fallback.overview;

  const businessDomains = safeArray(summary?.businessDomains);
  const mergeLogic = safeArray(summary?.mergeLogic);
  const riskFocus = safeArray(summary?.riskFocus);
  const reviewFocus = safeArray(summary?.reviewFocus);

  return {
    overview,
    businessDomains: businessDomains.length > 0 ? businessDomains : fallback.businessDomains,
    mergeLogic: mergeLogic.length > 0 ? mergeLogic : fallback.mergeLogic,
    riskFocus: riskFocus.length > 0 ? riskFocus : fallback.riskFocus,
    reviewFocus: reviewFocus.length > 0 ? reviewFocus : fallback.reviewFocus
  };
}

function buildFallbackOverallSummary(functions = [], units = []) {
  const modules = Array.from(new Set(functions.map(item => item.module || '未分类'))).slice(0, 4);
  const domainList = modules.length > 0 ? modules : ['核心业务处理'];
  const integrationCount = units.filter(unit => unit.type === 'integration').length;
  const configCount = units.filter(unit => unit.type === 'configuration').length;
  const reuseCount = units.filter(unit => /复用|二开|已有|改造/.test(`${unit.reuseHint || ''} ${unit.suggestedReason || ''}`)).length;

  const mergeLogic = [
    'AI 会优先把共享同一业务对象、同一页面链路或同一交付边界的需求合并成同一个交付包进行评估',
    integrationCount > 0
      ? '涉及外部集成或多端协同的需求，建议合并评估，避免拆散后低估联调和回归成本'
      : '同一模块下的相关需求若共享流程或数据对象，建议优先合并评估'
  ].filter(Boolean);

  const riskFocus = [
    integrationCount > 0 ? '存在多端或外部集成需求，需重点关注联调、回归与兼容影响' : '',
    configCount > 0 ? '配置、规则、权限类需求容易被低估，需确认是否只是配置还是涉及逻辑改造' : '',
    reuseCount > 0 ? '疑似存在二开 / 复用场景，需确认复用比例、回归范围与现网兼容影响' : ''
  ].filter(Boolean).slice(0, 4);

  const reviewFocus = [
    '重点确认哪些需求应该合并为同一交付包，而不是按端或按页面拆散评估',
    '重点确认哪些需求属于配置 / 二开 / 复用，避免按全新开发或纯配置误判',
    '重点确认是否遗漏了权限、联调、测试回归、上线支持等交付成本'
  ].slice(0, 4);

  return {
    overview: `本次需求主要围绕 ${domainList.join('、')} 等业务域展开，建议按交付边界而不是零散功能点进行打包评估。`,
    businessDomains: domainList,
    mergeLogic,
    riskFocus,
    reviewFocus
  };
}

function buildFallbackEstimationUnitSuggestion(functions = [], warningMessage = '当前使用规则草案，可继续人工调整') {
  const grouped = new Map();

  functions.forEach((item, index) => {
    const module = item.module || '未分类';
    const key = `${module}::${String(item.name || '').slice(0, 8)}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        module,
        items: []
      });
    }
    grouped.get(key).items.push(item);
  });

  const units = [];
  const assignments = {};

  Array.from(grouped.values()).forEach((group, index) => {
    const first = group.items[0];
    const unitId = `fallback_unit_${Date.now()}_${index}`;
    const unitName = group.items.length === 1 ? first.name : `${first.module || '未分类'}交付项 ${index + 1}`;

    units.push({
      id: unitId,
      name: unitName,
      module: group.module,
      type: 'module',
      suggestedReason: group.items.length === 1
        ? '回退策略：当前功能相对独立，先保留为单独交付项'
        : '回退策略：按模块和主题做初步归并，建议人工进一步确认交付边界',
      riskHints: group.items.length > 2 ? ['该单元包含多个来源功能，建议确认是否需要进一步拆分'] : [],
      reuseHint: /(复用|沿用|已有|改造|扩展|兼容)/.test(group.items.map(item => `${item.name} ${item.description || ''}`).join(' '))
        ? '疑似已有能力二开，建议确认复用比例和回归范围'
        : '',
      sourceFunctionIds: group.items.map(item => item.id)
    });

    group.items.forEach(item => {
      assignments[item.id] = unitId;
    });
  });

  return {
    units,
    assignments,
    mergeSuggestions: [],
    splitSuggestions: [],
    missingCandidates: [],
    overallSummary: buildFallbackOverallSummary(functions, units),
    strategy: 'fallback',
    warningMessage
  };
}

async function requestEstimationUnitSuggestionWithRetry(functions = [], scopeConfig = {}, model = 'glm-4-7-251222') {
  const attempts = [
    {
      model,
      promptBuilder: buildEstimationUnitSuggestionPrompt,
      warningMessage: ''
    },
    {
      model,
      promptBuilder: buildCompactEstimationUnitSuggestionPrompt,
      warningMessage: 'AI 已使用精简模式完成交付项整理'
    },
    {
      model: model === 'deepseek-r1-250528' ? 'glm-4-7-251222' : 'deepseek-r1-250528',
      promptBuilder: buildCompactEstimationUnitSuggestionPrompt,
      warningMessage: 'AI 已切换备用模型完成交付项整理'
    }
  ];

  let lastError = null;

  for (const attempt of attempts) {
    try {
      const systemPrompt = getEstimationUnitSuggestionSystemPrompt();
      const userPrompt = attempt.promptBuilder(functions, scopeConfig);
      const aiResponse = await callEstimationModel(attempt.model, systemPrompt, userPrompt);

      if (!String(aiResponse || '').trim()) {
        throw new Error(`模型 ${attempt.model} 返回空结果`);
      }

      const parsed = parseEstimationUnitSuggestionResponse(aiResponse, functions);
      if (parsed?.strategy === 'fallback') {
        throw new Error(`模型 ${attempt.model} 未返回有效 JSON`);
      }

      return {
        ...parsed,
        strategy: 'ai',
        warningMessage: attempt.warningMessage
      };
    } catch (error) {
      lastError = error;
      console.error('[Estimation] Unit suggestion attempt failed:', {
        model: attempt.model,
        error: error.message
      });
    }
  }

  return buildFallbackEstimationUnitSuggestion(
    functions,
    `AI整理失败，已回退为规则草案：${lastError?.message || '未获取到有效结果'}`
  );
}

// 解析单功能评估响应
function parseSingleEstimationResponse(response, functionItem = {}, userContext = '') {
  let parsedResult;

  try {
    // 提取 JSON
    let jsonStr = response;
    // 移除可能的代码块标记
    if (response.includes('```json')) {
      jsonStr = response.replace(/```json\s*([\s\S]*?)\s*```/, '$1');
    }
    // 移除首尾空白
    jsonStr = jsonStr.trim();
    const data = JSON.parse(jsonStr);

    // 验证必要字段
    if (!data.estimates || typeof data.estimates !== 'object') {
      throw new Error('Missing estimates');
    }

    // 确保所有角色都有值
    const roles = ['product', 'ui', 'frontend', 'backend', 'test'];
    const estimates = {};
    const roleExplanations = {};

    roles.forEach(role => {
      estimates[role] = parseFloat(data.estimates[role]) || 0;
      roleExplanations[role] = data.roleExplanations?.[role] || 
        getDefaultRoleExplanation(role, data.complexity);
    });

    parsedResult = {
      complexity: data.complexity || 'medium',
      estimates,
      roleExplanations,
      implementationApproach: data.implementationApproach || '基于功能描述的标准实现方案',
      confidence: parseFloat(data.confidence) || 0.8
    };
  } catch (error) {
    console.error('Failed to parse single estimation response:', error);
    console.error('Raw response:', response);
    
    // 返回默认评估结果
    parsedResult = {
      complexity: 'medium',
      estimates: { product: 1, ui: 1, frontend: 2, backend: 2, test: 1 },
      roleExplanations: {
        product: '需求分析和文档编写',
        ui: '界面设计和规范制定',
        frontend: '页面开发和交互实现',
        backend: '接口开发和业务逻辑',
        test: '测试用例设计和执行'
      },
      implementationApproach: '基于功能描述的标准实现方案',
      confidence: 0.5
    };
  }

  return calibrateSingleEstimationResult(parsedResult, functionItem, userContext);
}

function calibrateSingleEstimationResult(result, functionItem = {}, userContext = '') {
  const originalComplexity = result.complexity || 'medium';
  const contextText = [
    functionItem?.name,
    functionItem?.module,
    functionItem?.description,
    userContext
  ].filter(Boolean).join('\n');

  const inferredComplexity = inferEstimationComplexity(contextText, originalComplexity);
  const calibratedComplexity = getHigherComplexity(originalComplexity, inferredComplexity);
  const roleMinimums = getRoleMinimumsForEstimation(calibratedComplexity, contextText);

  const estimates = { ...result.estimates };

  Object.keys(roleMinimums).forEach(role => {
    const currentValue = roundUpToHalfDay(estimates[role] || 0);
    estimates[role] = Math.max(currentValue, roleMinimums[role]);
  });

  const currentTotal = Object.values(estimates).reduce((sum, days) => sum + days, 0);
  const minTotal = getMinimumTotalDays(calibratedComplexity, contextText, roleMinimums);

  if (currentTotal < minTotal) {
    const roleWeights = getRoleWeightsForEstimation(roleMinimums);
    const remainder = minTotal - currentTotal;

    Object.keys(estimates).forEach(role => {
      if (roleWeights[role] <= 0) return;
      estimates[role] = roundUpToHalfDay(estimates[role] + remainder * roleWeights[role]);
    });
  }

  const wasAdjusted = (
    calibratedComplexity !== originalComplexity ||
    hasEstimationChanged(result.estimates, estimates)
  );

  return {
    ...result,
    complexity: calibratedComplexity,
    estimates,
    implementationApproach: wasAdjusted
      ? `${result.implementationApproach || '基于功能描述的标准实现方案'}；已按企业项目交付口径进行保守校准，避免按理想开发路径低估人天。`
      : (result.implementationApproach || '基于功能描述的标准实现方案'),
    confidence: normalizeConfidence(result.confidence, wasAdjusted, userContext)
  };
}

function inferEstimationComplexity(contextText = '', fallback = 'medium') {
  const text = String(contextText || '').toLowerCase();

  const complexPattern = /(审批|工作流|流程引擎|第三方|对接|集成|银行|支付|企业微信|企微|短信|邮件|异步|定时任务|多系统|跨系统|复杂规则|规则引擎|批量数据|大数据量|高并发|多角色协同)/;
  const mediumPattern = /(列表|详情|表单|创建|编辑|删除|搜索|筛选|分页|配置|弹窗|抽屉|权限|角色|登录|鉴权|状态|流转|导入|导出|上传|下载|通知|消息|报表|统计|工作台|仪表盘|联调|时间轴|关联|卡片)/g;

  if (complexPattern.test(text)) return 'complex';

  const mediumMatches = text.match(mediumPattern) || [];
  const uniqueMediumMatches = new Set(mediumMatches);
  const hasPermissionOrFlow = /(权限|角色|鉴权|状态|流转|审批|工作流)/.test(text);
  const hasUiAndData = /(页面|列表|详情|表单|弹窗|抽屉|时间轴|工作台)/.test(text) && /(接口|api|数据库|数据|关联|同步|任务|卡片)/.test(text);

  if (uniqueMediumMatches.size >= 4 || (hasPermissionOrFlow && hasUiAndData)) {
    return 'complex';
  }

  if (uniqueMediumMatches.size > 0) return 'medium';
  return fallback || 'medium';
}

function getHigherComplexity(a = 'medium', b = 'medium') {
  const order = { simple: 1, medium: 2, complex: 3 };
  return (order[b] || 2) > (order[a] || 2) ? b : a;
}

function getRoleMinimumsForEstimation(complexity, contextText = '') {
  const text = String(contextText || '').toLowerCase();
  const pureBackendPattern = /(纯后端|后台任务|定时任务|job|cron|服务接口|接口服务|api服务)/;
  const uiPattern = /(页面|列表|详情|表单|按钮|弹窗|抽屉|tab|工作台|仪表盘|搜索|筛选|配置|web|app|h5)/;
  const backendPattern = /(接口|api|数据库|数据|保存|提交|同步|状态|权限|角色|导入|导出|上传|下载|通知|消息|审批|流程|任务)/;

  const isPureBackend = pureBackendPattern.test(text) && !uiPattern.test(text);
  const hasUI = !isPureBackend;
  const hasBackend = backendPattern.test(text) || !isPureBackend;

  const minimumMap = {
    simple: {
      product: 1,
      ui: hasUI ? 0.5 : 0,
      frontend: hasUI ? 1.5 : 0,
      backend: hasBackend ? 1.5 : 0,
      test: 1
    },
    medium: {
      product: 1.5,
      ui: hasUI ? 1 : 0,
      frontend: hasUI ? 3 : 0,
      backend: hasBackend ? 3 : 0,
      test: 1.5
    },
    complex: {
      product: 2.5,
      ui: hasUI ? 2 : 0,
      frontend: hasUI ? 5 : 0,
      backend: hasBackend ? 5 : 0,
      test: 2.5
    }
  };

  const mins = { ...(minimumMap[complexity] || minimumMap.medium) };

  if (/(第三方|对接|集成|银行|支付|企业微信|企微|短信|邮件)/.test(text)) {
    mins.product += 0.5;
    mins.backend += 1;
    mins.test += 0.5;
  }

  if (/(审批|工作流|状态|流转|任务分配|协同)/.test(text)) {
    mins.product += 0.5;
    mins.frontend += hasUI ? 0.5 : 0;
    mins.backend += hasBackend ? 1 : 0;
    mins.test += 0.5;
  }

  if (/(导入|导出|上传|下载|报表|统计|批量)/.test(text)) {
    mins.frontend += hasUI ? 0.5 : 0;
    mins.backend += hasBackend ? 0.5 : 0;
    mins.test += 0.5;
  }

  Object.keys(mins).forEach(role => {
    mins[role] = roundUpToHalfDay(mins[role]);
  });

  return mins;
}

function getMinimumTotalDays(complexity, contextText = '', roleMinimums = {}) {
  const text = String(contextText || '').toLowerCase();
  let minTotal = Object.values(roleMinimums).reduce((sum, days) => sum + days, 0);

  if (complexity === 'complex') {
    minTotal = Math.max(minTotal, 18);
  } else if (complexity === 'medium') {
    minTotal = Math.max(minTotal, 10);
  } else {
    minTotal = Math.max(minTotal, 5);
  }

  if (/(第三方|对接|集成|银行|支付|企业微信|企微)/.test(text)) {
    minTotal += 3;
  }

  if (/(审批|工作流|流程|状态流转|任务分配|多角色)/.test(text)) {
    minTotal += 2;
  }

  if (/(时间轴|关联|卡片|列表|详情|表单|弹窗|抽屉)/.test(text) && /(权限|状态|流转)/.test(text)) {
    minTotal += 2;
  }

  return roundUpToHalfDay(minTotal);
}

function getRoleWeightsForEstimation(roleMinimums = {}) {
  const baseWeights = {
    product: 0.15,
    ui: 0.15,
    frontend: 0.3,
    backend: 0.3,
    test: 0.1
  };

  const enabledRoles = Object.keys(baseWeights).filter(role => (roleMinimums[role] || 0) > 0);
  const totalWeight = enabledRoles.reduce((sum, role) => sum + baseWeights[role], 0) || 1;
  const normalized = {};

  Object.keys(baseWeights).forEach(role => {
    normalized[role] = enabledRoles.includes(role) ? baseWeights[role] / totalWeight : 0;
  });

  return normalized;
}

function roundUpToHalfDay(value) {
  const num = parseFloat(value) || 0;
  return Math.ceil(num * 2) / 2;
}

function hasEstimationChanged(before = {}, after = {}) {
  return ['product', 'ui', 'frontend', 'backend', 'test']
    .some(role => Math.abs((before[role] || 0) - (after[role] || 0)) >= 0.01);
}

function normalizeConfidence(confidence, wasAdjusted, userContext = '') {
  let normalized = parseFloat(confidence);
  if (!Number.isFinite(normalized)) normalized = 0.8;
  if (!userContext || !userContext.trim()) {
    normalized = Math.min(normalized, 0.78);
  }
  if (wasAdjusted) {
    normalized = Math.min(normalized, 0.72);
  }
  return Math.max(0.45, normalized);
}

// 获取默认角色说明
function getDefaultRoleExplanation(role, complexity) {
  const explanations = {
    product: {
      simple: '需求确认和简单PRD编写',
      medium: '需求分析、方案设计和PRD编写',
      complex: '深度需求调研、复杂方案设计和详细PRD编写'
    },
    ui: {
      simple: '简单界面设计和规范应用',
      medium: '界面设计、交互设计和设计规范制定',
      complex: '复杂界面设计、交互流程设计和设计系统维护'
    },
    frontend: {
      simple: '简单页面开发和样式实现',
      medium: '页面开发、组件开发和接口对接',
      complex: '复杂页面开发、性能优化和架构设计'
    },
    backend: {
      simple: '简单接口开发和数据处理',
      medium: '接口开发、业务逻辑实现和数据库设计',
      complex: '复杂业务逻辑、系统架构设计和高并发处理'
    },
    test: {
      simple: '基础功能测试',
      medium: '测试用例设计、功能测试和Bug验证',
      complex: '复杂测试场景设计、性能测试和自动化测试'
    }
  };
  
  return explanations[role]?.[complexity] || explanations[role]?.medium || '常规工作';
}

// 处理评估任务（异步）
async function processEstimationTask(taskId) {
  const task = estimationTasks.get(taskId);
  if (!task) return;

  task.status = 'running';
  task.updatedAt = new Date().toISOString();

  const { functions, config } = task;
  const batchSize = config?.batchSize || 5;
  const customPrompt = config?.customPrompt || '';

  try {
    // 分批处理
    for (let i = 0; i < task.totalBatches; i++) {
      // 检查是否被取消
      if (task.status === 'cancelled') {
        console.log(`[Estimation] Task ${taskId} cancelled`);
        return;
      }

      task.currentBatch = i + 1;
      const startIdx = i * batchSize;
      const batchFunctions = functions.slice(startIdx, startIdx + batchSize);

      console.log(`[Estimation] Processing batch ${i + 1}/${task.totalBatches}, functions: ${batchFunctions.length}`);

      // 构建 Prompt
      const systemPrompt = getEstimationSystemPrompt();
      const userPrompt = buildEstimationPrompt(batchFunctions, customPrompt);

      // 调用 AI
      const response = await openai.chat.completions.create({
        model: process.env.VOLCENGINE_MODEL_ID || 'doubao-pro-1.5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      const aiResponse = response.choices[0]?.message?.content || '';
      
      // 解析结果
      const batchResults = parseEstimationResponse(aiResponse, batchFunctions);
      task.results.push(...batchResults);

      // 更新进度
      task.progress = Math.round((task.results.length / functions.length) * 100);
      task.updatedAt = new Date().toISOString();

      console.log(`[Estimation] Batch ${i + 1} completed, progress: ${task.progress}%`);

      // 添加小延迟避免请求过快
      if (i < task.totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    task.status = 'completed';
    task.progress = 100;
    task.updatedAt = new Date().toISOString();

    console.log(`[Estimation] Task ${taskId} completed, total results: ${task.results.length}`);

  } catch (error) {
    console.error(`[Estimation] Task ${taskId} error:`, error);
    task.status = 'error';
    task.error = error.message;
    task.updatedAt = new Date().toISOString();
  }
}

// 获取评估 System Prompt
function getEstimationSystemPrompt() {
  return `# 软件功能人天评估专家

你是经验丰富的项目管理专家，擅长软件项目工作量评估。

## 评估标准
基于【中级人员水平】，按照 1 个人干活的标准进行评估。

### 各角色工作范围
1. **产品**: 需求沟通、方案策划、原型设计、PRD编写、评审修改
2. **UI**: 视觉设计、规范制定、评审修改、交付标注
3. **前端**: 技术方案、页面实现、交互开发、接口对接、自测修复
4. **后端**: 技术方案、数据库设计、接口开发、业务逻辑、单元测试
5. **测试**: 用例设计、功能测试、Bug验证、回归测试

## 评估原则
- 实事求是，根据功能复杂度合理评估
- 包含需求沟通、设计、开发、测试全流程
- 考虑会议、评审、沟通时间
- 复杂功能预留 10-20% 缓冲时间

## 参考标准（中级人员）
- 简单功能: 产品0.5-1天, UI0.5天, 前后端1-2天, 测试0.5-1天
- 中等功能: 产品1-2天, UI1-2天, 前后端2-4天, 测试1-2天
- 复杂功能: 产品3-5天, UI2-3天, 前后端5-10天, 测试3-5天

## 输出格式
必须严格按照以下 JSON 格式输出：
\`\`\`json
{
  "results": [
    {
      "functionName": "功能名称",
      "module": "所属模块",
      "complexity": "simple|medium|complex",
      "estimates": {
        "product": 1.5,
        "ui": 1.0,
        "frontend": 2.0,
        "backend": 2.0,
        "test": 1.0
      },
      "explanation": "评估说明"
    }
  ]
}
\`\`\``;
}

// 构建评估 Prompt
function buildEstimationPrompt(functions, customPrompt) {
  const functionsText = functions.map((f, idx) => {
    return `${idx + 1}. ${f.name}${f.description ? ` - ${f.description}` : ''}${f.module ? ` [${f.module}]` : ''}`;
  }).join('\n');

  return `${customPrompt ? `项目背景信息：\n${customPrompt}\n\n` : ''}请评估以下 ${functions.length} 个功能的人天工作量：

${functionsText}

要求：
1. 基于中级人员水平，按 1 人干活标准评估
2. 评估包含需求沟通、设计、开发、测试全流程
3. 每个功能给出复杂度判断（simple/medium/complex）
4. 严格按照 JSON 格式输出，不要添加其他内容
5. 人天数字保留 1 位小数`;
}

// 解析评估响应
function parseEstimationResponse(response, originalFunctions) {
  try {
    // 提取 JSON
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;
    const data = JSON.parse(jsonStr);

    if (!data.results || !Array.isArray(data.results)) {
      throw new Error('Invalid response format');
    }

    // 将结果与原始功能关联
    return data.results.map((result, idx) => ({
      functionId: originalFunctions[idx]?.id || `func_${idx}`,
      functionName: result.functionName || originalFunctions[idx]?.name || `功能${idx + 1}`,
      module: result.module || originalFunctions[idx]?.module || '未分类',
      complexity: result.complexity || 'medium',
      estimates: {
        product: parseFloat(result.estimates?.product) || 0,
        ui: parseFloat(result.estimates?.ui) || 0,
        frontend: parseFloat(result.estimates?.frontend) || 0,
        backend: parseFloat(result.estimates?.backend) || 0,
        test: parseFloat(result.estimates?.test) || 0
      },
      explanation: result.explanation || ''
    }));
  } catch (error) {
    console.error('Failed to parse estimation response:', error);
    // 返回默认评估结果
    return originalFunctions.map(f => ({
      functionId: f.id,
      functionName: f.name,
      module: f.module || '未分类',
      complexity: 'medium',
      estimates: { product: 1, ui: 1, frontend: 2, backend: 2, test: 1 },
      explanation: '解析失败，使用默认评估'
    }));
  }
}

// 计算评估统计
function calculateEstimationSummary(results) {
  const totalFunctions = results.length;
  const roleTotals = { product: 0, ui: 0, frontend: 0, backend: 0, test: 0 };
  const moduleTotals = {};

  results.forEach(result => {
    // 角色总计
    Object.keys(roleTotals).forEach(role => {
      roleTotals[role] += result.estimates[role] || 0;
    });

    // 模块总计
    const module = result.module || '未分类';
    if (!moduleTotals[module]) {
      moduleTotals[module] = { count: 0, days: 0 };
    }
    moduleTotals[module].count += 1;
    moduleTotals[module].days += Object.values(result.estimates).reduce((a, b) => a + b, 0);
  });

  const totalDays = Object.values(roleTotals).reduce((a, b) => a + b, 0);

  return {
    totalFunctions,
    totalDays,
    roleTotals,
    moduleTotals
  };
}

// 生成 Markdown 报告
function generateEstimationMarkdown(report) {
  const { summary, results, config } = report;
  
  let markdown = `# 人天评估报告\n\n`;
  markdown += `**评估日期**: ${new Date(report.createdAt).toLocaleString()}\n\n`;
  markdown += `**功能总数**: ${summary.totalFunctions} 个\n\n`;
  markdown += `**总人天**: ${summary.totalDays} 天\n\n`;

  markdown += `## 角色人天分布\n\n`;
  markdown += `| 角色 | 人天 |\n`;
  markdown += `|------|------|\n`;
  Object.entries(summary.roleTotals).forEach(([role, days]) => {
    const roleNames = { product: '产品', ui: 'UI', frontend: '前端', backend: '后端', test: '测试' };
    markdown += `| ${roleNames[role]} | ${days} |\n`;
  });
  markdown += `\n`;

  markdown += `## 详细评估清单\n\n`;
  
  // 按模块分组
  const moduleGroups = {};
  results.forEach(result => {
    const module = result.module || '未分类';
    if (!moduleGroups[module]) moduleGroups[module] = [];
    moduleGroups[module].push(result);
  });

  Object.entries(moduleGroups).forEach(([module, items]) => {
    markdown += `### ${module}\n\n`;
    markdown += `| 功能 | 复杂度 | 产品 | UI | 前端 | 后端 | 测试 | 小计 |\n`;
    markdown += `|------|--------|------|-----|------|------|------|------|\n`;
    
    items.forEach(item => {
      const subtotal = Object.values(item.estimates).reduce((a, b) => a + b, 0);
      const complexityLabels = { simple: '简单', medium: '中等', complex: '复杂' };
      markdown += `| ${item.functionName} | ${complexityLabels[item.complexity]} | `;
      markdown += `${item.estimates.product} | ${item.estimates.ui} | `;
      markdown += `${item.estimates.frontend} | ${item.estimates.backend} | `;
      markdown += `${item.estimates.test} | ${subtotal} |\n`;
    });
    
    markdown += `\n`;
  });

  return markdown;
}

// ============================================
// 6. 小红书智能配图功能 API
// ============================================

// 6.1 分析文案生成配图方案
app.post('/api/smart/xiaohongshu/image-plans', async (req, res) => {
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: '文案内容不能为空' });
  }

  try {
    const response = await openai.chat.completions.create({
      model: process.env.VOLCENGINE_MODEL_ID || 'doubao-pro-1.5',
      messages: [
        {
          role: 'system',
          content: `你是小红书配图专家。请根据提供的小红书文案，生成3个不同的配图方案。

每个方案需要包含：
1. title: 方案标题（简洁描述风格）
2. description: 画面描述（详细描述画面内容、构图、色彩等）
3. prompt: 英文生图提示词（用于AI生图，需要详细、专业，包含风格、光线、构图等关键词）

要求：
- 方案要多样化，覆盖不同风格（如：产品特写、场景展示、人物使用等）
- prompt必须是英文，详细且专业，适合AI图像生成
- 每个方案的prompt长度控制在200-500字符
- 返回JSON数组格式

示例输出格式：
[
  {
    "title": "产品特写风",
    "description": "精致的产品特写，突出产品质感和细节，背景简洁",
    "prompt": "Product photography, close-up shot, elegant cosmetic bottle, soft natural lighting, clean white background, high-end luxury feel, professional studio lighting, shallow depth of field, 8k quality"
  }
]`
        },
        {
          role: 'user',
          content: `请为以下小红书文案生成3个配图方案：\n\n${content.substring(0, 2000)}`
        }
      ],
      temperature: 0.8,
      max_tokens: 1500
    });

    const aiResponse = response.choices[0]?.message?.content || '';
    
    // 尝试解析JSON
    let plans = [];
    try {
      // 尝试直接解析
      plans = JSON.parse(aiResponse);
    } catch (e) {
      // 尝试从代码块中提取
      const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        plans = JSON.parse(jsonMatch[1]);
      } else {
        // 尝试提取方括号内容
        const bracketMatch = aiResponse.match(/\[[\s\S]*\]/);
        if (bracketMatch) {
          plans = JSON.parse(bracketMatch[0]);
        }
      }
    }

    // 验证结果格式
    if (!Array.isArray(plans) || plans.length === 0) {
      throw new Error('Invalid response format');
    }

    // 确保每个方案都有必要的字段
    plans = plans.slice(0, 3).map((plan, index) => ({
      id: `plan_${index + 1}`,
      title: plan.title || `方案 ${index + 1}`,
      description: plan.description || '',
      prompt: plan.prompt || ''
    }));

    res.json({ plans });
  } catch (error) {
    console.error('Generate image plans error:', error);
    // 返回默认方案
    res.json({
      plans: [
        {
          id: 'plan_1',
          title: '产品展示风',
          description: '精致的产品展示图，突出产品特点和质感',
          prompt: 'Product photography, elegant composition, soft natural lighting, clean background, professional studio quality, high-end feel, 8k resolution'
        },
        {
          id: 'plan_2',
          title: '生活场景风',
          description: '真实的生活使用场景，营造亲切感',
          prompt: 'Lifestyle photography, natural setting, warm lighting, authentic moment, cozy atmosphere, real life scenario, high quality'
        },
        {
          id: 'plan_3',
          title: '创意艺术风',
          description: '富有创意的艺术表现，吸引眼球',
          prompt: 'Creative artistic photography, unique composition, vibrant colors, artistic lighting, eye-catching design, modern aesthetic'
        }
      ],
      fallback: true
    });
  }
});

// 6.2 生成图片
app.post('/api/smart/xiaohongshu/generate-image', async (req, res) => {
  const { prompt, noteId } = req.body;

  if (!prompt || prompt.trim().length === 0) {
    return res.status(400).json({ error: '提示词不能为空' });
  }

  try {
    // 调用火山引擎生图API
    const imageResponse = await fetch('https://ark.cn-beijing.volces.com/api/v3/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 90783e84-ddc8-4bbe-be93-01c5be6cfc43'
      },
      body: JSON.stringify({
        model: 'doubao-seedream-4-5-251128',
        prompt: prompt,
        sequential_image_generation: 'disabled',
        response_format: 'url',
        size: '2K',
        stream: false,
        watermark: true
      })
    });

    if (!imageResponse.ok) {
      const errorData = await imageResponse.json();
      throw new Error(errorData.error?.message || 'Image generation failed');
    }

    const imageData = await imageResponse.json();
    
    // 提取图片URL
    let imageUrl = null;
    if (imageData.data && imageData.data.length > 0) {
      imageUrl = imageData.data[0].url;
    }

    if (!imageUrl) {
      throw new Error('No image URL in response');
    }

    // 如果有noteId，保存图片关联
    if (noteId && supabase) {
      try {
        await supabase.from('note_images').insert({
          note_id: noteId,
          image_url: imageUrl,
          prompt: prompt,
          created_at: new Date().toISOString()
        });
      } catch (e) {
        console.error('Failed to save image record:', e);
        // 不影响返回结果
      }
    }

    res.json({
      imageUrl,
      prompt,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Generate image error:', error);
    res.status(500).json({ 
      error: '图片生成失败',
      details: error.message 
    });
  }
});

// 6.3 获取笔记关联的图片
app.get('/api/smart/notes/:noteId/images', async (req, res) => {
  const { noteId } = req.params;

  if (!supabase) {
    return res.json({ images: [] });
  }

  try {
    const { data, error } = await supabase
      .from('note_images')
      .select('*')
      .eq('note_id', noteId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ images: data || [] });
  } catch (error) {
    console.error('Fetch note images error:', error);
    res.json({ images: [] });
  }
});

// ============================================
// 需求文档撰写 API
// ============================================

// 7.1 需求澄清接口
app.post('/api/smart-estimation/clarify', async (req, res) => {
  try {
    const { sessionId, productId, sourceIds, selectedFunctions, requirement, clarifications, userInput, isInit } = req.body;
    const sourceContext = await buildSmartSourceContext(productId, sourceIds);
    const selectedFunctionSummary = Array.isArray(selectedFunctions) && selectedFunctions.length > 0
      ? selectedFunctions.map(item => `- ${item.module || '未分类模块'} / ${item.name}${item.description ? `：${item.description}` : ''}`).join('\n')
      : '当前未勾选具体功能，将按资料和对话自动识别';
    const sourceNames = Array.isArray(sourceIds) && sourceIds.length > 0
      ? sourceIds.join('、')
      : '当前未勾选资料';

    if (isInit) {
      return res.json({
        response: `你好，我会按“人工判断为主，AI辅助理解”的方式帮你生成一版智能人天评估网页。\n\n你可以直接用这两种方式开始：\n- 直接告诉我要评估的功能 / 页面 / 流程\n- 或先在左侧勾选资料，再勾要评估的功能，然后告诉我“按这些功能开始评估”\n\n我会优先帮你弄清这几类信息：\n- 这次到底要评哪些功能\n- 有没有明显的页面、角色、接口、第三方系统\n- 是否偏新建、二开还是复用\n- 哪些点最容易被低估\n\n当前会话 ID：${sessionId || '未生成'}，左侧已选资料：${sourceNames}。`,
        isReady: false,
        reason: '等待用户输入要评估的范围'
      });
    }

    const systemPrompt = `${SMART_ESTIMATION_SKILL_GUIDE}

当前阶段：信息收集与评估前梳理
你的任务：
- 用自然对话帮助用户补齐评估所需信息
- 判断现在是否已经足够生成一版结构化评估结果
- 如果还不够，只追问最关键的 1-3 个问题
- 如果已经够了，明确告诉用户“可以开始生成”

当前资料上下文：
${sourceContext || '暂无额外资料'}

左侧已勾选待评功能：
${selectedFunctionSummary}

当前需求主线：
${requirement || '暂无'}

历史问答：
${(clarifications || []).map(item => `用户：${item?.question || ''}\nAI：${item?.answer || ''}`).join('\n') || '暂无'}

用户最新输入：
${userInput || ''}

判断为“可以开始生成”的最低标准：
- 至少能大致识别要评估的功能、页面或模块
- 能看出主要业务流程或核心目标
- 对新建 / 二开 / 复用至少有初步判断，或者能明确写入假设

请严格输出 JSON：
{
  "response": "给用户看的中文回复",
  "isReady": true,
  "reason": "为什么已经可以/还不可以开始生成",
  "detectedFunctions": ["功能1", "功能2"],
  "missingInformation": ["仍建议补充的信息"]
}`;

    const client = getClient('doubao');
    const modelId = getModelId('doubao');
    const completion = await client.chat.completions.create({
      model: modelId,
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.4,
      response_format: { type: 'json_object' }
    });

    const parsed = parseModelJson(completion.choices[0]?.message?.content || '', {});

    res.json({
      response: parsed.response || '我已经记录下你的需求。你可以继续补充功能边界、二开复用判断和接口依赖；如果觉得信息差不多了，也可以直接让我开始生成。',
      isReady: Boolean(parsed.isReady),
      reason: parsed.reason || '',
      detectedFunctions: ensureStringArray(parsed.detectedFunctions),
      missingInformation: ensureStringArray(parsed.missingInformation)
    });
  } catch (error) {
    console.error('Smart estimation clarify error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/smart-estimation/generate-report', async (req, res) => {
  try {
    const { productId, sourceIds, requirement, clarifications, selectedFunctions } = req.body;
    const sourceContext = await buildSmartSourceContext(productId, sourceIds);
    const selectedFunctionSummary = Array.isArray(selectedFunctions) && selectedFunctions.length > 0
      ? selectedFunctions.map(item => `- ${item.module || '未分类模块'} / ${item.name}${item.description ? `：${item.description}` : ''}`).join('\n')
      : '未显式勾选具体功能，请结合资料与对话识别';

    const systemPrompt = `${SMART_ESTIMATION_SKILL_GUIDE}

你现在要输出一版“方便人工查阅和继续确认”的结构化人天评估报告。

输入信息：
需求描述：
${requirement || '暂无'}

补充对话：
${(clarifications || []).map(item => `用户：${item?.question || ''}\nAI：${item?.answer || ''}`).join('\n') || '暂无'}

左侧已勾选待评功能：
${selectedFunctionSummary}

参考资料：
${sourceContext || '暂无额外资料'}

输出要求：
- 先判断需求本质在做什么
- 拆出功能明细，每条功能都要覆盖：涉及页面、接口、低估点、复用判断、建议补充背景
- 对每个角色给出工作量和理由
- 总量宁可保守，不要乐观压缩
- 如果信息不足，必须写进 assumptions 或 missingBackground，不能假装确定
- 保持网页阅读友好，输出内容短句化、结构化、便于前端直接渲染

请严格输出 JSON：
{
  "title": "评估标题",
  "overview": {
    "essence": "这批需求本质在做什么",
    "scopeSummary": "本次评估覆盖什么，不覆盖什么",
      "scopeLabel": "例如 8 个功能项 / 3 个页面流程",
    "complexity": "simple | medium | complex | high",
    "confidence": 0.72,
    "totalDays": 26.5,
    "scheduleSuggestion": "并行排期建议",
    "reuseJudgement": "像新建 / 偏二开 / 偏复用",
    "sourceDigest": ["资料吸收点 1", "资料吸收点 2"],
    "summary": "1-2 句结论"
  },
  "roleBreakdown": [
    {
      "role": "product",
      "days": 3.5,
      "rationale": "为什么是这些工作量",
      "workItems": ["工作项 1", "工作项 2"]
    }
  ],
  "functions": [
    {
      "id": "function_1",
      "name": "功能名称",
      "module": "所属模块",
      "description": "原始需求的简明转述",
      "essence": "这条需求本质在做什么",
      "complexity": "simple | medium | complex | high",
      "confidence": 0.7,
      "totalDays": 6.5,
      "roleDays": {
        "product": 1,
        "ui": 0.5,
        "frontend": 2,
        "backend": 2,
        "qa": 1
      },
      "pages": ["涉及页面或交互容器"],
      "interfaces": ["涉及接口、表、第三方系统"],
      "risks": ["可能低估点 1", "可能低估点 2"],
      "reuseHint": "像二开/复用的判断",
      "backgroundQuestions": ["仍建议补充的背景问题"]
    }
  ],
  "risks": ["全局风险 1", "全局风险 2"],
  "assumptions": ["估算假设 1", "估算假设 2"],
  "missingBackground": ["仍需确认的信息 1", "仍需确认的信息 2"],
  "recommendations": ["下一步建议 1", "下一步建议 2"]
}`;

    const client = getClient('doubao');
    const modelId = getModelId('doubao');
    const completion = await client.chat.completions.create({
      model: modelId,
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.45,
      response_format: { type: 'json_object' }
    });

    const parsed = parseModelJson(completion.choices[0]?.message?.content || '', {});
    const report = sanitizeSmartEstimationReport(parsed);
    res.json({ report });
  } catch (error) {
    console.error('Smart estimation generate report error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/smart-estimation/revise-report', async (req, res) => {
  try {
    const { productId, sourceIds, requirement, clarifications, selectedFunctions, report, instruction } = req.body;
    const sourceContext = await buildSmartSourceContext(productId, sourceIds);
    const selectedFunctionSummary = Array.isArray(selectedFunctions) && selectedFunctions.length > 0
      ? selectedFunctions.map(item => `- ${item.module || '未分类模块'} / ${item.name}${item.description ? `：${item.description}` : ''}`).join('\n')
      : '未显式勾选具体功能';

    const systemPrompt = `${SMART_ESTIMATION_SKILL_GUIDE}

你正在根据用户的新指令修订一份智能人天评估报告。

当前需求：
${requirement || '暂无'}

补充对话：
${(clarifications || []).map(item => `用户：${item?.question || ''}\nAI：${item?.answer || ''}`).join('\n') || '暂无'}

左侧已勾选待评功能：
${selectedFunctionSummary}

资料参考：
${sourceContext || '暂无额外资料'}

当前报告 JSON：
${JSON.stringify(report || {}, null, 2)}

用户新的修订要求：
${instruction || ''}

修订要求：
- 保持 JSON 结构完全兼容原报告
- 只改动与用户要求相关的内容，但要保持整体口径一致
- 如果用户要求改变交付口径、增加风险、调整二开复用判断，要同步影响相关功能项和角色总量
- 如果用户要求不充分，也可以在 assumptions / missingBackground 中补充说明

请严格输出 JSON，结构与当前报告一致。`;

    const client = getClient('doubao');
    const modelId = getModelId('doubao');
    const completion = await client.chat.completions.create({
      model: modelId,
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.35,
      response_format: { type: 'json_object' }
    });

    const parsed = parseModelJson(completion.choices[0]?.message?.content || '', {});
    const nextReport = sanitizeSmartEstimationReport(parsed);
    res.json({ report: nextReport });
  } catch (error) {
    console.error('Smart estimation revise report error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/requirement-doc/clarify', async (req, res) => {
  try {
    const { productId, sourceIds, requirement, clarifications, userInput, isInit } = req.body;
    const sourceContext = await buildSmartSourceContext(productId, sourceIds);
    const templateInfo = await deriveRequirementTemplateInfo(productId, sourceIds);
    const standardTemplateApproved = hasStandardTemplateConsent(
      requirement,
      userInput,
      (clarifications || []).flatMap(item => [item?.question, item?.answer])
    );
    const templateReferenceText = templateInfo.templateSourceNames.length > 0
      ? templateInfo.templateSourceNames.join('、')
      : '未提供';

    // 如果是初始化请求，直接返回引导语
    if (isInit) {
      return res.json({
        response: templateInfo.hasTemplateReference
          ? `您好！我是您的需求分析助手。我会先帮你判断需求是否清晰、合理，再结合左侧资料把需求文档一步步写出来。

接下来我会按这个节奏推进：先澄清关键问题 -> 确认大纲 -> 分章节撰写初稿。

你可以先告诉我以下任意信息，我会边理解边补齐业务闭环：
- 您希望解决什么业务问题？
- 目标用户群体是谁？
- 快乐路径是什么？
- 有没有必须考虑的异常情况、权限限制或数据流转？

我已识别到可参考的模板/历史文档：${templateReferenceText}。后续我会优先继承它们的结构、颗粒度和写作习惯。`
          : `您好！我是您的需求分析助手。我会先判断需求是否清晰合理，再按“先澄清、后提纲、再分块撰写”的方式和你一起完成这份文档。

开始生成大纲前，请先在左侧选择或上传至少一份“需求文档模板”或“历史需求文档”作为参考格式。
如果你暂时没有模板，也可以直接回复“按行业标准模板生成”，我会按通用 PRD 结构继续。

你也可以同时继续告诉我：
- 您希望解决什么业务问题？
- 目标用户群体是谁？
- 您期望实现的核心价值是什么？
- 快乐路径、异常流程、上下游系统或关键数据流向分别是什么？`,
        isComplete: false,
        needsTemplate: !templateInfo.hasTemplateReference,
        usingStandardTemplate: false
      });
    }

    const systemPrompt = `${REQUIREMENT_ANALYZER_SKILL_GUIDE}

当前阶段：需求收集与分析
目标：与用户进行自然、专业的交流，引导用户补齐需求，并判断现在是否已经满足“生成大纲”的前置条件。

阶段目标与判断标准：
- 先做合理性与可行性评估：判断该需求是否存在明显的业务漏洞、合规风险、安全问题、技术不成立或商业价值过弱的问题
- 只有在业务背景、目标用户、核心流程、关键功能、异常/边界、关键数据流向已经基本清楚时，才允许进入“生成大纲”
- 若用户已给的资料足够，优先基于资料归纳，不要为了追问而追问
- 若缺少模板资料，必须先确认用户是否接受“按行业标准模板生成”

交流风格：
1. 专业、友好、像真正的资深产品顾问
2. 提问聚焦，不机械，不一次抛太多无关问题
3. 优先追问最阻塞成文的 1-3 个关键问题
4. 如果需求明显不合理、违法、危险或严重自相矛盾，要明确指出问题，并建议更合理的改法
5. 除非用户明确要求，否则不要索要邮箱、手机号、联系人等行政信息
6. 参考历史文档时，只学习其结构、颗粒度和写作风格，不要照搬联系人、邮件抄送、审批流、会议纪要、日期签署等行政字段

当前已收集的信息：
${requirement ? `原始需求：${requirement}` : '暂无'}
${clarifications && clarifications.length > 0 ? 
  `\n历史对话：\n${clarifications.map(c => `用户：${c.question}\n产品专家：${c.answer}`).join('\n')}` : ''}
${sourceContext ? `\n用户已选参考资料：\n${sourceContext}` : '\n用户未提供额外参考资料'}
${templateInfo.hasTemplateReference
  ? `\n已识别到可复用的模板/历史文档：${templateReferenceText}`
  : standardTemplateApproved
    ? '\n当前未提供模板资料，但用户已同意按行业标准模板生成'
    : '\n当前尚未识别到需求文档模板或历史 PRD，请先询问用户是否按行业标准模板生成'}

用户最新输入：
${userInput}

请根据以上信息，给出专业的回应：
- 如果需求明显不合理或高风险，response 必须先指出问题，再给出建议的调整方向；此时 isComplete 必须为 false
- 如果信息不足，自然地引导用户提供最关键的补充信息，优先围绕快乐路径、异常流程、系统交互、数据来源/去向、权限边界来追问
- 如果信息足够，明确告诉用户“信息已足够，可以开始生成大纲”，并简要说明将参考哪些资料风格
- 保持对话流畅，避免机械提问
- 当资料里已经包含足够上下文时，优先利用资料，不要忽略它们
- 如果资料已经足够支撑起草大纲，应直接进入下一步，不要继续追问无关信息
- 如果缺少模板资料且用户尚未同意使用行业标准模板，请优先询问“是否按行业标准模板生成”，而不是直接卡住

请严格输出 JSON：
{
  "response": "给用户看的中文回复",
  "isComplete": true,
  "reason": "为什么现在可以/不可以进入大纲阶段",
  "needsTemplate": false,
  "usingStandardTemplate": false
}`;

    const client = getClient('doubao');
    const modelId = getModelId('doubao');

    const completion = await client.chat.completions.create({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt }
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' }
    });

    const parsed = parseModelJson(completion.choices[0]?.message?.content || '', {});
    const usingStandardTemplate = !templateInfo.hasTemplateReference && standardTemplateApproved;
    const needsTemplate = !templateInfo.hasTemplateReference && !usingStandardTemplate && (parsed.needsTemplate ?? true);

    res.json({ 
      response: parsed.response || (needsTemplate
        ? '我已经理解了你的需求。在开始生成大纲前，请先在左侧选择一份需求文档模板或历史 PRD；如果你暂时没有模板，也可以直接回复“按行业标准模板生成”。'
        : '我已经理解了你的需求，请继续补充你最在意的业务场景或核心功能。'),
      isComplete: needsTemplate ? false : Boolean(parsed.isComplete),
      reason: parsed.reason || '',
      needsTemplate,
      usingStandardTemplate
    });

  } catch (error) {
    console.error('Requirement clarification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 7.2 分析模板结构
app.post('/api/requirement-doc/analyze-template', async (req, res) => {
  try {
    const { templateContent } = req.body;
    const structure = await analyzeRequirementTemplateStructure(templateContent);

    res.json({ structure });

  } catch (error) {
    console.error('Template analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 7.3 生成大纲
app.post('/api/requirement-doc/generate-outline', async (req, res) => {
  try {
    const { productId, sourceIds, requirement, clarifications, templateStructure } = req.body;
    const sourceContext = await buildSmartSourceContext(productId, sourceIds);
    const templateInfo = await deriveRequirementTemplateInfo(productId, sourceIds);
    const standardTemplateApproved = hasStandardTemplateConsent(
      requirement,
      (clarifications || []).flatMap(item => [item?.question, item?.answer])
    );
    const effectiveTemplateStructure =
      templateStructure ||
      templateInfo.templateStructure ||
      (standardTemplateApproved ? getIndustryStandardTemplateStructure() : null);

    if (!effectiveTemplateStructure?.sections?.length) {
      return res.status(400).json({ error: '生成大纲前请先提供需求文档模板，或明确同意按行业标准模板生成' });
    }

    const systemPrompt = `${REQUIREMENT_ANALYZER_SKILL_GUIDE}

你是一位资深产品经理，正在根据用户需求、参考资料和历史文档风格生成需求文档大纲。

用户需求：
${requirement}

${clarifications && clarifications.length > 0 ? 
  `澄清对话：\n${clarifications.map(c => `Q: ${c.question}\nA: ${c.answer}`).join('\n')}` : ''}

${sourceContext ? `参考资料（可能包含历史 PRD、模板、业务说明、流程稿）：
${sourceContext}` : '无额外参考资料'}

模板结构参考：
${JSON.stringify(effectiveTemplateStructure, null, 2)}

请生成需求文档大纲，要求：
1. 先确保大纲服务于“当前需求”的真实业务闭环，而不是只把历史模板改标题
2. 如果参考资料里存在历史需求文档或模板，请优先继承它们的章节层级、写作习惯和表达风格
3. 大纲必须体现“先提纲、后分块撰写”的思路，让后续每章都可以独立展开
4. 不要把历史文档中的联系人、邮箱、审批节点、抄送对象、会议纪要尾注等行政信息写进大纲
5. 每个章节要有明确的子章节
6. 标注哪些章节需要流程图
7. 标注哪些章节需要原型图
8. 大纲顺序要符合真实的文档写作顺序，便于后续逐章写作
9. 每个章节都要补充“本章目标”和“写作要点”，方便用户在确认大纲阶段就看懂后续会写什么
10. 功能性需求部分必须以“页面流程/页面流转”为主线组织，而不是只按抽象模块堆砌
11. 对于每个页面型章节，默认需要包含：页面名称、页面定位、页面原型草图、界面元素、交互动作、后台逻辑/数据流转、边界与异常
12. 如果存在多个页面，请按用户真实使用顺序排列，例如：入口页 -> 列表页 -> 详情页 -> 创建/编辑页 -> 辅助弹窗/配置页
13. 页面型章节必须明确写出会拆成哪些页面；每个页面、弹窗、抽屉、配置面板都要单独成段并单独画原型，不能整章只给一个总原型
14. 页面型章节的“写作要点”里要提前说明该页面会采用统一的 ASCII 线框原型模板，并围绕原型中的区域展开功能描述
15. 非页面章节也要体现需求分析的视角，例如业务目标、成功标准、数据规则、权限边界、待确认事项
16. 如果当前信息仍存在未决问题，不要假装完整，应把未决点放进合适章节或“待确认事项”
17. 严禁在大纲里加入颜色、字号、圆角、阴影、设计风格等 UI 视觉细节
18. 如果用户或资料没有明确提供数值，不要在大纲中暗示具体配额、时长、性能指标或百分比目标；只能写“待确认的性能指标/容量约束/配额规则”
19. 如果原型只是“页面布局描述”而不是 ASCII 线框图，则视为不合格；后续章节写作必须重新输出该页面原型

输出JSON格式：
{
  "documentTitle": "需求文档标题",
  "summary": "2-4 句总结整份需求文档的组织思路、模板继承方式和重点范围",
  "sections": [
    {
      "title": "章节标题",
      "subsections": ["子章节1", "子章节2"],
      "needFlowchart": true,
      "needPrototype": false,
      "objective": "本章要解决什么问题",
      "writingPoints": ["写作要点1", "写作要点2"]
    }
  ]
}`;

    const client = getClient('doubao');
    const modelId = getModelId('doubao');

    const completion = await client.chat.completions.create({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const outline = sanitizeOutline(parseModelJson(
      completion.choices[0]?.message?.content || '',
      { documentTitle: '需求文档', summary: '', sections: [] }
    ));

    res.json({ outline });

  } catch (error) {
    console.error('Outline generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 7.4 拆解任务
app.post('/api/requirement-doc/generate-tasks', async (req, res) => {
  try {
    const { outline } = req.body;

    const tasks = outline.sections.map((section, index) => ({
      section: `${index + 1}. ${section.title}`,
      status: 'pending',
      content: ''
    }));

    res.json({ tasks });

  } catch (error) {
    console.error('Task generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 7.5 撰写章节（流式）
app.post('/api/requirement-doc/write-section', async (req, res) => {
  try {
    const { productId, sourceIds, requirement, clarifications, outline, currentSection, completedSections } = req.body;
    const sourceContext = await buildSmartSourceContext(productId, sourceIds);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const systemPrompt = `${REQUIREMENT_ANALYZER_SKILL_GUIDE}

你是一位资深产品经理，正在撰写需求文档的某个章节。

整体需求：
${requirement}

${clarifications && clarifications.length > 0 ? 
  `澄清对话：\n${clarifications.map(c => `Q: ${c.question}\nA: ${c.answer}`).join('\n')}` : ''}

${sourceContext ? `参考资料与历史文档风格：
${sourceContext}` : '无额外参考资料'}

当前章节：
${currentSection}

${completedSections && completedSections.length > 0 ?
  `已完成的章节：\n${completedSections.join('\n\n')}` : ''}

请撰写当前章节的内容，要求：
1. 内容详实，逻辑清晰，使用 Markdown 格式
2. 如果参考资料中存在历史需求文档，请继承其写作格式、章节组织方式、语言习惯；如与当前需求冲突，以当前需求为准
3. 不要复用历史文档中的联系人、邮箱、审批节点、会议纪要、发送说明等与当前需求无关的行政内容
4. 不要写颜色、字号、圆角、阴影、玻璃拟态等 UI 风格词，只写功能、布局位置、交互、数据、规则和状态
5. 如果章节涉及具体页面、弹窗、列表页、详情页、工作台、配置页等页面型内容，必须严格按照“页面名称 -> 页面定位 -> 页面原型草图 -> 界面元素 -> 交互动作 -> 后台逻辑与数据流转 -> 异常与边界 -> 权限与约束”的顺序展开
6. 功能性需求必须以页面流程为主线，逐一描述页面中的功能逻辑，而不是只列抽象模块
7. 每个页面型内容都要说明：页面目标、页面入口、界面区域、字段/列表/卡片展示内容、触发动作、前置校验、状态变化、后端处理、返回结果、权限或边界条件
8. “页面原型草图”必须使用 ASCII 线框图，放在 \`\`\`text 代码块中，不要省略代码块；如果是弹窗、抽屉、表单页，也继续沿用模板，只是把不需要的区块标注为“无”或“本页不涉及”
9. 原型中的区域命名要与后文“界面元素 / 交互动作”中的小节名称一一对应，例如原型里写“筛选区/版本列表区/右侧详情区”，后文也按这几个区块展开
10. 如果章节不是页面型章节（例如背景、目标、术语、验收标准），仍然保持结构化写法，但不要强行插入原型；这类章节也要覆盖业务闭环、边界、风险与待确认项
11. 如果当前章节下包含多个功能需求点、页面、模块或子场景，必须对每一个页面或子功能点分别输出独立的 ASCII 页面原型草图，再输出对应逻辑，不能整章只给一个总原型然后直接描述多个需求
12. 任何页面型功能需求描述前都必须先出现对应的原型块。顺序必须是：页面名称/功能需求标题 -> 页面定位 -> 页面原型草图 -> 界面元素 -> 交互动作 -> 后台逻辑与数据流转 -> 异常与边界
13. 如果信息不足但又必须继续推进，使用“待确认”明确写出，不要擅自虚构关键规则
14. 如果需要输出 Mermaid 图，必须只使用标准 Mermaid 语法和 ASCII 标点：引号使用英文双引号 "，冒号使用半角 :，箭头使用 --> 等标准写法；禁止使用中文引号、全角冒号、中文箭头或解释文字混入图代码
15. Mermaid 图代码本身必须是纯代码，不要在图代码里混入自然语言说明，不要输出无效的 JSON 片段或列表项目冒充图代码
16. 原型优先采用下面的标准模板，根据页面实际内容替换占位词：
\`\`\`text
${REQUIREMENT_DOC_ASCII_TEMPLATE}
\`\`\`
17. 如果用户提供了参考原型图或类似图二这种线框图风格，请尽量按该风格输出更接近页面草图的 ASCII 线框图，而不是简单布局说明
18. 如果输出的“原型”只是项目符号、自然语言或“页面布局描述”，则视为不合格，必须重新输出该页面原型草图
19. 如果用户或资料没有明确给出具体数字，禁止你自行补充诸如文件大小上限、文件数量上限、保留时长、响应时延、最大并发、分页大小、问题数上限、成功率或百分比目标；这类内容必须写成“待确认”

输出格式：
## 章节标题

### 页面名称
明确写出当前页面名称

### 页面定位
一句话说明本页面承载的目标

### 页面原型草图
\`\`\`text
${REQUIREMENT_DOC_ASCII_TEMPLATE}
\`\`\`

### 界面元素
#### 1. 区域/元素名称
- 展示内容：
- 所在位置：
- 数据来源：
- 显示/隐藏条件：
- 字段规则：

### 交互动作
#### 1. 动作名称
- 触发方式：
- 前置校验：
- 处理流程：
- 结果反馈：

### 后台逻辑与数据流转
- 数据来源：
- 数据去向：
- 后端处理：
- 状态流转：

### 异常与边界
- 异常场景：
- 边界条件：
- 待确认：

如果当前章节包含多个页面或多个功能需求点，请使用下面的重复结构依次展开，每个页面都必须完整出现一次：

#### 页面X：XXX
##### 页面定位
- 本页面目标：
##### 页面原型草图
\`\`\`text
${REQUIREMENT_DOC_ASCII_TEMPLATE}
\`\`\`
##### 界面元素
- 展示内容：
- 数据来源：
- 字段规则：
##### 交互动作
- 触发方式：
- 前置校验：
- 结果反馈：
##### 后台逻辑与数据流转
- 数据来源：
- 数据去向：
- 后端处理：
##### 异常与边界
- 异常场景：
- 边界条件：
- 待确认：

### 交互说明
- 页面切换：
- 按钮反馈：
- 空态/加载态/异常态：

### 权限与约束
- 权限要求：
- 数据限制：

如果章节需要流程图，请在对应位置补充：
\`\`\`mermaid
graph TD
    A[开始] --> B[结束]
\`\`\``;

    const client = getClient('doubao');
    const modelId = getModelId('doubao');

    const stream = await client.chat.completions.create({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt }
      ],
      temperature: 0.7,
      stream: true
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('Section writing error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// 7.6 修订文档章节
app.post('/api/requirement-doc/revise-document', async (req, res) => {
  try {
    const {
      productId,
      sourceIds,
      requirement,
      clarifications,
      document,
      instruction,
      quoteText,
      targetSectionIndex,
      targetSectionTitle
    } = req.body;
    const sourceContext = await buildSmartSourceContext(productId, sourceIds);

    if (!document?.sections || !Array.isArray(document.sections) || document.sections.length === 0) {
      return res.status(400).json({ error: '缺少文档内容，无法修订' });
    }

    if (!instruction || !String(instruction).trim()) {
      return res.status(400).json({ error: '缺少修改指令' });
    }

    const sectionList = document.sections
      .map((section, index) => `${index}. ${section.title}`)
      .join('\n');

    const systemPrompt = `${REQUIREMENT_ANALYZER_SKILL_GUIDE}

你是一位资深产品经理，正在根据用户反馈修订需求文档。

你的任务：
1. 理解用户的修改意图
2. 找到最相关的章节进行修订
3. 返回修订后的完整章节内容
4. 用一句话总结这次修改做了什么
5. 先判断用户修改请求是否合理、可行、与整体需求一致；如果请求明显不合理、违规、危险或与当前需求冲突，应尽量保留原章节主结构，在 summary 中明确说明原因
6. 如果参考资料中存在历史需求文档或模板，请尽量保持风格一致
7. 保持专业产品文档语气，但不要引入联系人、邮箱、审批流、抄送对象等行政字段，除非用户明确要求
8. 不要写颜色、字号、圆角、阴影、设计风格等 UI 细节
9. 如果目标章节是页面型章节，继续保持“页面名称 -> 页面定位 -> 页面原型草图 -> 界面元素 -> 交互动作 -> 后台逻辑与数据流转 -> 异常与边界 -> 权限与约束”的结构
10. 如果用户调整了页面功能，优先同步更新页面原型草图、界面元素、交互动作、后台逻辑与数据流转、交互说明，保持一致
11. 页面型章节中的原型必须继续使用 ASCII 线框图，不能改成自由文本、项目符号或图片说明
12. 如果 updatedSection.flowchart 不为空，它必须是纯 Mermaid 代码，且只使用标准 Mermaid 语法和 ASCII 标点；禁止中文引号、全角冒号、中文箭头、解释性前缀或代码块围栏
13. 如果目标章节里包含多个页面、功能需求点或子模块，必须保证每个页面/功能点都遵守“先页面原型草图、后逻辑”的顺序，不能只保留一个章节级总原型
14. 如果信息仍不完整但需要继续修订，允许在章节内保留“待确认”项，不能强行虚构关键规则
15. 如果用户没有明确要求，也没有资料支持，禁止新增具体配额、时长、性能阈值、容量限制、百分比目标等硬性数字；需要时请改写为“待确认”
16. 如果用户明确要求“把原型画出来”，则必须输出接近线框图的 ASCII 原型，而不是“原型描述”或“页面布局描述”

输出必须是 JSON 对象，格式如下：
{
  "targetSectionIndex": 0,
  "summary": "一句话总结修改内容",
  "updatedSection": {
    "title": "章节标题",
    "content": "修订后的完整章节内容，保留 Markdown 格式",
    "flowchart": "如果章节里需要 Mermaid 流程图则返回图代码，否则返回空字符串",
    "prototype": "如果章节里需要页面原型补充内容则返回文本，否则返回空字符串"
  }
}

要求：
1. 仅修改最相关的一个章节
2. content 必须是完整章节内容，不要只返回片段
3. 不要捏造与整体需求冲突的新功能
4. targetSectionIndex 必须是有效章节索引
5. 页面型章节仍然应优先按页面流程描述，并先写页面名称、页面定位、页面原型草图，再写界面元素、交互动作、后台逻辑与数据流转
6. 页面原型草图必须保留标准模板结构：页面标题、主要操作、说明/状态区、筛选区、主内容区、底部/弹窗入口
7. 如果返回 flowchart，必须确保 Mermaid 可直接渲染，不要输出代码块围栏，不要输出中文标点版本的语法
8. 如果返回的 content 中存在多个页面或功能需求点，每个页面/功能需求点都必须先有自己的 ASCII 页面原型草图，再开始描述界面元素与功能逻辑
9. 如果用户修改请求不成立，仍需返回最相关章节的完整内容，并在 summary 中明确说明“未按原要求改动的原因”`;

    const userPrompt = `整体需求：
${requirement || '暂无'}

澄清记录：
${clarifications && clarifications.length > 0
  ? clarifications.map(item => `Q: ${item.question}\nA: ${item.answer}`).join('\n')
  : '暂无'}

${sourceContext ? `参考资料与历史文档风格：
${sourceContext}` : '无额外参考资料'}

当前文档章节：
${sectionList}

当前文档全文：
${JSON.stringify(document, null, 2)}

用户修改指令：
${instruction}

${typeof targetSectionIndex === 'number'
  ? `用户明确引用的章节索引：${targetSectionIndex}\n用户明确引用的章节标题：${targetSectionTitle || '未提供'}`
  : '用户没有明确指定章节，请你自行判断最相关章节'}

${quoteText ? `用户引用的原文片段：${quoteText}` : '用户未引用具体原文片段'}`;

    const client = getClient('doubao');
    const modelId = getModelId('doubao');

    const completion = await client.chat.completions.create({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    const normalizedIndex = Number.isInteger(result.targetSectionIndex)
      ? result.targetSectionIndex
      : targetSectionIndex;

    if (!Number.isInteger(normalizedIndex) || normalizedIndex < 0 || normalizedIndex >= document.sections.length) {
      return res.status(500).json({ error: '模型未返回有效的章节索引' });
    }

    res.json({
      targetSectionIndex: normalizedIndex,
      summary: result.summary || '已根据你的反馈更新文档内容。',
      updatedSection: {
        title: result.updatedSection?.title || document.sections[normalizedIndex]?.title || targetSectionTitle || '未命名章节',
        content: result.updatedSection?.content || document.sections[normalizedIndex]?.content || '',
        flowchart: result.updatedSection?.flowchart || '',
        prototype: result.updatedSection?.prototype || ''
      }
    });
  } catch (error) {
    console.error('Requirement revision error:', error);
    res.status(500).json({ error: error.message });
  }
});

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

// Export the Express API
module.exports = app;
