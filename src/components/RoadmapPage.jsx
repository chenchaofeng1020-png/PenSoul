import React, { useMemo, useState, useEffect, useRef } from 'react'
import { Search, Plus, Calendar, GitBranch, Columns, Tag, User, Clock, ChevronDown, Download, Edit, Trash2, MoreHorizontal } from 'lucide-react'

// 产品路线图页面 - 与竞品管理保持一致的UI规范
const RoadmapPage = ({ currentProduct }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('全部') // 全部 | 计划中 | 进行中 | 已完成
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(null) // 控制哪个卡片的下拉菜单打开
  const [hoveredItem, setHoveredItem] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [items, setItems] = useState([])
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [initialLoad, setInitialLoad] = useState(true)

  // API调用函数
  const apiCall = async (url, options = {}) => {
    const token = localStorage.getItem('token')
    const response = await fetch(`http://localhost:8000/api${url}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && !event.target.closest('.dropdown-container')) {
        setDropdownOpen(null)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  // 获取路线图数据
  const fetchRoadmapData = async () => {
    if (!currentProduct?.id) return

    try {
      setLoading(true)
      setError(null)

      // 并行获取路线图项目和标签
      const [itemsResponse, tagsResponse] = await Promise.all([
        apiCall(`/products/${currentProduct.id}/roadmap/items`),
        apiCall(`/products/${currentProduct.id}/roadmap/tags`).catch(() => ({ data: [] })) // 标签API可能不存在，使用默认值
      ])

      // 处理路线图项目数据结构
      const itemsData = itemsResponse.data?.items || itemsResponse.data || []
      setItems(itemsData)
      setTags(tagsResponse.data || [])
    } catch (err) {
      console.error('获取路线图数据失败:', err)
      setError(err.message)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }

  // 创建路线图项目
  const createRoadmapItem = async (itemData) => {
    try {
      const response = await apiCall(`/products/${currentProduct.id}/roadmap/items`, {
        method: 'POST',
        body: JSON.stringify(itemData),
      })

      if (response.success) {
        // 重新获取数据以确保同步
        await fetchRoadmapData()
        return response.data
      }
    } catch (err) {
      console.error('创建路线图项目失败:', err)
      throw err
    }
  }

  // 更新路线图项目
  const updateRoadmapItem = async (itemId, itemData) => {
    try {
      const response = await apiCall(`/products/${currentProduct.id}/roadmap/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(itemData),
      })

      if (response.success) {
        await fetchRoadmapData()
        return response.data
      }
    } catch (err) {
      console.error('更新路线图项目失败:', err)
      throw err
    }
  }

  // 编辑路线图项目
  const handleEditItem = (item) => {
    setEditingItem(item)
    setShowEditModal(true)
  }

  // 删除路线图项目
  const handleDeleteItem = async (item) => {
    if (window.confirm(`确定要删除路线图项目"${item.title}"吗？此操作不可恢复。`)) {
      try {
        await deleteRoadmapItem(item.id)
        // 重新加载数据
        await fetchRoadmapData()
      } catch (err) {
        alert('删除失败: ' + err.message)
      }
    }
  }

  // 删除路线图项目
  const deleteRoadmapItem = async (itemId) => {
    try {
      const response = await apiCall(`/products/${currentProduct.id}/roadmap/items/${itemId}`, {
        method: 'DELETE',
      })

      if (response.success) {
        await fetchRoadmapData()
      }
    } catch (err) {
      console.error('删除路线图项目失败:', err)
      throw err
    }
  }

  // 更新路线图项目
  const handleUpdateItem = async (formData) => {
    try {
      // 转换数据格式
      const itemData = {
        ...formData,
        start_date: formData.startDate,
        end_date: formData.endDate,
        tags: formData.tags || [],
      }
      
      await updateRoadmapItem(editingItem.id, itemData)
      setShowEditModal(false)
      setEditingItem(null)
      // 重新加载数据
      await fetchRoadmapData()
    } catch (err) {
      alert('更新路线图项目失败: ' + err.message)
    }
  }

  // PDF导出功能
  const exportToPDF = async () => {
    try {
      const response = await apiCall(`/products/${currentProduct.id}/roadmap/export/pdf`, {
        method: 'GET',
      })

      if (response.success) {
        // 创建下载链接
        const link = document.createElement('a')
        link.href = response.data.download_url
        link.download = `${currentProduct.name}_roadmap_${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (err) {
      console.error('PDF导出失败:', err)
      alert('PDF导出失败，请稍后重试')
    }
  }

  const filteredItems = useMemo(() => {
    if (!Array.isArray(items)) return []
    return items.filter((item) => {
      const matchSearch =
        (item.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchStatus = statusFilter === '全部' || item.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [items, searchTerm, statusFilter])

  // 组件挂载时获取数据
  useEffect(() => {
    fetchRoadmapData()
  }, [currentProduct?.id])

  const handleAddItem = async (formData) => {
    try {
      // 转换标签格式
      const itemData = {
        ...formData,
        start_date: formData.start_date,
        end_date: formData.end_date,
        tags: formData.tags || [],
      }
      
      // 调试：打印发送的数据
      console.log('发送到后端的数据:', itemData)
      
      await createRoadmapItem(itemData)
      setShowAddModal(false)
    } catch (err) {
      alert('创建路线图项目失败: ' + err.message)
    }
  }

  // 状态翻译函数
  const translateStatus = (status) => {
    const statusMap = {
      'planned': '规划中',
      'in_progress': '进行中', 
      'completed': '已完成',
      'cancelled': '已取消',
      'on_hold': '暂停'
    }
    return statusMap[status] || status
  }

  // 优先级翻译函数
  const translatePriority = (priority) => {
    const priorityMap = {
      'low': '低',
      'medium': '中',
      'high': '高',
      'urgent': '紧急'
    }
    return priorityMap[priority] || priority
  }

  // 类型翻译函数
  const translateType = (type) => {
    const typeMap = {
      'Epic': '史诗',
      'Milestone': '里程碑',
      'Task': '任务',
      'Feature': '功能'
    }
    return typeMap[type] || type
  }

  const StatusBadge = ({ status }) => {
    const translatedStatus = translateStatus(status)
    const styles = {
      规划中: 'bg-blue-100 text-blue-700',
      进行中: 'bg-yellow-100 text-yellow-800',
      已完成: 'bg-green-100 text-green-700',
      已取消: 'bg-red-100 text-red-700',
      暂停: 'bg-gray-100 text-gray-700',
    }
    return (
      <span className={`inline-block px-2 py-1 rounded-full text-xs ${styles[translatedStatus] || 'bg-gray-100 text-gray-600'}`}>
        {translatedStatus}
      </span>
    )
  }

  // 加载状态
  if (initialLoad && loading) {
    return (
      <div className="space-y-4 pl-6 pr-6">
        <div className="border-b border-gray-200 pb-4 pt-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">产品路线图</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">加载中...</div>
        </div>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="space-y-4 pl-6 pr-6">
        <div className="border-b border-gray-200 pb-4 pt-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">产品路线图</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-red-500">加载失败: {error}</div>
        </div>
      </div>
    )
  }



  return (
    <div className="space-y-4 pl-6 pr-6">
      {/* 页面标题和添加按钮 - 保持与竞品管理一致的结构 */}
      <div className="border-b border-gray-200 pb-4 pt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">产品路线图</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={exportToPDF}
            className="inline-flex items-center space-x-1 bg-gray-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-gray-700 transition-colors duration-200"
          >
            <Download className="w-3 h-3" />
            <span>导出PDF</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-1 bg-primary-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-primary-700 transition-colors duration-200"
          >
            <Plus className="w-3 h-3" />
            <span>新建路线项</span>
          </button>
        </div>
      </div>

      {/* 搜索和筛选区域 */}
      <div className="bg-white rounded-xl p-1">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* 搜索框和状态筛选 */}
          <div className="flex items-center gap-3">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜索路线项标题或描述..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400 transition-colors duration-200"
              />
            </div>
            
            {/* 状态筛选下拉选择 */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400 transition-colors duration-200 cursor-pointer"
              >
                <option value="全部">全部</option>
                <option value="计划中">计划中</option>
                <option value="进行中">进行中</option>
                <option value="已完成">已完成</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* 内容视图 */}
      <div className="mt-2">
        <CurvedTimelineView 
          filteredItems={filteredItems} 
          dropdownOpen={dropdownOpen}
          setDropdownOpen={setDropdownOpen}
          handleEditItem={handleEditItem}
          handleDeleteItem={handleDeleteItem}
          hoveredItem={hoveredItem}
          setHoveredItem={setHoveredItem}
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
        />
      </div>

      {/* 编辑路线图项目弹窗 */}
      {showEditModal && (
        <EditRoadmapItemModal
          item={editingItem}
          onClose={() => {
            setShowEditModal(false)
            setEditingItem(null)
          }}
          onSubmit={handleUpdateItem}
        />
      )}

      {/* 新建路线图项目弹窗 */}
      {showAddModal && (
        <AddRoadmapItemModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddItem}
          currentProduct={currentProduct}
        />
      )}
    </div>
  )
}

const EditRoadmapItemModal = ({ item, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    title: item?.title || '',
    type: item?.type || 'Task',
    status: item?.status || 'planned',
    priority: item?.priority || 'medium',
    owner: item?.owner || '',
    startDate: item?.start_date || '',
    endDate: item?.end_date || '',
    tags: item?.tags ? (Array.isArray(item.tags) ? item.tags.join(', ') : item.tags) : '',
    description: item?.description || '',
    progress: item?.progress || 0,
  })

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = () => {
    if (!form.title) return
    
    // 获取当前用户ID（这里需要从认证上下文或其他地方获取）
    const currentUserId = 1; // 临时硬编码，实际应该从用户上下文获取
    
    const payload = {
      title: form.title,
      description: form.description,
      type: form.type,
      status: form.status,
      priority: form.priority,
      owner_id: currentUserId, // 后端需要的字段名
      start_date: form.startDate && form.startDate.trim() !== '' ? form.startDate : null,
      end_date: form.endDate && form.endDate.trim() !== '' ? form.endDate : null,
      progress: form.progress,
      tags: form.tags
        ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
    }
    onSubmit(payload)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">编辑路线图项目</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* 标题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">项目标题 *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400"
              placeholder="请输入项目标题"
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">项目描述</label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400"
              placeholder="请输入项目描述"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">类型</label>
              <select
                value={form.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400"
              >
                <option value="Task">任务</option>
                <option value="Epic">史诗</option>
                <option value="Milestone">里程碑</option>
                <option value="Feature">功能</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
              <select
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400"
              >
                <option value="planned">规划中</option>
                <option value="in_progress">进行中</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
                <option value="on_hold">暂停</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">优先级</label>
              <select
                value={form.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="urgent">紧急</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">进度 (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.progress}
                onChange={(e) => handleChange('progress', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400"
                placeholder="0-100"
              />
            </div>
          </div>

          {/* 时间范围 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">开始时间</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">结束时间</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400"
              />
            </div>
          </div>

          {/* 标签 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">标签</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400"
              placeholder="多个标签用逗号分隔，如：前端,UI,优化"
            />
          </div>
        </div>

        {/* 按钮区域 */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200"
          >
            保存修改
          </button>
        </div>
      </div>
    </div>
  )
}

const AddRoadmapItemModal = ({ onClose, onSubmit, currentProduct }) => {
  const [form, setForm] = useState({
    title: '',
    type: 'Task',
    status: 'planned',
    priority: 'medium',
    owner: '',
    startDate: '',
    endDate: '',
    tags: '',
    description: '',
    progress: 0,
  })
  const [teamMembers, setTeamMembers] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  // 加载团队成员
  useEffect(() => {
    if (currentProduct?.id) {
      loadTeamMembers()
    }
  }, [currentProduct])

  const loadTeamMembers = async () => {
    try {
      setLoadingMembers(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:8000/api/products/${currentProduct.id}/members`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTeamMembers(data.data.members || [])
      } else {
        console.error('获取团队成员失败')
      }
    } catch (err) {
      console.error('获取团队成员失败:', err)
    } finally {
      setLoadingMembers(false)
    }
  }

  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = () => {
    if (!form.title) return
    
    // 查找选中的团队成员
    const selectedMember = teamMembers.find(member => member.id.toString() === form.owner)
    const ownerName = selectedMember ? (selectedMember.full_name || selectedMember.username) : ''
    
    const payload = {
      title: form.title,
      description: form.description,
      type: form.type,
      status: form.status,
      priority: form.priority,
      owner_id: form.owner ? parseInt(form.owner) : null, // 后端需要的字段名
      owner_name: ownerName, // 添加负责人姓名用于显示
      start_date: form.startDate || null,
      end_date: form.endDate || null,
      progress: form.progress,
      tags: form.tags
        ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
    }
    onSubmit(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-lg w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">新建路线项</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">标题</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400"
              placeholder="请输入路线项标题"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">类型</label>
              <select
                value={form.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400"
              >
                <option value="Task">任务</option>
                <option value="Epic">史诗</option>
                <option value="Milestone">里程碑</option>
                <option value="Feature">功能</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
              <select
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400"
              >
                <option value="planned">规划中</option>
                <option value="in_progress">进行中</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
                <option value="on_hold">暂停</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">优先级</label>
              <select
                value={form.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="urgent">紧急</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">进度 (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.progress}
                onChange={(e) => handleChange('progress', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400"
                placeholder="0-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">负责人</label>
              <select
                value={form.owner}
                onChange={(e) => handleChange('owner', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400"
                disabled={loadingMembers}
              >
                <option value="">请选择负责人</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name || member.username}
                  </option>
                ))}
              </select>
              {loadingMembers && (
                <div className="text-xs text-gray-500 mt-1">加载团队成员中...</div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">标签（逗号分隔）</label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => handleChange('tags', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400"
                placeholder="例如：路线图, 前端"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">开始日期</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">结束日期</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400"
              placeholder="请输入详细描述"
            />
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors">取消</button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">保存</button>
        </div>
      </div>
    </div>
  )
}

export default RoadmapPage

const CurvedTimelineView = ({ 
  filteredItems, 
  dropdownOpen, 
  setDropdownOpen, 
  handleEditItem, 
  handleDeleteItem, 
  hoveredItem, 
  setHoveredItem, 
  selectedItem, 
  setSelectedItem 
}) => {
  // 状态翻译函数
  const translateStatus = (status) => {
    const statusMap = {
      'planned': '规划中',
      'in_progress': '进行中', 
      'completed': '已完成',
      'cancelled': '已取消',
      'on_hold': '暂停'
    }
    return statusMap[status] || status
  }

  // 自动换行的蛇形连续曲线：根据容器宽度自适应列数，换行仍保持曲线连续
  const containerRef = useRef(null)
  const [points, setPoints] = useState([])
  const [pathD, setPathD] = useState('')
  const [svgHeightPx, setSvgHeightPx] = useState(160)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [curveTension, setCurveTension] = useState(0.4) // 曲线张力控制
  const [containerWidth, setContainerWidth] = useState(800) // 添加容器宽度状态
  const [expandedDates, setExpandedDates] = useState(new Set()) // 展开的日期组

  const statusColor = {
    规划中: '#60A5FA',
    进行中: '#F59E0B',
    已完成: '#22C55E',
    已取消: '#EF4444',
    暂停: '#6B7280',
  }

  // viewBox 宽度固定，纵向高度按行数动态
  const VB_W = 1000
  const ROW_UNIT_H = 240 // 每行在 viewBox 的高度单位
  const ROW_SVG_PX = 200  // 每行实际像素高度

  // 按开始日期排序保持稳定顺序
  const items = useMemo(() => {
    if (!Array.isArray(filteredItems)) return []
    return [...filteredItems].sort((a, b) => new Date(a.start_date || a.startDate) - new Date(b.start_date || b.startDate))
  }, [filteredItems])

  // 按日期分组项目
  const groupedByDate = useMemo(() => {
    const groups = {}
    items.forEach(item => {
      const date = item.start_date || item.startDate
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(item)
    })
    return groups
  }, [items])

  // 获取唯一日期列表（用于时间轴上的点）
  const uniqueDates = useMemo(() => {
    return Object.keys(groupedByDate).sort((a, b) => new Date(a) - new Date(b))
  }, [groupedByDate])

  // 切换日期组的展开/折叠状态
  const toggleDateGroup = (date) => {
    const newExpanded = new Set(expandedDates)
    if (newExpanded.has(date)) {
      newExpanded.delete(date)
    } else {
      newExpanded.add(date)
    }
    setExpandedDates(newExpanded)
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const compute = () => {
      const cw = el.offsetWidth || 800
      setContainerWidth(cw) // 更新容器宽度状态

      // 自适应布局参数 - 使用更小的容器宽度百分比
      const MARGIN_X_PX = Math.max(4, cw * 0.005) // 使用容器宽度的0.5%作为边距，最小4px
      
      // 动态卡片间距 - 根据可用空间和卡片数量调整
      const getCardSpacing = (availableWidth, totalCards, avgCardWidth) => {
        const baseSpacing = 24 // 基础间距
        const minSpacing = 16 // 最小间距
        const maxSpacing = 48 // 最大间距
        
        // 计算理想间距：基于可用空间的剩余部分
        const totalCardWidth = totalCards * avgCardWidth
        const remainingSpace = availableWidth - totalCardWidth
        const idealSpacing = totalCards > 1 ? remainingSpace / (totalCards - 1) : baseSpacing
        
        // 限制在合理范围内
        return Math.max(minSpacing, Math.min(maxSpacing, idealSpacing))
      }
      
      const ROW_MIN_HEIGHT = 120 // 减少最小行高从180到120
      const ROW_EXTRA_HEIGHT = 40 // 减少额外行高从60到40

      // 动态卡片宽度 - 基于屏幕宽度的自适应计算
      const getCardWidth = (item) => {
        // 基础宽度：240px
        const baseWidth = 240
        // 根据容器宽度动态调整
        if (cw >= 1600) {
          return Math.min(320, baseWidth + (cw - 1600) * 0.05) // 超宽屏：最大320px
        } else if (cw >= 1200) {
          return baseWidth + (cw - 1200) * 0.02 // 大屏：240-280px
        } else if (cw >= 800) {
          return baseWidth // 中屏：保持240px
        } else {
          return Math.max(200, baseWidth - (800 - cw) * 0.1) // 小屏：最小200px
        }
      }

      // 修改分布算法：按日期分组处理
      const distributeItemsToRows = () => {
        const rows = []
        let currentRow = []
        const availableWidth = cw - MARGIN_X_PX * 2

        // 遍历唯一日期，每个日期作为一个单位处理
        for (const date of uniqueDates) {
          const dateItems = groupedByDate[date]
          const representativeItem = dateItems[0] // 使用第一个项目作为代表
          const cardWidth = getCardWidth(representativeItem)
          
          const currentRowCardWidths = currentRow.map(dateGroup => getCardWidth(groupedByDate[dateGroup][0]))
          const avgCardWidth = currentRowCardWidths.length > 0 
            ? (currentRowCardWidths.reduce((sum, w) => sum + w, 0) + cardWidth) / (currentRowCardWidths.length + 1)
            : cardWidth
          
          const spacing = currentRow.length > 0 
            ? getCardSpacing(availableWidth, currentRow.length + 1, avgCardWidth)
            : 0
          
          const currentRowTotalWidth = currentRowCardWidths.reduce((sum, w) => sum + w, 0)
          const currentRowSpacing = currentRow.length > 0 
            ? getCardSpacing(availableWidth, currentRow.length, currentRowCardWidths.reduce((sum, w) => sum + w, 0) / currentRow.length) * (currentRow.length - 1)
            : 0
          
          const neededWidth = currentRowTotalWidth + currentRowSpacing + spacing + cardWidth

          if (currentRow.length === 0 || neededWidth <= availableWidth) {
            currentRow.push(date)
          } else {
            rows.push([...currentRow])
            currentRow = [date]
          }
        }

        if (currentRow.length > 0) {
          rows.push(currentRow)
        }

        return rows
      }

      const rowsData = distributeItemsToRows()
      const totalRows = rowsData.length
      
      // 动态计算SVG高度
      const VB_H = totalRows * ROW_UNIT_H
      const totalSvgH = totalRows * (ROW_MIN_HEIGHT + ROW_EXTRA_HEIGHT)
      setSvgHeightPx(totalSvgH)

      const scaleX = VB_W / cw
      const marginUnitX = MARGIN_X_PX * scaleX

      // 生成优化的点位 - 按日期分组
      const pts = []
      rowsData.forEach((rowDates, rowIndex) => {
        const yUnit = rowIndex * ROW_UNIT_H + ROW_UNIT_H * 0.5
        const isEven = rowIndex % 2 === 0
        const availableWidth = cw - MARGIN_X_PX * 2
        
        // 计算行内日期组的动态间距
        const rowCardWidths = rowDates.map(date => {
          const dateItems = groupedByDate[date]
          return getCardWidth(dateItems[0]) // 使用代表项目的宽度
        })
        const totalCardWidth = rowCardWidths.reduce((sum, w) => sum + w, 0)
        const avgCardWidth = totalCardWidth / rowDates.length
        const dynamicSpacing = getCardSpacing(availableWidth, rowDates.length, avgCardWidth)
        
        // 计算总内容宽度
        const totalSpacing = (rowDates.length - 1) * dynamicSpacing
        const totalContentWidth = totalCardWidth + totalSpacing
        
        // 居中对齐布局
        let startX = MARGIN_X_PX + (availableWidth - totalContentWidth) / 2
        
        rowDates.forEach((date, cardIndex) => {
          const dateItems = groupedByDate[date]
          const cardWidth = getCardWidth(dateItems[0])
          const posIndex = isEven ? cardIndex : (rowDates.length - 1 - cardIndex)
          
          // 计算实际位置 - 使用动态间距
          let actualX = startX
          for (let i = 0; i < (isEven ? cardIndex : rowDates.length - 1 - cardIndex); i++) {
            const prevDate = rowDates[isEven ? i : rowDates.length - 1 - i]
            const prevDateItems = groupedByDate[prevDate]
            actualX += getCardWidth(prevDateItems[0]) + dynamicSpacing
          }
          
          const xUnit = (actualX + cardWidth / 2) * scaleX
          
          // 为每个日期组创建一个点，包含该日期的所有项目
          pts.push({ 
            x: xUnit, 
            y: yUnit, 
            date: date,
            items: dateItems,
            representativeItem: dateItems[0] // 用于显示的代表项目
          })
        })
      })

      // 样条曲线平滑算法 - 消除所有尖锐转折
      const createSmoothSpline = (points, tension = 0.5) => {
        if (points.length < 2) return ''
        
        let path = `M ${points[0].x} ${points[0].y}`
        
        if (points.length === 2) {
          // 只有两个点时，使用简单的曲线连接
          const dx = points[1].x - points[0].x
          const dy = points[1].y - points[0].y
          const distance = Math.sqrt(dx * dx + dy * dy)
          const controlDistance = Math.min(distance * 0.4, 80 * scaleX)
          
          const cp1x = points[0].x + (dx > 0 ? controlDistance : -controlDistance)
          const cp1y = points[0].y + dy * 0.2
          const cp2x = points[1].x - (dx > 0 ? controlDistance : -controlDistance)
          const cp2y = points[1].y - dy * 0.2
          
          path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[1].x} ${points[1].y}`
          return path
        }
        
        // 多点样条曲线处理
        for (let i = 1; i < points.length; i++) {
          const prev = points[i - 1]
          const curr = points[i]
          const next = points[i + 1] || curr
          const prevPrev = points[i - 2] || prev
          
          // 计算切线向量，用于确定控制点方向
          const getTangent = (p0, p1, p2, tension) => {
            const dx1 = p1.x - p0.x
            const dy1 = p1.y - p0.y
            const dx2 = p2.x - p1.x
            const dy2 = p2.y - p1.y
            
            // 平均切线方向
            const avgDx = (dx1 + dx2) * tension
            const avgDy = (dy1 + dy2) * tension
            
            return { dx: avgDx, dy: avgDy }
          }
          
          // 计算前一个点的出切线
          const prevTangent = getTangent(prevPrev, prev, curr, tension)
          // 计算当前点的入切线
          const currTangent = getTangent(prev, curr, next, tension)
          
          // 动态调整控制点距离
          const dx = curr.x - prev.x
          const dy = curr.y - prev.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          // 检测换行
          const isRowChange = Math.abs(dy) > ROW_UNIT_H * 0.3
          
          let controlDistance
          if (isRowChange) {
            // 换行时增加控制点距离，创造更平滑的S型曲线
            controlDistance = Math.max(distance * 0.5, 80 * scaleX)
          } else {
            // 同行内保持适中的控制点距离
            controlDistance = Math.max(distance * 0.3, 50 * scaleX)
          }
          
          // 限制控制点距离，避免过度弯曲
          controlDistance = Math.min(controlDistance, 120 * scaleX)
          
          // 计算控制点
          const cp1x = prev.x + prevTangent.dx * controlDistance / distance
          const cp1y = prev.y + prevTangent.dy * controlDistance / distance
          const cp2x = curr.x - currTangent.dx * controlDistance / distance
          const cp2y = curr.y - currTangent.dy * controlDistance / distance
          
          path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`
        }
        
        return path
      }
      
      const d = createSmoothSpline(pts, curveTension)

      setPoints(pts)
      setPathD(d)
    }

    compute()
    const ro = new ResizeObserver(() => compute())
    ro.observe(el)
    const onResize = () => compute()
    window.addEventListener('resize', onResize)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [items])

  const vbHeight = Math.max(ROW_UNIT_H, Math.ceil(svgHeightPx / ROW_SVG_PX) * ROW_UNIT_H)

  return (
    <div ref={containerRef} className={`bg-white rounded-xl border border-gray-200 transition-all duration-300 ${
      isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : ''
    }`} style={{ 
       transform: `scale(${zoomLevel})`, 
       transformOrigin: 'top left',
       padding: `16px ${Math.max(4, containerWidth * 0.005)}px` // 使用容器宽度的0.5%作为水平边距，最小4px
     }}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-4">
          {/* 控制按钮 */}
          <div className="flex items-center gap-2 border-r border-gray-200 pr-4">
            <button 
              onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="缩小"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="text-xs text-gray-500 min-w-[3rem] text-center">{Math.round(zoomLevel * 100)}%</span>
            <button 
              onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="放大"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button 
              onClick={() => setZoomLevel(1)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors text-xs"
              title="重置缩放"
            >
              重置
            </button>
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title={isFullscreen ? "退出全屏" : "全屏显示"}
            >
              {isFullscreen ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9h4.5M15 9V4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
          </div>
          
          {/* 状态图例 */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: statusColor['规划中'] }}></span><span className="text-gray-600">规划中</span></div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: statusColor['进行中'] }}></span><span className="text-gray-600">进行中</span></div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: statusColor['已完成'] }}></span><span className="text-gray-600">已完成</span></div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: statusColor['已取消'] }}></span><span className="text-gray-600">已取消</span></div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: statusColor['暂停'] }}></span><span className="text-gray-600">暂停</span></div>
          </div>
        </div>
      </div>

      

      <div className="relative" style={{ width: '100%', minHeight: svgHeightPx + 60 }}>
        {/* 时间刻度背景 */}
        <div className="absolute inset-0 pointer-events-none">

          

          

          
          {/* 月份分割线 */}
          <div className="absolute inset-0">
            {[...Array(12)].map((_, i) => (
              <div 
                key={i} 
                className="absolute top-8 bottom-0 w-px bg-gray-200/40" 
                style={{ left: `${(i + 1) * (100 / 12)}%` }}
              ></div>
            ))}
          </div>
        </div>

        <svg viewBox={`0 0 ${VB_W} ${vbHeight}`} preserveAspectRatio="none" className="w-full relative z-0" style={{ height: svgHeightPx, marginTop: '32px' }}>
          <path d={pathD} fill="none" stroke="#9CA3AF" strokeWidth="2" />
          {points.map((p) => (
            <g key={`${p.date}-point`}>
              <ellipse cx={p.x} cy={p.y} rx={6 * VB_W / containerWidth} ry="6" fill={statusColor[translateStatus(p.representativeItem.status)] || '#9CA3AF'} stroke="#ffffff" strokeWidth="2" />
              <text 
                x={p.x} 
                y={p.y - 18} 
                textAnchor="middle" 
                fontSize="10" 
                fill="#6B7280" 
                fontFamily="system-ui, -apple-system, sans-serif"
                fontWeight="400"
                style={{ userSelect: 'none' }}
              >
                {p.date}
              </text>
              {/* 多项目指示器 */}
              {p.items.length > 1 && (
                <circle 
                  cx={p.x + 8 * VB_W / containerWidth} 
                  cy={p.y - 8} 
                  r={4 * VB_W / containerWidth} 
                  fill="#3B82F6" 
                  stroke="#ffffff" 
                  strokeWidth="1"
                />
              )}
            </g>
          ))}
        </svg>

        {points.map((p) => {
          const cw = containerRef.current?.offsetWidth || 800
          
          // 动态卡片宽度 - 与布局算法保持一致
          const getCardWidth = (item) => {
            const baseWidth = 240
            if (cw >= 1600) {
              return Math.min(320, baseWidth + (cw - 1600) * 0.05)
            } else if (cw >= 1200) {
              return baseWidth + (cw - 1200) * 0.02
            } else if (cw >= 800) {
              return baseWidth
            } else {
              return Math.max(200, baseWidth - (800 - cw) * 0.1)
            }
          }
          
          const cardW = getCardWidth(p.representativeItem)
          // 自适应卡片间距 - 使用更小的容器宽度百分比
          const minGutter = Math.max(4, cw * 0.005) // 使用容器宽度的0.5%作为间距，最小4px
          
          // 改进的定位算法，避免边界溢出
          let leftPx = (p.x / VB_W) * cw
          let transformX = '-50%'
          
          // 左边界检查
          if (leftPx - cardW / 2 < minGutter) {
            leftPx = minGutter + cardW / 2
            transformX = '-50%'
          }
          
          // 右边界检查
          if (leftPx + cardW / 2 > cw - minGutter) {
            leftPx = cw - minGutter - cardW / 2
            transformX = '-50%'
          }

          // 改进的垂直定位，针对不同行使用不同间距
          const baseTopPx = (p.y / vbHeight) * svgHeightPx + 20 // 减少基础偏移
          const rowIndex = Math.floor(p.y / ROW_UNIT_H)
          // 第一行使用较小间距，后续行使用较小间距
          const extraSpacing = rowIndex === 0 ? 8 : rowIndex * 6
          const topPx = baseTopPx + extraSpacing
          
          // 检查是否为多项目日期组
          const isMultipleItems = p.items.length > 1
          const isExpanded = expandedDates.has(p.date)
          
          // 根据类型设置不同的样式
          const getCardStyles = () => {
            const isHovered = hoveredItem === p.representativeItem.id
            const isSelected = selectedItem === p.representativeItem.id
            
            return {
              container: `w-full bg-white rounded-lg border border-gray-200 cursor-pointer transition-all duration-200 shadow-sm ${
                isHovered ? 'shadow-md border-blue-300 bg-blue-50/30' : 
                isSelected ? 'shadow-md border-blue-400 bg-blue-50/50' : 'hover:shadow-md hover:border-gray-300'
              }`,
              header: "px-4 py-3",
              title: "text-sm font-semibold text-gray-900 mb-1 leading-tight",
              timeDisplay: "text-xs text-gray-500 mb-2 font-medium",
              ownerStatus: "flex items-center gap-3 text-xs",
              ownerInfo: "text-gray-600",
              statusBadge: "px-2 py-1 rounded-md text-xs font-medium border",
              content: "px-4 pb-3"
            }
          }
          
          const styles = getCardStyles()
          
          return (
            <div key={`${p.date}-group`} className="absolute" style={{ 
              left: `${leftPx}px`, 
              top: `${topPx}px`, 
              transform: `translateX(${transformX})`, 
              width: `${cardW}px`,
              zIndex: selectedItem === p.representativeItem.id ? 1000 : hoveredItem === p.representativeItem.id ? 100 : 20
            }}>
              {/* 主卡片 - 显示代表项目 */}
              <div 
                className={styles.container}
                style={{ 
                  minHeight: '60px',
                  zIndex: (selectedItem === p.representativeItem.id) ? 50 : (hoveredItem === p.representativeItem.id) ? 40 : 30,
                  position: 'relative'
                }}
                onMouseEnter={() => setHoveredItem(p.representativeItem.id)}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => setSelectedItem(selectedItem === p.representativeItem.id ? null : p.representativeItem.id)}
              >
                <div className={styles.header}>
                  <div className={styles.title}>{p.representativeItem.title}</div>
                  {/* 多项目指示器 */}
                  {isMultipleItems && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium ml-2">
                      +{p.items.length - 1}
                    </span>
                  )}
                  
                  {/* 时间显示 */}
                  <div className={styles.timeDisplay}>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span>
                        {p.representativeItem.start_date || p.representativeItem.startDate || '未设置'} - {p.representativeItem.end_date || p.representativeItem.endDate || '未设置'}
                      </span>
                    </div>
                  </div>
                  
                  {/* 负责人信息 */}
                  <div className={styles.ownerStatus}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="w-2 h-2 text-gray-500" />
                      </div>
                      <span className={styles.ownerInfo}>{p.representativeItem.owner_name || p.representativeItem.owner || '未分配'}</span>
                    </div>
                  </div>
                  
                  {/* 操作按钮区域 */}
                  <div className="flex items-center gap-1 mt-2">
                    {/* 展开/折叠按钮 */}
                    {isMultipleItems && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleDateGroup(p.date)
                        }}
                        className="p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                        title={isExpanded ? "折叠" : "展开"}
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                    {/* 省略号菜单按钮 */}
                    <div className="relative dropdown-container">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDropdownOpen(dropdownOpen === p.representativeItem.id ? null : p.representativeItem.id)
                        }}
                        className="p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                        title="更多操作"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      
                      {/* 下拉菜单 */}
                      {dropdownOpen === p.representativeItem.id && (
                        <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-xl z-[60] min-w-[120px] animate-in slide-in-from-top-2 duration-200">
                          <div className="py-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditItem(p.representativeItem)
                                setDropdownOpen(null)
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition-colors duration-150"
                            >
                              <Edit className="w-3 h-3" />
                              编辑
                            </button>
                            <div className="border-t border-gray-100 mx-1"></div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteItem(p.representativeItem)
                                setDropdownOpen(null)
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-2 transition-colors duration-150"
                            >
                              <Trash2 className="w-3 h-3" />
                              删除
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* 展开的详细信息 */}
                {(hoveredItem === p.representativeItem.id || selectedItem === p.representativeItem.id) && (
                  <div className="mt-3 pt-3 bg-gradient-to-r from-gray-50 to-white rounded-lg p-3 animate-in slide-in-from-top-2 duration-300">
                    {/* 状态信息 */}
                    <div className="mb-3">
                      <div className="text-[11px] text-gray-500 mb-1 font-medium uppercase tracking-wide">状态</div>
                      <span className={`px-2 py-1 rounded-md text-xs font-medium border ${
                        translateStatus(p.representativeItem.status) === '已完成' ? 'bg-green-50 text-green-700 border-green-200' :
                        translateStatus(p.representativeItem.status) === '进行中' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {translateStatus(p.representativeItem.status)}
                      </span>
                    </div>
                    
                    <div className="text-[11px] text-gray-500 mb-2 font-medium uppercase tracking-wide">详细描述</div>
                    <div className="text-xs text-gray-700 mb-3 leading-relaxed">
                      {p.representativeItem.description || '暂无详细描述...'}
                    </div>
                    {p.representativeItem.tags && p.representativeItem.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {p.representativeItem.tags.map((tag, idx) => (
                          <span key={idx} className="text-[10px] px-2 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full font-medium border border-blue-200">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 展开的其他项目卡片 */}
              {isMultipleItems && isExpanded && (
                <div className="mt-2 space-y-2">
                  {p.items.slice(1).map((item, index) => (
                    <div 
                      key={item.id}
                      className="w-full bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md hover:border-gray-300"
                      style={{ 
                        marginLeft: '12px',
                        width: 'calc(100% - 12px)',
                        opacity: 0.95,
                        transform: `scale(0.98)`
                      }}
                      onMouseEnter={() => setHoveredItem(item.id)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onClick={() => setSelectedItem(selectedItem === item.id ? null : item.id)}
                    >
                      <div className="px-3 py-2">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-gray-700 truncate">{item.title}</div>
                          <div className="relative dropdown-container">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setDropdownOpen(dropdownOpen === item.id ? null : item.id)
                              }}
                              className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                              title="更多操作"
                            >
                              <MoreHorizontal className="w-3 h-3" />
                            </button>
                            
                            {/* 下拉菜单 */}
                            {dropdownOpen === item.id && (
                              <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-xl z-[60] min-w-[120px] animate-in slide-in-from-top-2 duration-200">
                                <div className="py-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleEditItem(item)
                                      setDropdownOpen(null)
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition-colors duration-150"
                                  >
                                    <Edit className="w-3 h-3" />
                                    编辑
                                  </button>
                                  <div className="border-t border-gray-100 mx-1"></div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteItem(item)
                                      setDropdownOpen(null)
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-2 transition-colors duration-150"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    删除
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* 时间显示行 - 在标题下方独立一行 */}
                        <div className="mt-2 pb-2 text-xs text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="font-medium">
                              {item.start_date || item.startDate || '未设置'} - {item.end_date || item.endDate || '未设置'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* 负责人信息 */}
                      <div className="px-3 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="w-2.5 h-2.5 text-gray-500" />
                          </div>
                          <span className="text-xs text-gray-600 font-medium">{item.owner_name || item.owner || '未分配'}</span>
                        </div>
                      </div>
                      
                      {/* 展开的详细信息 */}
                      {(hoveredItem === item.id || selectedItem === item.id) && (
                        <div className="mx-3 mb-3 pt-2 bg-gradient-to-r from-gray-50 to-white rounded-lg p-2 animate-in slide-in-from-top-2 duration-300 border-t border-gray-100">
                          {/* 状态信息 */}
                          <div className="mb-2">
                            <div className="text-[10px] text-gray-500 mb-1 font-medium uppercase tracking-wide">状态</div>
                            <span className={`px-2 py-1 rounded-md text-xs font-medium border ${
                              translateStatus(item.status) === '已完成' ? 'bg-green-50 text-green-700 border-green-200' :
                              translateStatus(item.status) === '进行中' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                              'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {translateStatus(item.status)}
                            </span>
                          </div>
                          
                          <div className="text-[10px] text-gray-500 mb-1 font-medium uppercase tracking-wide">详细描述</div>
                          <div className="text-xs text-gray-700 leading-relaxed">
                            {item.description || '暂无详细描述...'}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
