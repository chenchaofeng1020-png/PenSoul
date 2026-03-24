import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, PenTool, Loader2, FileText, Image, Sparkles, Check, Save, User, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { getPersonas } from '../../services/api';

const MODEL_OPTIONS = [
  { id: 'default', name: '默认模型', description: '系统默认模型' },
  { id: 'deepseek-r1-250528', name: 'DeepSeek R1', description: '深度思考，推理能力强' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', description: 'Google最新模型，创意能力强' },
];

export function XiaohongshuDrawer({ isOpen, onClose, productId, sources, onNoteCreated, selectedPersona, onChangePersona }) {
  const { showToast } = useUI();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContents, setGeneratedContents] = useState([]);
  const [savedIndices, setSavedIndices] = useState(new Set());
  const [localPersona, setLocalPersona] = useState(selectedPersona);
  const [personas, setPersonas] = useState([]);
  const [showPersonaSelector, setShowPersonaSelector] = useState(false);
  const [loadingPersonas, setLoadingPersonas] = useState(false);
  const [selectedModel, setSelectedModel] = useState('default');
  const textareaRef = useRef(null);
  const drawerRef = useRef(null);

  // 重置状态当抽屉打开
  useEffect(() => {
    if (isOpen) {
      setGeneratedContents([]);
      setSavedIndices(new Set());
      setPrompt('');
      setLocalPersona(selectedPersona);
      setShowPersonaSelector(false);
    }
  }, [isOpen, selectedPersona]);

  // 加载人设列表
  const loadPersonas = async () => {
    setLoadingPersonas(true);
    try {
      const data = await getPersonas();
      setPersonas(data || []);
    } catch (e) {
      console.error('Failed to load personas', e);
    } finally {
      setLoadingPersonas(false);
    }
  };

  // 展开/收起人设选择器
  const togglePersonaSelector = () => {
    if (!showPersonaSelector && personas.length === 0) {
      loadPersonas();
    }
    setShowPersonaSelector(!showPersonaSelector);
  };

  // 选择人设
  const handleSelectPersona = (persona) => {
    console.log('[XiaohongshuDrawer] Selected persona:', persona.name);
    console.log('[XiaohongshuDrawer] Persona style_dna:', persona.style_dna ? 'exists' : 'missing');
    console.log('[XiaohongshuDrawer] Persona style_dna keys:', persona.style_dna ? Object.keys(persona.style_dna) : 'N/A');
    setLocalPersona(persona);
    setShowPersonaSelector(false);
    if (onChangePersona) {
      onChangePersona(persona);
    }
    showToast(`已选择人设：${persona.name}`, 'success');
  };

  // 清除人设（使用默认）
  const handleClearPersona = () => {
    setLocalPersona(null);
    setShowPersonaSelector(false);
    if (onChangePersona) {
      onChangePersona(null);
    }
  };

  // ESC 键关闭
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // 点击遮罩关闭
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // 根据人设构建System Prompt
  const buildPersonaPrompt = () => {
    // 小红书真实感内容创作专家 - 完整Skill内容
    const baseInstructions = `【角色设定 - 必须严格遵守】
你是一个普通的小红书用户，正在和朋友分享你的真实使用体验。你不是专业写手，不是营销号，就是一个真实的消费者。

【绝对红线 - 出现以下情况算彻底失败】
1. **严禁编造功能**：只能写资料中明确提到的功能，不能脑补任何未提及的功能
2. **严禁虚构场景**：不要编"周三晚上11点被老板cue"这种具体但虚假的场景
3. **严禁过度戏剧化**：不要写小说式的对话和情节
4. **严禁夸大效果**：资料没说能"100倍提升"就不要写

【优先级规则 - 非常重要】
1. **用户提示词（最高优先级）**：如果用户提供了创作提示词，必须优先根据提示词的方向进行选题和创作
2. **产品资料（参考作用）**：资料用于了解产品真实功能，确保不瞎编，但选题方向以用户提示词为准
3. **如果用户提示词与资料冲突**：优先满足用户提示词的选题方向，但只写资料中真实存在的功能

【如何正确使用资料】
- 仔细阅读资料中的功能描述
- **特别注意：如果资料包含图片，请仔细分析图片中展示的功能、界面、操作流程**
- 图片中看到的按钮、菜单、图表、界面布局都是重要的功能线索
- 结合用户提示词的选题方向，从资料（包括图片）中找相关的真实功能
- 围绕用户提示词的方向和资料中的真实功能进行创作
- 可以合理推测使用场景，但不能编造不存在的功能

【图片资料处理指南】
- 如果数据源是图片，请详细描述图片中展示的内容
- 关注图片中的：界面元素、功能按钮、数据展示、操作流程
- 从图片中推断产品的实际功能和使用方式
- 基于图片中的真实内容进行创作，不要脑补图片中没有的功能

【核心理念 - 最重要】
不要编造虚假场景，不要写小说式的故事。
直接说出真实的痛点，用简洁的语言表达产品的价值。

小红书用户想看的是：
- "这个痛点我也有！"（共鸣）
- "原来可以这样解决"（价值）
- "看起来挺靠谱"（真实）

【创作流程 - 两步法】

第一步：找痛点（最关键）
从资料提供的功能中，找出【一个】最能引发共鸣的真实痛点：

| 痛点类型 | 示例 | 为什么有效 |
|---------|------|-----------|
| 工作痛点 | "路线图更新要改PPT、发邮件、@所有人" | 产品人秒懂 |
| 效率痛点 | "对齐信息要花半小时" | 有数据支撑 |
| 协作痛点 | "大家看的版本不一样" | 团队协作常见问题 |
| 成本痛点 | "付费工具太贵" | 预算敏感 |

痛点原则：
- 越真实越好：不要编造"周三晚上被老板cue"这种虚假场景
- 越具体越好：用数据、用真实的工作场景
- 越简洁越好：一句话说清楚痛点，不要铺垫太多
- **必须基于资料**：只写资料中真实存在的功能能解决的问题

第二步：说价值（基于痛点展开）
确定痛点后，用简洁直接的方式说明产品如何解决：

【开头】痛点共鸣（1-2句）
→ 直接说出痛点，让读者有共鸣
→ 可以用"做产品的都懂那种痛"、"XX的痛谁懂"开头
→ 不要编造虚假的具体场景

【中间】解决方案（3-5句）
→ 简洁介绍产品如何解决这个痛点
→ 用列表形式（✅）列出核心价值点
→ 只写资料中明确提到的功能
→ 可以有真实的使用感受，但不要编造虚假场景

【结尾】行动号召（1-2句）
→ 简洁的推荐语
→ 可以加链接或引导语
→ 不要过度热情的"强烈推荐！"

【写作技巧】
1. **真实痛点**：不要编造虚假场景，用真实的工作痛点
2. **简洁直接**：不要铺垫太多，直接说痛点→解决方案
3. **结构清晰**：痛点→产品介绍→价值点→行动号召
4. **适当幽默**：可以用梗、双关，但要自然
5. **真实感**：可以吐槽、可以自嘲，但不要编造虚假场景

【语言风格指南 - 必须做到的（真实感）】

1. 口语化表达
   ✅ "嗯...说实话"
   ✅ "其实吧"
   ✅ "我觉得"
   ✅ "你们懂吧"

2. 句子长短不一
   ✅ "好用。真的。"
   ✅ "那天我...算了直接说吧"
   ✅ 可以有没说完的句子

3. 具体细节
   ✅ "周三晚上11点"
   ✅ "第三次用的时候"
   ✅ "大概用了两周"

4. 适当保留
   ✅ "虽然...但是..."
   ✅ "不过说实话..."
   ✅ "可能不适合..."

5. 小吐槽/小缺点
   ✅ "唯一缺点是..."
   ✅ "刚开始觉得..."
   ✅ "要是...就更好了"

【语言风格指南 - 绝对禁止的（AI味）】

1. 网络套话
   ❌ "绝绝子"
   ❌ "YYDS"
   ❌ "天花板"
   ❌ "不得不说"
   ❌ "真的绝了"
   ❌ "家人们谁懂啊"

2. 堆砌形容词
   ❌ "超级好用"
   ❌ "非常方便"
   ❌ "特别满意"
   ❌ "真的很棒"

3. 完美化描述
   ❌ "完美解决"
   ❌ "无可挑剔"
   ❌ "100分推荐"

4. 机械结构
   ❌ "首先...其次...最后..."
   ❌ "第一...第二...第三..."
   ❌ "总结如下"

5. 过度热情
   ❌ 每个句子都用感叹号
   ❌ "一定要买！"
   ❌ "强烈推荐！"

【示例对比 - 假设资料提到"路线图"、"拖拽调整"、"团队协作"功能】

❌ 错误示例（虚假场景）：
标题：上周改需求改到崩溃，结果...
说实话，上周三我真的快崩溃了。
老板临时说要调整Q3规划，我那个PPT做了整整两天...
同事看我愁眉苦脸的，让我试试DrawPie...
【问题：编造了"周三"、"老板临时说"等虚假场景，太戏剧化】

❌ 错误示例（平铺直叙）：
标题：这个工具可以拖拽调整
这个工具有个拖拽功能很好用。
可以把卡片拖到不同版本。
比以前用PPT方便多了。
【问题：干巴巴介绍功能，没有痛点共鸣】

✅ 正确示例（真实痛点 + 简洁直接）：
标题：做产品的都懂那种痛——

路线图更新一次，要改 PPT、发邮件、@研发@运营@市场，
最后大家看的还是三个版本不一样的文件 😮‍💨

直到我开始用 Drewpie（画饼）

名字就很懂产品人 😂 
画路线图 = 画饼，但这次饼画得又好看又清晰

用下来最爽的几点：
✅ 路线图直观好看，不是那种密密麻麻的甘特图
✅ 团队协作，研发/市场/运营看同一份实时更新的图
✅ 一个链接直接分享，不用来回发文件
✅ 现在完全免费，不用白不用

以前开季度规划会，光对齐信息就要花半小时
现在甩一个链接，5 秒钟所有人都在同一页

产品团队必备，强烈推荐去试试 👇
🔗 [drewpie 链接]

#产品经理 #产品规划 #路线图 #团队协作 #效率工具
【优点：
1. 真实痛点开场，不做作
2. 只写资料中提到的功能：路线图、团队协作、分享链接
3. 简洁直接，没有虚假的"周三晚上"场景
4. 有真实感：名字梗、免费、对齐信息的痛苦
5. 结构清晰：痛点→解决方案→具体价值→行动号召】

【创作检查清单 - 生成后必须逐项检查】
- [ ] **是否编造了资料中没有的功能？**（这是最重要的！）
- [ ] 是否只围绕【一个】切入点展开？
- [ ] 写的是否是资料中明确提到的真实功能？
- [ ] 是否有适当的保留或吐槽？
- [ ] 是否避免了网络套话？
- [ ] 是否避免了小说式的虚假场景？
- [ ] 读起来像不像真人说话？

【关键提醒】
1. **只写资料中明确提到的功能，不确定的不要写**
2. 少即是多。讲好一个真实的使用瞬间，胜过罗列十个产品卖点
3. 宁可写得简单真实，也不要瞎编功能显得"丰富"`;

    if (!localPersona || !localPersona.style_dna) {
      return baseInstructions + `

【输出要求】
1. 先输出【选题】：说明本次选择的切入点（1句话）
2. 再输出【文案】：按上述结构创作，200-400字
3. 标题带1-2个emoji，自然不刻意
4. 标签3-5个，具体不泛

【你的风格】
自然、真实、像朋友聊天一样`;
    }

    const { style_dna } = localPersona;
    
    return baseInstructions + `

【输出要求】
1. 先输出【选题】：说明本次选择的切入点（1句话）
2. 再输出【文案】：按上述结构创作，200-400字
3. 标题带1-2个emoji，自然不刻意
4. 标签3-5个，具体不泛

【你的完整人设风格】

# 风格概述
${style_dna.overview || '暂无'}

# 创作方法论
${style_dna.methodology || '暂无'}

# 思维内核
${style_dna.mindset || '暂无'}

# 表达特征
${style_dna.expression || '暂无'}

# 创作习惯
${style_dna.habits || '暂无'}

# 独特标记
${style_dna.signature || '暂无'}

# 风格关键词
语气：${style_dna.tone || '自然真实'}
节奏：${style_dna.pacing || '随性自然'}
词汇复杂度：${style_dna.vocabulary_complexity || '中等'}
句式特点：${style_dna.sentence_structure || '长短结合'}
常用词汇：${style_dna.keywords_detected?.join('、') || '无'}

【重要提醒】
1. 以上是你的人设风格完整内容，请深入理解其精神内涵，而不是机械套用
2. 用人设的语气说话，但内容要围绕【唯一的选题切入点】展开
3. 人设是调味剂，选题是主菜
4. 最重要的是：真实、像真人说话、只讲好一个使用瞬间`;
  };

  // 生成文案
  const handleGenerate = async () => {
    if (sources.length === 0) {
      showToast('请先选择资料', 'error');
      return;
    }

    setIsGenerating(true);
    setGeneratedContents([]);

    try {
      // 构建数据源内容
      let sourcesContent = '';
      sources.forEach((source, index) => {
        sourcesContent += `[资料${index + 1}] ${source.file_name}\n`;
        if (source.file_type === 'image') {
          sourcesContent += `[图片内容 - 请仔细分析这张图片中展示的产品功能、界面设计、操作流程等细节]\n\n`;
        } else {
          sourcesContent += `${source.content}\n\n`;
        }
      });

      // 构建 prompt（使用人设）
      const systemPrompt = buildPersonaPrompt();
      console.log('[XiaohongshuDrawer] Built system prompt, length:', systemPrompt.length);
      console.log('[XiaohongshuDrawer] System prompt preview:', systemPrompt.substring(0, 200) + '...');
      
      // 用户提示词 - 提示词优先，资料作为参考
      const hasCustomPrompt = prompt && prompt.trim().length > 0;
      const userPromptText = hasCustomPrompt 
        ? `【用户指定的创作方向】\n${prompt}\n\n请严格按照用户指定的创作方向，结合下方的产品资料进行创作。用户提示词优先级最高！`
        : '请从下方提供的产品资料中，找到最有共鸣的一个真实功能作为切入点，创作3份小红书文案。';
      
      const formatPrompt = `【输出格式要求】
请生成3份小红书文案，每份文案按以下格式输出：

【选题】
简要说明本次选择的痛点（1句话）
${hasCustomPrompt ? '- 说明这个痛点如何呼应用户的创作提示词' : '- 明确写出这个痛点对应的是资料中的哪个功能'}

【文案】
标题（简洁有力，可以有emoji）

正文（200-400字，简洁直接）
- ${hasCustomPrompt ? '优先满足用户提示词的创作方向' : '只写资料中明确提到的功能'}
- **真实痛点开场，不要编造虚假场景**
- 简洁介绍产品价值，用列表形式（✅）列出核心点
- 可以有真实的使用感受，但不要编造"周三晚上"这种虚假场景
- 结尾简洁的推荐语

#标签1 #标签2 #标签3（3-5个，具体不泛）

---

（下一份文案）

【绝对禁止】
- 严禁编造虚假场景（如"周三晚上11点被老板cue"）
- 严禁小说式的戏剧化情节
- 严禁过度热情的"强烈推荐！"
- 严禁平铺直叙介绍功能（如"这个工具有XX功能，可以..."）

【必须做到】
${hasCustomPrompt ? '- 优先根据用户提示词的方向进行创作' : '- 每份文案必须围绕【资料中真实存在的不同功能】展开'}
- 真实痛点开场，简洁直接
- 只写资料明确提到的功能，不确定的不要写
- 用列表形式（✅）列出核心价值点
- 3份文案 = 3个不同的痛点 = 3个不同的解决方案`;

      // 构建 user message（资料 + 要求）
      const userMessage = `【产品资料】\n${sourcesContent}\n\n【创作要求】\n${userPromptText}\n\n${formatPrompt}`;

      // Debug: 打印发送的数据
      console.log('[XiaohongshuDrawer] Sending request:');
      console.log('[XiaohongshuDrawer] - systemPrompt length:', systemPrompt.length);
      console.log('[XiaohongshuDrawer] - systemPrompt preview:', systemPrompt.substring(0, 300) + '...');
      console.log('[XiaohongshuDrawer] - userMessage length:', userMessage.length);
      console.log('[XiaohongshuDrawer] - localPersona:', localPersona ? localPersona.name : 'null');

      const response = await fetch('http://localhost:3002/api/smart/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          prompt: systemPrompt,  // 人设风格作为 system message
          context: userMessage,   // 资料和要求作为 user message
          type: 'xiaohongshu',
          personaId: localPersona?.id,
          model: selectedModel === 'default' ? undefined : selectedModel  // 模型选择
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

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
              if (data.content) {
                fullContent += data.content;
                // 实时解析并更新
                const parsed = parseContents(fullContent);
                setGeneratedContents(parsed);
              }
            } catch (e) {
              console.warn('Failed to parse Xiaohongshu stream chunk:', e);
            }
          }
        }
      }

      showToast('文案生成完成', 'success');
    } catch (error) {
      console.error('Generation failed:', error);
      showToast('生成失败，请重试', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // 解析生成的内容
  const parseContents = (content) => {
    if (!content) return [];
    const parts = content.split(/---+/).filter(p => p.trim());
    return parts.map((part, index) => ({
      id: index,
      style: `文案 ${index + 1}`,
      content: part.trim()
    }));
  };

  // 保存文案
  const handleSave = async (contentItem) => {
    if (savedIndices.has(contentItem.id)) return;

    try {
      const title = `小红书文案 - ${contentItem.style} - ${new Date().toLocaleDateString()}`;
      
      const res = await fetch('http://localhost:3002/api/smart/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          title,
          content: contentItem.content,
          type: 'xiaohongshu',
          sourceType: 'generated',
          sourceRefs: sources.map(s => s.id)
        })
      });

      const result = await res.json();
      if (result.data) {
        onNoteCreated(result.data);
        setSavedIndices(prev => new Set([...prev, contentItem.id]));
        showToast('保存成功', 'success');
      }
    } catch (error) {
      console.error('Save failed:', error);
      showToast('保存失败', 'error');
    }
  };

  if (!isOpen) return null;

  return createPortal((
    <div 
      className="fixed inset-0 bg-black/40 flex justify-end z-[60]"
      onClick={handleBackdropClick}
    >
      <div 
        ref={drawerRef}
        className="bg-white w-full max-w-[480px] h-full shadow-2xl flex flex-col animate-slide-in-right"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center text-white">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">小红书文案创作</h2>
              <p className="text-xs text-gray-500">基于产品资料生成种草文案</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 人设选择栏 */}
        <div className="px-5 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
          {/* 当前人设显示 / 展开按钮 */}
          <button
            onClick={togglePersonaSelector}
            className="w-full flex items-center justify-between group"
          >
            <div className="flex items-center gap-2">
              {localPersona ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                    {localPersona.name[0]}
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-medium text-indigo-900">{localPersona.name}</span>
                    {localPersona.style_dna?.tone && (
                      <span className="text-xs text-indigo-600 ml-2 px-2 py-0.5 bg-white/60 rounded">
                        {localPersona.style_dna.tone}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-medium text-gray-700">使用默认风格</span>
                    <span className="text-xs text-gray-500 ml-2">真实自然，适合大多数场景</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-indigo-600">
              <span>{showPersonaSelector ? '收起' : '切换'}</span>
              {showPersonaSelector ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          {/* 人设选择面板 */}
          {showPersonaSelector && (
            <div className="mt-3 pt-3 border-t border-indigo-100">
              {loadingPersonas ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {/* 默认选项 */}
                  <button
                    onClick={handleClearPersona}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                      !localPersona
                        ? 'bg-white border border-indigo-300 ring-1 ring-indigo-200'
                        : 'hover:bg-white/60'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 flex-shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">默认风格</span>
                      <p className="text-xs text-gray-500">真实自然，适合大多数场景</p>
                    </div>
                  </button>

                  {/* 人设列表 */}
                  {personas.map(persona => (
                    <button
                      key={persona.id}
                      onClick={() => handleSelectPersona(persona)}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                        localPersona?.id === persona.id
                          ? 'bg-white border border-indigo-300 ring-1 ring-indigo-200'
                          : 'hover:bg-white/60'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {persona.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-700">{persona.name}</span>
                        {persona.style_dna?.tone && (
                          <span className="text-xs text-indigo-600 ml-1.5 px-1.5 py-0.5 bg-indigo-50 rounded">
                            {persona.style_dna.tone}
                          </span>
                        )}
                        {persona.role_definition && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {persona.role_definition}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 模型选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择模型
            </label>
            <div className="grid grid-cols-2 gap-2">
              {MODEL_OPTIONS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedModel === model.id
                      ? 'border-pink-500 bg-pink-50 ring-1 ring-pink-200'
                      : 'border-gray-200 hover:border-pink-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-800">{model.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{model.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 提示词输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              创作方向 <span className="text-pink-600 font-medium">（优先级最高）</span>
            </label>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="【优先级最高】输入你想要的创作方向，AI会优先按此方向创作。如：面向产品经理群体、强调节省时间的价值、从团队协作痛点切入..."
              className="w-full h-24 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400 resize-none"
              maxLength={500}
            />
            <div className="flex justify-end mt-1">
              <span className="text-xs text-gray-400">{prompt.length}/500</span>
            </div>
          </div>

          {/* 数据源展示 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              数据源 <span className="text-gray-400 font-normal">（{sources.length}个）</span>
            </label>
            <div className="bg-gray-50 rounded-lg border border-gray-100 p-3 space-y-2 max-h-32 overflow-y-auto">
              {sources.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-2">请先选择资料</p>
              ) : (
                sources.map((source, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {source.file_type === 'image' ? (
                      <Image className="w-4 h-4 text-pink-500" />
                    ) : (
                      <FileText className="w-4 h-4 text-indigo-500" />
                    )}
                    <span className="text-gray-600 truncate">{source.file_name}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 生成按钮 */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || sources.length === 0}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
              isGenerating || sources.length === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-500 to-red-500 text-white hover:shadow-lg hover:shadow-pink-500/25 active:scale-[0.98]'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                正在创作文案...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                开始创作
              </>
            )}
          </button>

          {/* 生成结果 */}
          {generatedContents.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">生成结果</h3>
              {generatedContents.map((item) => (
                <div 
                  key={item.id}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-pink-300 transition-colors"
                >
                  {/* 卡片头部 */}
                  <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-pink-50 to-red-50 border-b border-pink-100">
                    <span className="text-sm font-medium text-pink-700">
                      {item.style}
                    </span>
                    <button
                      onClick={() => handleSave(item)}
                      disabled={savedIndices.has(item.id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        savedIndices.has(item.id)
                          ? 'bg-green-100 text-green-700 cursor-default'
                          : 'bg-white text-pink-600 hover:bg-pink-100 border border-pink-200'
                      }`}
                    >
                      {savedIndices.has(item.id) ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          已保存
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          保存
                        </>
                      )}
                    </button>
                  </div>
                  {/* 卡片内容 */}
                  <div className="p-4">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">
                      {item.content}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  ), document.body);
}
