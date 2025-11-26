import { supabase, hasSupabaseConfig } from '../lib/supabaseClient'

let CACHED_USER = null
if (supabase) {
  try {
    supabase.auth.onAuthStateChange((_event, session) => {
      CACHED_USER = session?.user || null
    })
  } catch { void 0 }
}

export async function register({ username, email, password }) {
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  })
  if (error) throw new Error(error.message)
  return { user: data.user }
}

export async function login({ login, password }) {
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
  let email = login
  if (!login.includes('@')) {
    try {
      const resp = await fetch(`/api/resolve-user?q=${encodeURIComponent(login)}`)
      const ct = resp.headers.get('content-type') || ''
      if (resp.ok && ct.includes('application/json')) {
        const j = await resp.json()
        email = j?.data?.email || login
      }
    } catch {
      // 本地开发环境无服务端函数时直接跳过解析
    }
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    if ((error.message || '').toLowerCase().includes('email not confirmed')) {
      try {
        const r = await fetch(`/api/admin-confirm?email=${encodeURIComponent(email)}`)
        if (r.ok) {
          const retry = await supabase.auth.signInWithPassword({ email, password })
          if (retry.error) throw new Error(retry.error.message)
          const user = retry.data.user
          const token = retry.data.session?.access_token || ''
          const username = user?.user_metadata?.username || user?.email || login
          return { user, token, username }
        }
      } catch { void 0 }
    }
    throw new Error(error.message)
  }
  const user = data.user
  const token = data.session?.access_token || ''
  const username = user?.user_metadata?.username || user?.email || login
  return { user, token, username }
}

export async function getUser() {
  if (!hasSupabaseConfig()) return null
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

// 获取产品详情（包含扩展资料）
export async function getProductDetails(productId) {
  if (!hasSupabaseConfig()) return null
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single()
  if (error) throw new Error(error.message)
  return data
}

// 更新产品资料
export async function updateProduct(productId, updates) {
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
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
  if (!hasSupabaseConfig()) return []
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
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
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
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
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
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
  const { error } = await supabase
    .from('product_selling_points')
    .delete()
    .eq('id', sellingPointId)
  if (error) throw new Error(error.message)
  return true
}

// 获取产品特性
export async function getProductFeatures(productId) {
  if (!hasSupabaseConfig()) return []
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
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
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
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
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
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
  const { error } = await supabase
    .from('product_features')
    .delete()
    .eq('id', featureId)
  if (error) throw new Error(error.message)
  return true
}

export async function getProducts() {
  if (!hasSupabaseConfig()) return []
  const user = await getUser()
  if (!user) return []
  console.time('api:getProducts')
  const { data, error } = await supabase
    .from('products')
    .select('id,name,logo_url,created_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
  console.timeEnd('api:getProducts')
  if (error) throw new Error(error.message)
  return data || []
}

export async function addProduct(product) {
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
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
  return data
}

export async function getCompetitors(productId) {
  if (!hasSupabaseConfig()) return []
  console.time('api:getCompetitors')
  const { data, error } = await supabase
    .from('competitors')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
  console.timeEnd('api:getCompetitors')
  if (error) throw new Error(error.message)
  return data || []
}

export async function addCompetitor(productId, competitor) {
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
  const insert = {
    product_id: productId,
    name: competitor.name,
    slogan: competitor.slogan,
    description: competitor.description,
    website_url: competitor.website || '',
    documentation_url: competitor.helpDocUrl || '',
    logo_url: competitor.logo || '',
    main_customers: Array.isArray(competitor.mainCustomers) ? competitor.mainCustomers.join(',') : '',
  }
  const { data, error } = await supabase.from('competitors').insert(insert).select('*').single()
  if (error) throw new Error(error.message)
  return data
}

export async function uploadScreenshot(file, { productId, competitorId }) {
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
  const ext = file.name.split('.').pop() || 'png'
  const path = `${productId}/${competitorId}/${Date.now()}.${ext}`
  const { error: uploadError } = await supabase.storage.from('screenshots').upload(path, file, { upsert: false })
  if (uploadError) throw new Error(uploadError.message)
  const { data: signed } = await supabase.storage.from('screenshots').createSignedUrl(path, 60 * 60)
  const insert = { product_id: productId, competitor_id: competitorId, storage_path: path }
  const { data, error } = await supabase.from('screenshots').insert(insert).select('*').single()
  if (error) throw new Error(error.message)
  return { ...data, signedUrl: signed?.signedUrl || null }
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

export async function getContentItems(productId, { platform, from, to } = {}) {
  if (!hasSupabaseConfig()) return []
  console.time('api:getContentItems')
  let q = supabase.from('content_items').select('*').eq('product_id', productId)
  if (platform) q = q.eq('platform', platform)
  if (from) q = q.gte('schedule_at', from)
  if (to) q = q.lte('schedule_at', to)
  const { data, error } = await q.order('schedule_at', { ascending: true })
  console.timeEnd('api:getContentItems')
  if (error) throw new Error(error.message)
  return data || []
}

export async function createContentItem(payload) {
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
  const { product_id, platform, title = '', body = '', schedule_at, status, topic_title = null } = payload
  console.time('api:createContentItem')
  const insert = { product_id, platform, title, body, schedule_at, status, topic_title }
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
    const hasTopicError = /topic_title/i.test(msg)
    const isSchemaCache = /schema cache/i.test(msg)
    const isColumnMissing = /column\s+"?topic_title"?/i.test(msg) || /does not exist/i.test(msg)
    if (hasTopicError || isSchemaCache || isColumnMissing) {
      const fallback = { product_id, platform, title, body, schedule_at, status }
      const { data: d2, error: e2 } = await supabase.from('content_items').insert(fallback).select('*').single()
      if (e2) throw new Error(e2.message)
      return d2
    }
    throw new Error(msg)
  }
  return data
}

export async function updateContentItem(id, updates) {
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
  console.time('api:updateContentItem')
  let data, error
  try {
    const res = await supabase.from('content_items').update(updates).eq('id', id).select('*').single()
    data = res.data; error = res.error
  } catch (e) {
    error = e
  }
  console.timeEnd('api:updateContentItem')
  if (error) {
    const msg = String(error.message || error)
    const hasTopicError = /topic_title/i.test(msg)
    const isSchemaCache = /schema cache/i.test(msg)
    const isColumnMissing = /column\s+"?topic_title"?/i.test(msg) || /does not exist/i.test(msg)
    if ((updates && Object.prototype.hasOwnProperty.call(updates, 'topic_title')) && (hasTopicError || isSchemaCache || isColumnMissing)) {
      const clone = { ...updates }
      delete clone.topic_title
      const { data: d2, error: e2 } = await supabase.from('content_items').update(clone).eq('id', id).select('*').single()
      if (e2) throw new Error(e2.message)
      return d2
    }
    throw new Error(msg)
  }
  return data
}

export async function deleteContentItem(id) {
  if (!hasSupabaseConfig()) throw new Error('未配置 Supabase')
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
