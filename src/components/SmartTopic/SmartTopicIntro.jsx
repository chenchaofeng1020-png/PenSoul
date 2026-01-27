import React from 'react';
import { X, ArrowRight, Target, Flame, User, MessageSquare, Database, Globe, Layers, Zap, Heart, List, FlaskConical, Search, Shuffle, CheckCircle2, AlertCircle } from 'lucide-react';

const SmartTopicIntro = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-[90%] max-w-6xl h-[90%] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all z-20 backdrop-blur-md"
        >
          <X size={24} />
        </button>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto hover-scrollbar">
          
          {/* Hero Section */}
          <div className="relative bg-gradient-to-br from-indigo-900 via-blue-800 to-sky-700 text-white p-12 overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>
            
            <div className="relative z-10 max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-sm font-medium mb-6 border border-white/20">
                <FlaskConical className="w-4 h-4 mr-2 text-sky-300" />
                智能选题系统 v1.0
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                拒绝“灵感乍现”，<br/>打造可复制的爆款选题系统
              </h1>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed mb-8">
                成熟写手和新手的最大区别在于：<br/>
                <span className="text-sky-300 font-semibold">新手找“自己想写的”，老手找“用户想看的”与“自己能写的”交集。</span>
              </p>
            </div>
          </div>

          <div className="max-w-5xl mx-auto p-8 md:p-12 space-y-20">
            
            {/* Part 1: Core Logic */}
            <section>
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-800 mb-4 flex items-center justify-center">
                  <span className="w-8 h-8 rounded-full bg-blue-600 text-white text-lg font-bold flex items-center justify-center mr-3">1</span>
                  核心逻辑：选题的“三叶草”模型
                </h2>
                <p className="text-gray-500 max-w-2xl mx-auto">
                  一个好的选题通常位于以下三个圈的交汇处。
                  <br/>
                  <strong className="text-indigo-600">黄金法则：选题 = 高频痛点 + 独特视角 + 情绪价值</strong>
                </p>
              </div>

              <div className="flex flex-col md:flex-row justify-center items-center gap-6 relative py-4">
                {/* Circle 1 */}
                <div className="w-60 h-60 rounded-full bg-rose-50 border-4 border-rose-100 flex flex-col items-center justify-center text-center p-6 mix-blend-multiply md:-mr-10 hover:z-10 transition-all hover:scale-105">
                  <Target size={32} className="text-rose-500 mb-2" />
                  <h3 className="font-bold text-gray-800 text-lg">用户痛点 (需求)</h3>
                  <p className="text-xs text-gray-500 mt-2">最焦虑、最困惑的问题<br/>"不得不解决的问题"</p>
                </div>

                {/* Circle 2 */}
                <div className="w-60 h-60 rounded-full bg-blue-50 border-4 border-blue-100 flex flex-col items-center justify-center text-center p-6 mix-blend-multiply md:-mt-24 z-10 hover:scale-105 transition-transform">
                  <Flame size={32} className="text-blue-500 mb-2" />
                  <h3 className="font-bold text-gray-800 text-lg">热点趋势 (流量)</h3>
                  <p className="text-xs text-gray-500 mt-2">当下大众正在讨论什么<br/>借势、蹭流量</p>
                </div>

                {/* Circle 3 */}
                <div className="w-60 h-60 rounded-full bg-purple-50 border-4 border-purple-100 flex flex-col items-center justify-center text-center p-6 mix-blend-multiply md:-ml-10 hover:z-10 transition-all hover:scale-105">
                  <User size={32} className="text-purple-500 mb-2" />
                  <h3 className="font-bold text-gray-800 text-lg">自身优势 (人设)</h3>
                  <p className="text-xs text-gray-500 mt-2">我擅长什么？<br/>避免同质化</p>
                </div>
              </div>
            </section>

            {/* Part 2: Sources */}
            <section className="bg-slate-50 rounded-3xl p-8 md:p-10">
              <h2 className="text-2xl font-bold text-gray-800 mb-8 flex items-center">
                <span className="w-8 h-8 rounded-full bg-indigo-600 text-white text-lg font-bold flex items-center justify-center mr-3">2</span>
                实操渠道：从哪里“挖”出好选题？
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start space-x-4">
                  <div className="p-3 bg-green-100 rounded-lg text-green-600 shrink-0"><MessageSquare size={20} /></div>
                  <div>
                    <h3 className="font-bold text-gray-800">从“用户反馈”中来</h3>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">用户的嘴里藏着最真实的选题。翻看评论区的高频提问、激烈争论，或私信中重复出现的问题。</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start space-x-4">
                  <div className="p-3 bg-orange-100 rounded-lg text-orange-600 shrink-0"><Database size={20} /></div>
                  <div>
                    <h3 className="font-bold text-gray-800">从“爆款库”中来</h3>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">不要重新发明轮子。收集同领域爆款，拆解其逻辑，进行微创新（如提出相反观点、切得更细）。</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start space-x-4">
                  <div className="p-3 bg-blue-100 rounded-lg text-blue-600 shrink-0"><Search size={20} /></div>
                  <div>
                    <h3 className="font-bold text-gray-800">从“数据工具”中来</h3>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">利用热搜榜（微博、知乎、头条）。如果是写情感、职场、社会评论，热榜是必争之地。</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start space-x-4">
                  <div className="p-3 bg-purple-100 rounded-lg text-purple-600 shrink-0"><Shuffle size={20} /></div>
                  <div>
                    <h3 className="font-bold text-gray-800">从“跨界降维”中来</h3>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">跨平台搬运（抖音段子转图文）或跨行业借鉴（用产品思维写婚姻经营），视角耳目一新。</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Part 3: Deep Processing (Angle Lab) */}
            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="w-8 h-8 rounded-full bg-indigo-600 text-white text-lg font-bold flex items-center justify-center mr-3">3</span>
                深度加工：如何把普通话题变成“神选题”？
              </h2>
              <p className="text-gray-600 mb-8 ml-11">
                找到话题只是第一步，<strong className="text-indigo-600">切入角度 (Angle)</strong> 才是决胜关键。看看同一个话题（以“早起”为例），经过不同模式加工后的效果：
              </p>

              <div className="overflow-hidden border border-gray-200 rounded-xl shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-4 w-1/4">切入角度</th>
                      <th className="p-4 w-1/3">说明</th>
                      <th className="p-4">示例（以“早起”为例）</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="hover:bg-purple-50/30 transition-colors">
                      <td className="p-4 font-bold text-purple-700 flex items-center"><Zap size={16} className="mr-2"/> 反常识/反直觉</td>
                      <td className="p-4 text-gray-600">提出与大众认知相反的观点，制造冲突。</td>
                      <td className="p-4 font-medium text-gray-800">《为什么我建议你不要盲目坚持早起？》</td>
                    </tr>
                    <tr className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-4 font-bold text-blue-700 flex items-center"><Target size={16} className="mr-2"/> 极致细分/场景化</td>
                      <td className="p-4 text-gray-600">缩小范围，针对特定人群或场景。</td>
                      <td className="p-4 font-medium text-gray-800">《30岁职场宝妈，如何利用早起这1小时逆袭？》</td>
                    </tr>
                    <tr className="hover:bg-green-50/30 transition-colors">
                      <td className="p-4 font-bold text-green-700 flex items-center"><List size={16} className="mr-2"/> 盘点/清单体</td>
                      <td className="p-4 text-gray-600">提供高密度的信息增量，收藏率高。</td>
                      <td className="p-4 font-medium text-gray-800">《坚持早起3年，我总结了这5个神级高效习惯》</td>
                    </tr>
                    <tr className="hover:bg-pink-50/30 transition-colors">
                      <td className="p-4 font-bold text-pink-700 flex items-center"><Heart size={16} className="mr-2"/> 情绪共鸣</td>
                      <td className="p-4 text-gray-600">侧重情感宣泄或抚慰，引发传播。</td>
                      <td className="p-4 font-medium text-gray-800">《那个坚持早起的年轻人，终于累垮了》</td>
                    </tr>
                    <tr className="hover:bg-orange-50/30 transition-colors">
                      <td className="p-4 font-bold text-orange-700 flex items-center"><Flame size={16} className="mr-2"/> 借势/蹭热点</td>
                      <td className="p-4 text-gray-600">强行关联当下最火的人或事。</td>
                      <td className="p-4 font-medium text-gray-800">《看了库克的时间表，我才懂早起的残酷真相》</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Part 4: Validation */}
            <section className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-3xl p-8 md:p-10 border border-indigo-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="w-8 h-8 rounded-full bg-indigo-600 text-white text-lg font-bold flex items-center justify-center mr-3">4</span>
                选题验证：发布前的“灵魂三问”
              </h2>
              <p className="text-gray-600 mb-8">
                在确定选题动笔之前，请强制自己回答三个问题，如果答案是否定的，<span className="text-red-500 font-bold">直接毙掉</span>：
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-indigo-500">
                  <div className="font-bold text-lg text-gray-800 mb-2 flex items-center">
                    <Globe className="w-5 h-5 mr-2 text-indigo-500"/> 覆盖面够宽吗？
                  </div>
                  <p className="text-sm text-gray-600">受众基数大不大？太冷门的话题很难爆。</p>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-indigo-500">
                  <div className="font-bold text-lg text-gray-800 mb-2 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2 text-indigo-500"/> 痛点够痛吗？
                  </div>
                  <p className="text-sm text-gray-600">是“痒点”还是“不得不解决的问题”？越痛越好。</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-indigo-500">
                  <div className="font-bold text-lg text-gray-800 mb-2 flex items-center">
                    <CheckCircle2 className="w-5 h-5 mr-2 text-indigo-500"/> 能写出新意吗？
                  </div>
                  <p className="text-sm text-gray-600">如果只是把百度的东西抄一遍，就不要写了。必须有增量信息。</p>
                </div>
              </div>
            </section>

          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end items-center shrink-0">
          <button 
            onClick={onClose}
            className="w-full md:w-auto px-10 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center hover:-translate-y-0.5 active:translate-y-0"
          >
            开始实操
            <ArrowRight className="ml-2 w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmartTopicIntro;
