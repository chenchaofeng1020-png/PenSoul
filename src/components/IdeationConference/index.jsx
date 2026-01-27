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
  getPersonas,
  chatWithAgent,
  researchWithAgent
} from '../../services/api';
import { executeSkill } from '../../services/skills';
import { agentRuntime } from '../../services/agent/AgentRuntime';

const IdeationConference = ({ currentUser, currentProduct }) => {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [topics, setTopics] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [currentPersonaId, setCurrentPersonaId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isResearching, setIsResearching] = useState(false);

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

  const handleSendMessage = async (content) => {
    // Optimistic update
    const tempUserMsg = { id: 'temp-' + Date.now(), role: 'user', content, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, tempUserMsg]);
    setIsTyping(true);

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
      const systemPrompt = `
${persona.role_definition || persona.prompt || '你是一个专业的编辑'}
你现在在“选题会议室”中，扮演“算命先生·诸葛”。
你的核心能力是帮助用户把模糊的灵感打磨成惊艳的选题。

【能力升级】
你现在拥有全网实时调研能力。
请在对话中**灵活判断**：
- 如果用户的话题涉及到最新的热点、陌生的领域，或者你需要数据支撑，请**自主决策**调用“research”工具。
- 在决定调用工具前，请先向用户说明你的意图，例如：“这个问题很有趣，我需要让卓伟去查一下最新的数据...”
- 搜索是为你服务的，但搜索结果（文档）也会同步展示给用户。

【工作流程】
1. **聆听与判断**：分析用户输入。如果需要补充信息，立即调研。
2. **调研与内化**：调用调研工具后，系统会展示调研报告。请你阅读报告，提取关键信息。
3. **输出方案**：
   - 先展示你的**思考过程**（Analysis）：你从报告里看到了什么关键点？
   - 再给出**策划建议**（Proposal）：基于这些点，你有哪些选题主意？
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
      const toolCallMatch = reply.match(/```json\s*(\{[\s\S]*?"tool_call"\s*:\s*"research"[\s\S]*?\})\s*```/);
      
      if (toolCallMatch) {
          try {
              const toolCall = JSON.parse(toolCallMatch[1]);
              const query = toolCall.query;
              
              if (query) {
                  // Set Researching State
                  setIsResearching(true);
                  
                  // Add invisible system message or show user that research is happening
                  const researchingMsg = await addIdeationMessage({
                      session_id: currentSessionId,
                      role: 'assistant', // Use assistant role but maybe format differently? 
                      content: `🕵️ **诸葛委托卓伟正在调研：** ${query}...`
                  });
                  setMessages(prev => prev.map(m => m.id === tempUserMsg.id ? { ...tempUserMsg, id: 'saved-' + Date.now() } : m).concat(researchingMsg));
                  
                  // Call Zhuowei
                  const { report, sources } = await researchWithAgent(query);
                  
                  // Update message to show done
                  setIsResearching(false);

                  // 2.2 Display Full Report & Sources
                  let displayContent = "";
                  
                  // Construct Source List
                  let sourceList = "";
                  let validSources = sources || [];
                  if (validSources.length === 0) {
                      const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
                      let match;
                      while ((match = linkRegex.exec(report)) !== null) {
                          validSources.push({ title: match[1], url: match[2] });
                      }
                  }
                  if (validSources.length > 0) {
                      sourceList = validSources.slice(0, 5).map(s => `- [${s.title}](${s.url})`).join('\n');
                  }

                  // Construct Display Message (Use details for collapsible report)
                  displayContent = `### 📄 全网调研报告\n\n`;
                  displayContent += `> 卓伟已完成对“${query}”的深度调研，生成了以下文档。\n\n`;
                  
                  // Add Report Content
                  displayContent += `#### 📝 调研详情\n`;
                  displayContent += `${report}\n\n`;
                  
                  // Add Sources
                  if (sourceList) {
                      displayContent += `#### 🔗 参考来源\n${sourceList}`;
                  } else {
                      displayContent += `#### 🔗 参考来源\n已完成全网深度检索`;
                  }
                  
                  // Add "Report" message
                  const reportMsg = await addIdeationMessage({
                      session_id: currentSessionId,
                      role: 'assistant', 
                      content: displayContent
                  });
                  setMessages(prev => prev.concat(reportMsg));
                  
                  // 2.3 Send Follow-up to Zhuge with Instructions
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
          } catch (e) {
              console.error('Failed to execute research tool', e);
              reply += `\n\n(调研指令执行失败: ${e.message})`;
          } finally {
              setIsResearching(false);
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
          
          // Remove JSON from display content
          finalContent = reply.replace(jsonMatch[0], '\n\n*(已自动生成选题卡片)*');
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
    <div className="flex h-full border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white relative">
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
        currentPersona={personas.find(p => p.id === currentPersonaId) || personas[0]}
        personas={personas}
        currentPersonaId={currentPersonaId}
        onPersonaChange={setCurrentPersonaId}
      />
          <StrategyBoard 
            topics={topics}
            onScheduleTopic={handleScheduleTopic}
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
