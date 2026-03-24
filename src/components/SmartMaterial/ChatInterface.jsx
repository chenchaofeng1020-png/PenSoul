import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send, User, Bot, Loader2, Sparkles, Trash2, FileText, Image, Bookmark, FileText as DocIcon, History } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { productDuckLogo } from '../../assets/logos';
import { useUI } from '../../context/UIContext';
import { useRequirementDoc, DOC_STATES } from '../../context/RequirementDocContext';
import { useSmartEstimation, SMART_ESTIMATION_STATES } from '../../context/SmartEstimationContext';
import { clarifyRequirement } from '../../services/requirementDocApi';
import { clarifySmartEstimation } from '../../services/smartEstimationApi';
import {
  archiveChatHistory,
  loadArchivedChatHistory,
  loadArchivedRequirementDocSessions,
  loadSmartEstimationSession,
  saveSmartEstimationSession
} from '../../utils/chatStorage';

export function ChatInterface({ productId, history, setHistory, sources, productName, onClearHistory, onSaveDeliverable, currentStudioMode, onOpenRequirementDocMode }) {
  const { showToast } = useUI();
  const { state: docState, dispatch: docDispatch, actions: docActions } = useRequirementDoc();
  const { state: smartEstimationState, dispatch: smartEstimationDispatch, actions: smartEstimationActions } = useSmartEstimation();
  const isRequirementDocMode = currentStudioMode === 'requirement_doc';
  const isSmartEstimationMode = currentStudioMode === 'smart_estimation';
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savingMessageId, setSavingMessageId] = useState(null);
  const [hasInitializedDocMode, setHasInitializedDocMode] = useState(false);
  const [hasInitializedSmartEstimationMode, setHasInitializedSmartEstimationMode] = useState(false);
  const [isLoadingState, setIsLoadingState] = useState({});
  const [quotedDocContext, setQuotedDocContext] = useState(null);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [historySessions, setHistorySessions] = useState([]);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const processAnnouncementsRef = useRef({
    outlineGenerating: false,
    outlineKey: '',
    taskKey: '',
    writingIndex: -1,
    completed: false
  });
  const selectedSourceIds = useMemo(() => sources.map(source => source.id), [sources]);
  const selectedSmartFunctions = useMemo(() => {
    const parsedFunctions = Array.isArray(smartEstimationState.parsedFunctions)
      ? smartEstimationState.parsedFunctions
      : [];
    const selectedKeys = smartEstimationState.selectedFunctionKeys || [];
    return parsedFunctions.filter(item => selectedKeys.includes(item.selectionKey));
  }, [smartEstimationState.parsedFunctions, smartEstimationState.selectedFunctionKeys]);

  const refreshHistorySessions = useCallback(() => {
    const archivedSessions = loadArchivedChatHistory(productId);
    const requirementDocSessions = loadArchivedRequirementDocSessions(productId);
    const currentSession = history.length > 0 ? [{
      id: 'current-session',
      type: 'chat_session',
      createdAt: Date.now(),
      messageCount: history.length,
      reason: 'current',
      title: `${productName || '当前产品'}当前会话`,
      messages: history
    }] : [];

    const normalizedChatSessions = archivedSessions.map(session => ({
      ...session,
      type: session.type || 'chat_session'
    }));

    const mergedSessions = [...currentSession, ...requirementDocSessions, ...normalizedChatSessions]
      .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));

    setHistorySessions(mergedSessions);
  }, [history, productId, productName]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  useEffect(() => {
    if (!isHistoryPanelOpen) {
      return;
    }
    refreshHistorySessions();
  }, [isHistoryPanelOpen, refreshHistorySessions]);

  // 自动调整 textarea 高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const nextHeight = Math.min(textareaRef.current.scrollHeight, 200);
      textareaRef.current.style.height = `${nextHeight}px`;
      textareaRef.current.style.overflowY = textareaRef.current.scrollHeight > 200 ? 'auto' : 'hidden';
    }
  }, [input]);

  useEffect(() => {
    const handleQuoteToChat = (event) => {
      const quotedText = event.detail?.text?.trim();
      if (!quotedText) return;
      const sectionIndex = Number.isInteger(event.detail?.sectionIndex) ? event.detail.sectionIndex : null;
      const sectionTitle = event.detail?.sectionTitle || '';

      setQuotedDocContext({
        text: quotedText,
        sectionIndex,
        sectionTitle
      });

      setInput((prev) => {
        const prefix = prev ? `${prev}\n\n` : '';
        return `${prefix}> ${quotedText}\n\n请基于这段内容继续优化。`;
      });
      textareaRef.current?.focus();
    };

    window.addEventListener('quoteToChat', handleQuoteToChat);
    return () => window.removeEventListener('quoteToChat', handleQuoteToChat);
  }, []);

  const initRequirementDocChat = useCallback(async () => {
    setHasInitializedDocMode(true);
    setIsLoading(true);
    
    // 触发需求收集状态
    const docId = `doc_${Date.now()}`;
    docActions.startCollecting({
      docId,
      productId,
      sourceIds: selectedSourceIds
    });
    
    try {
      // 设置加载状态
      setIsLoadingState(prev => ({ ...prev, 0: true }));
      
      const data = await clarifyRequirement({
        docId,
        productId,
        sourceIds: selectedSourceIds,
        isInit: true
      });

      setHistory([{ role: 'ai', content: data.response }]);
      
    } catch (error) {
      console.error('Init requirement doc error:', error);
      setHistory([{ 
        role: 'ai', 
        content: '抱歉，初始化需求文档模式失败，请重试。' 
      }]);
    } finally {
      setIsLoading(false);
      // 清除加载状态
      setIsLoadingState(prev => {
        const newState = { ...prev };
        delete newState[0];
        return newState;
      });
    }
  }, [docActions, productId, selectedSourceIds, setHistory]);

  const initSmartEstimationChat = useCallback(async () => {
    setHasInitializedSmartEstimationMode(true);
    setIsLoading(true);

    const sessionId = `smart_estimation_${Date.now()}`;
    smartEstimationActions.startCollecting({
      sessionId,
      productId,
      sourceIds: selectedSourceIds,
      title: 'AI智能人天评估'
    });

    try {
      setIsLoadingState(prev => ({ ...prev, 0: true }));

      const data = await clarifySmartEstimation({
        sessionId,
        productId,
        sourceIds: selectedSourceIds,
        selectedFunctions: selectedSmartFunctions,
        isInit: true
      });

      setHistory([{ role: 'ai', content: data.response }]);
    } catch (error) {
      console.error('Init smart estimation error:', error);
      setHistory([{
        role: 'ai',
        content: '抱歉，初始化 AI 智能人天评估失败，请稍后重试。'
      }]);
    } finally {
      setIsLoading(false);
      setIsLoadingState(prev => {
        const newState = { ...prev };
        delete newState[0];
        return newState;
      });
    }
  }, [productId, selectedSourceIds, selectedSmartFunctions, setHistory, smartEstimationActions]);

  // 当进入需求文档模式时，自动初始化对话
  useEffect(() => {
    let timerId;

    if (isRequirementDocMode && !hasInitializedDocMode) {
      // 如果有历史记录，先清空
      if (history.length > 0) {
        archiveChatHistory(productId, history, {
          reason: 'switch_to_requirement_doc',
          title: `${productName || '当前产品'}切换需求文档模式前会话`
        });
        setHistory([]);
      }
      // 延迟初始化，确保历史已清空
      timerId = window.setTimeout(() => {
        void initRequirementDocChat();
      }, 50);
    }
    if (!isRequirementDocMode) {
      setHasInitializedDocMode(false);
    }
    return () => window.clearTimeout(timerId);
  }, [hasInitializedDocMode, history, initRequirementDocChat, isRequirementDocMode, productId, productName, setHistory]);

  useEffect(() => {
    let timerId;

    if (isSmartEstimationMode && !hasInitializedSmartEstimationMode) {
      if (history.length > 0) {
        archiveChatHistory(productId, history, {
          reason: 'switch_to_smart_estimation',
          title: `${productName || '当前产品'}切换 AI 智能评估前会话`
        });
        setHistory([]);
      }

      const cachedSession = loadSmartEstimationSession(productId);
      if (cachedSession?.estimationState) {
        smartEstimationActions.restoreSnapshot(cachedSession.estimationState);
        setHistory(cachedSession.messages || []);
        setHasInitializedSmartEstimationMode(true);
        return undefined;
      }

      timerId = window.setTimeout(() => {
        void initSmartEstimationChat();
      }, 50);
    }

    if (!isSmartEstimationMode) {
      setHasInitializedSmartEstimationMode(false);
    }

    return () => window.clearTimeout(timerId);
  }, [hasInitializedSmartEstimationMode, history, initSmartEstimationChat, isSmartEstimationMode, productId, productName, setHistory, smartEstimationActions]);

  useEffect(() => {
    if (!isRequirementDocMode) {
      setQuotedDocContext(null);
      processAnnouncementsRef.current = {
        outlineGenerating: false,
        outlineKey: '',
        taskKey: '',
        writingIndex: -1,
        completed: false
      };
    }
  }, [isRequirementDocMode]);

  useEffect(() => {
    if (isSmartEstimationMode && smartEstimationState.sessionId && smartEstimationState.mode !== SMART_ESTIMATION_STATES.IDLE) {
      setHasInitializedSmartEstimationMode(true);
    }
  }, [isSmartEstimationMode, smartEstimationState.mode, smartEstimationState.sessionId]);

  useEffect(() => {
    if (isRequirementDocMode && docState.docId && docState.mode !== DOC_STATES.IDLE) {
      setHasInitializedDocMode(true);
    }
  }, [docState.docId, docState.mode, isRequirementDocMode]);

  useEffect(() => {
    if (!isRequirementDocMode || !docState.isGeneratingOutline) {
      if (!docState.isGeneratingOutline) {
        processAnnouncementsRef.current.outlineGenerating = false;
      }
      return;
    }

    if (processAnnouncementsRef.current.outlineGenerating) {
      return;
    }

    processAnnouncementsRef.current.outlineGenerating = true;
    setHistory(prev => [...prev, {
      role: 'ai',
      content: '我正在结合你提供的需求、资料和模板生成详细大纲，请稍候，通常需要几秒钟。'
    }]);
  }, [docState.isGeneratingOutline, isRequirementDocMode, setHistory]);

  useEffect(() => {
    if (!isRequirementDocMode || !docState.docId) {
      return;
    }

    docDispatch({
      type: 'UPDATE_REQUIREMENT_CONTEXT',
      payload: {
        productId,
        sourceIds: selectedSourceIds
      }
    });
  }, [docDispatch, docState.docId, isRequirementDocMode, productId, selectedSourceIds]);

  useEffect(() => {
    if (!isSmartEstimationMode || !smartEstimationState.sessionId) {
      return;
    }

    smartEstimationDispatch({
      type: 'UPDATE_CONTEXT',
      payload: {
        productId,
        sourceIds: selectedSourceIds
      }
    });
  }, [isSmartEstimationMode, productId, selectedSourceIds, smartEstimationDispatch, smartEstimationState.sessionId]);

  useEffect(() => {
    if (!isSmartEstimationMode || !productId) {
      return;
    }

    saveSmartEstimationSession(productId, {
      estimationState: smartEstimationState,
      messages: history
    });
  }, [history, isSmartEstimationMode, productId, smartEstimationState]);

  useEffect(() => {
    if (!isRequirementDocMode || !docState.outline?.sections?.length || docState.mode !== DOC_STATES.OUTLINE_CONFIRMING) {
      return;
    }

    const outlineKey = docState.outline.sections.map(section => section.title).join('|');
    if (processAnnouncementsRef.current.outlineKey === outlineKey) {
      return;
    }

    processAnnouncementsRef.current.outlineKey = outlineKey;
    setHistory(prev => [...prev, {
      role: 'ai',
      content: `我已经基于你提供的需求和模板整理出一版详细大纲，共 ${docState.outline.sections.length} 个章节。你可以直接在下方查看每章目标与写作要点，再决定是否确认。`
    }]);
  }, [docState.mode, docState.outline, isRequirementDocMode, setHistory]);

  useEffect(() => {
    if (!isRequirementDocMode || !docState.tasks?.length || docState.mode !== DOC_STATES.TASK_CONFIRMING) {
      return;
    }

    const taskKey = docState.tasks.map(task => task.section).join('|');
    if (processAnnouncementsRef.current.taskKey === taskKey) {
      return;
    }

    processAnnouncementsRef.current.taskKey = taskKey;
    setHistory(prev => [...prev, {
      role: 'ai',
      content: `大纲已拆解为 ${docState.tasks.length} 个写作任务。确认后我会按章节顺序开始撰写，并在这里同步进度。`
    }]);
  }, [docState.mode, docState.tasks, isRequirementDocMode, setHistory]);

  useEffect(() => {
    if (!isRequirementDocMode || docState.mode !== DOC_STATES.WRITING || !docState.tasks?.length) {
      return;
    }

    if (processAnnouncementsRef.current.writingIndex === docState.currentTaskIndex) {
      return;
    }

    const currentTask = docState.tasks[docState.currentTaskIndex];
    if (!currentTask) {
      return;
    }

    processAnnouncementsRef.current.writingIndex = docState.currentTaskIndex;
    setHistory(prev => [...prev, {
      role: 'ai',
      content: `正在撰写 ${currentTask.section}。右侧预览会实时更新当前章节内容。`
    }]);
  }, [docState.currentTaskIndex, docState.mode, docState.tasks, isRequirementDocMode, setHistory]);

  useEffect(() => {
    if (!isRequirementDocMode || !docState.document || (docState.mode !== DOC_STATES.EDITING && docState.mode !== DOC_STATES.COMPLETED)) {
      return;
    }

    if (processAnnouncementsRef.current.completed) {
      return;
    }

    processAnnouncementsRef.current.completed = true;
    setHistory(prev => [...prev, {
      role: 'ai',
      content: `需求文档初稿已完成。你现在可以在右侧查看完整成果，并继续在聊天区提出修改意见。`
    }]);
  }, [docState.document, docState.mode, isRequirementDocMode, setHistory]);

  // 构建包含上下文的 messages 数组
  const buildMessages = (currentMessage) => {
    const MAX_HISTORY = 10;
    const MAX_CHARS = 8000;

    const systemContent = `你是一个专业的产品资料分析助手。请基于当前选中的资料和对话历史回答用户的问题。`;

    // 构建历史上下文（最近 N 条）
    let contextHistory = history.slice(-MAX_HISTORY).map(msg => ({
      role: msg.role === 'ai' ? 'assistant' : 'user',
      content: msg.content
    }));

    // 如果历史太长，进行裁剪
    let totalChars = systemContent.length + contextHistory.reduce((sum, msg) => sum + msg.content.length, 0);
    while (totalChars > MAX_CHARS && contextHistory.length > 2) {
      contextHistory.shift();
      totalChars = systemContent.length + contextHistory.reduce((sum, msg) => sum + msg.content.length, 0);
    }

    // 组装 messages 数组
    const messages = [
      { role: 'system', content: systemContent },
      ...contextHistory,
      { role: 'user', content: currentMessage }
    ];

    return messages;
  };

  const handleGenerateSmartEstimationReport = useCallback(async (requirement, clarifications) => {
    try {
      await smartEstimationActions.generateReport({
        requirement,
        clarifications,
        selectedFunctions: selectedSmartFunctions
      });
      setHistory(prev => [...prev, {
        role: 'ai',
        content: '智能人天评估结果已经生成，右侧已更新为可查阅网页。你可以继续补充“新增风险”“按二开重估”“去掉某些范围”等，我会继续修订。'
      }]);
    } catch (error) {
      console.error('Smart estimation generation failed:', error);
      showToast(`生成评估结果失败: ${error.message}`, 'error');
      setHistory(prev => [...prev, {
        role: 'ai',
        content: `抱歉，生成评估结果时出现问题：${error.message}`
      }]);
    }
  }, [selectedSmartFunctions, showToast, smartEstimationActions, setHistory]);

  const handleSend = async (message = input) => {
    if (!message.trim() || isLoading) return;

    const referencedSources = sources.length > 0 
      ? sources.map(s => ({ id: s.id, file_name: s.file_name, file_type: s.file_type }))
      : [];

    const userMsg = { 
      role: 'user', 
      content: message,
      sources: referencedSources
    };
    setHistory(prev => [...prev, userMsg]);
    setInput('');
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.overflowY = 'hidden';
    }
    setIsLoading(true);

    try {
      let aiContent = '';
      const messageIndex = history.length;
      
      // 设置加载状态
      setIsLoadingState(prev => ({ ...prev, [messageIndex + 1]: true }));
      
      // 需求文档模式
      if (isRequirementDocMode) {
        if (docState.mode === DOC_STATES.EDITING || docState.mode === DOC_STATES.COMPLETED) {
          const revisionResult = await docActions.reviseDocument({
            instruction: message,
            quoteText: quotedDocContext?.text || '',
            targetSectionIndex: quotedDocContext?.sectionIndex ?? null,
            targetSectionTitle: quotedDocContext?.sectionTitle || ''
          });

          const revisedSectionTitle = revisionResult.updatedSection?.title || quotedDocContext?.sectionTitle || '目标章节';
          aiContent = `${revisionResult.summary}\n\n已更新章节：**${revisedSectionTitle}**。右侧预览已同步刷新最新内容。`;
          setHistory(prev => [...prev, { role: 'ai', content: aiContent }]);
          setQuotedDocContext(null);
        } else {
          const data = await clarifyRequirement({
            docId: docState.docId,
            productId,
            sourceIds: selectedSourceIds,
            requirement: docState.rawRequirement,
            clarifications: docState.clarifications,
            userInput: message
          });
          aiContent = data.response;

          // 如果是第一次输入，保存原始需求
          if (!docState.rawRequirement) {
            docDispatch({ type: 'SET_RAW_REQUIREMENT', payload: message });
          }

          // 添加澄清记录
          docDispatch({
            type: 'ADD_CLARIFICATION',
            payload: {
              question: message,
              answer: data.response
            }
          });

          // 如果AI认为信息已足够，触发大纲生成
          if (data.isComplete) {
            window.setTimeout(() => {
              void docActions.requestOutline({
                requirement: docState.rawRequirement || message,
                clarifications: [
                  ...docState.clarifications,
                  {
                    question: message,
                    answer: data.response
                  }
                ],
                templateStructure: null
              }).catch((outlineError) => {
                console.error('Outline generation failed:', outlineError);
                showToast(`生成大纲失败: ${outlineError.message}`, 'error');
                setHistory(prev => [...prev, {
                  role: 'ai',
                  content: `抱歉，生成详细大纲时出现问题：${outlineError.message}`
                }]);
              });
            }, 300);
          }

          setHistory(prev => [...prev, { role: 'ai', content: aiContent }]);
        }
      } else if (isSmartEstimationMode) {
        if (smartEstimationState.report) {
          await smartEstimationActions.reviseReport({ instruction: message });
          aiContent = '我已经根据你的补充刷新了右侧评估结果。你可以继续追问某条功能、要求按二开口径重算，或者直接保存为交付物。';
          setHistory(prev => [...prev, { role: 'ai', content: aiContent }]);
        } else {
          const data = await clarifySmartEstimation({
            sessionId: smartEstimationState.sessionId,
            productId,
            sourceIds: selectedSourceIds,
            selectedFunctions: selectedSmartFunctions,
            requirement: smartEstimationState.rawRequirement,
            clarifications: smartEstimationState.clarifications,
            userInput: message
          });

          aiContent = data.response;

          if (!smartEstimationState.rawRequirement) {
            smartEstimationDispatch({ type: 'SET_RAW_REQUIREMENT', payload: message });
          }

          const nextClarification = {
            question: message,
            answer: data.response
          };

          smartEstimationDispatch({
            type: 'ADD_CLARIFICATION',
            payload: nextClarification
          });

          if (data.isReady) {
            smartEstimationDispatch({
              type: 'MARK_READY',
              payload: {
                detectedFunctions: data.detectedFunctions,
                missingInformation: data.missingInformation
              }
            });

            const nextRequirement = smartEstimationState.rawRequirement || message || selectedSmartFunctions.map(item => `${item.module} - ${item.name}`).join('\n');
            const nextClarifications = [
              ...smartEstimationState.clarifications,
              nextClarification
            ];

            window.setTimeout(() => {
              void handleGenerateSmartEstimationReport(nextRequirement, nextClarifications);
            }, 300);
          }

          setHistory(prev => [...prev, { role: 'ai', content: aiContent }]);
        }
      } else {
        // 普通聊天模式
        const messages = buildMessages(message);
        
        const response = await fetch('http://localhost:3002/api/smart/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId,
            sourceIds: sources.map(source => source.id),
            messages,
            context: message
          })
        });

        if (!response.ok) throw new Error('Network response was not ok');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        setHistory(prev => [...prev, { role: 'ai', content: '' }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data: ')) {
              const dataStr = trimmedLine.slice(6);
              if (dataStr === '[DONE]') break;
              
              try {
                const data = JSON.parse(dataStr);
                if (data.error) {
                  aiContent = `❌ Error: ${data.error}`;
                  setHistory(prev => {
                     const newHistory = [...prev];
                     const lastIdx = newHistory.length - 1;
                     if (lastIdx >= 0) newHistory[lastIdx] = { ...newHistory[lastIdx], content: aiContent };
                     return newHistory;
                  });
                  break;
                }
                if (data.content) {
                  aiContent += data.content;
                  setHistory(prev => {
                    const newHistory = [...prev];
                    const lastIdx = newHistory.length - 1;
                    if (lastIdx >= 0 && newHistory[lastIdx].role === 'ai') {
                      newHistory[lastIdx] = { ...newHistory[lastIdx], content: aiContent };
                    }
                    return newHistory;
                  });
                }
              } catch (error) {
                console.error('Failed to parse smart generate stream chunk:', error);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setHistory(prev => [...prev, { role: 'ai', content: `抱歉，出现错误：${error.message}` }]);
    } finally {
      setIsLoading(false);
      // 清除加载状态
      setIsLoadingState(prev => {
        const newState = { ...prev };
        delete newState[history.length + 1];
        return newState;
      });
    }
  };

  const suggestedQuestions = isSmartEstimationMode
    ? [
        '请按左侧资料，先帮我梳理需要评估的功能清单。',
        '这是一个偏二开的项目，请按乙方交付口径评估。',
        '先告诉我哪些点最容易被低估，再给出一版建议人天。'
      ]
    : [
        `${productName || '产品'}的核心功能有哪些？`,
        `如何开始使用 ${productName || '产品'}？`,
        `${productName || '产品'}相比同类竞品有什么优势？`
      ];

  // 保存 AI 回复为交付物
  const handleSaveAsDeliverable = async (msg, index) => {
    if (!msg.content || msg.content.trim().length < 10) {
      showToast('内容太短，无法保存', 'error');
      return;
    }

    setSavingMessageId(index);
    
    try {
      // 1. 调用 AI 生成标题
      const titleResponse = await fetch('http://localhost:3002/api/smart/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: msg.content })
      });

      if (!titleResponse.ok) throw new Error('生成标题失败');
      
      const titleData = await titleResponse.json();
      const title = titleData.title || `AI 回复 - ${new Date().toLocaleTimeString()}`;

      // 2. 创建交付物
      const deliverable = {
        productId,
        title,
        content: msg.content,
        type: 'chat_deliverable',
        sourceRefs: msg.sources || []
      };

      // 3. 调用父组件的保存方法
      if (onSaveDeliverable) {
        await onSaveDeliverable(deliverable);
        showToast('已保存为交付物', 'success');
      } else {
        // 如果没有提供 onSaveDeliverable，直接调用 API
        const noteRes = await fetch('http://localhost:3002/api/smart/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deliverable)
        });
        
        if (!noteRes.ok) throw new Error('保存失败');
        
        const noteData = await noteRes.json();
        showToast('已保存为交付物', 'success');
        
        // 触发刷新
        if (onSaveDeliverable) {
          onSaveDeliverable(noteData.data);
        }
      }
    } catch (error) {
      console.error('保存交付物失败:', error);
      showToast('保存失败: ' + error.message, 'error');
    } finally {
      setSavingMessageId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white h-full relative">
      {/* 需求文档模式提示 */}
      {(isRequirementDocMode || isSmartEstimationMode) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full shadow-lg">
            <DocIcon className="w-4 h-4" />
            <span className="text-sm font-medium">{isRequirementDocMode ? '需求文档创作模式' : 'AI智能人天评估模式'}</span>
          </div>
        </div>
      )}

      {/* 聊天记录头部工具栏 */}
      {productId && (
        <div className="absolute top-4 right-4 z-10">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                refreshHistorySessions();
                setIsHistoryPanelOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-lg transition-all shadow-sm"
              title="查看本地历史聊天记录"
            >
              <History className="w-3.5 h-3.5" />
              历史记录
            </button>
            {history.length > 0 && (
              <button
                onClick={onClearHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-red-600 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-lg transition-all shadow-sm"
                title="清空聊天记录"
              >
                <Trash2 className="w-3.5 h-3.5" />
                清空记录
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar pb-32">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full pb-20">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <img src={productDuckLogo} className="w-10 h-10" alt="Logo" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{productName || 'AI工作台'}</h2>
            <p className="text-gray-400 mb-8">{sources.length} 个来源</p>
            
            <div className="w-full max-w-lg space-y-3">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                     setInput(q);
                     handleSend(q);
                  }}
                  className="w-full text-left px-5 py-3.5 bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-100 rounded-xl text-gray-600 hover:text-indigo-700 transition-all text-sm font-medium flex items-center justify-between group"
                >
                  <span>{q}</span>
                  <Sparkles className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {history.map((msg, idx) => {
              const isLastMessage = idx === history.length - 1;
              const isAIResponse = msg.role === 'ai';
              const isLoading = isLastMessage && isAIResponse && isLoadingState[idx];
              
              return (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-5 py-4 ${msg.role === 'user' ? 'bg-[#c9e7fd] text-gray-800 rounded-br-sm' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'}`}>
                    <div className={`text-xs mb-1.5 flex items-center font-medium tracking-wide uppercase ${msg.role === 'user' ? 'text-blue-600/70' : 'text-gray-400'}`}>
                      {msg.role === 'user' ? <User className="w-3 h-3 mr-1.5" /> : <Bot className="w-3 h-3 mr-1.5" />}
                      {msg.role === 'user' ? 'You' : 'AI Assistant'}
                    </div>
                    <div className={`prose prose-sm max-w-none prose-p:my-0 prose-ul:my-1 text-sm leading-relaxed ${msg.role === 'user' ? 'text-gray-800' : 'text-gray-700'}`}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                    
                    {/* AI 思考动画 */}
                    {isLoading && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                    
                    {/* AI 消息添加保存按钮 */}
                    {msg.role === 'ai' && msg.content && msg.content.length > 10 && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                        <button
                          onClick={() => handleSaveAsDeliverable(msg, idx)}
                          disabled={savingMessageId === idx}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="保存为交付物"
                        >
                          {savingMessageId === idx ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Bookmark className="w-3.5 h-3.5" />
                          )}
                          {savingMessageId === idx ? '保存中...' : '保存为交付物'}
                        </button>
                      </div>
                    )}
                    {/* 展示引用的资料 */}
                    {msg.role === 'user' && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-blue-300/40">
                        <div className="text-[10px] text-blue-600/70 mb-1.5">引用的资料：</div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.sources.map((source, sIdx) => (
                            <span
                              key={sIdx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-400/30 text-blue-800 text-[10px] rounded"
                              title={source.file_name}
                            >
                              {source.file_type === 'image' ? (
                                <Image className="w-3 h-3" />
                              ) : (
                                <FileText className="w-3 h-3" />
                              )}
                              <span className="max-w-[120px] truncate">{source.file_name}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {isRequirementDocMode && (
              <RequirementDocProcessCard
                docState={docState}
                onConfirmOutline={async () => {
                  try {
                    await docActions.confirmOutline();
                  } catch (error) {
                    showToast(`拆解任务失败: ${error.message}`, 'error');
                  }
                }}
                onStartWriting={async () => {
                  try {
                    await docActions.startWriting();
                  } catch (error) {
                    showToast(`撰写失败: ${error.message}`, 'error');
                  }
                }}
              />
            )}
            {isSmartEstimationMode && (
              <SmartEstimationProcessCard
                estimationState={smartEstimationState}
                onGenerate={async () => {
                  const nextRequirement = smartEstimationState.rawRequirement || history.find(message => message.role === 'user')?.content || selectedSmartFunctions.map(item => `${item.module} - ${item.name}`).join('\n') || '';
                  await handleGenerateSmartEstimationReport(nextRequirement, smartEstimationState.clarifications);
                }}
              />
            )}
            <div ref={scrollRef} />
          </>
        )}
      </div>

      {isHistoryPanelOpen && (
        <ChatHistoryPanel
          productName={productName}
          sessions={historySessions}
          onClose={() => setIsHistoryPanelOpen(false)}
          onRestoreSession={(session) => {
            if (history.length > 0 && session.type === 'requirement_doc') {
              archiveChatHistory(productId, history, {
                reason: 'restore_requirement_doc_before_replace',
                title: `${productName || '当前产品'}当前会话`
              });
            }

            if (session.type === 'requirement_doc') {
              docActions.restoreSnapshot(session.docState);
              setHistory(session.messages || []);
              setHasInitializedDocMode(true);
              onOpenRequirementDocMode?.();
              setIsHistoryPanelOpen(false);
              showToast('已恢复需求文档草稿', 'success');
              return;
            }

            setHistory(session.messages || []);
            setIsHistoryPanelOpen(false);
            showToast('已恢复到当前聊天窗口', 'success');
          }}
          canRestore={!isRequirementDocMode && !isSmartEstimationMode}
        />
      )}

      <div className="absolute bottom-6 left-0 right-0 px-6">
        <div className="max-w-3xl mx-auto relative shadow-lg rounded-2xl bg-white border border-gray-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isRequirementDocMode
              ? (docState.mode === DOC_STATES.EDITING || docState.mode === DOC_STATES.COMPLETED
                ? '描述你希望如何修改当前需求文档...'
                : '描述你的产品需求...')
              : isSmartEstimationMode
                ? (smartEstimationState.report
                  ? '继续补充范围、风险或改口径，我会修订右侧评估结果...'
                  : '描述要评估的功能、页面、流程或直接让我先帮你梳理...')
              : '问点什么...'}
            rows={1}
            className="w-full pl-5 pr-14 py-4 bg-transparent border-none rounded-2xl focus:outline-none focus:ring-0 text-base leading-7 text-gray-700 placeholder-gray-400 resize-none overflow-y-auto min-h-[56px] max-h-[200px]"
            disabled={isLoading}
            style={{ height: 'auto' }}
          />
          {quotedDocContext && (
            <div className="px-5 pb-3 text-xs text-indigo-600">
              正在引用章节「{quotedDocContext.sectionTitle || `第 ${(quotedDocContext.sectionIndex ?? 0) + 1} 章`}」中的选中文本进行修改
            </div>
          )}
          <div className="absolute right-3 bottom-3 flex items-center space-x-1">
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className={`p-2 rounded-xl transition-colors ${isLoading || !input.trim() ? 'text-gray-300 bg-gray-50' : 'text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transform hover:scale-105 active:scale-95 transition-all'}`}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <div className="mt-3 text-xs text-center text-gray-400 font-light">
          AI 生成内容可能不准确，请核实重要信息。
        </div>
      </div>
    </div>
  );
}

function RequirementDocProcessCard({ docState, onConfirmOutline, onStartWriting }) {
  const hasOutline = docState.outline?.sections?.length > 0;

  const outlineSnapshot = hasOutline ? (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
        {docState.mode === DOC_STATES.OUTLINE_CONFIRMING ? '大纲待确认' : '当前大纲'}
      </div>
      <div className="mt-2 text-sm text-amber-900">
        当前已生成 {docState.outline.sections.length} 个章节，后续写作会持续按照这版大纲推进。
      </div>
      {docState.outline.summary && (
        <div className="mt-3 rounded-xl border border-amber-100 bg-white/70 px-4 py-3 text-sm leading-6 text-amber-950">
          {docState.outline.summary}
        </div>
      )}
      <div className="mt-3 space-y-3">
        {docState.outline.sections.map((section, index) => (
          <div key={section.title + index} className="rounded-xl border border-amber-100 bg-white/80 px-4 py-3">
            <div className="text-sm font-semibold text-amber-900">
              {index + 1}. {section.title}
            </div>
            {section.objective && (
              <div className="mt-2 text-xs leading-5 text-amber-800">
                本章目标：{section.objective}
              </div>
            )}
            {section.subsections?.length > 0 && (
              <div className="mt-2 text-xs leading-5 text-amber-700">
                子章节：{section.subsections.join(' / ')}
              </div>
            )}
            {section.writingPoints?.length > 0 && (
              <div className="mt-2 space-y-1">
                {section.writingPoints.map((point, pointIndex) => (
                  <div key={`${section.title}-${pointIndex}`} className="text-xs leading-5 text-amber-800">
                    - {point}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {section.needFlowchart && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                  需要流程图
                </span>
              )}
              {section.needPrototype && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                  需要页面原型图
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {docState.mode === DOC_STATES.OUTLINE_CONFIRMING && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onConfirmOutline}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
          >
            确认大纲
          </button>
        </div>
      )}
    </div>
  ) : null;

  if (docState.isGeneratingOutline && !docState.outline?.sections?.length) {
    return (
      <div className="mx-auto max-w-[85%] rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          正在生成大纲
        </div>
        <div className="mt-2 text-sm text-indigo-950">
          AI 正在根据当前需求、已选资料和模板整理详细大纲，请稍候。
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-indigo-100">
          <div className="h-full w-1/2 rounded-full bg-indigo-500 animate-pulse" />
        </div>
      </div>
    );
  }

  if (docState.mode === DOC_STATES.OUTLINE_CONFIRMING && docState.outline?.sections?.length) {
    return <div className="mx-auto max-w-[85%]">{outlineSnapshot}</div>;
  }

  if (docState.mode === DOC_STATES.TASK_CONFIRMING) {
    return (
      <div className="mx-auto max-w-[85%]">
        {outlineSnapshot}
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">创作任务</div>
          {docState.tasks.length === 0 ? (
            <div className="mt-2 text-sm text-sky-900">正在拆解任务，请稍候...</div>
          ) : (
            <>
              <div className="mt-2 text-sm text-sky-900">
                已拆解为 {docState.tasks.length} 个写作任务，确认后将按章节顺序开始撰写。
              </div>
              <div className="mt-3 space-y-1">
                {docState.tasks.map((task, index) => (
                  <div key={task.section + index} className="text-xs text-sky-800">
                    {index + 1}. {task.section}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={onStartWriting}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
                >
                  开始撰写
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (docState.mode === DOC_STATES.WRITING) {
    const completedTasks = docState.tasks.filter(task => task.status === 'completed').length;
    const totalTasks = docState.tasks.length || 1;
    const progress = Math.round((completedTasks / totalTasks) * 100);

    return (
      <div className="mx-auto max-w-[85%]">
        {outlineSnapshot}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">正在创作</div>
          <div className="mt-2 text-sm text-emerald-900">
            当前进度 {completedTasks}/{docState.tasks.length}，右侧预览会实时刷新生成内容。
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (docState.mode === DOC_STATES.EDITING || docState.mode === DOC_STATES.COMPLETED) {
    return (
      <div className="mx-auto max-w-[85%]">
        {outlineSnapshot}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700">
          当前已生成完整初稿。你可以继续在聊天区提修改要求，右侧会作为成果预览区保留当前版本。
        </div>
      </div>
    );
  }

  return null;
}

function getRequirementDocSessionMeta(session) {
  const docState = session?.docState || {};
  const tasks = Array.isArray(docState.tasks) ? docState.tasks : [];
  const sections = Array.isArray(docState.document?.sections) ? docState.document.sections : [];
  const outlineCount = docState.outline?.sections?.length || sections.length || 0;
  const completedTasks = tasks.filter(task => task?.status === 'completed').length;
  const writtenSections = sections.filter(section => section?.content?.trim()).length;
  const totalWorkItems = tasks.length || outlineCount || 1;
  const progress = Math.round(((completedTasks || writtenSections) / totalWorkItems) * 100);

  const modeLabelMap = {
    [DOC_STATES.COLLECTING]: '需求收集中',
    [DOC_STATES.OUTLINE_CONFIRMING]: '等待确认大纲',
    [DOC_STATES.TASK_CONFIRMING]: tasks.length > 0 ? '任务已拆解' : '拆解任务中',
    [DOC_STATES.WRITING]: '正在写作',
    [DOC_STATES.EDITING]: '可继续编辑',
    [DOC_STATES.COMPLETED]: '初稿已完成'
  };

  return {
    outlineCount,
    completedTasks,
    writtenSections,
    progress: Number.isFinite(progress) ? progress : 0,
    modeLabel: modeLabelMap[docState.mode] || '草稿已保存'
  };
}

function ChatHistoryPanel({ productName, sessions, onClose, onRestoreSession, canRestore }) {
  return (
    <div className="absolute inset-0 z-20 bg-white/70 backdrop-blur-[1px]">
      <div className="absolute right-4 top-16 bottom-28 w-[380px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">历史聊天记录</h3>
            <p className="text-xs text-gray-500">{productName || '当前产品'}的本地缓存会话</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            关闭
          </button>
        </div>

        <div className="h-full overflow-y-auto px-3 py-3 pb-20">
          {sessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">
              暂无本地历史记录
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const requirementMeta = session.type === 'requirement_doc'
                  ? getRequirementDocSessionMeta(session)
                  : null;

                return (
                  <div key={session.id} className="rounded-xl border border-gray-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800">
                          {session.title || '历史会话'}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {new Date(session.updatedAt || session.createdAt).toLocaleString()} · {session.type === 'requirement_doc' ? `${requirementMeta?.outlineCount || 0} 个章节` : `${session.messageCount} 条消息`}
                        </div>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        session.type === 'requirement_doc'
                          ? 'bg-amber-50 text-amber-700'
                          : session.reason === 'current'
                            ? 'bg-indigo-50 text-indigo-600'
                            : 'bg-gray-100 text-gray-500'
                      }`}>
                        {session.type === 'requirement_doc'
                          ? '需求文档'
                          : session.reason === 'current'
                            ? '当前'
                            : '已归档'}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {session.type === 'requirement_doc' ? (
                        <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-900">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium">需求文档草稿</div>
                            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                              {requirementMeta?.modeLabel}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-amber-800">
                            <div className="rounded-md bg-white/70 px-2 py-1">
                              <div className="text-[10px] text-amber-600">大纲章节</div>
                              <div className="mt-0.5 font-semibold">{requirementMeta?.outlineCount || 0}</div>
                            </div>
                            <div className="rounded-md bg-white/70 px-2 py-1">
                              <div className="text-[10px] text-amber-600">已写章节</div>
                              <div className="mt-0.5 font-semibold">{requirementMeta?.writtenSections || 0}</div>
                            </div>
                            <div className="rounded-md bg-white/70 px-2 py-1">
                              <div className="text-[10px] text-amber-600">任务完成</div>
                              <div className="mt-0.5 font-semibold">{requirementMeta?.completedTasks || 0}</div>
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="mb-1 flex items-center justify-between text-[10px] text-amber-700">
                              <span>创作进度</span>
                              <span>{requirementMeta?.progress || 0}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-amber-100">
                              <div
                                className="h-full rounded-full bg-amber-500 transition-all duration-300"
                                style={{ width: `${requirementMeta?.progress || 0}%` }}
                              />
                            </div>
                          </div>
                          <div className="mt-3 line-clamp-3 whitespace-pre-wrap text-[11px] text-amber-900/90">
                            {session.docState?.title || '未命名需求文档'}
                          </div>
                        </div>
                      ) : (
                        (session.messages || []).slice(-4).map((message, index) => (
                          <div
                            key={`${session.id}-${index}`}
                            className={`rounded-lg px-3 py-2 text-xs leading-5 ${
                              message.role === 'user'
                                ? 'bg-blue-50 text-blue-900'
                                : 'bg-gray-50 text-gray-700'
                            }`}
                          >
                            <div className="mb-1 font-medium uppercase tracking-wide opacity-70">
                              {message.role === 'user' ? '用户' : 'AI'}
                            </div>
                            <div className="line-clamp-4 whitespace-pre-wrap">
                              {message.content}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {canRestore && (session.reason !== 'current' || session.type === 'requirement_doc') && (
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => onRestoreSession(session)}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
                        >
                          {session.type === 'requirement_doc' ? '打开需求文档' : '恢复到当前窗口'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SmartEstimationProcessCard({ estimationState, onGenerate }) {
  const hasReport = Boolean(estimationState.report);
  const canGenerate = estimationState.mode === SMART_ESTIMATION_STATES.READY && !estimationState.isGenerating;

  return (
    <div className="rounded-[28px] border border-sky-200 bg-sky-50 px-5 py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">
            {hasReport ? '结果已生成' : canGenerate ? '已具备生成条件' : '评估输入收集中'}
          </div>
          <div className="mt-2 text-sm leading-7 text-sky-950">
            {hasReport
              ? '右侧已经展示结构化评估网页。你可以继续补充限制条件、要求按不同交付口径重估，或直接保存为交付物。'
              : canGenerate
                ? 'AI 已经识别到足够的评估输入。你可以立即生成一版建议结果，也可以再补充几个边界条件。'
                : '继续告诉我：要评估哪些功能、涉及哪些页面/角色/接口、是否有二开复用、是否需要考虑权限、流程、第三方集成或数据迁移。'}
          </div>

          {Array.isArray(estimationState.detectedFunctions) && estimationState.detectedFunctions.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {estimationState.detectedFunctions.map((item, index) => (
                <span key={`${item}-${index}`} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-sky-700 ring-1 ring-sky-100">
                  {item}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {canGenerate ? (
          <button
            onClick={onGenerate}
            className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-700"
          >
            立即生成结果
          </button>
        ) : null}
      </div>
    </div>
  );
}
