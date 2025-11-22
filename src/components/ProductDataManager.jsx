import { useState, useEffect, lazy, Suspense } from 'react'
import { Edit, Plus, Trash2, Save, X, Tag, Target, Lightbulb, Package, Settings, ChevronDown, ChevronUp, BookOpen, HelpCircle } from 'lucide-react'
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
  deleteProductFaq
} from '../services/api'
const RichTextEditorLazy = lazy(() => import('./RichTextEditor'))

export default function ProductDataManager({ currentProduct }) {
  const [product, setProduct] = useState(null)
  const [sellingPoints, setSellingPoints] = useState([])
  const [features, setFeatures] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [basicErrors, setBasicErrors] = useState({})
  const [docs, setDocs] = useState([])
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [sellingLoading, setSellingLoading] = useState(false)
  const [featuresLoading, setFeaturesLoading] = useState(false)
  const [docsLoading, setDocsLoading] = useState(false)
  const [faqsLoading, setFaqsLoading] = useState(false)
  const [sellingLoaded, setSellingLoaded] = useState(false)
  const [featuresLoaded, setFeaturesLoaded] = useState(false)
  const [docsLoaded, setDocsLoaded] = useState(false)
  const [faqsLoaded, setFaqsLoaded] = useState(false)
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
    value_proposition: '',
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

  // 产品状态选项
  const statusOptions = [
    { value: 'active', label: '活跃', color: 'bg-green-100 text-green-800' },
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
  useEffect(() => {
    if (currentProduct?.id) {
      loadProductData()
      setSellingPoints([])
      setFeatures([])
      setDocs([])
      setFaqs([])
      setSellingLoaded(false)
      setFeaturesLoaded(false)
      setDocsLoaded(false)
      setFaqsLoaded(false)
    }
  }, [currentProduct])

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
    const verOk = (v) => {
      if (!v) return true
      return /^\d+\.\d+\.\d+$/.test(v)
    }
    if (!verOk(formData.version)) errs.version = '版本号需为x.y.z'
    if (!urlOk(formData.docs_url)) errs.docs_url = '文档链接需为http/https'
    if (!urlOk(formData.demo_url)) errs.demo_url = '演示链接需为http/https'
    if (!urlOk(formData.download_url)) errs.download_url = '下载链接需为http/https'
    if ((formData.overview_short || '').length > 200) errs.overview_short = '摘要不超过200字'
    if ((formData.key_points || []).some((s) => (s || '').length > 25)) errs.key_points = '卖点单条不超过25字'
    setBasicErrors(errs)
  }, [formData])

  const loadProductData = async () => {
    try {
      setLoading(true)
      const productData = await getProductDetails(currentProduct.id)
      setProduct(productData)
      
      // 初始化表单数据
      setFormData({
        name: productData.name || '',
        description: productData.description || '',
        tagline: productData.tagline || '',
        target_audience: productData.target_audience || '',
        value_proposition: productData.value_proposition || '',
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
        use_cases: Array.isArray(productData.use_cases) ? productData.use_cases : []
      })
    } catch (error) {
      console.error('加载产品数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const fetchByTab = async () => {
      if (!currentProduct?.id) return
      if (activeTab === 'sellingPoints' && !sellingLoaded) {
        setSellingLoading(true)
        try {
          const data = await getProductSellingPoints(currentProduct.id)
          setSellingPoints(data)
          setSellingLoaded(true)
        } catch (e) {
          setSellingPoints([])
        } finally {
          setSellingLoading(false)
        }
      }
      if (activeTab === 'features' && !featuresLoaded) {
        setFeaturesLoading(true)
        try {
          const data = await getProductFeatures(currentProduct.id)
          setFeatures(data)
          setFeaturesLoaded(true)
        } catch (e) {
          setFeatures([])
        } finally {
          setFeaturesLoading(false)
        }
      }
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
    }
    fetchByTab()
  }, [activeTab, currentProduct])

  // 保存基础信息
  const handleSaveBasicInfo = async () => {
    try {
      if (Object.keys(basicErrors).length > 0) {
        alert('请修正表单校验错误后再保存')
        return
      }
      const rawUpdates = {
        name: formData.name,
        description: formData.description,
        tagline: formData.tagline,
        target_audience: formData.target_audience,
        value_proposition: formData.value_proposition,
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
        release_date: formData.release_date,
        lifecycle_stage: formData.lifecycle_stage,
        key_points: formData.key_points,
        use_cases: formData.use_cases
      }
      const allowedKeys = Object.keys(product || {})
      const filteredUpdates = Object.fromEntries(
        Object.entries(rawUpdates).filter(([k]) => allowedKeys.includes(k))
      )
      const updatedProduct = await updateProduct(currentProduct.id, filteredUpdates)
      setProduct(updatedProduct)
      setEditing({ ...editing, basic: false })
    } catch (error) {
      console.error('保存基础信息失败:', error)
      alert('保存失败，请重试')
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
      alert('添加失败，请重试')
    }
  }

  // 删除卖点
  const handleDeleteSellingPoint = async (sellingPointId) => {
    if (!confirm('确定要删除这个卖点吗？')) return
    
    try {
      await deleteProductSellingPoint(sellingPointId)
      setSellingPoints(sellingPoints.filter(sp => sp.id !== sellingPointId))
    } catch (error) {
      console.error('删除卖点失败:', error)
      alert('删除失败，请重试')
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
      alert('添加失败，请重试')
    }
  }

  // 删除特性
  const handleDeleteFeature = async (featureId) => {
    if (!confirm('确定要删除这个特性吗？')) return
    
    try {
      await deleteProductFeature(featureId)
      setFeatures(features.filter(f => f.id !== featureId))
    } catch (error) {
      console.error('删除特性失败:', error)
      alert('删除失败，请重试')
    }
  }

  // 切换章节展开/收起
  const toggleSection = (section) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section]
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  if (!currentProduct) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">请先选择一个产品</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm h-full flex flex-col">
      {/* 头部 */}
      <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Settings className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">产品资料管理</h2>
          </div>
          <div className="text-sm text-gray-500">
            {currentProduct.name}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center space-x-2 mb-4 overflow-x-auto">
            {[
              { key: 'overview', label: '概览' },
              { key: 'sellingPoints', label: `卖点(${sellingPoints.length})` },
              { key: 'features', label: `特性(${features.length})` },
              { key: 'docs', label: '文档' },
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

        {activeTab === 'sellingPoints' && (
        <div className="mb-6 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-4 h-4 text-gray-600" />
              <h3 className="font-medium text-gray-900">产品卖点</h3>
              <span className="text-xs text-gray-500">({sellingPoints.length})</span>
            </div>
            <button
              onClick={() => toggleSection('sellingPoints')}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {expandedSections.sellingPoints ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
          
          {expandedSections.sellingPoints && (
            <div className="p-4 space-y-4">
              {sellingLoading && (
                <div className="text-sm text-gray-500">加载中...</div>
              )}
              {/* 添加新卖点 */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="卖点标题"
                    value={newSellingPoint.title}
                    onChange={(e) => setNewSellingPoint({...newSellingPoint, title: e.target.value})}
                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                  <select
                    value={newSellingPoint.category}
                    onChange={(e) => setNewSellingPoint({...newSellingPoint, category: e.target.value})}
                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                  >
                    <option value="general">通用</option>
                    <option value="performance">性能</option>
                    <option value="usability">易用性</option>
                    <option value="price">价格</option>
                    <option value="support">服务</option>
                  </select>
                </div>
                <textarea
                  placeholder="卖点详细描述"
                  value={newSellingPoint.description}
                  onChange={(e) => setNewSellingPoint({...newSellingPoint, description: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-20 mb-3"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleAddSellingPoint}
                    disabled={!newSellingPoint.title.trim()}
                    className="flex items-center space-x-1 px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Plus className="w-3 h-3" />
                    <span>添加卖点</span>
                  </button>
                </div>
              </div>
              
              {/* 卖点列表 */}
              <div className="space-y-2">
                {sellingPoints.map(sellingPoint => (
                  <div key={sellingPoint.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-gray-900">{sellingPoint.title}</h4>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            {sellingPoint.category === 'general' ? '通用' : 
                             sellingPoint.category === 'performance' ? '性能' :
                             sellingPoint.category === 'usability' ? '易用性' :
                             sellingPoint.category === 'price' ? '价格' : '服务'}
                          </span>
                          <span className="text-xs text-gray-500">优先级: {sellingPoint.priority}</span>
                        </div>
                        <p className="text-sm text-gray-600">{sellingPoint.description}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteSellingPoint(sellingPoint.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {sellingPoints.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无产品卖点，请添加第一个卖点</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        )}

        {activeTab === 'features' && (
        <div className="border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-gray-600" />
              <h3 className="font-medium text-gray-900">产品特性</h3>
              <span className="text-xs text-gray-500">({features.length})</span>
            </div>
            <button
              onClick={() => toggleSection('features')}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {expandedSections.features ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
          
          {expandedSections.features && (
            <div className="p-4 space-y-4">
              {featuresLoading && (
                <div className="text-sm text-gray-500">加载中...</div>
              )}
              {/* 添加新特性 */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="特性名称"
                    value={newFeature.name}
                    onChange={(e) => setNewFeature({...newFeature, name: e.target.value})}
                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                  <select
                    value={newFeature.feature_type}
                    onChange={(e) => setNewFeature({...newFeature, feature_type: e.target.value})}
                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                  >
                    {featureTypeOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <textarea
                  placeholder="特性详细描述"
                  value={newFeature.description}
                  onChange={(e) => setNewFeature({...newFeature, description: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-20 mb-3"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleAddFeature}
                    disabled={!newFeature.name.trim()}
                    className="flex items-center space-x-1 px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Plus className="w-3 h-3" />
                    <span>添加特性</span>
                  </button>
                </div>
              </div>
              
              {/* 特性列表 */}
              <div className="space-y-2">
                {features.map(feature => (
                  <div key={feature.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-gray-900">{feature.name}</h4>
                          <span className={`text-xs px-2 py-1 rounded ${featureTypeOptions.find(o => o.value === feature.feature_type)?.color || 'bg-gray-100 text-gray-800'}`}>
                            {featureTypeOptions.find(o => o.value === feature.feature_type)?.label || '未知'}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            feature.status === 'active' ? 'bg-green-100 text-green-800' :
                            feature.status === 'planned' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {feature.status === 'active' ? '活跃' :
                             feature.status === 'planned' ? '计划中' : '已废弃'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{feature.description}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteFeature(feature.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {features.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无产品特性，请添加第一个特性</p>
                  </div>
                )}
              </div>
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
                      alert('添加文档失败，请检查 Supabase 表配置')
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
                          alert('删除失败，请检查 Supabase 表配置')
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
                      alert('添加常见问题失败，请检查 Supabase 表配置')
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
                          alert('删除失败，请检查 Supabase 表配置')
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
    </div>
  )
}