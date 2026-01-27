import React, { useState, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import InspirationInbox from './InspirationInbox';
import AngleLab from './AngleLab';
import TopicResults from './TopicResults';
import SmartTopicIntro from './SmartTopicIntro';
import AddContentItemModalEnhanced from '../AddContentItemModalEnhanced';
import { createContentItem } from '../../services/api';
import { useUI } from '../../context/UIContext';

const SmartTopicWorkbench = ({ currentUser, productContext, onCreatePlan }) => {
  const { showToast } = useUI();
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [generatedTopics, setGeneratedTopics] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [createPlanData, setCreatePlanData] = useState(null);

  // Check intro status on mount
  useEffect(() => {
    const hasSeen = localStorage.getItem('has_seen_smart_topic_intro');
    if (!hasSeen) {
      setShowIntro(true);
    }
  }, []);

  const handleCloseIntro = () => {
    setShowIntro(false);
    localStorage.setItem('has_seen_smart_topic_intro', 'true');
  };

  // Cache Management
  const getCacheKey = (materials) => {
    if (!materials || materials.length === 0) return null;
    return materials.map(m => m.id).sort().join(',');
  };

  // Load cached topics when selection changes
  useEffect(() => {
    const key = getCacheKey(selectedMaterials);
    if (!key) {
      setGeneratedTopics([]);
      return;
    }
    
    try {
      const cache = JSON.parse(localStorage.getItem('smart_topic_cache') || '{}');
      if (cache[key]) {
        // Found cached topics for this combination
        setGeneratedTopics(cache[key]);
      } else {
        // No cache, clear results
        setGeneratedTopics([]);
      }
    } catch (e) {
      console.error('Failed to load topic cache:', e);
    }
  }, [selectedMaterials]);

  const handleGenerateSuccess = (topics) => {
    setGeneratedTopics(topics);
    setIsGenerating(false);

    // Save to cache
    const key = getCacheKey(selectedMaterials);
    if (key && topics.length > 0) {
      try {
        const cache = JSON.parse(localStorage.getItem('smart_topic_cache') || '{}');
        cache[key] = topics;
        localStorage.setItem('smart_topic_cache', JSON.stringify(cache));
      } catch (e) {
        console.error('Failed to save topic cache:', e);
      }
    }
  };

  const handleLocalCreatePlan = (planData) => {
    setCreatePlanData(planData);
    setIsCreatePlanOpen(true);
  };

  const handleCreatePlanSubmit = async (formData) => {
    try {
      if (!productContext?.id) {
        showToast('无法获取当前产品信息', 'error');
        return;
      }

      const payload = {
        product_id: productContext.id,
        platform: formData.platform,
        schedule_at: formData.schedule_at,
        status: formData.status,
        title: formData.topic_title,
        topic_title: formData.topic_title,
        body: createPlanData?.outline || '',
      };

      await createContentItem(payload);
      showToast('内容计划创建成功', 'success');
      setIsCreatePlanOpen(false);
      setCreatePlanData(null);
    } catch (error) {
      console.error('Failed to create plan:', error);
      showToast(error.message || '创建失败', 'error');
    }
  };

  // Layout: Left (Inbox) - Middle (Lab) - Right (Results)
  return (
    <div className="flex h-full bg-gray-50 overflow-hidden relative">
      {/* Help Button */}
      <button
        onClick={() => setShowIntro(true)}
        className="absolute top-4 right-6 z-40 p-2 bg-white/80 backdrop-blur hover:bg-white rounded-full shadow-sm text-gray-400 hover:text-indigo-600 transition-all border border-gray-100"
        title="功能介绍"
      >
        <HelpCircle size={20} />
      </button>

      {/* Intro Modal */}
      {showIntro && <SmartTopicIntro onClose={handleCloseIntro} />}

      {/* Left Column: Inspiration Inbox */}
      <div className="w-[360px] border-r border-gray-100 bg-white flex flex-col shrink-0">
        <InspirationInbox 
          currentUser={currentUser}
          selectedMaterials={selectedMaterials}
          onSelectionChange={setSelectedMaterials}
        />
      </div>

      {/* Middle Column: Angle Lab (The Transformer) */}
      <div className="w-[320px] border-r border-gray-200 bg-slate-50 flex flex-col shrink-0 relative shadow-inner z-10">
        <AngleLab 
          selectedMaterials={selectedMaterials}
          currentUser={currentUser}
          onGenerateStart={() => setIsGenerating(true)}
          onGenerateSuccess={handleGenerateSuccess}
          isGenerating={isGenerating}
        />
      </div>

      {/* Right Column: Topic Results */}
      <div className="flex-1 bg-white flex flex-col p-6 overflow-y-auto hover-scrollbar">
        <TopicResults 
          topics={generatedTopics} 
          isGenerating={isGenerating}
          currentUser={currentUser}
          onCreatePlan={handleLocalCreatePlan}
        />
      </div>

      {/* Create Plan Modal */}
      {isCreatePlanOpen && (
        <AddContentItemModalEnhanced
          onClose={() => setIsCreatePlanOpen(false)}
          onSubmit={handleCreatePlanSubmit}
          currentProduct={productContext}
          initialItem={{
            topic_title: createPlanData?.title,
            status: 'not_started'
          }}
        />
      )}
    </div>
  );
};

export default SmartTopicWorkbench;
