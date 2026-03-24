import React, { useState, useEffect } from 'react';
import SessionNavigator from './SessionNavigator';
import ChatInterface from './ChatInterface';
import StrategyBoard from './StrategyBoard';
import { 
  getIdeationSessions, 
  createIdeationSession, 
  deleteIdeationSession,
  getIdeationMessages,
  addIdeationMessage,
  getIdeationTopics,
  createIdeationTopic,
  updateIdeationTopic,
  updateIdeationSession,
  getPersonas,
  chatWithAgent,
  researchWithAgent
} from '../../services/api';
import { executeSkill } from '../../services/skills';
import { agentRuntime } from '../../services/agent/AgentRuntime';
import { BasePersona, ResearchSkill, IdeationSkill } from '../../services/agent/skills/definitions';

const IdeationConference = ({ currentUser, currentProduct }) => {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [topics, setTopics] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [currentPersonaId, setCurrentPersonaId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [researchPlan, setResearchPlan] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);

  // Load Personas & Sessions
  useEffect(() => {
    loadInitialData();
  }, [currentUser]);

  const loadInitialData = async () => {
    try {
        const [sessionsData, personasData] = await Promise.all([
            getIdeationSessions(),
            getPersonas()
        ]);
        
        setPersonas(personasData || []);
        setSessions(sessionsData);
        
        // Find default persona "公众号深度洞察文章", otherwise use the first one
        const defaultPersona = (personasData || []).find(p => p.name === '公众号深度洞察文章') || (personasData || [])[0];

        if (sessionsData.length > 0 && !currentSessionId) {
            setCurrentSessionId(sessionsData[0].id);
            setCurrentPersonaId(sessionsData[0].persona_id || defaultPersona?.id);
        } else if ((personasData || []).length > 0 && !currentPersonaId) {
             setCurrentPersonaId(defaultPersona?.id);
        }
    } catch (e) {
        console.error('Failed to load initial data', e);
    }
  };

  // Load Messages & Topics when session changes
  useEffect(() => {
    if (currentSessionId) {
      loadSessionData(currentSessionId);
    } else {
      setMessages([]);
      setTopics([]);
    }
  }, [currentSessionId]);

  const loadSessions = async () => {
    try {
      const data = await getIdeationSessions();
      setSessions(data);
      if (data.length > 0 && !currentSessionId) {
        setCurrentSessionId(data[0].id);
        const defaultPersona = personas.find(p => p.name === '公众号深度洞察文章') || personas[0];
        setCurrentPersonaId(data[0].persona_id || defaultPersona?.id);
      }
    } catch (e) {
      console.error('Failed to load sessions', e);
    }
  };

  const loadSessionData = async (sessionId) => {
    try {
      const [msgs, tps] = await Promise.all([
        getIdeationMessages(sessionId),
        getIdeationTopics(sessionId)
      ]);
      setMessages(msgs);
      setTopics(tps);
      
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
          const defaultPersona = personas.find(p => p.name === '公众号深度洞察文章') || personas[0];
          setCurrentPersonaId(session.persona_id || defaultPersona?.id);
      }
    } catch (e) {
      console.error('Failed to load session data', e);
    }
  };

  const handleCreateSession = async () => {
    try {
      const newSession = await createIdeationSession({
        title: '新策划 ' + new Date().toLocaleDateString(),
        persona_id: currentPersonaId,
        product_id: currentProduct?.id
      });
      setSessions([newSession, ...sessions]);
      setCurrentSessionId(newSession.id);
      
      // Add initial greeting
      const defaultPersona = personas.find(p => p.name === '公众号深度洞察文章') || personas[0];
      const persona = personas.find(p => p.id === currentPersonaId) || defaultPersona;
      const greeting = `贫道诸葛。当前以【${persona?.name || '未知'}】的身份为您服务。今日想聊什么？`;
      await addIdeationMessage({
        session_id: newSession.id,
        role: 'assistant',
        content: greeting
      });
      setMessages([{ role: 'assistant', content: greeting, created_at: new Date().toISOString() }]);
      setTopics([]);
    } catch (e) {
      console.error('Failed to create session', e);
    }
  };

  const handleDeleteSession = async (id) => {
    try {
      await deleteIdeationSession(id);
      setSessions(sessions.filter(s => s.id !== id));
      if (currentSessionId === id) {
        setCurrentSessionId(null);
      }
    } catch (e) {
      console.error('Failed to delete session', e);
    }
  };

  const generateSmartTitle = async (content) => {
    try {
      // 1. Generate title using LLM
      const { reply } = await agentRuntime.run({
        systemPrompt: '你是一个专业的编辑助手。请根据用户的输入，总结一个精简的会话标题（10字以内）。直接输出标题，不要包含引号或其他废话。',
        userMessage: content
      });
      
      const newTitle = reply.trim().replace(/^["'《]+|["'》]+$/g, '');
      
      if (newTitle && currentSessionId) {
        // 2. Update DB
        await updateIdeationSession(currentSessionId, { title: newTitle });
        
        // 3. Update Local State
        setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, title: newTitle } : s));
      }
    } catch (e) {
      console.warn('Failed to auto-generate title', e);
    }
  };

  const handleSendMessage = async (content) => {
    // Optimistic update
    const tempUserMsg = { id: 'temp-' + Date.now(), role: 'user', content, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, tempUserMsg]);
    setIsTyping(true);

    // Check if title needs update (Async, non-blocking)
    const currentSession = sessions.find(s => s.id === currentSessionId);
    if (currentSession && currentSession.title.startsWith('新策划') && content.length > 2) {
        generateSmartTitle(content);
    }

    try {
      // 1. Save user message
      await addIdeationMessage({
        session_id: currentSessionId,
        role: 'user',
        content
      });

      // 2. Call Agent
      const defaultPersona = personas.find(p => p.name === '公众号深度洞察文章') || personas[0];
      const persona = personas.find(p => p.id === currentPersonaId) || defaultPersona;
      const currentDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
      const systemPrompt = `
当前日期：${currentDate}

${BasePersona(persona)}

${ResearchSkill}

${IdeationSkill}
`;

      // Construct context (last 10 messages)
      const historyContext = messages.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n');
      const userMessageFull = `
历史对话：
${historyContext}

用户当前输入：
${content}
`;

      const currentPersona = personas.find(p => p.id === currentPersonaId) || personas[0];

      // Use AgentRuntime instead of direct API call
      let { reply } = await agentRuntime.run({
        systemPrompt: systemPrompt,
        userMessage: userMessageFull,
        context: {
            persona: currentPersona
        }
      });

      // 2.1 Check for Tool Call (Research)
      // Allow for json block with or without "json" language tag, or even just the object if it's clear
      const toolCallMatch = reply.match(/```(?:json)?\s*(\{[\s\S]*?"tool_call"\s*:\s*"research"[\s\S]*?\})\s*```/);
      
      if (toolCallMatch) {
          try {
              const toolCall = JSON.parse(toolCallMatch[1]);
              const researchType = toolCall.type || 'deep'; // Default to deep for backward compatibility

              if (researchType === 'quick') {
                  // === L1: Quick Search ===
                  const query = toolCall.query;
                  if (query) {
                      console.log('Executing quick search:', query);
                      
                      // 2. Execute Search (Zhuowei)
                      const { report } = await researchWithAgent(query);
                      
                      // 3. Inject result back to Zhuge immediately
                      const followUpMessage = `
【系统通知】针对你的轻量级检索请求 "${query}"，系统已查证：
"""
${report}
"""

请结合以上查证结果，直接回答用户的问题。不要提及你是通过工具查到的，自然地融入对话即可。
`;
                      const { reply: finalReply } = await agentRuntime.run({
                          systemPrompt: systemPrompt,
                          userMessage: followUpMessage,
                          context: {
                              persona: currentPersona
                          }
                      });
                      
                      reply = finalReply;
                  }
              } else {
                  // === L2: Deep Research (Existing Logic) ===
                  const plan = toolCall.plan || { 
                      main_topic: toolCall.query, 
                      sub_queries: [toolCall.query] 
                  };
                  
                  if (plan.main_topic) {
                      setIsResearching(true);
                      setResearchPlan(plan);
                      
                      const { report, sources } = await researchWithAgent(plan.main_topic);
                      
                      setIsResearching(false);
                      setResearchPlan(null);

                      // 2.2 Display Full Report & Sources
                      let validSources = sources || [];
                      if (validSources.length === 0) {
                          const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
                          let match;
                          while ((match = linkRegex.exec(report)) !== null) {
                              validSources.push({ title: match[1], url: match[2] });
                          }
                      }
                      
                      let sourceList = "";
                      if (validSources.length > 0) {
                          sourceList = validSources.slice(0, 5).map(s => `- [${s.title}](${s.url})`).join('\n');
                      }

                      setPreviewContent({
                          title: `调研报告：${plan.main_topic}`,
                          content: `${report}\n\n#### 🔗 参考来源\n${sourceList || '已完成全网深度检索'}`,
                          sources: validSources
                      });

                      let displayContent = `### 📄 全网调研报告\n\n`;
                      displayContent += `> 卓伟已完成对“${plan.main_topic}”的深度调研，生成了以下文档。\n\n`;
                      displayContent += `#### 📝 调研详情\n${report}\n\n`;
                      displayContent += `#### 🔗 参考来源\n${sourceList || '已完成全网深度检索'}`;
                      
                      const reportMsg = await addIdeationMessage({
                          session_id: currentSessionId,
                          role: 'assistant', 
                          content: displayContent
                      });
                      setMessages(prev => prev.concat(reportMsg));
                      
                      const followUpMessage = `
【系统通知】卓伟的调研报告已生成并展示给用户（见上文）。
调研报告内容如下：
"""
${report}
"""

请你仔细阅读这份报告，并把你的**思考过程**展示出来：
1. 先分析报告中的核心发现（Analysis）。
2. 结合用户最初的需求，推导出选题方向（Reasoning）。
3. 最后给出 3 个具体的选题建议（Proposal）。

请让用户感觉到你是在消化了这份文档后，经过深思熟虑才给出的建议。
`;
                      const { reply: finalReply } = await agentRuntime.run({
                          systemPrompt: systemPrompt,
                          userMessage: followUpMessage,
                          context: {
                              persona: currentPersona
                          }
                      });
                      
                      reply = finalReply;
                  }
              }
          } catch (e) {
              console.error('Failed to execute research tool', e);
              reply += `\n\n(调研指令执行失败: ${e.message})`;
          } finally {
              setIsResearching(false);
              setResearchPlan(null);
          }
      }

      // 3. Parse Reply for JSON (Topics)
      let finalContent = reply;
      const jsonMatch = reply.match(/```json\s*([\s\S]*?)\s*```/);
      
      if (jsonMatch) {
        try {
          const jsonStr = jsonMatch[1];
          const topicsData = JSON.parse(jsonStr);
          
          // Create topics in DB
          if (Array.isArray(topicsData)) {
            for (const t of topicsData) {
              const newTopic = await createIdeationTopic({
                session_id: currentSessionId,
                title: t.title,
                angle: t.angle,
                hook: t.hook,
                detail_json: t
              });
              setTopics(prev => [newTopic, ...prev]);
            }
          }
          
          // Remove JSON from display content, but keep a subtle system indicator
          finalContent = reply.replace(jsonMatch[0], '\n\n> 💡 *系统提示：选题卡片已生成至右侧看板*');
        } catch (e) {
          console.error('Failed to parse JSON from agent', e);
        }
      }

      // 4. Save assistant message
      const assistantMsg = await addIdeationMessage({
        session_id: currentSessionId,
        role: 'assistant',
        content: finalContent
      });

      setMessages(prev => prev.map(m => m.id === tempUserMsg.id ? { ...tempUserMsg, id: 'saved-' + Date.now() } : m).concat(assistantMsg));
    } catch (e) {
      console.error('Failed to send message', e);
      setMessages(prev => [...prev, { role: 'system', content: '发送失败: ' + e.message, id: 'err-' + Date.now() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleScheduleTopic = async (topic) => {
    const newStatus = topic.status === 'scheduled' ? 'pending' : 'scheduled';
    const newDate = newStatus === 'scheduled' ? new Date().toISOString() : null;
    
    try {
      const updated = await updateIdeationTopic(topic.id, {
        status: newStatus,
        schedule_date: newDate
      });
      setTopics(prev => prev.map(t => t.id === topic.id ? updated : t));
    } catch (e) {
      console.error('Failed to schedule topic', e);
    }
  };

  const handleTestSkill = async () => {
    try {
      const text = "这是一段测试文本，用于验证 MACC Agent Skills 的风格提取能力。技术架构必须严谨，同时兼顾用户体验。";
      // eslint-disable-next-line no-alert
      const confirmRun = window.confirm(`准备执行 MACC Skill 验证：\n\nSkill: extract_style_dna\nAgent: 老K\n\n点击确定开始执行...`);
      if (!confirmRun) return;

      const result = await executeSkill('extract_style_dna', { 
        text: text,
        personaName: 'MACC_TEST_' + Date.now()
      });
      
      console.log('Skill Result:', result);
      // eslint-disable-next-line no-alert
      alert(`✅ 验证成功！\n\n技能: ${result.skill}\n生成的 Persona ID: ${result.data.id}\n风格 DNA: ${JSON.stringify(result.data.style_dna, null, 2)}\n\n数据已持久化到 ${result.data.id.startsWith('mock-') ? 'Mock Store (localStorage)' : 'Supabase'}`);
    } catch (e) {
      console.error(e);
      // eslint-disable-next-line no-alert
      alert('❌ 验证失败: ' + e.message);
    }
  };

  return (
    <div className="flex h-full bg-white relative">
      <button 
        onClick={handleTestSkill}
        className="absolute bottom-4 left-4 z-50 bg-indigo-600 text-white px-3 py-1.5 rounded-full shadow-lg hover:bg-indigo-700 text-xs font-bold flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity"
        title="验证 Agent Skills 可用性"
      >
        <span>⚡ MACC Skill Test</span>
      </button>
      <SessionNavigator 
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={setCurrentSessionId}
        onCreateSession={handleCreateSession}
        onDeleteSession={handleDeleteSession}
      />
      
      {currentSessionId ? (
        <>
          <ChatInterface 
        messages={messages} 
        onSendMessage={handleSendMessage}
        isTyping={isTyping}
        isResearching={isResearching}
        researchPlan={researchPlan}
        currentPersona={personas.find(p => p.id === currentPersonaId) || personas[0]}
        personas={personas}
        currentPersonaId={currentPersonaId}
        onPersonaChange={setCurrentPersonaId}
        onViewReport={(reportData) => {
            setPreviewContent(reportData);
        }}
      />
          <StrategyBoard 
            topics={topics}
            onScheduleTopic={handleScheduleTopic}
            previewContent={previewContent}
            onClearPreview={() => setPreviewContent(null)}
          />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50 flex-col text-gray-400">
           <div className="w-16 h-16 bg-gray-200 rounded-full mb-4 flex items-center justify-center">
             <span className="text-2xl">💡</span>
           </div>
           <p>请选择或新建一个策划会话</p>
        </div>
      )}
    </div>
  );
};

export default IdeationConference;
