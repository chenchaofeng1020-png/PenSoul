import { useState, useEffect } from 'react'
import { 
  MessageCircle, 
  Reply, 
  ThumbsUp, 
  ThumbsDown, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Send, 
  User,
  Clock,
  Heart,
  Flag
} from 'lucide-react'

const CommentSystem = ({ 
  competitorId, 
  targetType,
  targetId,
  comments: initialComments = [], 
  onCommentAdd, 
  onCommentUpdate, 
  onCommentDelete,
  currentUser = { id: 1, name: '当前用户', avatar: null }
}) => {
  const [comments, setComments] = useState(initialComments)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [editingComment, setEditingComment] = useState(null)
  const [editText, setEditText] = useState('')
  const [showDropdown, setShowDropdown] = useState(null)
  const [isCommentExpanded, setIsCommentExpanded] = useState(false)

  const API_BASE = 'http://localhost:8000'

  // 将后端返回的扁平字段（username/full_name/avatar/author_id）或前端对象（author/user）统一映射为作者对象
  const mapAuthor = (record) => ({
    id: record?.author?.id ?? record?.author_id ?? record?.user_id ?? null,
    name: record?.author?.name ?? record?.full_name ?? record?.username ?? '用户',
    avatar: record?.author?.avatar ?? record?.avatar ?? null
  })

  const mapComment = (c) => ({
    id: c.id,
    author: mapAuthor(c),
    content: c.content,
    createdAt: c.created_at ? new Date(c.created_at).toLocaleString('zh-CN') : (c.createdAt || ''),
    updatedAt: c.updated_at ? new Date(c.updated_at).toLocaleString('zh-CN') : (c.updatedAt || null),
    likes: c.likes ?? 0,
    dislikes: c.dislikes ?? 0,
    isLiked: false,
    isDisliked: false,
    replies: (c.replies || []).map(r => ({
      id: r.id,
      author: mapAuthor(r),
      content: r.content,
      createdAt: r.created_at ? new Date(r.created_at).toLocaleString('zh-CN') : (r.createdAt || ''),
      updatedAt: r.updated_at ? new Date(r.updated_at).toLocaleString('zh-CN') : (r.updatedAt || null),
      likes: r.likes ?? 0,
      dislikes: r.dislikes ?? 0,
      isLiked: false,
      isDisliked: false
    }))
  })

  // 加载后端评论（当提供了 targetType/targetId 时）
  useEffect(() => {
    const loadComments = async () => {
      if (!targetType || !targetId) return
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`${API_BASE}/api/comments/${encodeURIComponent(targetType)}/${encodeURIComponent(targetId)}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })
        if (response.ok) {
          const data = await response.json()
          const list = data?.data?.comments ?? data?.data?.items ?? data?.data ?? []
          const mapped = Array.isArray(list) ? list.map(mapComment) : []
          setComments(mapped)
        } else {
          // 若未登录或接口错误，不覆盖已有评论
          console.warn('加载评论失败', response.status)
        }
      } catch (e) {
        console.error('加载评论异常:', e)
      }
    }
    loadComments()
  }, [targetType, targetId])

  // 移除写死的模拟评论数据，若未配置后端目标则不预填评论

  // 添加评论（后端）
  const handleAddComment = async () => {
    if (!newComment.trim()) return

    // 若有后端 target 配置，则调用 API
    if (targetType && targetId) {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          alert('请先登录后再发表评论')
          return
        }
        const response = await fetch(`${API_BASE}/api/comments/${encodeURIComponent(targetType)}/${encodeURIComponent(targetId)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ content: newComment, parent_id: null, attachments: [] })
        })
        if (response.ok) {
          const data = await response.json()
          const c = data?.data ?? null
          if (c) {
            const mapped = mapComment(c)
            setComments(prev => [mapped, ...prev])
            setNewComment('')
            setIsCommentExpanded(false) // 收起评论输入框
            onCommentAdd && onCommentAdd(mapped)
          }
        } else {
          const errText = await response.text()
          alert(`发表评论失败: ${response.status}\n${errText}`)
        }
      } catch (e) {
        console.error('发表评论异常:', e)
        alert('发表评论异常，请稍后再试')
      }
      return
    }

    // 本地模拟逻辑（无后端时）
    const comment = {
      id: Date.now(),
      author: currentUser,
      content: newComment,
      createdAt: new Date().toLocaleString('zh-CN'),
      updatedAt: null,
      likes: 0,
      dislikes: 0,
      isLiked: false,
      isDisliked: false,
      replies: []
    }

    setComments(prev => [comment, ...prev])
    setNewComment('')
    setIsCommentExpanded(false) // 收起评论输入框

    if (onCommentAdd) {
      onCommentAdd(comment)
    }
  }

  // 取消评论
  const handleCancelComment = () => {
    setNewComment('')
    setIsCommentExpanded(false)
  }

  // 添加回复
  const handleAddReply = async (commentId) => {
    if (!replyText.trim()) return

    if (targetType && targetId) {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          alert('请先登录后再回复')
          return
        }
        const response = await fetch(`${API_BASE}/api/comments/${encodeURIComponent(targetType)}/${encodeURIComponent(targetId)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ content: replyText, parent_id: commentId, attachments: [] })
        })
        if (response.ok) {
          const data = await response.json()
          const r = data?.data ?? null
          if (r) {
            const mapped = mapComment(r) // 返回的是新创建的评论（可能是 reply），只取其自身
            const reply = {
              id: mapped.id,
              author: mapped.author,
              content: mapped.content,
              createdAt: mapped.createdAt,
              updatedAt: mapped.updatedAt,
              likes: mapped.likes,
              dislikes: mapped.dislikes,
              isLiked: false,
              isDisliked: false
            }
            setComments(prev => prev.map(comment => 
              comment.id === commentId 
                ? { ...comment, replies: [...(comment.replies || []), reply] }
                : comment
            ))
            setReplyingTo(null)
            setReplyText('')
            onCommentAdd && onCommentAdd(reply)
          }
        } else {
          const errText = await response.text()
          alert(`回复失败: ${response.status}\n${errText}`)
        }
      } catch (e) {
        console.error('回复异常:', e)
        alert('回复异常，请稍后再试')
      }
      return
    }

    const reply = {
      id: Date.now(),
      author: currentUser,
      content: replyText,
      createdAt: new Date().toLocaleString('zh-CN'),
      updatedAt: null,
      likes: 0,
      dislikes: 0,
      isLiked: false,
      isDisliked: false
    }

    setComments(prev => prev.map(comment => 
      comment.id === commentId 
        ? { ...comment, replies: [...comment.replies, reply] }
        : comment
    ))
    
    setReplyingTo(null)
    setReplyText('')
  }

  // 点赞/踩（前端状态）
  const handleLike = (commentId, replyId = null, isLike = true) => {
    setComments(prev => prev.map(comment => {
      if (comment.id === commentId && !replyId) {
        const newComment = { ...comment }
        if (isLike) {
          if (newComment.isLiked) {
            newComment.likes -= 1
            newComment.isLiked = false
          } else {
            newComment.likes += 1
            newComment.isLiked = true
            if (newComment.isDisliked) {
              newComment.dislikes -= 1
              newComment.isDisliked = false
            }
          }
        } else {
          if (newComment.isDisliked) {
            newComment.dislikes -= 1
            newComment.isDisliked = false
          } else {
            newComment.dislikes += 1
            newComment.isDisliked = true
            if (newComment.isLiked) {
              newComment.likes -= 1
              newComment.isLiked = false
            }
          }
        }
        return newComment
      } else if (comment.id === commentId && replyId) {
        return {
          ...comment,
          replies: comment.replies.map(reply => {
            if (reply.id === replyId) {
              const newReply = { ...reply }
              if (isLike) {
                if (newReply.isLiked) {
                  newReply.likes -= 1
                  newReply.isLiked = false
                } else {
                  newReply.likes += 1
                  newReply.isLiked = true
                  if (newReply.isDisliked) {
                    newReply.dislikes -= 1
                    newReply.isDisliked = false
                  }
                }
              } else {
                if (newReply.isDisliked) {
                  newReply.dislikes -= 1
                  newReply.isDisliked = false
                } else {
                  newReply.dislikes += 1
                  newReply.isDisliked = true
                  if (newReply.isLiked) {
                    newReply.likes -= 1
                    newReply.isLiked = false
                  }
                }
              }
              return newReply
            }
            return reply
          })
        }
      }
      return comment
    }))
  }

  // 编辑评论
  const handleEditComment = (commentId, replyId = null) => {
    if (replyId) {
      const comment = comments.find(c => c.id === commentId)
      const reply = comment?.replies.find(r => r.id === replyId)
      if (reply) {
        setEditText(reply.content)
        setEditingComment({ commentId, replyId })
      }
    } else {
      const comment = comments.find(c => c.id === commentId)
      if (comment) {
        setEditText(comment.content)
        setEditingComment({ commentId })
      }
    }
    setShowDropdown(null)
  }

  // 保存编辑（后端）
  const handleSaveEdit = async () => {
    if (!editText.trim()) return

    const targetItemId = editingComment?.replyId ?? editingComment?.commentId
    if (targetItemId && (targetType && targetId)) {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          alert('请先登录后再编辑评论')
          return
        }
        const response = await fetch(`${API_BASE}/api/comments/${encodeURIComponent(targetItemId)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ content: editText, attachments: [] })
        })
        if (!response.ok) {
          const errText = await response.text()
          alert(`保存编辑失败: ${response.status}\n${errText}`)
          return
        }
      } catch (e) {
        console.error('保存编辑异常:', e)
        alert('保存编辑异常，请稍后再试')
        return
      }
    }

    setComments(prev => prev.map(comment => {
      if (comment.id === editingComment.commentId && !editingComment.replyId) {
        return {
          ...comment,
          content: editText,
          updatedAt: new Date().toLocaleString('zh-CN')
        }
      } else if (comment.id === editingComment.commentId && editingComment.replyId) {
        return {
          ...comment,
          replies: comment.replies.map(reply => 
            reply.id === editingComment.replyId
              ? { ...reply, content: editText, updatedAt: new Date().toLocaleString('zh-CN') }
              : reply
          )
        }
      }
      return comment
    }))

    setEditingComment(null)
    setEditText('')
  }

  // 删除评论（后端）
  const handleDeleteComment = async (commentId, replyId = null) => {
    const targetItemId = replyId ?? commentId

    if (targetItemId && (targetType && targetId)) {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          alert('请先登录后再删除评论')
          return
        }
        const response = await fetch(`${API_BASE}/api/comments/${encodeURIComponent(targetItemId)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (!response.ok) {
          const errText = await response.text()
          alert(`删除失败: ${response.status}\n${errText}`)
          return
        }
      } catch (e) {
        console.error('删除异常:', e)
        alert('删除异常，请稍后再试')
        return
      }
    }

    if (replyId) {
      setComments(prev => prev.map(comment => 
        comment.id === commentId
          ? { ...comment, replies: comment.replies.filter(reply => reply.id !== replyId) }
          : comment
      ))
    } else {
      setComments(prev => prev.filter(comment => comment.id !== commentId))
    }
    setShowDropdown(null)
  }

  // 用户头像组件
  const UserAvatar = ({ user, size = 'md' }) => {
    const sizeClasses = {
      sm: 'w-6 h-6',
      md: 'w-8 h-8',
      lg: 'w-10 h-10'
    }

    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0`}>
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
        ) : (
          <User className="w-4 h-4 text-gray-500" />
        )}
      </div>
    )
  }

  // 评论项组件
  const CommentItem = ({ comment, isReply = false }) => {
    const isEditing = editingComment?.commentId === comment.id && 
                     (isReply ? editingComment?.replyId === comment.id : !editingComment?.replyId)
    const canEdit = comment.author.id === currentUser.id

    return (
      <div className={`${isReply ? 'ml-12' : ''} mb-4`}>
        <div className="flex space-x-3">
          <UserAvatar user={comment.author} size={isReply ? 'sm' : 'md'} />
          
          <div className="flex-1 min-w-0">
            {/* 用户信息和时间 */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900 text-sm">{comment.author.name}</span>
                <span className="text-xs text-gray-500 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {comment.createdAt}
                  {comment.updatedAt && (
                    <span className="ml-2 text-blue-600">(已编辑)</span>
                  )}
                </span>
              </div>
              
              {/* 操作菜单 */}
              {canEdit && (
                <div className="relative">
                  <button
                    onClick={() => setShowDropdown(showDropdown === comment.id ? null : comment.id)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  
                  {showDropdown === comment.id && (
                    <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                      <button
                        onClick={() => handleEditComment(comment.id, isReply ? comment.id : null)}
                        className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        <Edit className="w-4 h-4" />
                        <span>编辑</span>
                      </button>
                      <button
                        onClick={() => handleDeleteComment(isReply ? comment.parentId : comment.id, isReply ? comment.id : null)}
                        className="flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>删除</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* 评论内容 */}
            {isEditing ? (
              <div className="mb-3">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="编辑评论..."
                />
                <div className="flex justify-end space-x-2 mt-2">
                  <button
                    onClick={() => setEditingComment(null)}
                    className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                  >
                    保存
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-800 text-sm mb-3 leading-relaxed">{comment.content}</p>
            )}
            
            {/* 操作按钮 */}
            {!isEditing && (
              <div className="flex items-center space-x-4 text-sm">
                <button
                  onClick={() => handleLike(isReply ? comment.parentId : comment.id, isReply ? comment.id : null, true)}
                  className={`flex items-center space-x-1 ${comment.isLiked ? 'text-blue-600' : 'text-gray-500'} hover:text-blue-600`}
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>{comment.likes}</span>
                </button>
                
                <button
                  onClick={() => handleLike(isReply ? comment.parentId : comment.id, isReply ? comment.id : null, false)}
                  className={`flex items-center space-x-1 ${comment.isDisliked ? 'text-red-600' : 'text-gray-500'} hover:text-red-600`}
                >
                  <ThumbsDown className="w-4 h-4" />
                  <span>{comment.dislikes}</span>
                </button>
                
                {!isReply && (
                  <button
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    className="flex items-center space-x-1 text-gray-500 hover:text-blue-600"
                  >
                    <Reply className="w-4 h-4" />
                    <span>回复</span>
                  </button>
                )}
              </div>
            )}
            
            {/* 回复输入框 */}
            {replyingTo === comment.id && !isReply && (
              <div className="mt-3">
                <div className="flex space-x-3">
                  <UserAvatar user={currentUser} size="sm" />
                  <div className="flex-1">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={2}
                      placeholder={`回复 ${comment.author.name}...`}
                    />
                    <div className="flex justify-end space-x-2 mt-2">
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => handleAddReply(comment.id)}
                        className="flex items-center space-x-1 px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                      >
                        <Send className="w-3 h-3" />
                        <span>回复</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* 回复列表 */}
        {!isReply && comment.replies && comment.replies.length > 0 && (
          <div className="mt-4">
            {comment.replies.map(reply => (
              <CommentItem 
                key={reply.id} 
                comment={{ ...reply, parentId: comment.id }} 
                isReply={true} 
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">评论讨论</h3>
            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm">
              {comments.length}
            </span>
          </div>
        </div>
      </div>
      
      {/* 新评论输入 - 优化为紧凑形式 */}
      <div className="p-4 border-b border-gray-200">
        {!isCommentExpanded ? (
          // 紧凑的输入框
          <div className="flex items-center space-x-3">
            <UserAvatar user={currentUser} size="sm" />
            <div 
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-text hover:bg-gray-100 transition-colors duration-200"
              onClick={() => setIsCommentExpanded(true)}
            >
              写下你的评论...
            </div>
          </div>
        ) : (
          // 展开的富文本编辑器
          <div className="flex space-x-3">
            <UserAvatar user={currentUser} />
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
                placeholder="写下你的评论..."
                autoFocus
              />
              <div className="flex justify-end space-x-2 mt-3">
                <button
                  onClick={handleCancelComment}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                  取消
                </button>
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  <Send className="w-4 h-4" />
                  <span>发表评论</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* 评论列表 */}
      <div className="p-4">
        {comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">暂无评论，来发表第一条评论吧！</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map(comment => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default CommentSystem