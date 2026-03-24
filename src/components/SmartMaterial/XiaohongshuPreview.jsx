import React, { useState, useRef } from 'react';
import { Heart, Star, MessageCircle, Share2, ChevronLeft, ChevronRight, Edit3 } from 'lucide-react';

export function XiaohongshuPreview({ content, images = [] }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(128);
  const [collectCount, setCollectCount] = useState(28);
  const [commentCount, setCommentCount] = useState(112);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const imageContainerRef = useRef(null);

  // 解析小红书文案
  const parseContent = (text) => {
    if (!text) return { title: '', body: '', tags: [] };
    
    const lines = text.split('\n').filter(line => line.trim());
    let title = '';
    let body = [];
    let tags = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) {
        // 标签行
        const lineTags = trimmed.match(/#[^\s#]+/g) || [];
        tags.push(...lineTags);
      } else if (!title && trimmed.length > 0) {
        // 第一行非空行作为标题
        title = trimmed;
      } else {
        body.push(trimmed);
      }
    });
    
    return { title, body: body.join('\n'), tags };
  };

  const { title, body, tags } = parseContent(content);

  // 处理图片切换
  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    }
  };

  const handleNextImage = () => {
    if (currentImageIndex < images.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    }
  };

  // 双击点赞
  const handleDoubleClick = () => {
    if (!liked) {
      setLiked(true);
      setLikeCount(prev => prev + 1);
    }
    setShowHeartAnimation(true);
    setTimeout(() => setShowHeartAnimation(false), 800);
  };

  // 点击点赞按钮
  const handleLikeClick = () => {
    if (liked) {
      setLiked(false);
      setLikeCount(prev => prev - 1);
    } else {
      setLiked(true);
      setLikeCount(prev => prev + 1);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
      {/* 头部 - 用户信息 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-red-500 flex items-center justify-center text-white text-sm font-bold">
            用
          </div>
          <span className="text-sm font-medium text-gray-800">用户昵称</span>
        </div>
        <button className="text-xs text-red-500 font-medium px-3 py-1 border border-red-500 rounded-full hover:bg-red-50 transition-colors">
          关注
        </button>
      </div>

      {/* 可滚动内容区 */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* 图片区域 */}
        <div 
          ref={imageContainerRef}
          className="relative w-full aspect-[4/3] bg-gray-100 overflow-hidden cursor-pointer flex-shrink-0"
          onDoubleClick={handleDoubleClick}
        >
          {images.length > 0 ? (
            <>
              <img 
                src={images[currentImageIndex].image_url || images[currentImageIndex]} 
                alt={`图片 ${currentImageIndex + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* 双击爱心动画 */}
              {showHeartAnimation && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Heart className="w-24 h-24 text-white fill-red-500 animate-ping" />
                </div>
              )}

              {/* 左右切换按钮 */}
              {images.length > 1 && (
                <>
                  {currentImageIndex > 0 && (
                    <button 
                      onClick={handlePrevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                  {currentImageIndex < images.length - 1 && (
                    <button 
                      onClick={handleNextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </>
              )}

              {/* 轮播指示器 */}
              {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, idx) => (
                    <div 
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-2xl">🖼️</span>
                </div>
                <p className="text-sm">使用智能配图生成图片</p>
              </div>
            </div>
          )}
        </div>

        {/* 文案内容 */}
        <div className="px-4 py-3">
          {/* 标题 */}
          {title && (
            <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
          )}
          
          {/* 正文 */}
          {body && (
            <div className="text-sm text-gray-800 leading-relaxed mb-3 whitespace-pre-wrap">
              {body}
            </div>
          )}
          
          {/* 标签 */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag, idx) => (
                <span 
                  key={idx} 
                  className="text-sm text-blue-500 hover:text-blue-600 cursor-pointer"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* 展开按钮 */}
          <button className="text-xs text-gray-500 hover:text-gray-700 mb-2">
            展开
          </button>

          {/* 猜你想搜 */}
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
            <span className="flex items-center">
              <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              猜你想搜
            </span>
            <span className="text-gray-400">相关内容推荐</span>
          </div>

          {/* 评论预览 */}
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <p className="text-xs text-gray-500">
              查看全部 {commentCount} 条评论
            </p>
            <div className="text-sm">
              <span className="font-medium text-gray-800">用户A：</span>
              <span className="text-gray-700">太棒了！👍</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-800">用户B：</span>
              <span className="text-gray-700">种草了，马上入手</span>
            </div>
          </div>
        </div>
      </div>

      {/* 底部互动栏 - 固定在底部 */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white flex-shrink-0">
        {/* 评论输入框 */}
        <div className="flex items-center flex-1 mr-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full flex-1">
            <Edit3 className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">说点什么...</span>
          </div>
        </div>
        
        {/* 互动按钮 */}
        <div className="flex items-center gap-4">
          <button 
            onClick={handleLikeClick}
            className="flex items-center gap-1 group"
          >
            <Heart 
              className={`w-6 h-6 transition-colors ${
                liked ? 'text-gray-800 fill-red-500' : 'text-gray-700 group-hover:text-red-500'
              }`} 
            />
            <span className={`text-sm ${liked ? 'text-gray-800' : 'text-gray-700'}`}>
              {likeCount}
            </span>
          </button>
          <button className="flex items-center gap-1 group">
            <Star className="w-6 h-6 text-gray-700 group-hover:text-yellow-500 transition-colors" />
            <span className="text-sm text-gray-700">{collectCount}</span>
          </button>
          <button className="flex items-center gap-1 group">
            <MessageCircle className="w-6 h-6 text-gray-700 group-hover:text-blue-500 transition-colors" />
            <span className="text-sm text-gray-700">{commentCount}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
