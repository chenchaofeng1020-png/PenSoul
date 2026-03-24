import { Home, BarChart3, Settings, Users, Target, ChevronDown, Plus, LogOut, Edit, Map, Zap, Cog, GitBranch, Layers, FileText, Calendar, Database, MessageSquare, BookOpen } from 'lucide-react'
import { productDuckLogo } from '../assets/logos'
import { useState, useEffect, useRef } from 'react'
import AddProductModal from './AddProductModal'

const Sidebar = ({ 
  selectedCategory, 
  setSelectedCategory, 
  currentUser, 
  userAvatar,
  onLogout,
  currentProduct,
  userProducts,
  onProductChange,
  onAddProduct,
  widthClass,
  isLoadingProducts,
  onRefresh
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
    { icon: <BookOpen className="w-5 h-5" />, label: 'AI工作台', path: '/smart-material' },
    { icon: '🗄️', label: '产品规划', path: '/planning' },
    { icon: <Users className="w-5 h-5" />, label: '人设实验室', path: '/personas' },
    { icon: '📅', label: '排期公告板', path: '/content' },
    { icon: <Cog className="w-5 h-5" />, label: '系统设置', path: '/settings' },
  ]

  return (
    <div className={`${widthClass || 'w-48'} flex flex-col`}>
      {/* 产品信息区域 */}
      <div className="p-6 relative" ref={dropdownRef}>
        <div 
          className="flex items-center space-x-1 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors duration-200"
          onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
        >
          {currentProduct?.logo_url ? (
            <img 
              src={currentProduct.logo_url} 
              alt={`${currentProduct.name || '产品'} Logo`} 
              className="w-6 h-6 rounded-lg object-cover"
              referrerPolicy="no-referrer"
              onError={(e)=>{e.currentTarget.src = productDuckLogo}}
            />
          ) : (
            <img 
              src={productDuckLogo} 
              alt="产品鸭 Logo" 
              className="w-6 h-6 rounded-lg"
            />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 truncate">{currentProduct?.name || '请选择产品'}</h1>
          </div>
          <ChevronDown 
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
              isProductDropdownOpen ? 'rotate-180' : ''
            }`} 
          />
        </div>
        
        {/* 产品下拉菜单 */}
         {isProductDropdownOpen && (
           <div className="absolute top-full left-2 w-52 mt-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
            {/* 灵感工作台入口 */}
            <div className="p-2 border-b border-gray-100 bg-amber-50">
              <button 
                onClick={() => {
                  if (setSelectedCategory) {
                    setSelectedCategory('灵感工作台');
                  } else {
                    // Fallback if setSelectedCategory is not available
                    window.location.hash = '#/ideas';
                  }
                  setIsProductDropdownOpen(false)
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 rounded-lg transition-colors duration-200"
              >
                <span className="text-lg">💡</span>
                <span>灵感工作台</span>
              </button>
            </div>

            {/* 按钮区域 */}
            <div className="p-2 border-b border-gray-100 space-y-1">
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

              <button 
                onClick={(e) => {
                   e.stopPropagation()
                   if (onRefresh) {
                     onRefresh()
                   }
                }}
                disabled={isLoadingProducts}
                className={`w-full flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  isLoadingProducts 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className={`w-4 h-4 flex items-center justify-center ${isLoadingProducts ? 'animate-spin' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                    <path d="M3 3v5h5"/>
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                    <path d="M16 21h5v-5"/>
                  </svg>
                </div>
                <span>{isLoadingProducts ? '加载中...' : '刷新列表'}</span>
              </button>
            </div>
            
            <div className="p-2 max-h-[300px] overflow-y-auto hover-scrollbar">
              {isLoadingProducts && (!userProducts || userProducts.length === 0) ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className="flex items-center space-x-3 px-3 py-2">
                      <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
                      <div className="flex-1 h-4 bg-gray-200 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (!userProducts || userProducts.length === 0) ? (
                <div className="text-center py-4 text-sm text-gray-500">
                  暂无产品，请新建
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
                           className="w-6 h-6 rounded object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.src = productDuckLogo
                            e.currentTarget.onerror = null
                          }}
                         />
                       ) : (
                         <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded flex items-center justify-center">
                           <span className="text-white font-semibold text-xs">
                             {(product.name || '').charAt(0)}
                           </span>
                         </div>
                       )}
                     </div>
                     
                     <span className="flex-1 text-left">{product.name}</span>
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
        <ul className="space-y-1">
          {menuItems.map((item, index) => {
            const isSelected = selectedCategory === item.label
            return (
              <li key={index}>
                <a
                  href="#"
                  onClick={(e) => {
                  e.preventDefault()
                  setSelectedCategory((item.label || '').trim())
                  }}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors duration-200 ${
                    isSelected 
                      ? 'bg-blue-50 text-blue-600 font-medium' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  <span className="text-lg leading-none w-5 h-5 flex items-center justify-center">{item.icon}</span>
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
            src={userAvatar || localStorage.getItem('user_avatar') || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"} 
            alt="用户头像" 
            className="w-8 h-8 rounded-full object-cover"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{currentUser || '用户'}</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
        </div>

        {/* 用户下拉菜单 */}
        {isUserMenuOpen && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 overflow-hidden">
             {/* 个人信息入口 */}
             <div 
              onClick={() => {
                setSelectedCategory('个人信息');
                setIsUserMenuOpen(false);
              }}
              className="flex items-center space-x-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100"
            >
              <img 
                src={userAvatar || localStorage.getItem('user_avatar') || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"} 
                alt="用户头像" 
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{currentUser || '用户'}</p>
                <p className="text-xs text-gray-500 truncate">查看个人信息</p>
              </div>
            </div>

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
