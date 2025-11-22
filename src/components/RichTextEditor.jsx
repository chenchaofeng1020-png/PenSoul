import React, { useState, useRef, useEffect } from 'react'
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  List, 
  ListOrdered, 
  Link, 
  Image, 
  Code, 
  Quote, 
  Undo, 
  Redo,
  Type,
  Palette
} from 'lucide-react'

const RichTextEditor = ({ 
  initialContent = '', 
  onSave, 
  onPreview,
  onChange,
  placeholder = '开始编写分析内容...',
  height = '400px'
}) => {
  const [content, setContent] = useState(initialContent)
  const [showImageUpload, setShowImageUpload] = useState(false)
  const editorRef = useRef(null)
  const fileInputRef = useRef(null)

  // 初始化编辑器内容
  const initializeEditor = () => {
    if (editorRef.current && initialContent) {
      editorRef.current.innerHTML = initialContent
    }
  }

  // 使用useEffect来初始化内容
  useEffect(() => {
    initializeEditor()
  }, [initialContent])

  // 格式化命令
  const formatText = (command, value = null) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    // 实时通知内容变化
    if (onChange) {
      onChange(editorRef.current?.innerHTML || '')
    }
  }

  // 插入链接
  const insertLink = () => {
    const url = prompt('请输入链接地址:')
    if (url) {
      formatText('createLink', url)
    }
  }

  // 处理图片上传
  const handleImageUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = `<img src="${e.target.result}" alt="上传图片" style="max-width: 100%; height: auto; margin: 10px 0;" />`
        document.execCommand('insertHTML', false, img)
        setShowImageUpload(false)
      }
      reader.readAsDataURL(file)
    }
  }

  // 保存内容（保留函数但不在UI中显示按钮）
  const handleSave = () => {
    const htmlContent = editorRef.current?.innerHTML || ''
    if (onSave) {
      onSave(htmlContent)
    }
    alert('内容已保存')
  }

  // 工具栏按钮组件
  const ToolbarButton = ({ onClick, icon: Icon, title, active = false }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-colors duration-200 ${
        active 
          ? 'bg-blue-100 text-blue-600 border border-blue-200' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  )

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      {/* 工具栏 */}
      <div className="border-b border-gray-200 p-3">
        <div className="flex flex-wrap items-center gap-1">
          {/* 文本格式 */}
          <div className="flex items-center gap-1 mr-3">
            <ToolbarButton 
              onClick={() => formatText('bold')} 
              icon={Bold} 
              title="粗体" 
            />
            <ToolbarButton 
              onClick={() => formatText('italic')} 
              icon={Italic} 
              title="斜体" 
            />
            <ToolbarButton 
              onClick={() => formatText('underline')} 
              icon={Underline} 
              title="下划线" 
            />
          </div>

          {/* 分隔线 */}
          <div className="w-px h-6 bg-gray-300 mx-2"></div>

          {/* 对齐方式 */}
          <div className="flex items-center gap-1 mr-3">
            <ToolbarButton 
              onClick={() => formatText('justifyLeft')} 
              icon={AlignLeft} 
              title="左对齐" 
            />
            <ToolbarButton 
              onClick={() => formatText('justifyCenter')} 
              icon={AlignCenter} 
              title="居中对齐" 
            />
            <ToolbarButton 
              onClick={() => formatText('justifyRight')} 
              icon={AlignRight} 
              title="右对齐" 
            />
          </div>

          {/* 分隔线 */}
          <div className="w-px h-6 bg-gray-300 mx-2"></div>

          {/* 列表 */}
          <div className="flex items-center gap-1 mr-3">
            <ToolbarButton 
              onClick={() => formatText('insertUnorderedList')} 
              icon={List} 
              title="无序列表" 
            />
            <ToolbarButton 
              onClick={() => formatText('insertOrderedList')} 
              icon={ListOrdered} 
              title="有序列表" 
            />
          </div>

          {/* 分隔线 */}
          <div className="w-px h-6 bg-gray-300 mx-2"></div>

          {/* 插入元素 */}
          <div className="flex items-center gap-1 mr-3">
            <ToolbarButton 
              onClick={insertLink} 
              icon={Link} 
              title="插入链接" 
            />
            <ToolbarButton 
              onClick={() => setShowImageUpload(true)} 
              icon={Image} 
              title="插入图片" 
            />
            <ToolbarButton 
              onClick={() => formatText('formatBlock', 'blockquote')} 
              icon={Quote} 
              title="引用" 
            />
            <ToolbarButton 
              onClick={() => formatText('formatBlock', 'pre')} 
              icon={Code} 
              title="代码块" 
            />
          </div>

          {/* 分隔线 */}
          <div className="w-px h-6 bg-gray-300 mx-2"></div>

          {/* 字体大小 */}
          <div className="flex items-center gap-2 mr-3">
            <select 
              onChange={(e) => formatText('fontSize', e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              defaultValue="3"
            >
              <option value="1">小</option>
              <option value="3">正常</option>
              <option value="5">大</option>
              <option value="7">特大</option>
            </select>
          </div>

          {/* 分隔线 */}
          <div className="w-px h-6 bg-gray-300 mx-2"></div>

          {/* 撤销重做 */}
          <div className="flex items-center gap-1 mr-3">
            <ToolbarButton 
              onClick={() => formatText('undo')} 
              icon={Undo} 
              title="撤销" 
            />
            <ToolbarButton 
              onClick={() => formatText('redo')} 
              icon={Redo} 
              title="重做" 
            />
          </div>

          {/* 右侧操作 - 移除保存按钮和预览按钮 */}
          <div className="flex items-center gap-2 ml-auto">
            {/* 保存按钮和预览按钮已移除 */}
          </div>
        </div>
      </div>

      {/* 编辑器内容区域 */}
      <div className="relative">
        {/* 编辑模式 */}
        <div
          ref={editorRef}
          contentEditable
          className="p-4 focus:outline-none min-h-[400px] overflow-auto rich-text-editor"
          style={{ height }}
          onInput={(e) => {
          setContent(e.target.innerHTML)
          // 实时通知内容变化
          if (onChange) {
            onChange(e.target.innerHTML)
          }
        }}
        suppressContentEditableWarning={true}
        data-placeholder={placeholder}
        />

        {/* 图片上传模态框 */}
        {showImageUpload && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">插入图片</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    选择图片文件
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowImageUpload(false)}
                    className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 text-xs text-gray-500 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <span>字符数: {content.replace(/<[^>]*>/g, '').length}</span>
          <span>模式: 编辑</span>
        </div>
        <div className="flex items-center space-x-2">
          <span>支持 Markdown 语法</span>
        </div>
      </div>
    </div>
  )
}

export default RichTextEditor