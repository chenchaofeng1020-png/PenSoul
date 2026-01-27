import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { Edit, Plus, Trash2, Save, X, Tag, Target, Lightbulb, Package, Settings, ChevronDown, ChevronUp, BookOpen, HelpCircle, Star, Sparkles, AlertCircle, Users, ArrowRight, Search, Zap, ExternalLink, Loader2, Copy, CheckCircle } from 'lucide-react'
import { 
  getProductDetails, 
  updateProduct, 
  getProductSellingPoints, 
  addProductSellingPoint, 
  updateProductSellingPoint, 
  deleteProductSellingPoint,
  getProductFeatures,
  addProductFeature,
  updateProductFeature,
  deleteProductFeature,
  listProductDocs,
  addProductDoc,
  deleteProductDoc,
  listProductFaqs,
  addProductFaq,
  deleteProductFaq,
  uploadProductLogo,
  getProductStories,
  addProductStory,
  updateProductStory,
  deleteProductStory,
  getProductFeatureCards,
  addProductFeatureCard,
  updateProductFeatureCard,
  deleteProductFeatureCard,
  getProductMessaging,
  addProductMessaging,
  updateProductMessaging,
  deleteProductMessaging
} from '../services/api'
import { useUI } from '../context/UIContext'
import AiPositioningAssistant from './AiPositioningAssistant'
import AiProductPlanningWizard from './AiProductPlanningWizard'
const RichTextEditorLazy = lazy(() => import('./RichTextEditor'))
 

const DEFAULT_COMPETITOR_LOGO = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="%23F3F4F6"/><path d="M24 12l8 6v12l-8 6-8-6V18l8-6z" fill="%239CA3AF" opacity="0.5"/><path d="M24 16l5 3.5v7l-5 3.5-5-3.5v-7l5-3.5z" fill="%236B7280"/></svg>'

export default function ProductDataManager({ currentProduct, onUpdateProduct }) {
  const { showToast, confirm } = useUI()
  const [product, setProduct] = useState(null)
  const [sellingPoints, setSellingPoints] = useState([])
  const [features, setFeatures] = useState([])
  const [activeTab, setActiveTab] = useState('wizard')
  const [basicErrors, setBasicErrors] = useState({})
  const [docs, setDocs] = useState([])
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(false)
  const [sellingLoading, setSellingLoading] = useState(false)
  const [featuresLoading, setFeaturesLoading] = useState(false)
  const [docsLoading, setDocsLoading] = useState(false)
  const [faqsLoading, setFaqsLoading] = useState(false)
  const [sellingLoaded, setSellingLoaded] = useState(false)
  const [featuresLoaded, setFeaturesLoaded] = useState(false)
  const [docsLoaded, setDocsLoaded] = useState(false)
  const [faqsLoaded, setFaqsLoaded] = useState(false)
  const [competitors, setCompetitors] = useState([])
  const [competitorsLoading, setCompetitorsLoading] = useState(false)
  const [competitorsLoaded, setCompetitorsLoaded] = useState(false)
  const [storiesLoaded, setStoriesLoaded] = useState(false)
  const [featureCardsLoaded, setFeatureCardsLoaded] = useState(false)
  const [messagingLoaded, setMessagingLoaded] = useState(false)
  const [storiesLoading, setStoriesLoading] = useState(false)
  const [featureCardsLoading, setFeatureCardsLoading] = useState(false)
  const [messagingLoading, setMessagingLoading] = useState(false)
  const [competitorSearch, setCompetitorSearch] = useState('')
  const [showAddCompetitorModal, setShowAddCompetitorModal] = useState(false)
  const [isAddingCompetitor, setIsAddingCompetitor] = useState(false)
  const [isSavingCompetitor, setIsSavingCompetitor] = useState(false)
  const [newCompetitor, setNewCompetitor] = useState({
    name: '',
    positioning: '',
    slogan: '',
    description: '',
    competitive_highlights: '',
    features: [],
    main_customers: []
  })
  const [featureInput, setFeatureInput] = useState('')
  const [customersInput, setCustomersInput] = useState('')
  const [editingCompetitorId, setEditingCompetitorId] = useState(null)
  const [detailCompetitor, setDetailCompetitor] = useState(null)
  const [starredIds, setStarredIds] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', slogan: '', description: '', website_url: '', logo_url: '', positioning: '', competitive_highlights: '', features: [], main_customers: [] })
  const [editFeatureInput, setEditFeatureInput] = useState('')
  const [editCustomersInput, setEditCustomersInput] = useState('')
  const [quickNewComp, setQuickNewComp] = useState({ name: '', description: '', website_url: '', logo_url: '' })
  const [compHighlights, setCompHighlights] = useState('')
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [editing, setEditing] = useState({
    basic: false,
    sellingPoints: false,
    features: false
  })
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tagline: '',
    target_audience: '',

    website_url: '',
    logo_url: '',
    category: '',
    status: 'active',
    tags: [],
    overview_short: '',
    positioning: '',
    industry: '',
    docs_url: '',
    demo_url: '',
    download_url: '',
    version: '',
    release_date: '',
    lifecycle_stage: 'ga',
    key_points: [],
    use_cases: []
  })
  const autoSaveRef = useRef(null)
  const [newSellingPoint, setNewSellingPoint] = useState({
    title: '',
    description: '',
    priority: 1,
    category: 'general'
  })
  const [newFeature, setNewFeature] = useState({
    name: '',
    description: '',
    feature_type: 'core',
    status: 'active'
  })
  const [newDoc, setNewDoc] = useState({
    title: '',
    doc_type: 'guide',
    url: '',
    tags: [],
  })
  const [newFaq, setNewFaq] = useState({
    question: '',
    answer: '',
    category: 'general'
  })
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    sellingPoints: true,
    features: true
  })

  const [wizard, setWizard] = useState({
    elevator: '',
    personas: [],
    name: '',
    category: '',
    tagline: '',
    positioning: '',
    website_url: '',
    industry: '',

    overview_short: ''
  })
  const [featureCards, setFeatureCards] = useState([])
  const [newFeatureCard, setNewFeatureCard] = useState({ name: '', module: '', launch_date: '', intro_source: '', intro_scenario: '', intro_problem: '', intro_solution: '', intro_effect: '' })
  const [editingFeatureIndex, setEditingFeatureIndex] = useState(null)
  
  const [storiesData, setStoriesData] = useState([])
  const [newStory, setNewStory] = useState({ who: '', role_tag: '', user_goal: '', max_pain: '', existing_solution: '', our_solution: '', is_primary: false })
  const [editingStoryIndex, setEditingStoryIndex] = useState(null)
  const [isAddingStory, setIsAddingStory] = useState(false)
  const [isAddingFeatureCard, setIsAddingFeatureCard] = useState(false)
  const [isEditingHighlights, setIsEditingHighlights] = useState(false)
  const [isEditingTagline, setIsEditingTagline] = useState(false)
  const [isEditingProductIntro, setIsEditingProductIntro] = useState(false)

  const [messagingRows, setMessagingRows] = useState([])
  const [newMessage, setNewMessage] = useState({ persona: '', channel: '', pain: '', anchor_message: '', benefit: '', evidence: '' })
  const [editingMessageIndex, setEditingMessageIndex] = useState(null)
  const [isAddingMessage, setIsAddingMessage] = useState(false)
  const [logoError, setLogoError] = useState(false)

  // AI Positioning Assistant State
  const [showAiPositioning, setShowAiPositioning] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const enableAiPlanning = ((import.meta?.env?.VITE_ENABLE_AI_PLANNING ?? 'true') === 'true')

  const capabilityDomains = ['创建', '协作', '分析', '自动化', '集成', '治理']

  useEffect(() => {
    setCompHighlights(product?.competitive_highlights || '')
  }, [product?.competitive_highlights])

  useEffect(() => {
    setLogoError(false)
  }, [formData.logo_url])

  const previewData = (() => {
    const hero = wizard.elevator || wizard.tagline || formData.tagline || ''
    const firstStory = storiesData[0] || {}
    const pains = firstStory.max_pain ? [firstStory.max_pain] : (firstStory.problem ? [firstStory.problem] : [])
    const solution = firstStory.our_solution || ''
    const benefits = featureCards.map(fc => fc.intro_effect || fc.benefit_statement).filter(Boolean).slice(0, 4)
    const title = wizard.name || formData.name || currentProduct?.name || ''
    return { hero, pains, solution, benefits, title }
  })()

  // 产品状态选项
  const statusOptions = [
    { value: 'active', label: '迭代中', color: 'bg-green-100 text-green-800' },
    { value: 'development', label: '开发中', color: 'bg-blue-100 text-blue-800' },
    { value: 'deprecated', label: '已下线', color: 'bg-gray-100 text-gray-800' }
  ]

  // 特性类型选项
  const featureTypeOptions = [
    { value: 'core', label: '核心功能', color: 'bg-blue-100 text-blue-800' },
    { value: 'secondary', label: '次要功能', color: 'bg-green-100 text-green-800' },
    { value: 'experimental', label: '实验功能', color: 'bg-yellow-100 text-yellow-800' }
  ]

  // 加载产品数据
  // 指导内容数据
  const guidanceData = {
    positioning: {
      title: '产品定位',
      description: '一句话清晰描述你的产品是什么，服务于谁，以及与竞品的核心差异。',
      examples: [
        { title: 'Slack', content: 'Slack 是一个即时通讯应用，为团队提供更好的沟通方式，以取代电子邮件。' },
        { title: 'Notion', content: 'Notion 是一个多合一的工作空间，将笔记、任务、数据库和日历整合在一起。' },
        { title: 'Airbnb', content: '连接全球旅行者与房东的短租平台。' },
        { title: 'Dropbox', content: '简单可靠的云存储与文件同步服务。' },
        { title: 'Shopify', content: '帮助商家在线开店与管理电商的电商平台。' },
        { title: 'Canva', content: '人人可用的在线设计工具，让设计更轻松。' },
        { title: 'Stripe', content: '为互联网企业提供简洁强大的支付基础设施。' }
      ]
    },

    tagline: {
      title: '宣传语 (Slogan)',
      description: '一句简短有力、令人印象深刻的口号，传达品牌精神或核心价值。',
      examples: [
        { title: 'Nike', content: 'Just Do It.' },
        { title: 'Apple', content: 'Think Different.' },
        { title: 'Adidas', content: 'Impossible Is Nothing.' },
        { title: 'McDonald’s', content: 'I\'m lovin\' it.' },
        { title: 'BMW', content: 'Sheer Driving Pleasure.' },
        { title: 'LinkedIn', content: 'Connect to opportunity.' },
        { title: '知乎', content: '有问题，上知乎。' },
        { title: '小米', content: '为发烧而生。' }
      ]
    }
  }

  const [activeField, setActiveField] = useState('positioning')

  const loadedIdRef = useRef(null)

  useEffect(() => {
    if (currentProduct?.id && currentProduct.id !== loadedIdRef.current) {
      loadedIdRef.current = currentProduct.id
      loadProductData()
      setSellingPoints([])
      setFeatures([])
      setDocs([])
      setFaqs([])
      setCompetitors([])
      setSellingLoaded(false)
      setFeaturesLoaded(false)
      setDocsLoaded(false)
      setFaqsLoaded(false)
      setCompetitorsLoaded(false)
      setStoriesLoaded(false)
      setFeatureCardsLoaded(false)
      setMessagingLoaded(false)
    }
  }, [currentProduct?.id])

  useEffect(() => {
    const errs = {}
    const urlOk = (u) => {
      if (!u) return true
      try {
        const x = new URL(u)
        return x.protocol === 'http:' || x.protocol === 'https:'
      } catch {
        return false
      }
    }
    if (!urlOk(formData.docs_url)) errs.docs_url = '文档链接需为http/https'
    if (!urlOk(formData.demo_url)) errs.demo_url = '演示链接需为http/https'
    if (!urlOk(formData.download_url)) errs.download_url = '下载链接需为http/https'
    if ((formData.overview_short || '').length > 200) errs.overview_short = '摘要不超过200字'
    if ((formData.key_points || []).some((s) => (s || '').length > 25)) errs.key_points = '卖点单条不超过25字'
    setBasicErrors(errs)
  }, [formData])

  const loadProductData = async () => {
    const id = currentProduct?.id
    if (!id) return
    let usedCache = false
    const cacheKey = `product_details_cache_${id}`
    try {
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const parsed = JSON.parse(cached)
          const ttl = 10 * 60 * 1000
          if (parsed && typeof parsed === 'object' && typeof parsed.ts === 'number' && parsed.data && (Date.now() - parsed.ts) < ttl) {
            const productData = parsed.data
            setProduct(productData)
            setFormData({
              name: productData.name || '',
              description: productData.description || '',
              tagline: productData.tagline || '',
              target_audience: productData.target_audience || '',

              website_url: productData.website_url || '',
              logo_url: productData.logo_url || '',
              category: productData.category || '',
              status: productData.status || 'active',
              tags: productData.tags || [],
              overview_short: productData.overview_short || '',
              positioning: productData.positioning || '',
              industry: productData.industry || '',
              docs_url: productData.docs_url || '',
              demo_url: productData.demo_url || '',
              download_url: productData.download_url || '',
              version: productData.version || '',
              release_date: productData.release_date || '',
              lifecycle_stage: productData.lifecycle_stage || 'ga',
              key_points: Array.isArray(productData.key_points) ? productData.key_points : [],
              use_cases: Array.isArray(productData.use_cases) ? productData.use_cases : [],
              pain_point: productData.pain_point || '',
              product_category: productData.product_category || '',
              key_benefit: productData.key_benefit || '',
              core_competitor: productData.core_competitor || '',
              differentiation: productData.differentiation || ''
            })
            setLoading(false)
            usedCache = true
          }
        }
      } catch { /* ignore cache errors */ }
      if (!usedCache) setLoading(true)
      // 仅获取产品定义相关字段，其他字段按需加载
      const fields = 'id, name, description, tagline, target_audience, website_url, logo_url, category, status, tags, overview_short, positioning, industry, docs_url, demo_url, download_url, version, release_date, lifecycle_stage, key_points, use_cases, pain_point, product_category, key_benefit, core_competitor, differentiation, competitive_highlights'
      const fresh = await getProductDetails(id, fields)
      if (!fresh) {
        throw new Error('产品不存在 or 无权访问')
      }
      setProduct(fresh)
      setFormData({
        name: fresh.name || '',
        description: fresh.description || '',
        tagline: fresh.tagline || '',
        target_audience: fresh.target_audience || '',

        website_url: fresh.website_url || '',
        logo_url: fresh.logo_url || '',
        category: fresh.category || '',
        status: fresh.status || 'active',
        tags: fresh.tags || [],
        overview_short: fresh.overview_short || '',
        positioning: fresh.positioning || '',
        industry: fresh.industry || '',
        docs_url: fresh.docs_url || '',
        demo_url: fresh.demo_url || '',
        download_url: fresh.download_url || '',
        version: fresh.version || '',
        release_date: fresh.release_date || '',
        lifecycle_stage: fresh.lifecycle_stage || 'ga',
        key_points: Array.isArray(fresh.key_points) ? fresh.key_points : [],
        use_cases: Array.isArray(fresh.use_cases) ? fresh.use_cases : [],
        pain_point: fresh.pain_point || '',
        product_category: fresh.product_category || '',
        key_benefit: fresh.key_benefit || '',
        core_competitor: fresh.core_competitor || '',
        differentiation: fresh.differentiation || ''
      })
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: fresh }))
      } catch { /* ignore write errors */ }
    } catch (error) {
      const msg = String(error?.message || error || '')
      if (/aborted|AbortError|ERR_ABORTED/i.test(msg)) {
        return
      }
      console.error('加载产品数据失败:', msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab !== 'wizard') return
    if (!currentProduct?.id || !product) return
    if (autoSaveRef.current) {
      clearTimeout(autoSaveRef.current)
    }
    const payload = {
      name: formData.name,
      description: formData.description,
      tagline: formData.tagline,
      target_audience: formData.target_audience,

      website_url: formData.website_url,
      logo_url: formData.logo_url,
      category: formData.category,
      status: formData.status,
      tags: formData.tags,
      overview_short: formData.overview_short,
      positioning: formData.positioning,
      industry: formData.industry,
      docs_url: formData.docs_url,
      demo_url: formData.demo_url,
      download_url: formData.download_url,
      version: formData.version,
      release_date: formData.release_date || null,
      lifecycle_stage: formData.lifecycle_stage,
      key_points: formData.key_points,
      use_cases: formData.use_cases,
      pain_point: formData.pain_point,
      product_category: formData.product_category,
      key_benefit: formData.key_benefit,
      core_competitor: formData.core_competitor,
      differentiation: formData.differentiation
    }
    const errorKeys = Object.keys(basicErrors || {})
    const filtered = Object.fromEntries(
      Object.entries(payload).filter(([k, v]) => ((k === 'version') || !errorKeys.includes(k)) && typeof v !== 'undefined')
    )
    if (Object.keys(filtered).length === 0) return
    autoSaveRef.current = setTimeout(async () => {
      try {
        const updated = await updateProduct(currentProduct.id, filtered)
        setProduct(updated)
        if (onUpdateProduct) {
          onUpdateProduct(updated)
        }
        try {
          const cacheKey = `product_details_cache_${currentProduct.id}`
          localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: updated }))
        } catch { /* ignore */ }
      } catch { /* ignore */ }
    }, 800)
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    }
  }, [activeTab, currentProduct?.id, product, formData, basicErrors])

  useEffect(() => {
    const fetchByTab = async () => {
      if (!currentProduct?.id) return
      
      if (activeTab === 'docs' && !docsLoaded) {
        setDocsLoading(true)
        try {
          const data = await listProductDocs(currentProduct.id)
          setDocs(data)
          setDocsLoaded(true)
        } catch (e) {
          setDocs([])
        } finally {
          setDocsLoading(false)
        }
      }
      if (activeTab === 'faqs' && !faqsLoaded) {
        setFaqsLoading(true)
        try {
          const data = await listProductFaqs(currentProduct.id)
          setFaqs(data)
          setFaqsLoaded(true)
        } catch (e) {
          setFaqs([])
        } finally {
          setFaqsLoading(false)
        }
      }
      // 竞品模块已移除，避免加载
      if (activeTab === 'competitorAnalysis' && !competitorsLoaded) {
        setCompetitors([])
        setCompetitorsLoaded(true)
      }
      if (activeTab === 'stories' && !storiesLoaded) {
        const cacheKey = `product_stories_cache_${currentProduct.id}`
        const cached = localStorage.getItem(cacheKey)
        let hasCache = false
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            if (Array.isArray(parsed)) {
              setStoriesData(parsed)
              setStoriesLoaded(true)
              hasCache = true
            }
          } catch (e) { /* ignore */ }
        }

        if (!hasCache) setStoriesLoading(true)

        getProductStories(currentProduct.id)
          .then((data) => {
            setStoriesData(data)
            setStoriesLoaded(true)
            localStorage.setItem(cacheKey, JSON.stringify(data))
          })
          .catch((e) => {
            if (!hasCache) setStoriesData([])
          })
          .finally(() => {
            setStoriesLoading(false)
          })
      }
      if (activeTab === 'featureCards' && !featureCardsLoaded) {
        setFeatureCardsLoading(true)
        try {
          const data = await getProductFeatureCards(currentProduct.id)
          setFeatureCards(data)
          setFeatureCardsLoaded(true)
        } catch (e) {
          setFeatureCards([])
        } finally {
          setFeatureCardsLoading(false)
        }
      }
      if (activeTab === 'messaging' && !messagingLoaded) {
        setMessagingLoading(true)
        try {
          const data = await getProductMessaging(currentProduct.id)
          setMessagingRows(data)
          setMessagingLoaded(true)
        } catch (e) {
          setMessagingRows([])
        } finally {
          setMessagingLoading(false)
        }
      }
    }
    fetchByTab()
  }, [activeTab, currentProduct?.id])

  // 保存基础信息
  const handleSaveBasicInfo = async () => {
    try {
      const rawUpdates = {
        name: formData.name,
        description: formData.description,
        tagline: formData.tagline,
        target_audience: formData.target_audience,

        website_url: formData.website_url,
        logo_url: formData.logo_url,
        category: formData.category,
        status: formData.status,
        tags: formData.tags,
        overview_short: formData.overview_short,
        positioning: formData.positioning,
        industry: formData.industry,
        docs_url: formData.docs_url,
        demo_url: formData.demo_url,
        download_url: formData.download_url,
        version: formData.version,
        release_date: formData.release_date || null,
        lifecycle_stage: formData.lifecycle_stage,
        key_points: formData.key_points,
        use_cases: formData.use_cases,
        pain_point: formData.pain_point,
        product_category: formData.product_category,
        key_benefit: formData.key_benefit,
        core_competitor: formData.core_competitor,
        differentiation: formData.differentiation
      }
      const errorKeys = Object.keys(basicErrors || {})
      const filteredUpdates = Object.fromEntries(
        Object.entries(rawUpdates).filter(([k, v]) => ((k === 'version') || !errorKeys.includes(k)) && typeof v !== 'undefined')
      )
      if (Object.keys(filteredUpdates).length === 0) {
        showToast('未找到可保存的有效字段', 'warning')
        return
      }
      const updatedProduct = await updateProduct(currentProduct.id, filteredUpdates)
      setProduct(updatedProduct)
      if (onUpdateProduct) {
        onUpdateProduct(updatedProduct)
      }
      setEditing({ ...editing, basic: false })
    } catch (error) {
      console.error('保存基础信息失败:', error)
      showToast('保存失败，请重试', 'error')
    }
  }

  // 添加卖点
  const handleAddSellingPoint = async () => {
    if (!newSellingPoint.title.trim()) return
    
    try {
      const sellingPoint = await addProductSellingPoint(currentProduct.id, newSellingPoint)
      setSellingPoints([...sellingPoints, sellingPoint])
      setNewSellingPoint({
        title: '',
        description: '',
        priority: 1,
        category: 'general'
      })
    } catch (error) {
      console.error('添加卖点失败:', error)
      showToast('添加失败，请重试', 'error')
    }
  }

  // 删除卖点
  const handleDeleteSellingPoint = async (sellingPointId) => {
    if (!await confirm({ title: '删除卖点', message: '确定要删除这个卖点吗？' })) return
    
    try {
      await deleteProductSellingPoint(sellingPointId)
      setSellingPoints(sellingPoints.filter(sp => sp.id !== sellingPointId))
    } catch (error) {
      console.error('删除卖点失败:', error)
      showToast('删除失败，请重试', 'error')
    }
  }

  // 添加特性
  const handleAddFeature = async () => {
    if (!newFeature.name.trim()) return
    
    try {
      const feature = await addProductFeature(currentProduct.id, newFeature)
      setFeatures([...features, feature])
      setNewFeature({
        name: '',
        description: '',
        feature_type: 'core',
        status: 'active'
      })
    } catch (error) {
      console.error('添加特性失败:', error)
      showToast('添加失败，请重试', 'error')
    }
  }

  // 删除特性
  const handleDeleteFeature = async (featureId) => {
    if (!await confirm({ title: '删除特性', message: '确定要删除这个特性吗？' })) return
    
    try {
      await deleteProductFeature(featureId)
      setFeatures(features.filter(f => f.id !== featureId))
    } catch (error) {
      console.error('删除特性失败:', error)
      showToast('删除失败，请重试', 'error')
    }
  }

  // 切换章节展开/收起
  const toggleSection = (section) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section]
    })
  }

  if (!currentProduct) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">请先选择一个产品</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl  h-full flex flex-col">
      {/* 头部 */}
      <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-gray-900">产品规划</h2>
          </div>
          <div className="flex items-center gap-3">
            {enableAiPlanning && (
              <button 
                onClick={() => setShowWizard(true)} 
                className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-600 text-white rounded-md hover:from-blue-700 hover:to-blue-700 transition shadow-sm"
              >
                <Sparkles className="w-3 h-3" />
                <span className="text-sm">AI 规划向导</span>
              </button>
            )}
          </div>
        {showWizard && (
          <AiProductPlanningWizard
            currentProduct={currentProduct}
            context={{
              productBasic: formData,
              personas: storiesData,
              messaging: messagingRows,
              features: featureCards,
              competitors
            }}
            onClose={() => setShowWizard(false)}
            onApplyUpdates={async (type, data) => {
              if (type === 'basic') {
                 try {
                    const updates = {
                      target_audience: data.target_audience || formData.target_audience,
                      product_category: data.product_category || formData.product_category,
                      core_competitor: data.core_competitor || formData.core_competitor,
                      positioning: data.positioning || formData.positioning,
                      pain_point: data.pain_point || formData.pain_point,
                      key_benefit: data.key_benefit || formData.key_benefit,
                      differentiation: data.differentiation || formData.differentiation
                    }
                    await updateProduct(currentProduct.id, updates)
                    setFormData({ ...formData, ...updates })
                    showToast('已更新产品定义')
                 } catch { showToast('保存失败', 'error') }
              } else if (type === 'persona') {
                 try {
                    const inserted = await addProductStory(currentProduct.id, data)
                    setStoriesData([...storiesData, inserted])
                    showToast('已添加用户画像')
                 } catch { showToast('保存失败', 'error') }
              } else if (type === 'feature') {
                 try {
                    const inserted = await addProductFeatureCard(currentProduct.id, data)
                    setFeatureCards([...featureCards, inserted])
                    showToast('已添加功能特性')
                 } catch { showToast('保存失败', 'error') }
              } else if (type === 'messaging') {
                 try {
                    const inserted = await addProductMessaging(currentProduct.id, data)
                    setMessagingRows([...messagingRows, inserted])
                    showToast('已添加宣传语')
                 } catch { showToast('保存失败', 'error') }
              }
            }}
          />
        )}
        
        
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center space-x-2 mb-4 overflow-x-auto">
            {[
              { key: 'wizard', label: '产品定义' },
              { key: 'stories', label: '用户画像' },
              { key: 'featureCards', label: '功能卡片' },
              { key: 'messaging', label: '产品介绍' },
              { key: 'docs', label: '资料库' },
              { key: 'faqs', label: 'FAQ' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-3 py-1.5 text-sm rounded-lg border ${
                  activeTab === t.key
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'wizard' && (
            <div className="space-y-6">
              {loading ? (
                <div className="bg-white rounded-xl border border-gray-200  overflow-hidden animate-pulse">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg bg-gray-200"></div>
                      <div className="space-y-2">
                        <div className="h-6 bg-gray-200 rounded w-48"></div>
                        <div className="flex gap-2">
                          <div className="h-5 bg-gray-200 rounded w-16"></div>
                          <div className="h-5 bg-gray-200 rounded w-12"></div>
                        </div>
                      </div>
                    </div>
                    <div className="h-9 bg-gray-200 rounded-lg w-28"></div>
                  </div>
                  <div className="p-6 space-y-8">
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-24 mb-6"></div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                        {[...Array(6)].map((_, i) => (
                          <div key={i}>
                            <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-gray-100 pt-6 mt-6">
                        <div className="h-3 bg-gray-200 rounded w-20 mb-2"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-full"></div>
                          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : !isEditingProductIntro ? (
                <div className="bg-white rounded-xl border border-gray-200  overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden">
                        {formData.logo_url && !logoError ? (
                          <img 
                            src={formData.logo_url} 
                            alt="产品Logo" 
                            className="w-full h-full object-cover" 
                            onError={() => setLogoError(true)}
                          />
                        ) : (
                          <Package className="w-8 h-8 text-gray-300" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{formData.name || '未命名产品'}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          {formData.status && (
                             <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                               statusOptions.find(s => s.value === formData.status)?.color || 'bg-gray-100 text-gray-800'
                             }`}>
                               {statusOptions.find(s => s.value === formData.status)?.label || formData.status}
                             </span>
                          )}
                          {formData.version && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              v{formData.version}
                            </span>
                          )}
                          {formData.release_date && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              {formData.release_date}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsEditingProductIntro(true)}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition"
                    >
                      <Edit className="w-4 h-4" />
                      编辑产品定义
                    </button>
                  </div>
                  <div className="p-6 space-y-8">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                        <div className="w-1 h-4 bg-green-600 rounded"></div>
                        核心定义
                      </h3>
                      <dl className="space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <dt className="text-gray-500 text-xs mb-1">目标客户</dt>
                            <dd className="text-gray-900">{formData.target_audience || <span className="text-gray-400 italic">暂无描述</span>}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-500 text-xs mb-1">核心痛点</dt>
                            <dd className="text-gray-900">{formData.pain_point || <span className="text-gray-400 italic">暂无描述</span>}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-500 text-xs mb-1">产品品类</dt>
                            <dd className="text-gray-900">{formData.product_category || <span className="text-gray-400 italic">暂无描述</span>}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-500 text-xs mb-1">产品价值</dt>
                            <dd className="text-gray-900">{formData.key_benefit || <span className="text-gray-400 italic">暂无描述</span>}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-500 text-xs mb-1">主要竞品</dt>
                            <dd className="text-gray-900">{formData.core_competitor || <span className="text-gray-400 italic">暂无描述</span>}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-500 text-xs mb-1">差异化优势</dt>
                            <dd className="text-gray-900">{formData.differentiation || <span className="text-gray-400 italic">暂无描述</span>}</dd>
                          </div>
                        </div>
                        <div className="border-t border-gray-100 pt-4">
                          <dt className="text-gray-500 text-xs mb-1">产品定位</dt>
                          <dd className="text-gray-900 leading-relaxed">{formData.positioning || <span className="text-gray-400 italic">暂无描述</span>}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200  p-6 mb-4">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">编辑产品定义</h3>
                    <div className="flex items-center gap-2">
                       <button 
                        onClick={() => setIsEditingProductIntro(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition"
                      >
                        取消
                      </button>
                      <button 
                        onClick={async () => {
                          await handleSaveBasicInfo();
                          setIsEditingProductIntro(false);
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition  flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        保存更改
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-8">
                    {/* Basic Info Section */}
                    <section>
                      <div className="flex items-center mb-4">
                        <div className="w-1 h-4 bg-blue-600 rounded mr-2"></div>
                        <h3 className="text-base font-medium text-gray-900">基础信息</h3>
                      </div>
                      
                      <div className="grid grid-cols-12 gap-6">
                        <div className="col-span-12 md:col-span-2">
                           <label className="block text-xs font-medium text-gray-500 mb-2">产品 Logo</label>
                           <div className="w-full aspect-square rounded-lg bg-gray-50 border border-gray-200 flex flex-col items-center justify-center overflow-hidden relative group cursor-pointer hover:border-blue-300 transition-colors">
                              <input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0]
                                  if (!file || !currentProduct?.id) return
                                  try {
                                    const { url } = await uploadProductLogo(file, currentProduct.id)
                                    if (url) {
                                      setFormData(prev => ({ ...prev, logo_url: url }))
                                    }
                                  } catch (err) {
                                    alert('上传失败')
                                  }
                                }}
                              />
                              {formData.logo_url && !logoError ? (
                                <img 
                                  src={formData.logo_url} 
                                  alt="Logo" 
                                  className="w-full h-full object-cover" 
                                  onError={() => setLogoError(true)}
                                />
                              ) : (
                                <Plus className="w-6 h-6 text-gray-300 mb-1" />
                              )}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                                 <span className="text-xs text-transparent group-hover:text-gray-600 font-medium bg-white/80 px-2 py-1 rounded  transition-all transform translate-y-2 group-hover:translate-y-0">更换</span>
                              </div>
                           </div>
                        </div>
                        
                        <div className="col-span-12 md:col-span-10 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">产品名称</label>
                              <input 
                                type="text" 
                                value={formData.name} 
                                onChange={(e)=>{const v=e.target.value; setWizard(prev=>({...prev, name:v})); setFormData(prev=>({...prev, name:v}))}} 
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                                placeholder="输入产品名称"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">产品状态</label>
                              <select 
                                value={formData.status} 
                                onChange={(e)=>setFormData(prev=>({...prev, status:e.target.value}))} 
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              >
                                <option value="development">开发中</option>
                                <option value="active">迭代中</option>
                                <option value="deprecated">已下线</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">上线时间</label>
                              <input 
                                type="date" 
                                value={formData.release_date} 
                                onChange={(e)=>setFormData(prev=>({...prev, release_date:e.target.value}))} 
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">最新版本</label>
                              <input 
                                type="text" 
                                value={formData.version} 
                                onChange={(e)=>setFormData(prev=>({...prev, version:e.target.value}))} 
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                                placeholder="填写版本标识"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                    
                    {/* Core Definition Section */}
                    <section>
                       <div className="flex items-center mb-4">
                        <div className="w-1 h-4 bg-green-600 rounded mr-2"></div>
                        <h3 className="text-base font-medium text-gray-900">核心定义</h3>
                      </div>
                      
                      <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Target Audience */}
                            <div className="group">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                目标客户 (Target Audience)
                              </label>
                              <textarea 
                                rows={3}
                                value={formData.target_audience || ''} 
                                onChange={(e)=>setFormData(prev=>({...prev, target_audience:e.target.value}))} 
                                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all " 
                                placeholder="例如：中小型电商卖家"
                              />
                              <p className="mt-1.5 text-xs text-gray-500">
                                指南：明确谁会购买和使用你的产品。例如：企业IT部门、自由设计师、全职妈妈等。
                              </p>
                            </div>

                            {/* Pain Point */}
                            <div className="group">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                核心痛点 (Pain Point)
                              </label>
                              <textarea 
                                rows={3}
                                value={formData.pain_point || ''} 
                                onChange={(e)=>setFormData(prev=>({...prev, pain_point:e.target.value}))} 
                                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all " 
                                placeholder="例如：无法高效管理多平台订单"
                              />
                              <p className="mt-1.5 text-xs text-gray-500">
                                指南：用户面临的最大问题是什么？例如：流程繁琐、数据不准确、沟通成本高等。
                              </p>
                            </div>

                            {/* Product Category */}
                            <div className="group">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                产品品类 (Category)
                              </label>
                              <textarea 
                                rows={3}
                                value={formData.product_category || ''} 
                                onChange={(e)=>setFormData(prev=>({...prev, product_category:e.target.value}))} 
                                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all " 
                                placeholder="例如：ERP SaaS"
                              />
                              <p className="mt-1.5 text-xs text-gray-500">
                                指南：你的产品属于哪个市场类别？例如：CRM、项目管理工具、即时通讯软件等。
                              </p>
                            </div>

                            {/* Key Benefit */}
                            <div className="group">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                产品价值 (Key Benefit)
                              </label>
                              <textarea 
                                rows={3}
                                value={formData.key_benefit || ''} 
                                onChange={(e)=>setFormData(prev=>({...prev, key_benefit:e.target.value}))} 
                                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all " 
                                placeholder="例如：自动化同步库存"
                              />
                              <p className="mt-1.5 text-xs text-gray-500">
                                指南：产品带来的最主要价值是什么？例如：提升效率、降低成本、增加收入等。
                              </p>
                            </div>

                            {/* Core Competitor */}
                            <div className="group">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                主要竞品 (Competitor)
                              </label>
                              <textarea 
                                rows={3}
                                value={formData.core_competitor || ''} 
                                onChange={(e)=>setFormData(prev=>({...prev, core_competitor:e.target.value}))} 
                                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all " 
                                placeholder="例如：Excel表格"
                              />
                              <p className="mt-1.5 text-xs text-gray-500">
                                指南：用户目前的替代方案是什么？可能是直接竞品，也可能是传统方式（如Excel）。
                              </p>
                            </div>

                            {/* Differentiation */}
                            <div className="group">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                差异化优势 (Differentiation)
                              </label>
                              <textarea 
                                rows={3}
                                value={formData.differentiation || ''} 
                                onChange={(e)=>setFormData(prev=>({...prev, differentiation:e.target.value}))} 
                                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all " 
                                placeholder="例如：开箱即用，无需部署"
                              />
                              <p className="mt-1.5 text-xs text-gray-500">
                                指南：你比竞品好在哪里？例如：更易用、更智能、价格更亲民、服务更好等。
                              </p>
                            </div>
                          </div>

                          {/* Positioning Fields */}
                          <div className="group relative">
                             <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                               <Target className="w-4 h-4 text-blue-600" />
                               产品定位 (Positioning)
                             </label>
                             <div className="relative">
                               <textarea 
                                 value={formData.positioning} 
                                 onChange={(e)=>{const v=e.target.value; setWizard(prev=>({...prev, positioning:v})); setFormData(prev=>({...prev, positioning:v}))}} 
                                 className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all  pr-10" 
                                 rows={3} 
                                 placeholder="描述你的产品定位..."
                               />
                               <button
                                 onClick={() => setShowAiPositioning(true)}
                                 className="absolute right-2 bottom-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1 rounded-full transition animate-pulse"
                                 title="AI 智能定位助手"
                               >
                                 <Sparkles className="w-5 h-5" />
                               </button>
                             </div>
                             {/* Inline Guide */}
                             <div className="mt-3 bg-blue-50/50 border border-blue-100 rounded-lg p-4">
                                 <div className="flex items-center gap-2 text-blue-800 text-xs font-bold mb-2">
                                   <Lightbulb className="w-3 h-3" />
                                   填写指南
                                 </div>
                                 <p className="text-xs text-blue-900/80 mb-3 leading-relaxed">
                                   {guidanceData.positioning.description}
                                 </p>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                   {guidanceData.positioning.examples.slice(0, 4).map((ex, i) => (
                                      <div key={i} className="bg-white rounded px-2 py-1.5 text-xs border border-blue-100/50">
                                         <span className="font-semibold text-blue-700">{ex.title}:</span> <span className="text-gray-600">{ex.content}</span>
                                      </div>
                                   ))}
                                 </div>
                              </div>
                           </div>


                      </div>
                    </section>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'featureCards' && (
            <div className={`grid grid-cols-1 ${isAddingFeatureCard ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
              <div className="lg:col-span-2 space-y-4">
                {!isAddingFeatureCard ? (
                  <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 ">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">功能卡片列表</h3>
                      <p className="text-xs text-gray-500 mt-1">已记录 {featureCards.length} 个功能卡片</p>
                    </div>
                    <button
                      onClick={() => { setEditingFeatureIndex(null); setNewFeatureCard({ name: '', module: '', launch_date: '', intro_source: '', intro_scenario: '', intro_problem: '', intro_solution: '', intro_effect: '' }); setIsAddingFeatureCard(true) }}
                      className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition "
                    >
                      <Plus className="w-4 h-4" />
                      <span>新建功能卡片</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-semibold text-gray-900">{editingFeatureIndex !== null ? '编辑功能卡片' : '添加功能卡片'}</h3>
                      <span className="text-xs text-gray-500">必填：功能名称、所属模块、上线时间；建议补齐功能介绍</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">功能名称</label>
                        <input
                          type="text"
                          value={newFeatureCard.name}
                          onChange={(e) => setNewFeatureCard({ ...newFeatureCard, name: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">所属模块</label>
                        <input
                          type="text"
                          value={newFeatureCard.module}
                          onChange={(e) => setNewFeatureCard({ ...newFeatureCard, module: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          placeholder="如：创建/协作/分析等"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">上线时间</label>
                        <input
                          type="date"
                          value={newFeatureCard.launch_date}
                          onChange={(e) => setNewFeatureCard({ ...newFeatureCard, launch_date: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2 mt-4">
                      <label className="block text-sm font-medium text-gray-700">功能介绍</label>
                      <textarea
                        value={newFeatureCard.intro_source}
                        onChange={(e) => setNewFeatureCard({ ...newFeatureCard, intro_source: e.target.value })}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="需求来源（客户/内部/数据等）"
                      />
                      <textarea
                        value={newFeatureCard.intro_scenario}
                        onChange={(e) => setNewFeatureCard({ ...newFeatureCard, intro_scenario: e.target.value })}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="使用场景（谁、在什么时候、如何使用）"
                      />
                      <textarea
                        value={newFeatureCard.intro_problem}
                        onChange={(e) => setNewFeatureCard({ ...newFeatureCard, intro_problem: e.target.value })}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="解决的问题（痛点与指标）"
                      />
                      <textarea
                        value={newFeatureCard.intro_solution}
                        onChange={(e) => setNewFeatureCard({ ...newFeatureCard, intro_solution: e.target.value })}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="如何解决的（流程/算法/策略/交互）"
                      />
                      <textarea
                        value={newFeatureCard.intro_effect}
                        onChange={(e) => setNewFeatureCard({ ...newFeatureCard, intro_effect: e.target.value })}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="效果（效率提升/成本降低/体验改善等，尽量量化）"
                      />
                    </div>
                    <div className="flex items-center justify-end mt-4 gap-3">
                      <button
                        onClick={() => { setIsAddingFeatureCard(false); setEditingFeatureIndex(null); setNewFeatureCard({ name: '', module: '', launch_date: '', intro_source: '', intro_scenario: '', intro_problem: '', intro_solution: '', intro_effect: '' }) }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition"
                      >
                        取消
                      </button>
                      <button
                        className="inline-flex items-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-md text-sm"
                        onClick={async () => {
                          const { name, module, launch_date, intro_source, intro_scenario, intro_problem, intro_solution, intro_effect } = newFeatureCard
                          if (!name.trim() || !module.trim() || !launch_date) return
                          if (![intro_source, intro_scenario, intro_problem, intro_solution, intro_effect].some(v => (v || '').trim())) return
                          
                          try {
                            if (editingFeatureIndex !== null) {
                              const cardToUpdate = featureCards[editingFeatureIndex]
                              if (cardToUpdate?.id) {
                                // 乐观更新 - 编辑
                                const optimisticUpdated = { ...cardToUpdate, ...newFeatureCard }
                                const prevCards = [...featureCards]
                                const next = [...featureCards]
                                next[editingFeatureIndex] = optimisticUpdated
                                setFeatureCards(next)
                                
                                // 立即关闭编辑框
                                setNewFeatureCard({ name: '', module: '', launch_date: '', intro_source: '', intro_scenario: '', intro_problem: '', intro_solution: '', intro_effect: '' })
                                setEditingFeatureIndex(null)
                                setIsAddingFeatureCard(false)

                                try {
                                  const updated = await updateProductFeatureCard(cardToUpdate.id, newFeatureCard)
                                  setFeatureCards(prev => prev.map(c => c.id === cardToUpdate.id ? updated : c))
                              } catch (e) {
                                  setFeatureCards(prevCards) // 回滚
                                  showToast('更新失败，已还原', 'error')
                              }
                            }
                          } else {
                            // 乐观更新 - 新增
                            const tempId = 'temp_' + Date.now()
                            const optimisticNew = { id: tempId, product_id: currentProduct.id, ...newFeatureCard }
                            
                            setFeatureCards([...featureCards, optimisticNew])
                            
                            // 立即关闭编辑框
                            const payload = { ...newFeatureCard }
                            setNewFeatureCard({ name: '', module: '', launch_date: '', intro_source: '', intro_scenario: '', intro_problem: '', intro_solution: '', intro_effect: '' })
                            setEditingFeatureIndex(null)
                            setIsAddingFeatureCard(false)

                            try {
                                const inserted = await addProductFeatureCard(currentProduct.id, payload)
                                // 用真实数据替换临时数据
                                setFeatureCards(prev => prev.map(c => c.id === tempId ? inserted : c))
                            } catch (e) {
                                // 失败回滚
                                setFeatureCards(prev => prev.filter(c => c.id !== tempId))
                                showToast('保存失败，请检查网络或配置', 'error')
                            }
                          }
                        } catch (e) {
                          showToast('操作异常', 'error')
                        }
                      }}
                    >
                      {editingFeatureIndex !== null ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      <span>{editingFeatureIndex !== null ? '更新功能卡片' : '保存功能卡片'}</span>
                    </button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {featureCards.map((fc, idx) => (
                  <div key={idx} className="group relative bg-white rounded-xl border border-gray-200 p-4  hover: transition">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-500" />
                          <div className="text-sm font-semibold text-gray-900">{fc.name}</div>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="inline-flex px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">{fc.module || '未填写模块'}</span>
                          <span className="text-xs text-gray-500">{fc.launch_date || '未设置上线时间'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          aria-label="编辑功能卡片"
                          disabled={fc.id?.toString().startsWith('temp_')}
                          className={`text-gray-400 hover:text-blue-600 transition opacity-0 group-hover:opacity-100 ${fc.id?.toString().startsWith('temp_') ? 'cursor-not-allowed opacity-50' : ''}`}
                          onClick={() => {
                            setEditingFeatureIndex(idx)
                            setNewFeatureCard({
                              name: fc.name || '',
                              module: fc.module || '',
                              launch_date: fc.launch_date || '',
                              intro_source: fc.intro_source || '',
                              intro_scenario: fc.intro_scenario || '',
                              intro_problem: fc.intro_problem || '',
                              intro_solution: fc.intro_solution || '',
                              intro_effect: fc.intro_effect || ''
                            })
                            setIsAddingFeatureCard(true)
                          }}
                        >
                          {fc.id?.toString().startsWith('temp_') ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit className="w-4 h-4" />}
                        </button>
                        <button
                          aria-label="删除功能卡片"
                          disabled={fc.id?.toString().startsWith('temp_')}
                          className={`text-gray-400 hover:text-red-600 transition opacity-0 group-hover:opacity-100 ${fc.id?.toString().startsWith('temp_') ? 'cursor-not-allowed opacity-50' : ''}`}
                          onClick={async () => {
                            if (!await confirm({ title: '删除功能卡片', message: '确定删除？' })) return
                            if (fc.id) {
                              try {
                                await deleteProductFeatureCard(fc.id)
                                setFeatureCards(featureCards.filter(item => item.id !== fc.id))
                              } catch (e) {
                                showToast('删除失败', 'error')
                              }
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">功能介绍</div>
                        <div className="space-y-1 text-sm text-gray-900">
                          <div className="flex gap-2">
                            <span className="text-gray-500 text-xs w-20 shrink-0">需求来源</span>
                            <span className="">{fc.intro_source || '未填写'}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-gray-500 text-xs w-20 shrink-0">使用场景</span>
                            <span className="">{fc.intro_scenario || '未填写'}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-gray-500 text-xs w-20 shrink-0">解决的问题</span>
                            <span className="">{fc.intro_problem || '未填写'}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-gray-500 text-xs w-20 shrink-0">如何解决的</span>
                            <span className="">{fc.intro_solution || '未填写'}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-gray-500 text-xs w-20 shrink-0">效果</span>
                            <span className="">{fc.intro_effect || '未填写'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {isAddingFeatureCard && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 transition-all duration-300 ease-in-out  h-fit max-h-[70vh] overflow-y-auto">
                  <div className="flex items-center gap-2 mb-3 text-blue-800">
                    <Lightbulb className="w-5 h-5" />
                    <h4 className="font-semibold">功能介绍 指南</h4>
                  </div>
                  <p className="text-sm text-blue-900 mb-4 leading-relaxed opacity-90">
                    通过结构化的说明，清晰表达该功能的来源、适用场景、要解决的问题、解决思路与实现方式，以及带来的可量化效果。建议以事实和数据为依据，避免仅罗列功能点。
                  </p>
                  <div className="space-y-5">
                    <div>
                      <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">建议结构</div>
                      <ul className="list-disc pl-5 mt-2 text-sm text-blue-900 space-y-1">
                        <li>需求来源：客户访谈、支持反馈、数据洞察、业务目标等，并附证据。</li>
                        <li>使用场景：角色、触发条件、关键步骤、边界与限制。</li>
                        <li>解决的问题：明确痛点与指标，定义期望结果与判定标准。</li>
                        <li>如何解决的：核心思路、流程/算法/策略/交互、技术取舍与风险。</li>
                        <li>效果：效率/成本/错误率/满意度等指标的量化提升与验证方式。</li>
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">写作要点</div>
                      <ul className="list-disc pl-5 mt-2 text-sm text-blue-900 space-y-1">
                        <li>用业务语言描述价值，不仅是“做了什么”，而是“解决了什么”。</li>
                        <li>尽量量化：使用基线数据与对比数据，说明提升幅度与样本范围。</li>
                        <li>引用真实案例或用户反馈，增强可信度与可验证性。</li>
                        <li>明确边界条件与不适用场景，避免过度承诺。</li>
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">优秀案例</div>
                      <div className="grid grid-cols-1 gap-3 mt-2">
                        <div className="bg-white bg-opacity-60 rounded-lg p-3 border border-blue-100 ">
                          <div className="text-xs font-bold text-gray-700 mb-1">审批自动化（中型制造企业）</div>
                          <div className="text-xs text-gray-600">从人工多环节审批改为自动化流转，平均审批时长由72小时缩短至8小时，错误率下降90%，每月节省约120人小时。</div>
                        </div>
                        <div className="bg-white bg-opacity-60 rounded-lg p-3 border border-blue-100 ">
                          <div className="text-xs font-bold text-gray-700 mb-1">营销线索分配优化（SaaS）</div>
                          <div className="text-xs text-gray-600">基于评分与地域路由的自动分配，将跟进首响时间从4小时缩减到30分钟，MQL→SQL转化率提升25%。</div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">常见错误</div>
                      <ul className="list-disc pl-5 mt-2 text-sm text-blue-900 space-y-1">
                        <li>只列功能而无业务价值或验证数据。</li>
                        <li>缺少场景与角色，无法复现场景与边界。</li>
                        <li>使用模糊表述，未给出可度量的效果指标。</li>
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">评估指标</div>
                      <ul className="list-disc pl-5 mt-2 text-sm text-blue-900 space-y-1">
                        <li>效率（时长、吞吐量、自动化率）</li>
                        <li>成本（人力成本、资源占用、采购/运维成本）</li>
                        <li>质量（错误率、返工率、满意度、合规性）</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'competitorAnalysis' && (
            <div className={`grid grid-cols-1 ${isEditingHighlights ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-gray-900">竞争亮点（本产品）</h3>
                    {!isEditingHighlights && (
                         <button
                           onClick={() => setIsEditingHighlights(true)}
                           className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                         >
                           {compHighlights ? '编辑亮点' : '添加亮点'}
                         </button>
                    )}
                  </div>
                  {!isEditingHighlights ? (
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      {compHighlights || <span className="text-gray-400 italic">暂无竞争亮点描述，点击上方按钮添加</span>}
                    </div>
                  ) : (
                    <>
                      <span className="text-xs text-gray-500 block mb-2">用于描述本产品相较竞品的亮点</span>
                      <textarea
                        value={compHighlights}
                        onChange={(e)=>setCompHighlights(e.target.value.slice(0, 400))}
                        rows={4}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="例如：在XX场景下显著提升效率/降低成本/体验更优/服务更全面等，最好量化"
                      />
                      <div className="flex items-center justify-end mt-3 gap-3">
                        <button
                          onClick={() => setIsEditingHighlights(false)}
                          className="px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-100"
                        >
                          取消
                        </button>
                        <button
                          className="px-3 py-2 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={async()=>{
                            if (!currentProduct?.id) return
                            
                            // 乐观更新：立即更新本地状态并关闭编辑框
                            const previousProduct = { ...currentProduct }
                            const optimisticProduct = { ...currentProduct, competitive_highlights: compHighlights }
                            setProduct(optimisticProduct)
                            setIsEditingHighlights(false)

                            try {
                              // 后台异步保存
                              const updated = await updateProduct(currentProduct.id, { competitive_highlights: compHighlights })
                              // 再次更新以确保数据一致性（通常与乐观更新一致）
                              setProduct(updated)
                              try {
                                const cacheKey = `product_details_cache_${currentProduct.id}`
                                localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: updated }))
                              } catch { /* ignore */ }
                            } catch (e) {
                              console.error(e)
                              // 失败回滚
                              setProduct(previousProduct)
                              setIsEditingHighlights(true)
                              showToast('保存失败: ' + (e.message || '请检查 Supabase 表配置'), 'error')
                            }
                          }}
                        >保存亮点</button>
                      </div>
                    </>
                  )}
                </div>
                {!isEditingHighlights && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-gray-900">{editingCompetitorId ? '编辑竞品' : '添加竞品'}</h3>
                    {!isAddingCompetitor && (
                      <div className="flex items-center space-x-2">
                        <div className={`flex items-center transition-all duration-300 ${isSearchExpanded ? 'w-64' : 'w-8'}`}>
                          {isSearchExpanded ? (
                            <div className="relative w-full">
                              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="text"
                                value={competitorSearch}
                                onChange={(e)=>setCompetitorSearch(e.target.value)}
                                className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="搜索竞品..."
                                autoFocus
                                onBlur={() => { if (!competitorSearch) setIsSearchExpanded(false) }}
                              />
                              <button 
                                onClick={() => { setCompetitorSearch(''); setIsSearchExpanded(false) }}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setIsSearchExpanded(true)}
                              className="p-2 text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-700 rounded-full transition-all "
                              title="搜索竞品"
                            >
                              <Search className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <button
                          className="inline-flex items-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-md text-sm"
                          onClick={()=>{ setIsAddingCompetitor(true); setEditingCompetitorId(null); setNewCompetitor({ name:'', positioning:'', slogan:'', description:'', competitive_highlights:'', features:[], main_customers:[] }); setFeatureInput(''); setCustomersInput('') }}
                        >
                          <Plus className="w-4 h-4" />
                          <span>新建竞品</span>
                        </button>
                      </div>
                    )}
                  </div>
                  {isAddingCompetitor && (
                    <div className="space-y-4">
                      <p className="text-xs text-gray-500">填写以下字段：产品名称、产品定位、产品slogan、产品介绍、产品亮点、特色功能、主要客户</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">产品名称</label>
                          <input
                            type="text"
                            value={newCompetitor.name}
                            onChange={(e)=>setNewCompetitor({ ...newCompetitor, name: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">产品slogan</label>
                          <input
                            type="text"
                            value={newCompetitor.slogan}
                            onChange={(e)=>setNewCompetitor({ ...newCompetitor, slogan: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            placeholder="一句话概括产品"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">产品定位</label>
                          <textarea
                            rows={3}
                            value={newCompetitor.positioning}
                            onChange={(e)=>setNewCompetitor({ ...newCompetitor, positioning: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            placeholder="行业/场景/目标角色"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">产品介绍</label>
                          <textarea
                            rows={3}
                            value={newCompetitor.description}
                            onChange={(e)=>setNewCompetitor({ ...newCompetitor, description: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            placeholder="简要介绍产品与核心价值"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">产品亮点</label>
                          <textarea
                            rows={3}
                            value={newCompetitor.competitive_highlights}
                            onChange={(e)=>setNewCompetitor({ ...newCompetitor, competitive_highlights: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            placeholder="效率/成本/体验/服务等方面的优势，尽量量化"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">特色功能</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {newCompetitor.features.map((tag, i) => (
                                <span key={i} className="inline-flex items-center bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded border border-blue-200">
                                  {tag}
                                  <button type="button" className="ml-1 text-blue-600 hover:text-blue-800" onClick={() => {
                                    const next = newCompetitor.features.filter((_, idx) => idx !== i)
                                    setNewCompetitor({ ...newCompetitor, features: next })
                                  }}>
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                            <input
                              type="text"
                              value={featureInput}
                              onChange={(e)=>setFeatureInput(e.target.value)}
                              onKeyDown={(e)=>{ if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); const t = featureInput.trim(); if (!t) return; if (newCompetitor.features.includes(t)) { setFeatureInput(''); return } setNewCompetitor({ ...newCompetitor, features: [...newCompetitor.features, t] }); setFeatureInput('') } }}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                              placeholder="输入后按回车或逗号添加"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">主要客户</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {newCompetitor.main_customers.map((tag, i) => (
                                <span key={i} className="inline-flex items-center bg-gray-50 text-gray-700 text-xs px-2 py-1 rounded border border-gray-200">
                                  {tag}
                                  <button type="button" className="ml-1 text-gray-600 hover:text-gray-800" onClick={() => {
                                    const next = newCompetitor.main_customers.filter((_, idx) => idx !== i)
                                    setNewCompetitor({ ...newCompetitor, main_customers: next })
                                  }}>
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                            <input
                              type="text"
                              value={customersInput}
                              onChange={(e)=>setCustomersInput(e.target.value)}
                              onKeyDown={(e)=>{ if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); const t = customersInput.trim(); if (!t) return; if (newCompetitor.main_customers.includes(t)) { setCustomersInput(''); return } setNewCompetitor({ ...newCompetitor, main_customers: [...newCompetitor.main_customers, t] }); setCustomersInput('') } }}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                              placeholder="输入后按回车或逗号添加"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={()=>{ setIsAddingCompetitor(false); setEditingCompetitorId(null); setNewCompetitor({ name:'', positioning:'', slogan:'', description:'', competitive_highlights:'', features:[], main_customers:[] }); setFeatureInput(''); setCustomersInput('') }}
                          className="px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-100"
                        >取消</button>
                        <button
                          className="px-3 py-2 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isSavingCompetitor}
                          onClick={async()=>{
                            if (!currentProduct?.id) return
                            const { name, description } = newCompetitor
                            if (!name.trim() || !description.trim()) { showToast('请填写产品名称与产品介绍', 'warning'); return }
                            
                            setIsSavingCompetitor(true)
                            const previousCompetitors = [...competitors]

                            try {
                              const payload = { 
                                name: newCompetitor.name,
                                slogan: newCompetitor.slogan,
                                description: newCompetitor.description,
                                positioning: newCompetitor.positioning,
                                competitive_highlights: newCompetitor.competitive_highlights,
                                features: (newCompetitor.features || []).join(','),
                                main_customers: (newCompetitor.main_customers || []).join(',')
                              }

                              if (editingCompetitorId) {
                                // 乐观更新编辑
                                const optimisticUpdated = { ...competitors.find(c => c.id === editingCompetitorId), ...payload }
                                setCompetitors(competitors.map(x=>x.id===editingCompetitorId ? optimisticUpdated : x))
                                setIsAddingCompetitor(false)
                                setEditingCompetitorId(null)
                                setNewCompetitor({ name:'', positioning:'', slogan:'', description:'', competitive_highlights:'', features:[], main_customers:[] })
                                setFeatureInput(''); setCustomersInput('')
                                
                                // 后台保存
                                const updated = await updateCompetitor(editingCompetitorId, payload)
                                setCompetitors(prev => prev.map(x=>x.id===editingCompetitorId ? updated : x))
                              } else {
                                // 新增暂不使用乐观更新（需要真实ID），但显示加载状态
                                const inserted = await addCompetitor(currentProduct.id, payload)
                                setCompetitors([inserted, ...competitors])
                                setIsAddingCompetitor(false)
                                setEditingCompetitorId(null)
                                setNewCompetitor({ name:'', positioning:'', slogan:'', description:'', competitive_highlights:'', features:[], main_customers:[] })
                                setFeatureInput(''); setCustomersInput('')
                              }
                            } catch (error) {
                              console.error(error)
                              setCompetitors(previousCompetitors)
                              if (editingCompetitorId) setIsAddingCompetitor(true) // Re-open if it was edit
                              showToast(editingCompetitorId ? '更新竞品失败，请检查 Supabase 表配置' : '添加竞品失败，请检查 Supabase 表配置', 'error')
                            } finally {
                              setIsSavingCompetitor(false)
                            }
                          }}
                        >{isSavingCompetitor ? '保存中...' : (editingCompetitorId ? '更新竞品' : '保存竞品')}</button>
                      </div>
                    </div>
                  )}
                </div>
                )}

                {!isEditingHighlights && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {([...competitors]
                    .filter((c)=>{
                      const s = competitorSearch.trim().toLowerCase(); if (!s) return true
                      const name = String(c.name||'').toLowerCase(); const slogan = String(c.slogan||'').toLowerCase(); const desc = String(c.description||'').toLowerCase()
                      return name.includes(s) || slogan.includes(s) || desc.includes(s)
                    })
                    .sort((a,b)=>{ const sa = starredIds[a.id]?1:0; const sb = starredIds[b.id]?1:0; return sb - sa })
                  ).map((c)=>{
                    const customers = String(c.main_customers||'').split(',').map((x)=>x.trim()).filter(Boolean)
                    const featTags = String(c.features||'').split(',').map((x)=>x.trim()).filter(Boolean)
                    
                    return (
                      <div key={c.id} className="group flex flex-col bg-white rounded-xl border border-gray-200 hover: hover:border-blue-200 transition-all duration-300 overflow-hidden h-full">
                        {/* Header Section */}
                        <div className="p-5 flex items-start gap-4 relative">
                          <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden ">
                            <img src={c.logo_url || DEFAULT_COMPETITOR_LOGO} alt="logo" className="w-full h-full object-cover" onError={(e)=>{e.currentTarget.src = DEFAULT_COMPETITOR_LOGO}} />
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center justify-between mb-1 pr-16">
                              <h4 className="text-base font-bold text-gray-900 truncate">{c.name}</h4>
                              <button
                                className={`transition-colors ${starredIds[c.id] ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 hover:text-yellow-500'}`}
                                onClick={()=>setStarredIds(prev=>({ ...prev, [c.id]: !prev[c.id] }))}
                              >
                                <Star className={`w-4 h-4 ${starredIds[c.id] ? 'fill-current' : ''}`} />
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 truncate pr-16">{c.slogan || '暂无标语'}</p>
                            {c.website_url && (
                              <a href={c.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline mt-1.5 font-medium">
                                <ExternalLink className="w-3 h-3" /> 访问官网
                              </a>
                            )}
                          </div>
                          
                          {/* Action Buttons moved to top-right */}
                          <div className="absolute top-5 right-5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                              <button
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                                title="编辑"
                                onClick={()=>{ 
                                  setIsAddingCompetitor(true)
                                  setEditingCompetitorId(c.id)
                                  setNewCompetitor({
                                    name: c.name||'',
                                    positioning: c.positioning||'',
                                    slogan: c.slogan||'',
                                    description: c.description||'',
                                    competitive_highlights: c.competitive_highlights||'',
                                    features: String(c.features||'').split(',').map((x)=>x.trim()).filter(Boolean),
                                    main_customers: String(c.main_customers||'').split(',').map((x)=>x.trim()).filter(Boolean)
                                  })
                                  setFeatureInput('')
                                  setCustomersInput('')
                                }}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                                title="删除"
                                onClick={async()=>{ 
                                  if (!confirm('确定删除该竞品？')) return; 
                                  const prev = [...competitors];
                                  setCompetitors(competitors.filter((x)=>x.id!==c.id)); // 乐观删除
                                  try { 
                                    await deleteCompetitor(c.id); 
                                  } catch (e) { 
                                    setCompetitors(prev); // 失败回滚
                                    alert('删除失败，请检查 Supabase 表配置') 
                                  } 
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-gray-50 mx-5"></div>

                        {/* Body Section */}
                        <div className="p-5 pt-4 flex-1 flex flex-col gap-4">
                          {/* Description */}
                          <div>
                            <div className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                               产品介绍
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {c.description || '暂无简介'}
                            </p>
                          </div>

                          {/* Positioning */}
                          <div>
                            <div className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                               <Target className="w-3.5 h-3.5 text-green-600" /> 产品定位
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {c.positioning || '暂无定位描述'}
                            </p>
                          </div>

                          {/* Competitive Highlights */}
                          <div>
                            <div className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                               <Sparkles className="w-3.5 h-3.5 text-amber-500" /> 竞争亮点
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {c.competitive_highlights || '暂无亮点描述'}
                            </p>
                          </div>

                          {/* Features */}
                          {featTags.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5 text-blue-500" /> 核心功能
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {featTags.map((ft,i)=> (
                                  <span key={i} className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md border border-blue-100">
                                    {ft}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Customers */}
                          {customers.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-blue-500" /> 主要客户
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {customers.map((cust,i)=>(
                                  <span key={i} className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md border border-blue-100">
                                    {cust}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Footer Actions - REMOVED */}
                      </div>
                    )
                  })}
                </div>
                )}
              </div>
              {isEditingHighlights && (
                <div className="lg:col-span-1">
                  <div className="sticky top-6 space-y-4">
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5  h-fit max-h-[70vh] overflow-y-auto mb-4">
                        <div className="flex items-center gap-2 mb-3 text-blue-800">
                          <Lightbulb className="w-5 h-5" />
                          <h4 className="font-semibold">竞争分析指南</h4>
                        </div>
                        <div className="space-y-4 text-sm text-blue-900 opacity-90">
                          <div>
                            <div className="font-medium mb-1">问题1：如何定义亮点？</div>
                            <p className="mb-2">产品亮点，或称核心竞争力、差异化优势，并不仅仅指“别人没有的功能”。它的定义是多维度的，核心在于“为特定客户群体、在特定场景下，提供了相较于其他解决方案而言，更具吸引力的独特价值”。</p>
                            <p className="mb-2">这个“独特价值”可以体现在多个层面：</p>
                            <ul className="list-disc pl-5 space-y-1">
                              <li><span className="font-medium">功能与技术创新（人无我有）</span>：这确实是最直观的亮点，即拥有竞争对手无法轻易模仿的独家技术或功能。例如特斯拉的自动驾驶技术、大疆的飞行控制系统。这是市场宣传中最容易理解的亮点。</li>
                              <li><span className="font-medium">效率与成本优势（人有我优）</span>：即使功能相同，如果你的产品能显著提升效率、降低成本或增加收入，这就是一个“强大的亮点”。例如，你的产品能将原本需要3天完成的工作缩短到半天，或替换过时的系统让客户的获客成本降低约30%。</li>
                              <li><span className="font-medium">体验与易用性（人有我易）</span>：对于复杂的B端产品，极致的易用性本身就是一种核心竞争力。如果产品操作复杂、需要大量培训才能上手，而你的产品设计直观、流程顺畅、能让用户快速掌握，这也是一个能力导向的亮点。Slack就是一个很好的例子，它凭借C端产品的体验颠覆了传统的企业沟通工具。</li>
                              <li><span className="font-medium">服务与生态系统（人有我全）</span>：对于非SaaS的B端产品，这一点尤其重要。你的亮点可能不在软件本身，而在于围绕软件的<strong>整体解决方案</strong>。这包括：专业的咨询与实施服务、快速响应的本地化支持、强大的生态整合能力（能与客户现有的ERP/CRM系统无缝对接，形成一体化）。</li>
                              <li><span className="font-medium">品牌与信任（占领心智）</span>：通过长期积累，在特定领域建立专业、可靠的品牌形象。比如想到到安全、用户会想到某某；这也是一种强大的护城河。</li>
                            </ul>
                            <p className="mt-2">总结：请不要将“亮点”局限于“独立功能”。对于B端产品，“更低的成本”、“更高的效率”、“更好的体验”、“更全面的服务”同样是极具杀伤力的亮点。市场之所以只强调“别人没有”，是因为这最容易被包装和传播，但产品经理要把价值理解得更深、更具体。</p>
                          </div>
                          <div>
                            <div className="font-medium mb-1">问题2：打造产品亮点的思路是什么？</div>
                            <ol className="list-decimal pl-5 space-y-2">
                              <li>
                                <div className="font-medium">深度聚焦，而非广度覆盖</div>
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                  <li>选择你的战场：不要试图覆盖所有客户的所有需求。选择一个你最擅长、资源最匹配的细分市场或特定客户群体。</li>
                                  <li>聚焦核心场景：深入研究这个群体在工作中最痛、最高频的核心业务场景。B端产品的价值在于解决业务问题。</li>
                                </ul>
                              </li>
                              <li>
                                <div className="font-medium">从“差异化”而非“功能列表”出发</div>
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                  <li>建立竞争坐标系：即使找不到可直接试用的竞品，也可以通过市场报告、客户访谈、销售反馈等方式，去描述主要竞争对手的画像（他们主打什么？客户抱怨他们什么？）。</li>
                                  <li>寻找价值差异：在功能、效率、体验、服务这几个维度上，寻找竞品做得不够好，而你又能做得特别出色的点。这就是你的差异化机会。</li>
                                </ul>
                              </li>
                              <li>
                                <div className="font-medium">将“隐性优势”显性化</div>
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                  <li>量化价值：不要只说“我们的产品效率高”，而是要通过数据证明，比如“能为XX规模的企业每年节省XX人天的工作量，折合成本为XX万元”。</li>
                                  <li>故事化包装：将你的亮点融入到一个生动的客户案例中。例如，“某客户之前用传统方式处理XX业务，耗时耗力、错误频出。用了我们的产品后，实现了自动化处理，效率提升5倍，零失误”。</li>
                                </ul>
                              </li>
                              <li>
                                <div className="font-medium">构建组合优势，而非单点突破</div>
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                  <li>单一的功能亮点很容易被模仿。真正的壁垒通常是多个优势的组合。例如：“领先的技术”+“深刻的行业理解”+“极致的服务响应”。</li>
                                  <li>即便别人可以模仿你的某个功能，也很难复制你的<strong>整个体系</strong>。苹果的成功就是“产品创新+生态系统优势”的组合。</li>
                                </ul>
                              </li>
                            </ol>
                          </div>
                        </div>
                      </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'messaging' && (
            <div className="space-y-4">
              {/* Tagline */}
              <div className={`grid grid-cols-1 ${isEditingTagline ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-4`}>
                <div className={isEditingTagline ? "lg:col-span-2" : ""}>
                  <div className="bg-white rounded-xl border border-gray-200 p-6  group">
                     <div className="flex items-center justify-between mb-2">
                       <label className="block text-base font-semibold text-gray-900 flex items-center gap-2">
                         <Lightbulb className="w-4 h-4 text-yellow-600" />
                         宣传语 (Slogan)
                       </label>
                       {!isEditingTagline && (
                          <button
                            onClick={() => setIsEditingTagline(true)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            {formData.tagline ? '编辑' : '添加'}
                          </button>
                       )}
                     </div>

                     {!isEditingTagline ? (
                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                          {formData.tagline || <span className="text-gray-400 italic">暂无宣传语，点击上方按钮添加</span>}
                        </div>
                     ) : (
                        <>
                           <input 
                             type="text" 
                             value={formData.tagline} 
                             onChange={(e)=>{const v=e.target.value; setWizard(prev=>({...prev, tagline:v})); setFormData(prev=>({...prev, tagline:v}))}} 
                             className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-yellow-100 focus:border-yellow-400 transition-all " 
                             placeholder="一句简短有力的口号..."
                             autoFocus
                           />
                           <div className="flex items-center justify-end mt-3 gap-3">
                              <button
                                onClick={() => {
                                  const original = product?.tagline || ''
                                  setFormData(prev => ({ ...prev, tagline: original }))
                                  setWizard(prev => ({ ...prev, tagline: original }))
                                  setIsEditingTagline(false)
                                }}
                                className="px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-100"
                              >
                                取消
                              </button>
                              <button
                                className="px-3 py-2 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={async()=>{
                                  if (!currentProduct?.id) return
                                  
                                  // 乐观更新
                                  const previousProduct = { ...product } // Use local product state for rollback
                                  const optimisticProduct = { ...product, tagline: formData.tagline }
                                  setProduct(optimisticProduct)
                                  setIsEditingTagline(false)

                                  try {
                                    const updated = await updateProduct(currentProduct.id, { tagline: formData.tagline })
                                    setProduct(updated)
                                    // Cache update
                                    try {
                                      const cacheKey = `product_details_cache_${currentProduct.id}`
                                      localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: updated }))
                                    } catch (e) { void 0 }
                                  } catch (e) {
                                    console.error(e)
                                    // Rollback
                                    setProduct(previousProduct)
                                    setFormData(prev => ({ ...prev, tagline: previousProduct.tagline || '' }))
                                    setWizard(prev => ({ ...prev, tagline: previousProduct.tagline || '' }))
                                    setIsEditingTagline(true)
                                   showToast('保存失败: ' + (e.message || '请检查 Supabase 表配置'), 'error')
                                 }
                               }}
                             >
                                保存
                              </button>
                           </div>
                        </>
                     )}
                  </div>
                </div>

                {/* Side Guide */}
                {isEditingTagline && (
                  <div className="lg:col-span-1">
                     <div className="sticky top-6 bg-yellow-50/50 border border-yellow-100 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-yellow-800 text-xs font-bold mb-2">
                          <Lightbulb className="w-3 h-3" />
                          填写指南
                        </div>
                        <p className="text-xs text-yellow-900/80 mb-3 leading-relaxed">
                          {guidanceData.tagline.description}
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                          {guidanceData.tagline.examples.slice(0, 4).map((ex, i) => (
                             <div key={i} className="bg-white rounded px-2 py-1.5 text-xs border border-yellow-100/50">
                                <span className="font-semibold text-yellow-700">{ex.title}:</span> <span className="text-gray-600">{ex.content}</span>
                             </div>
                          ))}
                        </div>
                     </div>
                  </div>
                )}
              </div>

              {!isEditingTagline && (<> {
                !isAddingMessage ? (
                <div className="bg-white rounded-xl border border-gray-200  p-6 mb-4">
                   <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">产品介绍话术列表</h3>
                        <p className="text-xs text-gray-500 mt-1">针对不同受众和渠道的核心沟通话术 ({messagingRows.length})</p>
                      </div>
                      <button 
                        onClick={() => { setEditingMessageIndex(null); setNewMessage({ persona: '', channel: '', pain: '', anchor_message: '' }); setIsAddingMessage(true) }}
                        className="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-700 text-sm font-medium px-4 py-2 rounded-lg transition "
                      >
                        <Plus className="w-4 h-4" />
                        新建产品介绍
                      </button>
                   </div>
                   
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200  p-6">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">{editingMessageIndex !== null ? '编辑关键消息' : '添加关键消息'}</h3>
                  </div>
                  
                  <div className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">目标受众 (Persona)</label>
                           <input
                              type="text"
                              value={newMessage.persona}
                              onChange={(e) => setNewMessage({ ...newMessage, persona: e.target.value })}
                              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                              placeholder="例如：CTO、运维主管..."
                            />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">传播渠道</label>
                           <input
                              type="text"
                              value={newMessage.channel}
                              onChange={(e) => setNewMessage({ ...newMessage, channel: e.target.value })}
                              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                              placeholder="例如：官网首页、销售PPT、技术白皮书..."
                            />
                        </div>
                     </div>
                     
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">核心痛点</label>
                        <input
                          type="text"
                          value={newMessage.pain}
                          onChange={(e) => setNewMessage({ ...newMessage, pain: e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                          placeholder="用户面临的最大问题是什么？"
                        />
                     </div>
                     
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">锚点话术</label>
                        <textarea
                          rows={3}
                          value={newMessage.anchor_message}
                          onChange={(e) => setNewMessage({ ...newMessage, anchor_message: e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                          placeholder="针对该痛点和受众的标准沟通话术..."
                        />
                     </div>
                     
                     
                     
                     <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                        <button 
                          onClick={() => { setIsAddingMessage(false); setEditingMessageIndex(null); setNewMessage({ persona: '', channel: '', pain: '', anchor_message: '' }) }}
                          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition"
                        >
                          取消
                        </button>
                        <button 
                          onClick={async () => {
                            const { persona, channel, pain, anchor_message } = newMessage
                            if (!persona.trim() || !channel.trim() || !pain.trim() || !anchor_message.trim()) {
                              showToast('请填写完整信息', 'warning')
                              return
                            }
                            
                            try {
                              if (editingMessageIndex !== null) {
                                const msgToUpdate = messagingRows[editingMessageIndex]
                                if (msgToUpdate?.id) {
                                  const updated = await updateProductMessaging(msgToUpdate.id, newMessage)
                                  const next = [...messagingRows]
                                  next[editingMessageIndex] = updated
                                  setMessagingRows(next)
                                }
                              } else {
                                const inserted = await addProductMessaging(currentProduct.id, newMessage)
                                setMessagingRows([...messagingRows, inserted])
                              }
                              setNewMessage({ persona: '', channel: '', pain: '', anchor_message: '' })
                              setEditingMessageIndex(null)
                              setIsAddingMessage(false)
                            } catch (e) {
                              showToast('保存失败，请检查数据库配置', 'error')
                            }
                          }}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition  flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          <span>{editingMessageIndex !== null ? '更新消息' : '保存消息'}</span>
                        </button>
                     </div>
                  </div>
                </div>
              )}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {messagingRows.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                          <p>暂无消息，点击右上角添加第一条关键消息</p>
                        </div>
                      ) : (
                        messagingRows.map((row, idx) => (
                          <div key={idx} className="group bg-white rounded-lg border border-gray-200 p-4 transition relative hover:bg-gray-50 group-hover:border-blue-300">
                             <div className="flex justify-between items-start pb-2 mb-2 border-b border-gray-100">
                                <div className="flex gap-2">
                                   <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded font-medium">{row.persona}</span>
                                   <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">{row.channel}</span>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                                  <button
                                    onClick={() => { try { navigator.clipboard?.writeText(row.anchor_message || ''); showToast('已复制', 'success'); } catch (e) { /* noop */ } }}
                                    className="text-gray-400 hover:text-blue-600 transition"
                                    title="复制话术"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setEditingMessageIndex(idx)
                                      setNewMessage({
                                        persona: row.persona || '',
                                        channel: row.channel || '',
                                        pain: row.pain || '',
                                        anchor_message: row.anchor_message || ''
                                      })
                                      setIsAddingMessage(true)
                                    }}
                                    className="text-gray-400 hover:text-blue-600 transition"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={async () => {
                                      if (!await confirm({ title: '删除消息', message: '确定删除？' })) return
                                      if (row.id) {
                                        try {
                                          await deleteProductMessaging(row.id)
                                          setMessagingRows(messagingRows.filter(item => item.id !== row.id))
                                        } catch (e) {
                                          showToast('删除失败', 'error')
                                        }
                                      }
                                    }}
                                    className="text-gray-400 hover:text-red-600 transition"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                 <div>
                                    <div className="text-xs text-gray-500 mb-1">痛点</div>
                                    <div className="text-sm text-gray-900 line-clamp-2">{row.pain}</div>
                                 </div>
                                 <div>
                                    <div className="text-xs text-gray-500 mb-1">话术</div>
                                    <div className="text-sm font-medium text-gray-900 line-clamp-3 border-l-2 border-blue-500 pl-3 bg-blue-50/30 rounded">{row.anchor_message}</div>
                                 </div>
                              </div>
                           </div>
                         ))
                       )}
                   </div>
              </>)}
              

            </div>
          )}

          {activeTab === 'stories' && (
            <div className={`grid grid-cols-1 ${isAddingStory ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
              <div className="lg:col-span-2 space-y-6">
                {!isAddingStory ? (
                  <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 ">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">用户画像列表</h3>
                      <p className="text-xs text-gray-500 mt-1">已记录 {storiesData.length} 个用户画像</p>
                    </div>
                    <button
                      onClick={() => { setEditingStoryIndex(null); setNewStory({ who: '', role_tag: '', user_goal: '', max_pain: '', existing_solution: '', our_solution: '', is_primary: false }); setIsAddingStory(true) }}
                      className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition "
                    >
                      <Plus className="w-4 h-4" />
                      <span>新建画像</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 p-4 ">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-gray-900">{editingStoryIndex !== null ? '编辑用户画像' : '添加用户画像'}</h3>
                      <span className="text-xs text-gray-500">基于用户群体特征与目标刻画画像</span>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          value={newStory.who}
                          onChange={(e) => setNewStory({ ...newStory, who: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                          placeholder="画像名称（例如：忙碌的项目经理）"
                        />
                        <input
                          type="text"
                          value={newStory.role_tag}
                          onChange={(e) => setNewStory({ ...newStory, role_tag: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                          placeholder="角色标签（例如：技术团队负责人）"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">用户目标/任务</label>
                          <textarea
                            value={newStory.user_goal}
                            onChange={(e) => setNewStory({ ...newStory, user_goal: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            placeholder="他们想要达成什么..."
                            rows={2}
                          />
                        </div>
                        <div>
                           <label className="block text-xs font-medium text-gray-700 mb-1">最大痛点</label>
                          <textarea
                            value={newStory.max_pain}
                            onChange={(e) => setNewStory({ ...newStory, max_pain: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            placeholder="当前解决方案的问题..."
                            rows={2}
                          />
                        </div>
                         <div>
                           <label className="block text-xs font-medium text-gray-700 mb-1">现有方案</label>
                          <textarea
                            value={newStory.existing_solution}
                            onChange={(e) => setNewStory({ ...newStory, existing_solution: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            placeholder="他们现在怎么做..."
                            rows={2}
                          />
                        </div>
                         <div>
                           <label className="block text-xs font-medium text-gray-700 mb-1">我们的解决方案</label>
                          <textarea
                            value={newStory.our_solution}
                            onChange={(e) => setNewStory({ ...newStory, our_solution: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            placeholder="我们如何解决这个问题..."
                            rows={2}
                          />
                        </div>
                      </div>
  
                      <div className="flex items-center justify-between pt-2">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newStory.is_primary}
                            onChange={(e) => setNewStory({ ...newStory, is_primary: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">标记为主要用户画像</span>
                        </label>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => { setIsAddingStory(false); setEditingStoryIndex(null); setNewStory({ who: '', role_tag: '', user_goal: '', max_pain: '', existing_solution: '', our_solution: '', is_primary: false }) }}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition"
                          >
                            取消
                          </button>
                          <button
                            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition "
                            onClick={async () => {
                              const { who, user_goal, max_pain } = newStory
                              if (!who.trim() || !user_goal.trim() || !max_pain.trim()) {
                                showToast('请填写画像名称、用户目标和最大痛点', 'warning')
                                return
                              }
                              
                              const cacheKey = `product_stories_cache_${currentProduct.id}`
                              const prevStories = [...storiesData]
                              
                              // 乐观更新
                              if (editingStoryIndex !== null) {
                                // 更新
                                const storyToUpdate = storiesData[editingStoryIndex]
                                const optimUpdated = { ...storyToUpdate, ...newStory }
                                const next = [...storiesData]
                                next[editingStoryIndex] = optimUpdated
                                setStoriesData(next)
                                localStorage.setItem(cacheKey, JSON.stringify(next)) // 更新缓存
                                
                                setIsAddingStory(false)
                                setEditingStoryIndex(null)
                                setNewStory({ who: '', role_tag: '', user_goal: '', max_pain: '', existing_solution: '', our_solution: '', is_primary: false })

                                try {
                                  if (storyToUpdate?.id) {
                                    const updated = await updateProductStory(storyToUpdate.id, newStory)
                                    // 后台确认更新
                                    setStoriesData(curr => {
                                      const n = [...curr]
                                      const idx = n.findIndex(s => s.id === updated.id)
                                      if (idx !== -1) n[idx] = updated
                                      localStorage.setItem(cacheKey, JSON.stringify(n))
                                      return n
                                    })
                                  }
                                } catch (e) {
                                  showToast('保存失败，正在恢复...', 'error')
                                  setStoriesData(prevStories)
                                  localStorage.setItem(cacheKey, JSON.stringify(prevStories))
                                }
                              } else {
                                // 新建
                                const tempId = 'temp_' + Date.now()
                                const optimNew = { ...newStory, id: tempId, product_id: currentProduct.id }
                                const next = [...storiesData, optimNew]
                                setStoriesData(next)
                                localStorage.setItem(cacheKey, JSON.stringify(next))
                                
                                setIsAddingStory(false)
                                setEditingStoryIndex(null)
                                setNewStory({ who: '', role_tag: '', user_goal: '', max_pain: '', existing_solution: '', our_solution: '', is_primary: false })

                                try {
                                  const inserted = await addProductStory(currentProduct.id, newStory)
                                  setStoriesData(curr => {
                                    const n = curr.map(s => s.id === tempId ? inserted : s)
                                    localStorage.setItem(cacheKey, JSON.stringify(n))
                                    return n
                                  })
                                } catch (e) {
                                  showToast('保存失败，正在恢复...', 'error')
                                  setStoriesData(prevStories)
                                  localStorage.setItem(cacheKey, JSON.stringify(prevStories))
                                }
                              }
                            }}
                          >
                            {editingStoryIndex !== null ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            <span>{editingStoryIndex !== null ? '更新画像' : '保存画像'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
  
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {storiesData.map((s, idx) => (
                    <div key={idx} className="group relative bg-white rounded-xl border border-gray-200  hover: hover:border-blue-200 transition-all duration-200 flex flex-col h-full overflow-hidden">
                      {/* Header Section */}
                      <div className="p-5 border-b border-gray-50 bg-gray-50/30">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 ">
                              <Users className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-gray-900 text-base">{s.who}</h3>
                                {s.is_primary && (
                                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200 flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                    核心画像
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 mt-0.5 font-medium">{s.role_tag || '未设定角色标签'}</div>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4 bg-white  border border-gray-100 rounded-lg p-1">
                            <button
                              aria-label="编辑用户画像"
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                              onClick={() => { setEditingStoryIndex(idx); setNewStory({ who: s.who || '', role_tag: s.role_tag || '', user_goal: s.user_goal || '', max_pain: s.max_pain || '', existing_solution: s.existing_solution || '', our_solution: s.our_solution || '', is_primary: !!s.is_primary }); setIsAddingStory(true) }}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <div className="w-px h-3 bg-gray-200 mx-0.5"></div>
                            <button
                              aria-label="删除用户画像"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                              onClick={async () => {
                                if (!await confirm({ title: '删除用户画像', message: '确定删除？' })) return
                                if (s.id) {
                                  const cacheKey = `product_stories_cache_${currentProduct.id}`
                                  const prevStories = [...storiesData]
                                  const next = storiesData.filter(item => item.id !== s.id)
                                  
                                  setStoriesData(next)
                                  localStorage.setItem(cacheKey, JSON.stringify(next))

                                  try {
                                    await deleteProductStory(s.id)
                                  } catch (e) {
                                    showToast('删除失败', 'error')
                                    setStoriesData(prevStories)
                                    localStorage.setItem(cacheKey, JSON.stringify(prevStories))
                                  }
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Body Section */}
                      <div className="p-5 space-y-4 flex-1">
                        {/* Goal & Pain Grid */}
                        <div className="space-y-3">
                          <div className="bg-blue-50/30 rounded-lg p-3 border border-blue-100/50">
                            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1.5">
                              <Target className="w-3.5 h-3.5" /> 目标 (Goal)
                            </div>
                            <div className="text-sm text-gray-800 leading-relaxed">{s.user_goal || '-'}</div>
                          </div>
                          
                          <div className="bg-red-50/30 rounded-lg p-3 border border-red-100/50">
                            <div className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-wider mb-1.5">
                              <AlertCircle className="w-3.5 h-3.5" /> 痛点 (Pain)
                            </div>
                            <div className="text-sm text-gray-800 leading-relaxed">{s.max_pain || '-'}</div>
                          </div>
                        </div>

                        {/* Solutions Comparison */}
                        {(s.existing_solution || s.our_solution) && (
                          <div className="pt-2 mt-2 border-t border-dashed border-gray-100">
                            <div className="grid grid-cols-2 gap-4 relative pt-2">
                              {/* Vertical Divider */}
                              <div className="absolute left-1/2 top-2 bottom-0 w-px bg-gray-100 -ml-px"></div>

                              <div className="pr-2">
                                <div className="text-xs text-gray-400 mb-1.5 font-medium">现有方案</div>
                                <div className="text-xs text-gray-500 leading-relaxed line-clamp-3">{s.existing_solution || '-'}</div>
                              </div>
                              
                              <div className="pl-2">
                                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold mb-1.5">
                                  <Lightbulb className="w-3 h-3" />
                                  我们的方案
                                </div>
                                <div className="text-xs text-gray-900 font-medium leading-relaxed line-clamp-3 bg-emerald-50/50 p-1.5 -m-1.5 rounded">{s.our_solution || '-'}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {isAddingStory && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 h-fit max-h-[80vh] overflow-y-auto">
                    <div className="flex items-center gap-2 mb-3 text-blue-800">
                      <Lightbulb className="w-5 h-5" />
                      <h3 className="font-semibold">用户画像指南</h3>
                    </div>
                    <div className="space-y-4 text-sm text-blue-900">
                      <div>
                        <h4 className="font-medium mb-1">什么是用户画像？</h4>
                        <p className="text-blue-700/80">用户画像是对目标用户群体的特征、目标、痛点与行为的结构化刻画，帮助团队理解用户是谁、他们的动机与约束。</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium">核心要素</h4>
                        <div className="bg-white/50 p-2 rounded border border-blue-100">
                          <div className="font-medium text-blue-800">Who (画像)</div>
                          <div className="text-xs text-blue-600">谁是你的用户？例如：忙碌的销售经理。</div>
                        </div>
                        <div className="bg-white/50 p-2 rounded border border-blue-100">
                           <div className="font-medium text-blue-800">Goal (目标)</div>
                          <div className="text-xs text-blue-600">他们想要达成什么？例如：快速录入客户信息。</div>
                        </div>
                        <div className="bg-white/50 p-2 rounded border border-blue-100">
                           <div className="font-medium text-blue-800">Pain (痛点)</div>
                          <div className="text-xs text-blue-600">现在的困难是什么？例如：手动录入太慢，容易出错。</div>
                        </div>
                         <div className="bg-white/50 p-2 rounded border border-blue-100">
                         <div className="font-medium text-blue-800">Behavior (行为)</div>
                        <div className="text-xs text-blue-600">他们的典型行为与决策习惯，例如：常用移动端、偏好自动化。</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="mb-6 border border-gray-200 rounded-lg">
              
              {expandedSections.basic && (
                <div className="p-4 space-y-4">
              {editing.basic ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">产品名称</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">产品分类</label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="如：SaaS、电商、教育等"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">概览摘要</label>
                    <textarea
                      value={formData.overview_short}
                      onChange={(e) => {
                        const v = e.target.value.slice(0, 200)
                        setFormData({ ...formData, overview_short: v })
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-24"
                      placeholder="用100–200字总结产品与核心价值"
                    />
                    <div className={`mt-1 text-xs ${basicErrors.overview_short ? 'text-red-600' : 'text-gray-500'}`}>{(formData.overview_short || '').length}/200</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">产品定位</label>
                      <input
                        type="text"
                        value={formData.positioning}
                        onChange={(e) => setFormData({ ...formData, positioning: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="行业/场景/目标角色"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">所属行业</label>
                      <input
                        type="text"
                        value={formData.industry}
                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="如：SaaS/电商/教育等"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">版本号</label>
                      <input
                        type="text"
                        value={formData.version}
                        onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="如：1.2.0"
                      />
                      {basicErrors.version && <div className="mt-1 text-xs text-red-600">{basicErrors.version}</div>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">发布日期</label>
                      <input
                        type="date"
                        value={formData.release_date}
                        onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">阶段</label>
                      <select
                        value={formData.lifecycle_stage}
                        onChange={(e) => setFormData({ ...formData, lifecycle_stage: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="alpha">Alpha</option>
                        <option value="beta">Beta</option>
                        <option value="ga">GA</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">文档链接</label>
                      <input
                        type="url"
                        value={formData.docs_url}
                        onChange={(e) => setFormData({ ...formData, docs_url: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="https://docs.example.com"
                      />
                      {basicErrors.docs_url && <div className="mt-1 text-xs text-red-600">{basicErrors.docs_url}</div>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">演示链接</label>
                      <input
                        type="url"
                        value={formData.demo_url}
                        onChange={(e) => setFormData({ ...formData, demo_url: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="https://demo.example.com"
                      />
                      {basicErrors.demo_url && <div className="mt-1 text-xs text-red-600">{basicErrors.demo_url}</div>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">下载链接</label>
                      <input
                        type="url"
                        value={formData.download_url}
                        onChange={(e) => setFormData({ ...formData, download_url: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="https://download.example.com"
                      />
                      {basicErrors.download_url && <div className="mt-1 text-xs text-red-600">{basicErrors.download_url}</div>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">核心卖点（最多5条）</label>
                    <div className="space-y-2">
                      {formData.key_points.map((kp, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={kp}
                            onChange={(e) => {
                              const arr = [...formData.key_points]
                              arr[idx] = e.target.value.slice(0, 25)
                              setFormData({ ...formData, key_points: arr })
                            }}
                            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                          />
                          <button
                            onClick={() => {
                              const arr = formData.key_points.filter((_, i) => i !== idx)
                              setFormData({ ...formData, key_points: arr })
                            }}
                            className="px-2 py-1 text-sm text-red-600 bg-red-50 rounded"
                          >
                            删除
                          </button>
                        </div>
                      ))}
                      {formData.key_points.length < 5 && (
                        <button
                          onClick={() => setFormData({ ...formData, key_points: [...formData.key_points, ''] })}
                          className="px-3 py-1 text-sm text-white bg-blue-600 rounded"
                        >
                          添加卖点
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">用例概览（最多3条）</label>
                    <div className="space-y-2">
                      {formData.use_cases.map((uc, idx) => (
                        <div key={idx} className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={uc?.name || ''}
                            onChange={(e) => {
                              const arr = [...formData.use_cases]
                              arr[idx] = { ...(arr[idx] || {}), name: e.target.value.slice(0, 20) }
                              setFormData({ ...formData, use_cases: arr })
                            }}
                            className="border border-gray-300 rounded px-3 py-2 text-sm"
                            placeholder="场景名"
                          />
                          <input
                            type="text"
                            value={uc?.summary || ''}
                            onChange={(e) => {
                              const arr = [...formData.use_cases]
                              arr[idx] = { ...(arr[idx] || {}), summary: e.target.value.slice(0, 40) }
                              setFormData({ ...formData, use_cases: arr })
                            }}
                            className="border border-gray-300 rounded px-3 py-2 text-sm"
                            placeholder="一句话描述"
                          />
                        </div>
                      ))}
                      {formData.use_cases.length < 3 && (
                        <button
                          onClick={() => setFormData({ ...formData, use_cases: [...formData.use_cases, { name: '', summary: '' }] })}
                          className="px-3 py-1 text-sm text-white bg-blue-600 rounded"
                        >
                          添加用例
                        </button>
                      )}
                    </div>
                  </div>
                  
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">产品描述</label>
                    <Suspense fallback={<div className="text-sm text-gray-500">编辑器加载中...</div>}>
                      <RichTextEditorLazy
                        initialContent={formData.description}
                        onChange={(content) => setFormData({...formData, description: content})}
                        placeholder="详细描述产品的功能、用途和价值"
                        height="150px"
                      />
                    </Suspense>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">目标用户</label>
                      <textarea
                        value={formData.target_audience}
                        onChange={(e) => setFormData({...formData, target_audience: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-20"
                        placeholder="描述目标用户群体"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">价值主张</label>
                      <textarea
                        value={formData.value_proposition}
                        onChange={(e) => setFormData({...formData, value_proposition: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-20"
                        placeholder="产品为用户带来的核心价值"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">官网链接</label>
                      <input
                        type="url"
                        value={formData.website_url}
                        onChange={(e) => setFormData({...formData, website_url: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="https://example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Logo链接</label>
                      <input
                        type="url"
                        value={formData.logo_url}
                        onChange={(e) => setFormData({...formData, logo_url: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">产品状态</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      {statusOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setEditing({...editing, basic: false})}
                      className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSaveBasicInfo}
                      disabled={Object.keys(basicErrors).length > 0}
                      className={`px-3 py-1 text-sm text-white rounded ${Object.keys(basicErrors).length > 0 ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                      保存
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-base font-semibold text-gray-900">{product.name || '未填写'}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${statusOptions.find(s => s.value === product.status)?.color || 'bg-gray-100 text-gray-800'}`}>{statusOptions.find(s => s.value === product.status)?.label || '未填写'}</span>
                    </div>
                    <button onClick={() => setEditing({...editing, basic: true})} className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700">编辑</button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="text-xs text-gray-500 mb-1">概览摘要</div>
                      <div className="text-sm text-gray-900">{product.overview_short || '未填写'}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Array.isArray(product.key_points) && product.key_points.length > 0 ? (
                          product.key_points.map((kp, i) => (
                            <span key={i} className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700">{kp}</span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">未填写核心卖点</span>
                        )}
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="text-xs text-gray-500 mb-2">重要链接</div>
                      <div className="flex flex-wrap gap-2">
                        <a href={product.website_url || '#'} target={product.website_url ? '_blank' : undefined} rel={product.website_url ? 'noreferrer' : undefined} className={`text-xs px-2 py-1 rounded ${product.website_url ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>官网</a>
                        <a href={product.docs_url || '#'} target={product.docs_url ? '_blank' : undefined} rel={product.docs_url ? 'noreferrer' : undefined} className={`text-xs px-2 py-1 rounded ${product.docs_url ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>文档</a>
                        <a href={product.demo_url || '#'} target={product.demo_url ? '_blank' : undefined} rel={product.demo_url ? 'noreferrer' : undefined} className={`text-xs px-2 py-1 rounded ${product.demo_url ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>演示</a>
                        <a href={product.download_url || '#'} target={product.download_url ? '_blank' : undefined} rel={product.download_url ? 'noreferrer' : undefined} className={`text-xs px-2 py-1 rounded ${product.download_url ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>下载</a>
                        <a href={product.logo_url || '#'} target={product.logo_url ? '_blank' : undefined} rel={product.logo_url ? 'noreferrer' : undefined} className={`text-xs px-2 py-1 rounded ${product.logo_url ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>Logo</a>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-3">
                      <div className="text-xs text-gray-500">产品分类</div>
                      <div className="text-sm text-gray-900">{product.category || '未填写'}</div>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-3">
                      <div className="text-xs text-gray-500">阶段</div>
                      <div className="text-sm text-gray-900">{product.lifecycle_stage ? product.lifecycle_stage.toUpperCase() : '未填写'}</div>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-3">
                      <div className="text-xs text-gray-500">产品定位</div>
                      <div className="text-sm text-gray-900">{product.positioning || '未填写'}</div>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-3">
                      <div className="text-xs text-gray-500">所属行业</div>
                      <div className="text-sm text-gray-900">{product.industry || '未填写'}</div>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-3">
                      <div className="text-xs text-gray-500">版本号</div>
                      <div className="text-sm text-gray-900">{product.version || '未填写'}</div>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-3">
                      <div className="text-xs text-gray-500">发布日期</div>
                      <div className="text-sm text-gray-900">{product.release_date || '未填写'}</div>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-3">
                      <div className="text-xs text-gray-500">目标用户</div>
                      <div className="text-sm text-gray-900">{product.target_audience || '未填写'}</div>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-3">
                      <div className="text-xs text-gray-500">价值主张</div>
                      <div className="text-sm text-gray-900">{product.value_proposition || '未填写'}</div>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-3 col-span-2">
                      <div className="text-xs text-gray-500">标签</div>
                      <div className="text-sm text-gray-900">{(Array.isArray(product.tags) ? product.tags.join('、') : (String(product.tags || '').split(',').map(t => t.trim()).filter(Boolean).join('、'))) || '未填写'}</div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="text-xs text-gray-500 mb-1">产品描述</div>
                    {product.description ? (
                      <div className="text-sm text-gray-900" dangerouslySetInnerHTML={{ __html: product.description }} />
                    ) : (
                      <div className="text-sm text-gray-900">未填写</div>
                    )}
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="text-xs text-gray-500 mb-1">用例概览</div>
                    {Array.isArray(product.use_cases) && product.use_cases.length ? (
                      <div className="text-sm text-gray-900">{product.use_cases.map(uc => `${uc?.name || ''}${uc?.summary ? '·' + uc.summary : ''}`).join('；')}</div>
                    ) : (
                      <div className="text-sm text-gray-900">未填写</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
          )}

        

        

        {activeTab === 'docs' && (
        <div className="mt-6 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-gray-600" />
              <h3 className="font-medium text-gray-900">知识库与文档</h3>
              <span className="text-xs text-gray-500">({docs.length})</span>
            </div>
          </div>
          <div className="p-4 space-y-4">
            {docsLoading && (
              <div className="text-sm text-gray-500">加载中...</div>
            )}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-3 gap-3 mb-3">
                <input
                  type="text"
                  placeholder="文档标题"
                  value={newDoc.title}
                  onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2 text-sm"
                />
                <select
                  value={newDoc.doc_type}
                  onChange={(e) => setNewDoc({ ...newDoc, doc_type: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="guide">指南</option>
                  <option value="api">API</option>
                  <option value="deployment">部署</option>
                  <option value="whitepaper">白皮书</option>
                </select>
                <input
                  type="url"
                  placeholder="文档链接"
                  value={newDoc.url}
                  onChange={(e) => setNewDoc({ ...newDoc, url: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={async () => {
                    if (!newDoc.title.trim() || !newDoc.url.trim()) return
                    try {
                      const inserted = await addProductDoc(currentProduct.id, newDoc)
                      setDocs([...docs, inserted])
                      setNewDoc({ title: '', doc_type: 'guide', url: '', tags: [] })
                    } catch (error) {
                      showToast('保存失败', 'error')
                    }
                  }}
                  className="flex items-center space-x-1 px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                >
                  <Plus className="w-3 h-3" />
                  <span>添加文档</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {docs.map((doc) => (
                <div key={doc.id} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900">{doc.title}</h4>
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                          {doc.doc_type}
                        </span>
                      </div>
                      <a href={doc.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600">
                        {doc.url}
                      </a>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await deleteProductDoc(doc.id)
                          setDocs(docs.filter((d) => d.id !== doc.id))
                        } catch (error) {
                          showToast('删除失败，请检查 Supabase 表配置', 'error')
                        }
                      }}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {docs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无文档，请添加第一个文档链接</p>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {activeTab === 'faqs' && (
        <div className="mt-6 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-gray-600" />
              <h3 className="font-medium text-gray-900">常见问题（FAQ）</h3>
              <span className="text-xs text-gray-500">({faqs.length})</span>
            </div>
          </div>
          <div className="p-4 space-y-4">
            {faqsLoading && (
              <div className="text-sm text-gray-500">加载中...</div>
            )}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  placeholder="问题"
                  value={newFaq.question}
                  onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2 text-sm"
                />
                <select
                  value={newFaq.category}
                  onChange={(e) => setNewFaq({ ...newFaq, category: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="general">通用</option>
                  <option value="pricing">定价</option>
                  <option value="integration">集成</option>
                  <option value="security">安全</option>
                </select>
              </div>
              <textarea
                placeholder="答案"
                value={newFaq.answer}
                onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-24 mb-3"
              />
              <div className="flex justify-end">
                <button
                  onClick={async () => {
                    if (!newFaq.question.trim() || !newFaq.answer.trim()) return
                    try {
                      const inserted = await addProductFaq(currentProduct.id, newFaq)
                      setFaqs([...faqs, inserted])
                      setNewFaq({ question: '', answer: '', category: 'general' })
                    } catch (error) {
                      showToast('添加常见问题失败，请检查 Supabase 表配置', 'error')
                    }
                  }}
                  className="flex items-center space-x-1 px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                >
                  <Plus className="w-3 h-3" />
                  <span>添加问题</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {faqs.map((faq) => (
                <div key={faq.id} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900">{faq.question}</h4>
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                          {faq.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{faq.answer}</p>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await deleteProductFaq(faq.id)
                          setFaqs(faqs.filter((f) => f.id !== faq.id))
                        } catch (error) {
                          showToast('删除失败，请检查 Supabase 表配置', 'error')
                        }
                      }}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {faqs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无常见问题，请添加第一个问题</p>
                </div>
              )}
            </div>
          </div>
        </div>
        )}
        </div>
      </div>
      {/* AI Positioning Assistant */}
      <AiPositioningAssistant
        isOpen={showAiPositioning}
        onClose={() => setShowAiPositioning(false)}
        currentPositioning={formData.positioning}
        initialData={{
          targetAudience: formData.target_audience,
          painPoint: formData.pain_point,
          category: formData.product_category,
          keyBenefit: formData.key_benefit,
          competitor: formData.core_competitor,
          differentiation: formData.differentiation
        }}
        onApply={(text, guideData) => {
          setFormData(prev => {
            const next = { ...prev, positioning: text }
            if (guideData) {
              if (guideData.targetAudience) next.target_audience = guideData.targetAudience
              if (guideData.painPoint) next.pain_point = guideData.painPoint
              if (guideData.category) next.product_category = guideData.category
              if (guideData.keyBenefit) next.key_benefit = guideData.keyBenefit
              if (guideData.competitor) next.core_competitor = guideData.competitor
              if (guideData.differentiation) next.differentiation = guideData.differentiation
            }
            return next
          })
          setWizard(prev => ({ ...prev, positioning: text }))
          setShowAiPositioning(false)
        }}
      />
      
    </div>
  )
}
