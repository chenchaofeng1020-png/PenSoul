import React, { useState, useEffect } from 'react';
import { SourceManager } from '../components/SmartMaterial/SourceManager';
import { ChatInterface } from '../components/SmartMaterial/ChatInterface';
import { StudioPanel } from '../components/SmartMaterial/StudioPanel';
import { NoteDetailModal } from '../components/SmartMaterial/NoteDetailModal';
import { ResizableDivider } from '../components/SmartMaterial/ResizableDivider';
import { RequirementDocProvider } from '../context/RequirementDocContext';
import { SmartEstimationProvider } from '../context/SmartEstimationContext';
import { loadChatHistory, saveChatHistory, clearChatHistory, archiveChatHistory } from '../utils/chatStorage';

export default function SmartMaterialPage({ currentProduct }) {
  const REQUIREMENT_DOC_PANEL_WIDTH = 420;
  const SMART_ESTIMATION_PANEL_WIDTH = 460;
  const productId = currentProduct?.id;
  const productName = currentProduct?.name;
  const [sources, setSources] = useState([]);
  const [selectedSources, setSelectedSources] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const [studioMode, setStudioMode] = useState(null);
  
  // 面板宽度状态
  const [leftPanelWidth, setLeftPanelWidth] = useState(280);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  
  useEffect(() => {
    if (!productId) return;
    
    setIsHistoryLoaded(false);
    
    fetch(`http://localhost:3002/api/smart/sources?productId=${productId}`)
      .then(res => res.json())
      .then(data => setSources(data.data || []))
      .catch(console.error);

    fetch(`http://localhost:3002/api/smart/notes?productId=${productId}`)
      .then(async res => {
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Failed to fetch notes: ${res.status} ${errorText}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('[SmartMaterialPage] Loaded notes:', data);
        setNotes(data.data || []);
      })
      .catch(err => {
        console.error('[SmartMaterialPage] Error loading notes:', err);
      });
    
    console.log('[SmartMaterialPage] Loading chat history for product:', productId);
    const savedHistory = loadChatHistory(productId);
    console.log('[SmartMaterialPage] Loaded chat history:', savedHistory?.length || 0, 'messages');
    if (savedHistory && savedHistory.length > 0) {
      console.log('[SmartMaterialPage] First message:', savedHistory[0]?.content?.substring(0, 50));
    }
    setChatHistory(savedHistory || []);
    
    setTimeout(() => {
      setIsHistoryLoaded(true);
      console.log('[SmartMaterialPage] History load completed for product:', productId);
    }, 100);
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    if (!isHistoryLoaded) {
      console.log('[SmartMaterialPage] Skip saving: history not loaded yet for product:', productId);
      return;
    }
    console.log('[SmartMaterialPage] Saving chat history for product:', productId, 'messages:', chatHistory.length);
    if (chatHistory.length > 0) {
      console.log('[SmartMaterialPage] Last message:', chatHistory[chatHistory.length - 1]?.content?.substring(0, 50));
    }
    saveChatHistory(productId, chatHistory);
  }, [chatHistory, productId, isHistoryLoaded]);

  const handleDeleteNote = async (id) => {
    try {
      await fetch(`http://localhost:3002/api/smart/notes/${id}`, { method: 'DELETE' });
      setNotes(notes.filter(n => n.id !== id));
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

  const handleNoteCreated = (note) => {
    setNotes(prev => {
      const exists = prev.find(n => n.id === note.id);
      if (exists) {
        return prev.map(n => n.id === note.id ? note : n);
      }
      return [note, ...prev];
    });
  };

  const handleSelectNote = (note) => {
    if (note.type === 'estimation_report') {
      try {
        const content = JSON.parse(note.content);
        if (content.reportId) {
          const reportUrl = `${window.location.origin}/#/estimation/${content.reportId}`;
          window.open(reportUrl, '_blank');
          return;
        }
      } catch (e) {
        console.error('解析报告 ID 失败:', e);
      }
    }
    setSelectedNote(note);
  };

  const handleClearChatHistory = () => {
    if (confirm('确定要清空当前产品的聊天记录吗？')) {
      archiveChatHistory(productId, chatHistory, {
        reason: 'manual_clear',
        title: `${productName || '当前产品'}聊天记录`
      });
      clearChatHistory(productId);
      setChatHistory([]);
    }
  };

  const handleSaveDeliverable = async (deliverable) => {
    try {
      const noteRes = await fetch('http://localhost:3002/api/smart/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deliverable)
      });
      
      if (!noteRes.ok) throw new Error('保存失败');
      
      const noteData = await noteRes.json();
      
      setNotes(prev => {
        const exists = prev.find(n => n.id === noteData.data.id);
        if (exists) {
          return prev.map(n => n.id === noteData.data.id ? noteData.data : n);
        }
        return [noteData.data, ...prev];
      });
      
      return noteData.data;
    } catch (error) {
      console.error('保存交付物失败:', error);
      throw error;
    }
  };

  const handleOpenRequirementDocMode = () => {
    setRightPanelWidth(prev => Math.max(prev, REQUIREMENT_DOC_PANEL_WIDTH));
    setStudioMode('requirement_doc');
  };

  const handleOpenSmartEstimationMode = () => {
    setRightPanelWidth(prev => Math.max(prev, SMART_ESTIMATION_PANEL_WIDTH));
    setStudioMode('smart_estimation');
  };

  const handleCloseStudioMode = () => {
    setStudioMode(null);
  };

  if (!currentProduct) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        请先选择一个产品
      </div>
    );
  }

  // 第一条分隔线拖动处理 - 调整左侧面板
  const handleLeftDividerMove = (deltaX) => {
    setLeftPanelWidth(prev => {
      const newWidth = prev + deltaX;
      return Math.max(200, Math.min(600, newWidth));
    });
  };

  // 第二条分隔线拖动处理 - 调整右侧面板
  const handleRightDividerMove = (deltaX) => {
    setRightPanelWidth(prev => {
      const newWidth = prev - deltaX;
      return Math.max(250, Math.min(600, newWidth));
    });
  };

  return (
    <RequirementDocProvider>
      <SmartEstimationProvider>
      <div className="flex h-full overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100">
          {/* 左侧面板 */}
          <div 
            className="flex-shrink-0 z-20 overflow-hidden"
            style={{ width: leftPanelWidth, minWidth: 200 }}
          >
            <SourceManager 
              productId={productId} 
              sources={sources} 
              setSources={setSources} 
              currentStudioMode={studioMode}
              onSelectionChange={setSelectedSources}
            />
          </div>

          {/* 第一条分隔线 */}
          <ResizableDivider 
            onResizeMove={handleLeftDividerMove}
          />

          {/* 中间面板 */}
          <div className="flex-1 flex flex-col min-w-[200px] z-10 overflow-hidden">
            <ChatInterface 
               productId={productId} 
               history={chatHistory} 
               setHistory={setChatHistory} 
               sources={selectedSources}
               productName={productName}
               onClearHistory={handleClearChatHistory}
               onSaveDeliverable={handleSaveDeliverable}
               currentStudioMode={studioMode}
               onOpenRequirementDocMode={handleOpenRequirementDocMode}
            />
          </div>

          {/* 第二条分隔线 */}
          <ResizableDivider 
            onResizeMove={handleRightDividerMove}
          />

          {/* 右侧面板 */}
          <div 
            className="flex-shrink-0 bg-white z-20 overflow-hidden"
            style={{ width: rightPanelWidth, minWidth: 250 }}
          >
            <StudioPanel 
              productId={productId}
              productName={productName}
              sources={selectedSources}
              chatHistory={chatHistory}
              notes={notes}
              onNoteCreated={handleNoteCreated}
              onSelectNote={handleSelectNote}
              onDeleteNote={handleDeleteNote}
              currentStudioMode={studioMode}
              onOpenRequirementDocMode={handleOpenRequirementDocMode}
              onOpenSmartEstimationMode={handleOpenSmartEstimationMode}
              onCloseStudioMode={handleCloseStudioMode}
            />
          </div>
        
        {selectedNote && (
          <NoteDetailModal 
            note={selectedNote} 
            onClose={() => setSelectedNote(null)} 
            onUpdate={(updated) => {
               setNotes(notes.map(n => n.id === updated.id ? updated : n));
               setSelectedNote(updated);
            }}
          />
        )}
      </div>
      </SmartEstimationProvider>
    </RequirementDocProvider>
  );
}
