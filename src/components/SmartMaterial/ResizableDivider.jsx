import React, { useState, useEffect, useCallback, useRef } from 'react';

export function ResizableDivider({ onResizeStart, onResizeMove, onResizeEnd }) {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    startXRef.current = e.clientX;
    
    // 通知父组件开始拖动
    onResizeStart?.(e.clientX);
  }, [onResizeStart]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startXRef.current;
    onResizeMove?.(deltaX);
    startXRef.current = e.clientX;
  }, [isDragging, onResizeMove]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onResizeEnd?.();
    }
  }, [isDragging, onResizeEnd]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { capture: true });
      document.addEventListener('mouseup', handleMouseUp, { capture: true });
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove, { capture: true });
      document.removeEventListener('mouseup', handleMouseUp, { capture: true });
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, { capture: true });
      document.removeEventListener('mouseup', handleMouseUp, { capture: true });
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      data-resizable-divider="true"
      className={`relative flex-shrink-0 w-px hover:w-0.5 transition-all duration-150 cursor-col-resize group z-30 ${
        isDragging ? 'bg-indigo-400/80 w-0.5' : 'bg-gray-200 hover:bg-indigo-300/70'
      }`}
      style={{ 
        minHeight: '100%',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* 拖动指示器 - 悬停时显示 */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-6 rounded-full transition-all duration-150 ${
          isDragging 
            ? 'bg-white opacity-100' 
            : 'bg-indigo-300 opacity-0 group-hover:opacity-100'
        }`}
      />
      
      {/* 拖动时的全局遮罩 */}
      {isDragging && (
        <div
          className="fixed inset-0 z-[9999]"
          style={{ cursor: 'col-resize' }}
        />
      )}
    </div>
  );
}
