import React, { useState } from 'react';
import { User, Brain, PenTool, Search, MessageSquare, FileText, ArrowDown, Database, Sparkles, CheckCircle2 } from 'lucide-react';

export default function AgentOrchestration() {
  const [imgError, setImgError] = useState({});

  const agents = [
    {
       id: 'user',
       name: '用户 (User)',
       role: '发起者 / 决策者',
       desc: '提供初始样文，确认选题与大纲，最终验收。',
       skills: ['提供样文 (Provide Samples)', '确认大纲 (Approve Outline)', '最终验收 (Final Review)'],
       prompt_focus: 'N/A',
       icon: User,
       avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Felix&clothing=blazerAndShirt&accessories=prescription02',
       color: 'bg-gray-800',
       borderColor: 'border-gray-200',
       outputs: [
           { target: '灵魂捕手·老 K', label: '上传样文' },
           { target: '算命先生·诸葛', label: '提出意图' }
       ]
    },
    {
       id: 'old_k',
       name: '灵魂捕手·老 K (Soul Catcher)',
       role: '认知逆向工程师',
       desc: '深沉、敏锐、像心理医生。负责从样文中提取风格 DNA。',
       skills: ['分析风格DNA (analyze_style_dna)'],
       prompt_focus: '逆向推导“认知模型”和“创作SOP”，关注结构与引用，而非表面辞藻。',
       icon: Brain,
       avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=OldK&top=shortFlat&facialHair=beardLight&clothing=blazerAndShirt&eyebrows=defaultNatural',
       color: 'bg-purple-600',
       borderColor: 'border-purple-200',
       outputs: [
           { target: '算命先生·诸葛', label: 'StyleDNA' },
           { target: '爆肝写手·大智', label: 'StyleDNA' },
           { target: '毒舌判官·包租婆', label: 'StyleDNA' }
       ]
    },
    {
       id: 'zhuge',
       name: '算命先生·诸葛 (The Strategist)',
       role: '内容战略家',
       desc: '运筹帷幄、擅长透过现象看本质。负责战略策划与选题生成。',
       skills: ['总结会话标题 (summarize_session_title)', '生成选题卡片 (generate_topic_cards)'],
       prompt_focus: 'SCQA + 蓝海画布。符合 Persona 价值观。',
       icon: Sparkles,
       avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Zhuge&top=shortRound&accessories=prescription02&clothing=collarAndSweater&eyebrows=raisedExcited',
       color: 'bg-blue-600',
       borderColor: 'border-blue-200',
       outputs: [
           { target: '爆肝写手·大智', label: 'Topic Cards (选题卡片)' }
       ]
    },
    {
       id: 'da_zhi',
       name: '爆肝写手·大智 (The Writer)',
       role: '内容创作主笔',
       desc: '听话、耐操、文笔多变。负责生成调研清单、大纲规划、分章撰写与修正。',
       skills: ['生成调研清单 (generate_research_brief)', '生成大纲 (create_outline)', '撰写章节 (write_chapter)', '修改段落 (fix_segment)'],
       prompt_focus: '严格遵循大纲与人设逻辑。Stop after each chapter.',
       icon: PenTool,
       avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=DaZhi&top=shaggyMullet&clothing=hoodie&eyes=happy&eyebrows=defaultNatural',
       color: 'bg-orange-500',
       borderColor: 'border-orange-200',
       outputs: [
           { target: '八卦狗仔·卓伟', label: 'Research Brief (调研需求)' },
           { target: '毒舌判官·包租婆', label: 'Draft (初稿)' }
       ]
    },
    {
        id: 'zhuo_wei',
        name: '八卦狗仔·卓伟 (The Paparazzo)',
        role: '情报搜集员',
        desc: '刨根问底、只信实锤、不带感情。负责深度调研。',
        skills: ['执行深度调研 (execute_research)'],
        prompt_focus: '只提供事实 (Facts)，必须附带来源 (Source URL)。',
         icon: Search,
         avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Paparazzi&accessories=sunglasses&clothing=hoodie',
         color: 'bg-green-600',
        borderColor: 'border-green-200',
        outputs: [
            { target: '爆肝写手·大智', label: 'Intelligence Report (情报)' }
        ]
    },
    {
        id: 'bao_zu_po',
        name: '毒舌判官·包租婆 (The Critic)',
        role: '审稿人',
        desc: '极其挑剔、嘴毒心善。负责审稿与质量把控。',
        skills: ['审阅文章 (review_article)'],
        prompt_focus: '毒舌批评 + 具体建议。检查禁忌词与数据来源。',
        icon: FileText,
        avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=BaoZuPo&top=bigHair&clothing=overall&accessories=round&mouth=serious',
        color: 'bg-red-600',
        borderColor: 'border-red-200',
        outputs: [
            { target: '爆肝写手·大智', label: 'Critique List (批注/返工)' },
            { target: '用户 (User)', label: 'Final Draft (定稿)' }
        ]
    }
  ];

  return (
    <div className="h-full overflow-y-auto bg-gray-50/30 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10 text-center">
           <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">MACC Agent 编排逻辑</h2>
           <p className="text-gray-500 mt-3 text-lg">Multi-Agent Content Creation System 职能分工与协作流向图</p>
        </div>
        
        <div className="relative space-y-8">
            {/* Connecting Line */}
            <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-gradient-to-b from-gray-200 via-blue-200 to-gray-200" />

            {agents.map((agent, index) => (
                <div key={agent.id} className="relative flex group">
                    {/* Icon/Avatar Node */}
                    <div className={`
                        flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg z-10
                        transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3
                        ${agent.color} overflow-hidden border-2 border-white
                    `}>
                        {agent.avatar && !imgError[agent.id] ? (
                             <img 
                                src={agent.avatar} 
                                alt={agent.name} 
                                className="w-full h-full object-cover bg-white/10" 
                                onError={() => setImgError(prev => ({ ...prev, [agent.id]: true }))}
                             />
                        ) : (
                             <agent.icon className="w-8 h-8 text-white" />
                        )}
                    </div>

                    {/* Card Content */}
                    <div className="ml-8 flex-1">
                        <div className={`
                            bg-white rounded-2xl p-6 border shadow-sm transition-all duration-300
                            hover:shadow-md hover:border-blue-300
                            ${agent.borderColor}
                        `}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        {agent.name}
                                        <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-600 border border-gray-200">
                                            {agent.role}
                                        </span>
                                    </h3>
                                    <p className="text-gray-600 mt-1 text-sm leading-relaxed">{agent.desc}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Skills */}
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        <Database className="w-3.5 h-3.5" />
                                        核心技能 (Skills)
                                    </h4>
                                    <ul className="space-y-2">
                                        {agent.skills.map((skill, idx) => (
                                            <li key={idx} className="text-sm font-mono text-blue-700 bg-blue-50/50 px-2 py-1 rounded w-fit">
                                                {skill}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Prompt Strategy */}
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        提示词策略 (Prompt Strategy)
                                    </h4>
                                    <p className="text-sm text-gray-700 leading-relaxed italic">
                                        "{agent.prompt_focus}"
                                    </p>
                                </div>
                            </div>

                            {/* Outputs / Connections */}
                            {agent.outputs && agent.outputs.length > 0 && (
                                <div className="mt-6 pt-4 border-t border-gray-100">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                                        数据流向 (Data Flow)
                                    </h4>
                                    <div className="flex flex-wrap gap-3">
                                        {agent.outputs.map((out, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
                                                <span className="font-medium text-gray-900">{out.label}</span>
                                                <ArrowDown className="w-3 h-3 text-gray-400 rotate-[-90deg]" />
                                                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {out.target}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
