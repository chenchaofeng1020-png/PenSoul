import React from 'react';
import { GenerationGrid } from './GenerationGrid';
import { NoteList } from './NoteList';
import { RequirementDocMode } from './RequirementDoc/RequirementDocMode';
import { SmartEstimationMode } from './SmartEstimation/SmartEstimationMode';
import { useRequirementDoc } from '../../context/RequirementDocContext';
import { LayoutGrid, List, X } from 'lucide-react';
import { archiveRequirementDocSession } from '../../utils/chatStorage';

export function StudioPanel({ productId, productName, sources, chatHistory, notes, onNoteCreated, onSelectNote, onDeleteNote, currentStudioMode, onOpenRequirementDocMode, onOpenSmartEstimationMode, onCloseStudioMode }) {
  const { state, dispatch } = useRequirementDoc();
  const isRequirementDocMode = currentStudioMode === 'requirement_doc';
  const isSmartEstimationMode = currentStudioMode === 'smart_estimation';

  const handleOpenRequirementDoc = () => {
    onOpenRequirementDocMode?.();
  };

  const handleOpenSmartEstimation = () => {
    onOpenSmartEstimationMode?.();
  };

  const handleCloseStudio = () => {
    if (isRequirementDocMode) {
      archiveRequirementDocSession(productId, {
        docState: state,
        messages: chatHistory
      }, {
        reason: 'close_requirement_doc',
        title: `${productName || '当前产品'}需求文档草稿`
      });
      dispatch({ type: 'RESET' });
    }
    onCloseStudioMode?.();
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-50">
      {!currentStudioMode ? (
        <>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-800">Studio</h2>
            <div className="flex space-x-1 text-gray-400">
              <LayoutGrid className="w-4 h-4" />
              <List className="w-4 h-4" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
            <div className="space-y-3">
              <GenerationGrid 
                productId={productId} 
                sources={sources} 
                chatHistory={chatHistory} 
                onNoteCreated={onNoteCreated}
                onOpenRequirementDoc={handleOpenRequirementDoc}
                onOpenSmartEstimation={handleOpenSmartEstimation}
                compact={true}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-500">最近交付物</h3>
                <span className="text-xs text-gray-400 cursor-pointer hover:text-indigo-600">查看全部 {notes.length}</span>
              </div>
              
              <NoteList 
                notes={notes} 
                onSelect={onSelectNote} 
                onDelete={onDeleteNote}
                compact={true}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="relative h-full">
          <button
            onClick={handleCloseStudio}
            className="absolute top-4 right-4 z-10 p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow text-gray-600 hover:text-gray-800"
            title="返回Studio"
          >
            <X className="w-5 h-5" />
          </button>
          {isRequirementDocMode ? (
            <RequirementDocMode 
              productId={productId}
              sources={sources}
              onNoteCreated={onNoteCreated}
            />
          ) : null}
          {isSmartEstimationMode ? (
            <SmartEstimationMode
              productId={productId}
              sources={sources}
              onNoteCreated={onNoteCreated}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
