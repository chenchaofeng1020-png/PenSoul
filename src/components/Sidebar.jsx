import { Home, BarChart3, Settings, Users, Target, TrendingUp, ChevronDown, Plus, LogOut, Edit, Map, Zap, Cog, GitBranch, Layers, FileText, Calendar, Database } from 'lucide-react'
import { productDuckLogo } from '../assets/logos'
import { useState, useEffect, useRef } from 'react'
import AddProductModal from './AddProductModal'

const Sidebar = ({ 
  searchTerm, 
  setSearchTerm, 
  selectedCategory, 
  setSelectedCategory, 
  onAddCompetitor, 
  currentUser, 
  onLogout,
  currentProduct,
  userProducts,
  onProductChange,
  onAddProduct,
  widthClass,
  isLoadingProducts
}) => {
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false)
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const dropdownRef = useRef(null)
  const userMenuRef = useRef(null)

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProductDropdownOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false)
      }
    }

    if (isProductDropdownOpen || isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isProductDropdownOpen, isUserMenuOpen])

  // 处理新建产品
  const handleAddProduct = (productData) => {
    if (onAddProduct) {
      onAddProduct(productData)
    }
  }

  // 处理用户菜单点击
  const handleUserMenuClick = () => {
    setIsUserMenuOpen(!isUserMenuOpen)
  }

  // 处理退出系统
  const handleLogout = () => {
    console.log('退出系统')
    setIsUserMenuOpen(false)
    if (onLogout) {
      onLogout()
    }
  }

  const menuItems = [
    { icon: GitBranch, label: '产品路线图' },
    { icon: Layers, label: '竞品管理' },
    { icon: Calendar, label: '内容规划' },
    { icon: Database, label: '产品资料管理' },
    { icon: Users, label: '团队成员' },
  ]

  return (
    <div className={`${widthClass || 'w-48'} flex flex-col`}>
      {/* 产品信息区域 */}
      <div className="p-6 relative" ref={dropdownRef}>
        <div 
          className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors duration-200"
          onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
        >
          <img 
            src={productDuckLogo} 
            alt="产品鸭 Logo" 
            className="w-10 h-10 rounded-lg"
          />
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900 truncate" style={{maxWidth: '3em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{currentProduct?.name || '请选择产品'}</h1>
          </div>
          <ChevronDown 
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
              isProductDropdownOpen ? 'rotate-180' : ''
            }`} 
          />
        </div>
        
        {/* 产品下拉菜单 */}
         {isProductDropdownOpen && (
           <div className="absolute top-full left-4 right-2 mt-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            {/* 新建产品按钮 */}
            <div className="p-2 border-b border-gray-100">
              <button 
                onClick={() => {
                  setIsAddProductModalOpen(true)
                  setIsProductDropdownOpen(false)
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>新建产品</span>
              </button>
            </div>
            
            <div className="p-2">
              {isLoadingProducts && (!userProducts || userProducts.length === 0) ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className="flex items-center space-x-3 px-3 py-2">
                      <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
                      <div className="flex-1 h-4 bg-gray-200 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
               userProducts?.map((product) => (
                 <div key={product.id} className="group relative">
                   <button
                     onClick={() => {
                       onProductChange(product)
                       setIsProductDropdownOpen(false)
                     }}
                     className={`w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-lg transition-colors duration-200 ${
                       currentProduct?.id === product.id
                         ? 'bg-primary-50 text-primary-700'
                         : 'text-gray-700 hover:bg-gray-50'
                     }`}
                   >
                     {/* 产品logo或首字母 */}
                     <div className="flex-shrink-0">
                       {product.logo_url ? (
                         <img 
                           src={product.logo_url} 
                           alt={`${product.name} Logo`} 
                           className="w-6 h-6 rounded"
                         />
                       ) : (
                         <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded flex items-center justify-center">
                           <span className="text-white font-semibold text-xs">
                             {(product.name || '').charAt(0)}
                           </span>
                         </div>
                       )}
                     </div>
                     
                     <span className="flex-1 text-left">{product.name}</span>
                   </button>
                   
                   {/* 编辑按钮 */}
                   <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingProduct(product)
                        setIsEditProductModalOpen(true)
                        setIsProductDropdownOpen(false)
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 transition-all duration-200"
                      title="编辑产品"
                    >
                      <Edit className="w-3 h-3 text-gray-500" />
                    </button>
                 </div>
               ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 pl-4">
        <ul className="space-y-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            const isSelected = selectedCategory === item.label
            return (
              <li key={index}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    setSelectedCategory((item.label || '').trim())
                  }}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
                    isSelected 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium" style={{fontSize: '14px'}}>{item.label}</span>
                </a>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* 用户信息区域 */}
      <div className="p-4 relative" ref={userMenuRef}>
        <div 
          className="flex items-center space-x-3 bg-gray-100 rounded-lg p-3 cursor-pointer hover:bg-gray-200 transition-colors duration-200" 
          style={{width: '176px'}}
          onClick={handleUserMenuClick}
        >
          <img 
            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80" 
            alt="风景头像" 
            className="w-8 h-8 rounded-full object-cover"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{currentUser || '用户'}</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
        </div>

        {/* 用户下拉菜单 */}
        {isUserMenuOpen && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span>退出系统</span>
            </button>
          </div>
        )}
      </div>

      {/* 新建产品弹窗 */}
      <AddProductModal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        onSubmit={handleAddProduct}
      />
      
      {/* 编辑产品弹窗 */}
      {isEditProductModalOpen && editingProduct && (
        <AddProductModal 
          isOpen={isEditProductModalOpen}
          onClose={() => {
            setIsEditProductModalOpen(false)
            setEditingProduct(null)
          }}
          onSubmit={(updatedProduct) => {
            // 如果有更新产品的回调，调用它
            if (onAddProduct) {
              onAddProduct(updatedProduct, editingProduct.id)
            }
            setIsEditProductModalOpen(false)
            setEditingProduct(null)
          }}
          editMode={true}
          initialData={editingProduct}
        />
      )}
    </div>
  )
}

export default Sidebar
