import { supabase, hasSupabaseConfig } from '../lib/supabaseClient.js'
import { translateAuthError } from './authErrors.js'
import { MOCK_STYLE_DATA } from './skills/core/mockStyleData.js'

// Default System Persona
const DEFAULT_PERSONA = {
  id: 'default-persona-公众号深度洞察文章',
  user_id: 'mock-user-1',
  name: '公众号深度洞察文章',
  description: '技术解读+商业洞察+人文思考，专业通俗化风格',
  role_definition: '你是一个擅长深度洞察的公众号作者，风格融合了技术解读、商业分析和人文思考。',
  style_dna: {
      overview: MOCK_STYLE_DATA.overview,
      methodology: MOCK_STYLE_DATA.methodology,
      mindset: MOCK_STYLE_DATA.mindset,
      expression: MOCK_STYLE_DATA.expression,
      habits: MOCK_STYLE_DATA.habits,
      signature: MOCK_STYLE_DATA.signature,
      // Legacy fields for compatibility
      tone: '专业通俗化',
      pacing: '张弛有度',
      vocabulary_complexity: '中偏高',
      sentence_structure: '长短结合',
      keywords_detected: ['说实话', '你看', '但是', '逻辑']
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

// Mock Data Storage (Memory)
const mockStore = {
  users: [{ id: 'mock-user-1', email: 'demo@example.com', password: 'password', user_metadata: { username: 'Demo User' } }],
  products: [
    { id: 'mock-prod-1', owner_id: 'mock-user-1', name: '示例产品：智能记账', description: '一款基于 AI 的智能记账工具，自动识别票据。', created_at: new Date().toISOString() }
  ],
  sellingPoints: [],
  features: [],
  docs: [],
  faqs: [],
  stories: [],
  featureCards: [],
  messaging: [],
  contentItems: [],
  ideationSessions: [],
  ideationMessages: [],
  ideationTopics: [],
  personas: [DEFAULT_PERSONA]
}

// Load mock data from localStorage
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const savedProducts = localStorage.getItem('mock_products')
    if (savedProducts) {
      mockStore.products = JSON.parse(savedProducts)
    }
    const savedContentItems = localStorage.getItem('mock_contentItems')
    if (savedContentItems) {
      mockStore.contentItems = JSON.parse(savedContentItems)
    }
    const savedPersonas = localStorage.getItem('mock_personas')
    if (savedPersonas) {
      let loadedPersonas = JSON.parse(savedPersonas)
      // Filter out old default persona to ensure we use the latest code definition
      loadedPersonas = loadedPersonas.filter(p => p.id !== DEFAULT_PERSONA.id)
      // Add the latest default persona
      loadedPersonas.unshift(DEFAULT_PERSONA)
      mockStore.personas = loadedPersonas
    }
  }
} catch (e) {
  console.error('Failed to load mock data from localStorage', e)
}

// Helper to generate ID
const genId = () => Math.random().toString(36).substring(2, 9)

let CACHED_USER = null
if (supabase) {
  try {
    supabase.auth.onAuthStateChange((_event, session) => {
      CACHED_USER = session?.user || null
    })
  } catch { void 0 }
}

export async function register({ username, email, password, invitationCode }) {
  // Use backend API for registration to enforce invitation code check
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, inviteCode: invitationCode })
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || '注册失败')
  }

  // Update local cache if successful
  if (data.user) {
      CACHED_USER = data.user
      // Update mock store if in mock mode to allow immediate login
      if (!hasSupabaseConfig()) {
          // Ensure password matches for mock login
          data.user.password = password 
          mockStore.users.push(data.user)
      }
  }

  return { user: data.user }
}

export async function login({ login, password }) {
  if (!hasSupabaseConfig()) {
    // Mock Login
    const user = mockStore.users.find(u => u.email === login || u.user_metadata.username === login)
    if (user && user.password === password) {
        CACHED_USER = user
        return { user, token: 'mock-token', username: user.user_metadata.username }
    }
    // Allow demo login
    if (login === 'demo' && password === 'demo') {
        const demoUser = mockStore.users[0]
        CACHED_USER = demoUser
        return { user: demoUser, token: 'mock-token', username: 'Demo User' }
    }
    throw new Error('用户不存在或密码错误 (Mock Mode: try demo/demo)')
  }
  let email = login
  if (!login.includes('@')) {
    try {
      const resp = await fetch(`/api/resolve-user?q=${encodeURIComponent(login)}`)
      const ct = resp.headers.get('content-type') || ''
      if (resp.ok && ct.includes('application/json')) {
        const j = await resp.json()
        email = j?.data?.email || login
      }
    } catch { void 0 }
  }
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if ((error.message || '').toLowerCase().includes('email not confirmed')) {
        try {
          const r = await fetch(`/api/admin-confirm?email=${encodeURIComponent(email)}`)
          if (r.ok) {
            const retry = await supabase.auth.signInWithPassword({ email, password })
            if (retry.error) throw new Error(translateAuthError(retry.error.message))
            const user = retry.data.user
            const token = retry.data.session?.access_token || ''
            const username = user?.user_metadata?.username || user?.email || login
            return { user, token, username }
          }
        } catch { void 0 }
      }
      throw new Error(translateAuthError(error.message))
    }
    const user = data.user
    const token = data.session?.access_token || ''
    const username = user?.user_metadata?.username || user?.email || login
    return { user, token, username }
  } catch (e) {
    const msg = String(e?.message || e || '')
    const isNetwork = /Failed to fetch|TypeError/i.test(msg)
    if (isNetwork) {
      const user = mockStore.users.find(u => u.email === email || u.user_metadata.username === login)
      if (user && user.password === password) {
        CACHED_USER = user
        return { user, token: 'mock-token', username: user.user_metadata.username }
      }
      if ((login === 'demo' || email === 'demo@example.com') && password === 'demo') {
        const demoUser = mockStore.users[0]
        CACHED_USER = demoUser
        return { user: demoUser, token: 'mock-token', username: 'Demo User' }
      }
      throw new Error('网络不可用，且未命中本地账号 (尝试 demo/demo)')
    }
    throw e
  }
}

export async function getUser() {
  if (!hasSupabaseConfig()) {
      return CACHED_USER || mockStore.users[0] // Default to demo user in mock mode
  }
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const sessUser = sessionData?.session?.user
    if (sessUser) {
      CACHED_USER = sessUser
      return sessUser
    }
  } catch { void 0 }
  if (CACHED_USER) return CACHED_USER
  const { data } = await supabase.auth.getUser()
  CACHED_USER = data.user || null
  return CACHED_USER
}

export async function updateUser(updates) {
  if (!hasSupabaseConfig()) {
      if (CACHED_USER) {
          const newMeta = { ...CACHED_USER.user_metadata, ...updates }
          CACHED_USER.user_metadata = newMeta
          // Update mock store
          const idx = mockStore.users.findIndex(u => u.id === CACHED_USER.id)
          if (idx >= 0) {
              mockStore.users[idx].user_metadata = newMeta
          }
          return { user: CACHED_USER }
      }
      return { user: null }
  }
  const { data, error } = await supabase.auth.updateUser({
    data: updates
  })
  if (error) throw new Error(error.message)
  return { user: data.user }
}

// 获取产品详情（包含扩展资料）
export async function getProductDetails(productId, fields = '*') {
  if (!hasSupabaseConfig()) {
      const resp = await fetch(`/api/products/${productId}`)
      if (!resp.ok) return null
      const json = await resp.json()
      return json.data
  }
  const { data, error } = await supabase
    .from('products')
    .select(fields)
    .eq('id', productId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

// 更新产品资料
export async function updateProduct(productId, updates) {
  if (!hasSupabaseConfig()) {
      const resp = await fetch(`/api/products/${productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
      })
      if (!resp.ok) throw new Error('Failed to update product')
      const json = await resp.json()
      return json.data
  }
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', productId)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}


// 获取产品卖点
export async function getProductSellingPoints(productId) {
  if (!hasSupabaseConfig()) {
      return mockStore.sellingPoints.filter(sp => sp.product_id === productId).sort((a,b) => b.priority - a.priority)
  }
  const { data, error } = await supabase
    .from('product_selling_points')
    .select('*')
    .eq('product_id', productId)
    .order('priority', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

// 添加产品卖点
export async function addProductSellingPoint(productId, sellingPoint) {
  if (!hasSupabaseConfig()) {
      const newSP = { id: genId(), product_id: productId, ...sellingPoint }
      mockStore.sellingPoints.push(newSP)
      return newSP
  }
  const { title, description, priority = 1, category = 'general' } = sellingPoint
  const { data, error } = await supabase
    .from('product_selling_points')
    .insert({
      product_id: productId,
      title,
      description,
      priority,
      category
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

// 更新产品卖点
export async function updateProductSellingPoint(sellingPointId, updates) {
  if (!hasSupabaseConfig()) {
      const idx = mockStore.sellingPoints.findIndex(sp => sp.id === sellingPointId)
      if (idx > -1) {
          mockStore.sellingPoints[idx] = { ...mockStore.sellingPoints[idx], ...updates }
          return mockStore.sellingPoints[idx]
      }
      throw new Error('Selling point not found')
  }
  const { data, error } = await supabase
    .from('product_selling_points')
    .update(updates)
    .eq('id', sellingPointId)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

// 删除产品卖点
export async function deleteProductSellingPoint(sellingPointId) {
  if (!hasSupabaseConfig()) {
      mockStore.sellingPoints = mockStore.sellingPoints.filter(sp => sp.id !== sellingPointId)
      return true
  }
  const { error } = await supabase
    .from('product_selling_points')
    .delete()
    .eq('id', sellingPointId)
  if (error) throw new Error(error.message)
  return true
}

// 获取产品特性
export async function getProductFeatures(productId) {
  if (!hasSupabaseConfig()) {
      return mockStore.features.filter(f => f.product_id === productId)
  }
  const { data, error } = await supabase
    .from('product_features')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

// 添加产品特性
export async function addProductFeature(productId, feature) {
  if (!hasSupabaseConfig()) {
      const newF = { id: genId(), product_id: productId, created_at: new Date().toISOString(), ...feature }
      mockStore.features.push(newF)
      return newF
  }
  const { name, description, feature_type = 'core', status = 'active', parent_id = null } = feature
  const { data, error } = await supabase
    .from('product_features')
    .insert({
      product_id: productId,
      name,
      description,
      feature_type,
      status,
      parent_id
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

// 更新产品特性
export async function updateProductFeature(featureId, updates) {
  if (!hasSupabaseConfig()) {
      const idx = mockStore.features.findIndex(f => f.id === featureId)
      if (idx > -1) {
          mockStore.features[idx] = { ...mockStore.features[idx], ...updates }
          return mockStore.features[idx]
      }
      throw new Error('Feature not found')
  }
  const { data, error } = await supabase
    .from('product_features')
    .update(updates)
    .eq('id', featureId)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

// 删除产品特性
export async function deleteProductFeature(featureId) {
  if (!hasSupabaseConfig()) {
      mockStore.features = mockStore.features.filter(f => f.id !== featureId)
      return true
  }
  const { error } = await supabase
    .from('product_features')
    .delete()
    .eq('id', featureId)
  if (error) throw new Error(error.message)
  return true
}

export async function getProducts() {
  if (!hasSupabaseConfig()) {
      const user = await getUser()
      const uname = user?.user_metadata?.username || user?.email || ''
      const uid = user?.id || ''
      const qs = new URLSearchParams({ user: uname, uid, t: String(Date.now()) }).toString()
      const resp = await fetch('/api/products?' + qs)
      if (!resp.ok) throw new Error('Failed to fetch products')
      const json = await resp.json()
      return json.data || []
  }
  const user = await getUser()
  if (!user) return []
  console.time('api:getProducts')
  try {
    const { data: ownerProducts } = await supabase
      .from('products')
      .select('id,name,logo_url,created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
    const merged = [...(ownerProducts || [])]
    console.timeEnd('api:getProducts')
    return merged
  } catch (e) {
    console.timeEnd('api:getProducts')
    const { data, error } = await supabase
      .from('products')
      .select('id,name,logo_url,created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data || []
  }
}

export async function addProduct(product) {
  if (!hasSupabaseConfig()) {
      const user = await getUser()
      const payload = {
          name: product.name,
          description: product.description || '',
          website_url: product.website || '',
          logo_url: product.logo || '',
          owner_id: user?.id || 'mock-user-1',
          owner_info: {
            username: user?.user_metadata?.username || user?.email || 'Unknown',
            email: user?.email || '',
            full_name: user?.user_metadata?.full_name || user?.user_metadata?.username || ''
          }
      }
      const resp = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      })
      if (!resp.ok) throw new Error('Failed to create product')
      const json = await resp.json()
      
      // Auto-generate default persona for this product (Mock Mode)
      try {
        const { id, created_at, updated_at, description, ...personaTemplate } = DEFAULT_PERSONA
        const newPersona = {
          ...personaTemplate,
          // description: `${description} [${json.data.name}]`, // 数据库无 description 字段，暂不写入
          name: `${personaTemplate.name} - ${json.data.name}`,
          role_definition: `${personaTemplate.role_definition} (适用于产品: ${json.data.name})`
        }
        await createPersona(newPersona)
      } catch (e) {
        console.warn('Failed to auto-generate default persona (mock):', e)
      }

      return json.data
  }
  const user = await getUser()
  if (!user) throw new Error('未登录')
  const insert = {
    owner_id: user.id,
    name: product.name,
    description: product.description || '',
    website_url: product.website || '',
    logo_url: product.logo || '',
  }
  const { data, error } = await supabase.from('products').insert(insert).select('*').single()
  if (error) throw new Error(error.message)
  try {
    await supabase.from('product_members').insert({ product_id: data.id, user_id: user.id, role: 'owner' })
  } catch { /* ignore unique violation */ }

  // Auto-generate default persona for this product
  try {
    const { id, created_at, updated_at, description, ...personaTemplate } = DEFAULT_PERSONA
    const newPersona = {
      ...personaTemplate,
      // description: `${description} [${product.name}]`, // 数据库无 description 字段，暂不写入
      name: `${personaTemplate.name} - ${product.name}`,
      role_definition: `${personaTemplate.role_definition} (适用于产品: ${product.name})`
    }
    // Attempt to link to product if the schema supports it (will be ignored if not supported in mock, might fail in supabase if column missing)
    // To be safe against column missing errors in Supabase, we'll just create it as user-level first.
    // If we really want to link, we'd need schema migration.
    // For now, distinguishing via description is a safe fallback.
    await createPersona(newPersona)
  } catch (e) {
    console.warn('Failed to auto-generate default persona for product:', e)
  }

  return data
}


 

// 上传用户头像到 Supabase 存储
export async function uploadUserAvatar(file, userId) {
  if (!hasSupabaseConfig()) {
    // Mock Mode: return base64 for preview
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ url: reader.result });
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  }

  const ext = (file.name.split('.').pop() || 'png').toLowerCase()
  const safeExt = ['png','jpg','jpeg','gif','webp','svg'].includes(ext) ? ext : 'png'
  // Use 'user-avatars' folder structure if possible, or just flat
  const path = `avatars/${userId}/${Date.now()}.${safeExt}`
  
  let bucket = 'avatars'
  
  // Try uploading
  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type })
  
  if (uploadError) {
    const msg = String(uploadError.message || '').toLowerCase()
    const missing = msg.includes('bucket not found') || msg.includes('does not exist') || msg.includes('not found')
    
    if (missing) {
      bucket = 'logos'
      const { error: fallbackErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type })
      if (fallbackErr) {
        const fbMsg = String(fallbackErr.message || '').toLowerCase()
        const fbMissing = fbMsg.includes('bucket not found') || fbMsg.includes('does not exist')
        if (fbMissing) {
          bucket = 'screenshots'
          try {
            await fetch('/api/init-storage').catch(()=>{})
          } catch { /* noop */ }
          const { error: shotErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type })
          if (shotErr) throw new Error(shotErr.message)
        } else {
          throw new Error(fallbackErr.message)
        }
      }
    } else {
      throw new Error(uploadError.message)
    }
  }

  let url = null
  if (bucket === 'avatars' || bucket === 'logos') {
    const { data: pub } = await supabase.storage.from(bucket).getPublicUrl(path)
    url = pub?.publicUrl || null
    // Fallback to signed URL if public URL seems invalid or we want to be sure
    if (!url) {
        const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 30) // 30 days
        url = signed?.signedUrl || null
    }
  } else {
      const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 30)
      url = signed?.signedUrl || null
  }
  
  return { path, url }
}

// 上传产品 Logo 到 Supabase 存储，并返回可访问的 URL（优先公共链接，其次签名链接）
export async function uploadProductLogo(file, productId) {
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
  const ext = (file.name.split('.').pop() || 'png').toLowerCase()
  const safeExt = ['png','jpg','jpeg','gif','webp','svg'].includes(ext) ? ext : 'png'
  const path = `${productId}/logo/${Date.now()}.${safeExt}`
  let bucket = 'logos'
  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type })
  if (uploadError) {
    const msg = String(uploadError.message || '')
    const lower = msg.toLowerCase()
    const missing = lower.includes('bucket not found') || lower.includes('does not exist')
    if (missing) {
      bucket = 'screenshots'
      const { error: fallbackErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type })
      if (fallbackErr) throw new Error(fallbackErr.message)
    } else {
      throw new Error(uploadError.message)
    }
  }
  let url = null
  if (bucket === 'logos') {
    const { data: pub } = await supabase.storage.from(bucket).getPublicUrl(path)
    url = pub?.publicUrl || null
    if (!url) {
      const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 7)
      url = signed?.signedUrl || null
    }
  } else {
    // 对非公开桶（回退）统一使用签名链接，避免 401 导致预览裂图
    const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 7)
    url = signed?.signedUrl || null
  }
  return { path, url }
}

export async function listScreenshots(productId, competitorId) {
  if (!hasSupabaseConfig()) return []
  let query = supabase.from('screenshots').select('*').eq('product_id', productId)
  if (competitorId) query = query.eq('competitor_id', competitorId)
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  const results = data || []
  const signed = await Promise.all(
    results.map(async (row) => {
      const { data: s } = await supabase.storage.from('screenshots').createSignedUrl(row.storage_path, 60 * 60)
      return { ...row, signedUrl: s?.signedUrl || null }
    })
  )
  return signed
}

export async function deleteScreenshot(id) {
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
  const { data: row, error: getErr } = await supabase.from('screenshots').select('*').eq('id', id).single()
  if (getErr) throw new Error(getErr.message)
  if (row?.storage_path) {
    await supabase.storage.from('screenshots').remove([row.storage_path])
  }
  const { error } = await supabase.from('screenshots').delete().eq('id', id)
  if (error) throw new Error(error.message)
  return true
}

export async function getContentItems(productId, { platform, from, to, minimal = false } = {}) {
  if (!hasSupabaseConfig()) {
    let items = mockStore.contentItems.filter(i => i.product_id === productId)
    if (platform) items = items.filter(i => i.platform === platform)
    if (from) items = items.filter(i => i.schedule_at >= from)
    if (to) items = items.filter(i => i.schedule_at <= to)
    return items.sort((a, b) => new Date(a.schedule_at) - new Date(b.schedule_at))
  }
  console.time('api:getContentItems')
  const fields = minimal ? 'id, product_id, platform, title, schedule_at, status, topic_title, summary, created_at' : '*'
  let q = supabase.from('content_items').select(fields).eq('product_id', productId)
  if (platform) q = q.eq('platform', platform)
  if (from) q = q.gte('schedule_at', from)
  if (to) q = q.lte('schedule_at', to)
  const { data, error } = await q.order('schedule_at', { ascending: true })
  console.timeEnd('api:getContentItems')
  if (error) throw new Error(error.message)
  return data || []
}

export async function getContentItem(id) {
  if (!hasSupabaseConfig()) {
    return mockStore.contentItems.find(i => i.id === id) || null
  }
  const { data, error } = await supabase
    .from('content_items')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

function extractSummary(html, length = 200) {
  if (!html) return ''
  try {
    const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    return text.slice(0, length) + (text.length > length ? '...' : '')
  } catch {
    return ''
  }
}

export async function createContentItem(payload) {
  if (!hasSupabaseConfig()) {
    const summary = extractSummary(payload.body)
    const newItem = {
      id: genId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...payload,
      summary
    }
    mockStore.contentItems.push(newItem)
    try { localStorage.setItem('mock_contentItems', JSON.stringify(mockStore.contentItems)) } catch (e) { console.error(e) }
    return newItem
  }
  const { product_id, platform, title = '', body = '', schedule_at, status, topic_title = null } = payload
  console.time('api:createContentItem')
  const summary = extractSummary(body)
  const insert = { product_id, platform, title, body, schedule_at, status, topic_title, summary }
  let data, error
  try {
    const res = await supabase.from('content_items').insert(insert).select('*').single()
    data = res.data; error = res.error
  } catch (e) {
    error = e
  }
  console.timeEnd('api:createContentItem')
  if (error) {
    const msg = String(error.message || error)
    const isColumnError = /column\s+"?summary"?/i.test(msg) || /does not exist/i.test(msg)
    
    if (isColumnError) {
      // 如果 summary 字段不存在，尝试回退
      console.warn('数据库缺少 summary 字段，尝试降级写入')
      delete insert.summary
      try {
        const res = await supabase.from('content_items').insert(insert).select('*').single()
        return res.data
      } catch (retryError) {
        // 如果还是失败，可能是 topic_title 的问题，继续原来的回退逻辑
        const hasTopicError = /topic_title/i.test(String(retryError.message))
        const isSchemaCache = /schema cache/i.test(String(retryError.message))
        const isTopicColumnMissing = /column\s+"?topic_title"?/i.test(String(retryError.message)) || /does not exist/i.test(String(retryError.message))
        
        if (hasTopicError || isSchemaCache || isTopicColumnMissing) {
          const fallbackTitle = title || (topic_title || '')
          const fallback = { product_id, platform, title: fallbackTitle, body, schedule_at, status }
          const { data: d2, error: e2 } = await supabase.from('content_items').insert(fallback).select('*').single()
          if (e2) throw new Error(e2.message)
          return d2
        }
        throw new Error(retryError.message)
      }
    }

    // 原有的回退逻辑
    const hasTopicError = /topic_title/i.test(msg)
    const isSchemaCache = /schema cache/i.test(msg)
    const isTopicColumnMissing = /column\s+"?topic_title"?/i.test(msg) || /does not exist/i.test(msg)
    if (hasTopicError || isSchemaCache || isTopicColumnMissing) {
      const fallbackTitle = title || (topic_title || '')
      const fallback = { product_id, platform, title: fallbackTitle, body, schedule_at, status }
      const { data: d2, error: e2 } = await supabase.from('content_items').insert(fallback).select('*').single()
      if (e2) throw new Error(e2.message)
      return d2
    }
    throw new Error(msg)
  }
  return data
}

export async function updateContentItem(id, updates) {
  if (!hasSupabaseConfig()) {
    const index = mockStore.contentItems.findIndex(i => i.id === id)
    if (index === -1) throw new Error('Item not found')
    
    const updatesCopy = { ...updates }
    if (typeof updatesCopy.body !== 'undefined') {
      updatesCopy.summary = extractSummary(updatesCopy.body)
    }
    
    const updated = {
      ...mockStore.contentItems[index],
      ...updatesCopy,
      updated_at: new Date().toISOString()
    }
    mockStore.contentItems[index] = updated
    try { localStorage.setItem('mock_contentItems', JSON.stringify(mockStore.contentItems)) } catch (e) { console.error(e) }
    return updated
  }
  console.time('api:updateContentItem')
  
  const clone = { ...updates }
  if (typeof clone.body !== 'undefined') {
    clone.summary = extractSummary(clone.body)
  }

  let data, error
  try {
    const res = await supabase.from('content_items').update(clone).eq('id', id).select('*').single()
    data = res.data; error = res.error
  } catch (e) {
    error = e
  }
  console.timeEnd('api:updateContentItem')
  if (error) {
    const msg = String(error.message || error)
    const isColumnError = /column\s+"?summary"?/i.test(msg) || /does not exist/i.test(msg)
    
    if (isColumnError) {
      // 如果 summary 字段不存在，尝试回退
      console.warn('数据库缺少 summary 字段，尝试降级更新')
      delete clone.summary
      try {
        const res = await supabase.from('content_items').update(clone).eq('id', id).select('*').single()
        return res.data
      } catch (retryError) {
         // 继续原来的回退逻辑
         const hasTopicError = /topic_title/i.test(String(retryError.message))
         const isSchemaCache = /schema cache/i.test(String(retryError.message))
         const isTopicColumnMissing = /column\s+"?topic_title"?/i.test(String(retryError.message)) || /does not exist/i.test(String(retryError.message))
         if ((clone && Object.prototype.hasOwnProperty.call(clone, 'topic_title')) && (hasTopicError || isSchemaCache || isTopicColumnMissing)) {
            const clone2 = { ...clone }
            delete clone2.topic_title
            if (typeof clone.topic_title !== 'undefined') {
              clone2.title = clone2.title || clone.topic_title || ''
            }
            const { data: d2, error: e2 } = await supabase.from('content_items').update(clone2).eq('id', id).select('*').single()
            if (e2) throw new Error(e2.message)
            return d2
          }
         throw new Error(retryError.message)
      }
    }

    // 原有的回退逻辑
    const hasTopicError = /topic_title/i.test(msg)
    const isSchemaCache = /schema cache/i.test(msg)
    const isColumnMissing = /column\s+"?topic_title"?/i.test(msg) || /does not exist/i.test(msg)
    if ((clone && Object.prototype.hasOwnProperty.call(clone, 'topic_title')) && (hasTopicError || isSchemaCache || isColumnMissing)) {
      const clone2 = { ...clone }
      delete clone2.topic_title
      if (typeof clone.topic_title !== 'undefined') {
        clone2.title = clone2.title || clone.topic_title || ''
      }
      const { data: d2, error: e2 } = await supabase.from('content_items').update(clone2).eq('id', id).select('*').single()
      if (e2) throw new Error(e2.message)
      return d2
    }
    throw new Error(msg)
  }
  return data
}

export async function deleteContentItem(id) {
  if (!hasSupabaseConfig()) {
    mockStore.contentItems = mockStore.contentItems.filter(i => i.id !== id)
    try { localStorage.setItem('mock_contentItems', JSON.stringify(mockStore.contentItems)) } catch (e) { console.error(e) }
    return true
  }
  const { error } = await supabase.from('content_items').delete().eq('id', id)
  if (error) throw new Error(error.message)
  return true
}

// 产品知识库（文档）
export async function listProductDocs(productId) {
  if (!hasSupabaseConfig()) return []
  const { data, error } = await supabase
    .from('product_docs')
    .select('*')
    .eq('product_id', productId)
    .order('order', { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

export async function addProductDoc(productId, doc) {
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
  const { title, doc_type, url, tags = [], order = 0 } = doc
  const { data, error } = await supabase
    .from('product_docs')
    .insert({ product_id: productId, title, doc_type, url, tags, order })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateProductDoc(docId, updates) {
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
  const { data, error } = await supabase
    .from('product_docs')
    .update(updates)
    .eq('id', docId)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteProductDoc(docId) {
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
  const { error } = await supabase
    .from('product_docs')
    .delete()
    .eq('id', docId)
  if (error) throw new Error(error.message)
  return true
}

// 产品常见问题（FAQ）
export async function listProductFaqs(productId) {
  if (!hasSupabaseConfig()) return []
  const { data, error } = await supabase
    .from('product_faqs')
    .select('*')
    .eq('product_id', productId)
    .order('order', { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

export async function addProductFaq(productId, faq) {
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
  const { question, answer, category = 'general', order = 0 } = faq
  const { data, error } = await supabase
    .from('product_faqs')
    .insert({ product_id: productId, question, answer, category, order })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateProductFaq(faqId, updates) {
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
  const { data, error } = await supabase
    .from('product_faqs')
    .update(updates)
    .eq('id', faqId)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteProductFaq(faqId) {
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
  const { error } = await supabase
    .from('product_faqs')
    .delete()
    .eq('id', faqId)
  if (error) throw new Error(error.message)
  return true
}

// --- User Stories ---
export async function getProductStories(productId) {
  if (!hasSupabaseConfig()) return []
  const { data, error } = await supabase
    .from('product_stories')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

export async function addProductStory(productId, story) {
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
  const { data, error } = await supabase
    .from('product_stories')
    .insert({ product_id: productId, ...story })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateProductStory(id, updates) {
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
  const { data, error } = await supabase
    .from('product_stories')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteProductStory(id) {
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
  const { error } = await supabase
    .from('product_stories')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
  return true
}

// --- Feature Cards ---
export async function getProductFeatureCards(productId) {
  if (!hasSupabaseConfig()) return []
  const { data, error } = await supabase
    .from('product_feature_cards')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

export async function addProductFeatureCard(productId, card) {
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
  const { data, error } = await supabase
    .from('product_feature_cards')
    .insert({ product_id: productId, ...card })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateProductFeatureCard(id, updates) {
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
  const { data, error } = await supabase
    .from('product_feature_cards')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteProductFeatureCard(id) {
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
  const { error } = await supabase
    .from('product_feature_cards')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
  return true
}

// --- Product Messaging ---
export async function getProductMessaging(productId) {
  if (!hasSupabaseConfig()) return []
  const { data, error } = await supabase
    .from('product_messaging')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

export async function addProductMessaging(productId, msg) {
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
  const { data, error } = await supabase
    .from('product_messaging')
    .insert({ product_id: productId, ...msg })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateProductMessaging(id, updates) {
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
  const { data, error } = await supabase
    .from('product_messaging')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteProductMessaging(id) {
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
  const { error } = await supabase
    .from('product_messaging')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
  return true
}

export async function acceptInvitation(token, userInfo) {
  const resp = await fetch(`/api/invitations/${token}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userInfo)
  })
  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({}))
    throw new Error(errorData.message || '接受邀请失败')
  }
  return resp.json()
}

// --- Idea Incubator APIs ---

export async function getIdeas(ownerId) {
  const params = new URLSearchParams();
  if (ownerId) params.append('owner_id', ownerId);
  const response = await fetch(`/api/ideas?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch ideas');
  const { data } = await response.json();
  return data || [];
}

export async function getIdea(id) {
  const response = await fetch(`/api/ideas/${id}`);
  if (!response.ok) throw new Error('Failed to fetch idea');
  const { data } = await response.json();
  return data;
}

export async function createIdea(ideaData) {
  const response = await fetch('/api/ideas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ideaData)
  });
  if (!response.ok) throw new Error('Failed to create idea');
  const { data } = await response.json();
  return data;
}

export async function updateIdea(id, updates) {
  const response = await fetch(`/api/ideas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!response.ok) throw new Error('Failed to update idea');
  const { data } = await response.json();
  return data;
}

export async function deleteIdea(id) {
  const response = await fetch(`/api/ideas/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete idea');
  return true;
}

export async function chatWithIdea(id, message, context = {}) {
  const response = await fetch(`/api/ideas/${id}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context })
  });
  if (!response.ok) throw new Error('Failed to chat with idea');
  return await response.json(); // Returns { reply, extracted_info }
}

export async function convertIdeaToProduct(id, productData) {
  const response = await fetch(`/api/ideas/${id}/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData)
  });
  if (!response.ok) throw new Error('Failed to convert idea');
  return await response.json(); // Returns { productId }
}

// --- Ideation Conference Room APIs ---

// 1. Sessions
export async function getIdeationSessions() {
  if (!hasSupabaseConfig()) {
    const user = await getUser();
    return mockStore.ideationSessions.filter(s => s.user_id === user.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  const { data, error } = await supabase
    .from('ideation_sessions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createIdeationSession(sessionData) {
  const user = await getUser();
  if (!hasSupabaseConfig()) {
    const newSession = {
      id: genId(),
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      title: '新策划',
      ...sessionData
    };
    mockStore.ideationSessions.push(newSession);
    return newSession;
  }
  const { data, error } = await supabase
    .from('ideation_sessions')
    .insert({
      user_id: user.id,
      ...sessionData
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateIdeationSession(id, updates) {
  if (!hasSupabaseConfig()) {
    const idx = mockStore.ideationSessions.findIndex(s => s.id === id);
    if (idx > -1) {
      mockStore.ideationSessions[idx] = { ...mockStore.ideationSessions[idx], ...updates, updated_at: new Date().toISOString() };
      return mockStore.ideationSessions[idx];
    }
    throw new Error('Session not found');
  }
  const { data, error } = await supabase
    .from('ideation_sessions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteIdeationSession(id) {
  if (!hasSupabaseConfig()) {
    mockStore.ideationSessions = mockStore.ideationSessions.filter(s => s.id !== id);
    mockStore.ideationMessages = mockStore.ideationMessages.filter(m => m.session_id !== id);
    mockStore.ideationTopics = mockStore.ideationTopics.filter(t => t.session_id !== id);
    return true;
  }
  const { error } = await supabase
    .from('ideation_sessions')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}

// 2. Messages
export async function getIdeationMessages(sessionId) {
  if (!hasSupabaseConfig()) {
    return mockStore.ideationMessages.filter(m => m.session_id === sessionId).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }
  const { data, error } = await supabase
    .from('ideation_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function addIdeationMessage(messageData) {
  if (!hasSupabaseConfig()) {
    const newMessage = {
      id: genId(),
      created_at: new Date().toISOString(),
      ...messageData
    };
    mockStore.ideationMessages.push(newMessage);
    return newMessage;
  }
  const { data, error } = await supabase
    .from('ideation_messages')
    .insert(messageData)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// 3. Topics
export async function getIdeationTopics(sessionId) {
  if (!hasSupabaseConfig()) {
    return mockStore.ideationTopics.filter(t => t.session_id === sessionId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  const { data, error } = await supabase
    .from('ideation_topics')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createIdeationTopic(topicData) {
  if (!hasSupabaseConfig()) {
    const newTopic = {
      id: genId(),
      created_at: new Date().toISOString(),
      status: 'pending',
      ...topicData
    };
    mockStore.ideationTopics.push(newTopic);
    return newTopic;
  }
  const { data, error } = await supabase
    .from('ideation_topics')
    .insert(topicData)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateIdeationTopic(id, updates) {
  if (!hasSupabaseConfig()) {
    const idx = mockStore.ideationTopics.findIndex(t => t.id === id);
    if (idx > -1) {
      mockStore.ideationTopics[idx] = { ...mockStore.ideationTopics[idx], ...updates };
      return mockStore.ideationTopics[idx];
    }
    throw new Error('Topic not found');
  }
  const { data, error } = await supabase
    .from('ideation_topics')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// 4. Chat with Agent (Proxy to /api/agents/test)
export async function chatWithAgent({ system_prompt, user_message, model_config }) {
  const response = await fetch('/api/agents/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system_prompt, user_message, model_config })
  });
  
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Agent request failed');
  }
  
  return await response.json(); // { reply: "..." }
}

// 5. Research with Agent (Zhuowei)
export async function researchWithAgent(query) {
  const response = await fetch('/api/agents/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Research request failed');
  }
  
  return await response.json(); // { report: "...", sources: [] }
}

// --- Personas (MACC) ---
export async function getPersonas() {
  if (!hasSupabaseConfig()) {
    // Ensure default persona is always present and up-to-date in memory
    let currentPersonas = mockStore.personas || []
    
    // Check if default persona exists (by ID)
    const defaultIndex = currentPersonas.findIndex(p => p.id === DEFAULT_PERSONA.id)
    
    if (defaultIndex === -1) {
      // If not found, add to the beginning
      currentPersonas = [DEFAULT_PERSONA, ...currentPersonas]
    } else {
      // If found, update it to ensure we have the latest style data
      currentPersonas[defaultIndex] = DEFAULT_PERSONA
    }
    
    // Update store
    mockStore.personas = currentPersonas
    
    return mockStore.personas
  }
  const { data, error } = await supabase
    .from('personas')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)

  // Auto-seed default persona if missing (regardless of whether other personas exist)
  let personas = data || []
  
  // Deduplicate default personas if multiple exist (keep the oldest one)
  if (DEFAULT_PERSONA) {
    const defaultPersonas = personas.filter(p => p.name === DEFAULT_PERSONA.name)
    if (defaultPersonas.length > 1) {
      // Sort by created_at ascending (oldest first)
      defaultPersonas.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      
      // Keep the first one, mark others for removal from display (and ideally DB)
      const toKeep = defaultPersonas[0]
      const toRemoveIds = defaultPersonas.slice(1).map(p => p.id)
      
      // Filter list for return
      personas = personas.filter(p => p.name !== DEFAULT_PERSONA.name || p.id === toKeep.id)
      
      // Async clean up duplicates in DB
      try {
        supabase.from('personas').delete().in('id', toRemoveIds).then(({ error }) => {
          if (error) console.warn('Failed to cleanup duplicate personas:', error)
          else console.log('Cleaned up duplicate personas:', toRemoveIds)
        })
      } catch (e) { /* ignore */ }
    }
    
    const hasDefault = personas.some(p => p.name === DEFAULT_PERSONA.name)
    
    if (!hasDefault) {
      try {
        const user = await getUser()
        if (user) {
          const { id, created_at, updated_at, user_id, ...template } = DEFAULT_PERSONA
          // Sanitize template to remove any fields not in DB schema (like description if it was there)
          const { description, ...safeTemplate } = template
          
          const newPersona = { ...safeTemplate }
          
          // Use createPersona to handle DB insertion and sanitization
          const seeded = await createPersona(newPersona)
          
          // Add to the list to return immediately
          personas.unshift(seeded)
        }
      } catch (seedErr) {
        console.warn('Failed to auto-seed default persona:', seedErr)
      }
    }
  }

  return personas
}

export async function createPersona(persona) {
  if (!hasSupabaseConfig()) {
    const newPersona = {
      id: genId(),
      created_at: new Date().toISOString(),
      style_dna: {},
      is_active: true,
      ...persona
    }
    mockStore.personas.push(newPersona)
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('mock_personas', JSON.stringify(mockStore.personas))
    }
    return newPersona
  }
  
  const user = await getUser()
  if (!user) throw new Error('未登录')

  // Sanitize persona object: remove description if present, ensure other fields are valid
  const { description, ...safePersona } = persona

  const { data, error } = await supabase
    .from('personas')
    .insert({
      ...safePersona,
      user_id: user.id
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updatePersona(id, updates) {
  if (!hasSupabaseConfig()) {
    const idx = mockStore.personas.findIndex(p => p.id === id)
    if (idx === -1) throw new Error('Persona not found')
    mockStore.personas[idx] = { ...mockStore.personas[idx], ...updates }
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('mock_personas', JSON.stringify(mockStore.personas))
    }
    return mockStore.personas[idx]
  }
  
  // Sanitize updates
  const { description, ...safeUpdates } = updates

  const { data, error } = await supabase
    .from('personas')
    .update(safeUpdates)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}
