import React, { useState, useEffect } from 'react';
import { Search, FileText, CheckCircle2, Loader2, Globe, BookOpen, BrainCircuit } from 'lucide-react';

const ResearchProcess = ({ query, plan: initialPlan, onComplete }) => {
  const [step, setStep] = useState('planning'); // planning, searching, reading, synthesizing, completed
  const [logs, setLogs] = useState([]);
  const [plan, setPlan] = useState(null);

  // Mock Plan Generation (Phase 1)
  useEffect(() => {
    if (step === 'planning') {
      const timer = setTimeout(() => {
        let currentPlan = initialPlan;
        
        if (!currentPlan) {
            // Fallback if no plan provided (backward compatibility)
            currentPlan = {
                main_topic: query,
                sub_queries: [
                    `${query} 技术原理与架构`,
                    `${query} 行业落地案例`,
                    `${query} 2024年市场数据`
                ]
            };
        }

        // Format for internal use
        const formattedPlan = {
            main_topic: currentPlan.main_topic,
            dimensions: currentPlan.sub_queries.map((q, i) => ({
                type: ['tech', 'case', 'data'][i % 3] || 'general',
                query: q
            }))
        };

        setPlan(formattedPlan);
        setLogs(prev => [...prev, { type: 'plan', content: `诸葛已拆解调研需求，准备从 ${formattedPlan.dimensions.length} 个维度展开...` }]);
        setStep('searching');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [step, query, initialPlan]);

  // Mock Searching (Phase 2)
  useEffect(() => {
    if (step === 'searching' && plan) {
      let currentIdx = 0;
      const interval = setInterval(() => {
        if (currentIdx >= plan.dimensions.length) {
          clearInterval(interval);
          setStep('reading');
          return;
        }
        const dim = plan.dimensions[currentIdx];
        setLogs(prev => [...prev, { type: 'search', content: `正在搜索：${dim.query}` }]);
        currentIdx++;
      }, 1200);
      return () => clearInterval(interval);
    }
  }, [step, plan]);

  // Mock Reading (Phase 3)
  useEffect(() => {
    if (step === 'reading') {
      const docs = [
        '深度解析：核心技术原理与演进...',
        '2024年度行业白皮书.pdf',
        '某知名企业落地实践全纪实...',
        'GitHub 开源项目技术文档...'
      ];
      
      let currentIdx = 0;
      const interval = setInterval(() => {
        if (currentIdx >= docs.length) {
            clearInterval(interval);
            setStep('synthesizing');
            return;
        }
        setLogs(prev => [...prev, { type: 'read', content: `正在阅读：${docs[currentIdx]}` }]);
        currentIdx++;
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step]);

  // Synthesizing & Complete
  useEffect(() => {
    if (step === 'synthesizing') {
       const timer = setTimeout(() => {
           setStep('completed');
           if (onComplete) onComplete();
       }, 1500);
       return () => clearTimeout(timer);
    }
  }, [step]);

  return (
    <div className="bg-white border border-blue-100 rounded-xl p-4 shadow-sm my-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 border-b border-gray-50 pb-3">
        <div className={`p-2 rounded-lg ${step === 'completed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
           {step === 'planning' && <BrainCircuit className="w-5 h-5 animate-pulse" />}
           {step === 'searching' && <Globe className="w-5 h-5 animate-pulse" />}
           {step === 'reading' && <BookOpen className="w-5 h-5 animate-pulse" />}
           {step === 'synthesizing' && <Loader2 className="w-5 h-5 animate-spin" />}
           {step === 'completed' && <CheckCircle2 className="w-5 h-5" />}
        </div>
        <div>
           <h3 className="font-semibold text-gray-800 text-sm">
             {step === 'planning' && '诸葛正在规划调研路径...'}
             {step === 'searching' && '卓伟正在全网搜集情报...'}
             {step === 'reading' && '正在深度阅读文献...'}
             {step === 'synthesizing' && '正在整理调研报告...'}
             {step === 'completed' && '全网调研已完成'}
           </h3>
           <p className="text-xs text-gray-400">
             {step === 'completed' ? '已生成深度报告，包含多维数据与来源' : 'AI 协作中 · 实时联网'}
           </p>
        </div>
      </div>

      {/* Dynamic Logs */}
      <div className="space-y-2 pl-2 relative">
         {/* Timeline Line */}
         <div className="absolute left-[3px] top-2 bottom-2 w-0.5 bg-gray-100"></div>

         {logs.map((log, idx) => (
             <div key={idx} className="relative flex items-center gap-3 text-xs animate-in slide-in-from-bottom-2 fade-in duration-300">
                 <div className={`w-2 h-2 rounded-full z-10 shrink-0 ${
                     log.type === 'plan' ? 'bg-purple-400' :
                     log.type === 'search' ? 'bg-blue-400' :
                     'bg-green-400'
                 }`}></div>
                 <span className="text-gray-600 font-medium">
                    {log.type === 'plan' && '[规划]'}
                    {log.type === 'search' && '[搜索]'}
                    {log.type === 'read' && '[阅读]'}
                 </span>
                 <span className="text-gray-500 truncate">{log.content}</span>
             </div>
         ))}
         
         {step !== 'completed' && (
             <div className="relative flex items-center gap-3 text-xs opacity-50">
                 <div className="w-2 h-2 rounded-full bg-gray-300 z-10 animate-pulse"></div>
                 <span className="text-gray-400 italic">处理中...</span>
             </div>
         )}
      </div>
    </div>
  );
};

export default ResearchProcess;
