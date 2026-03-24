import { FileClock, RotateCcw, Sparkles } from 'lucide-react';

export function DraftChoiceStep({ draftMeta, onContinue, onRestart }) {
  const savedAtText = draftMeta?.savedAt
    ? new Date(draftMeta.savedAt).toLocaleString()
    : '刚刚';

  return (
    <div className="h-full flex items-center justify-center p-8 bg-slate-50/50">
      <div className="w-full max-w-2xl bg-white border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden">
        
        {/* Header Area */}
        <div className="bg-indigo-50/50 border-b border-indigo-100/50 px-8 py-6 flex items-center gap-5">
           <div className="w-14 h-14 rounded-full bg-white border border-indigo-100 flex items-center justify-center flex-shrink-0 shadow-sm text-indigo-600">
            <FileClock className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">发现未完成的评估草稿</h3>
            <div className="mt-1.5 flex items-center gap-2 text-sm text-slate-500">
               <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
               最近自动保存：{savedAtText}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-8 py-8">
           <p className="text-[15px] text-slate-600 leading-relaxed mb-8">
             系统检测到您上次的评估进度已保存。您可以选择继续在原草稿上完善，或者放弃旧数据，基于当前选中的资料重新开始。
           </p>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={onContinue}
              className="group relative flex flex-col text-left rounded-xl border-2 border-indigo-100 bg-indigo-50/30 p-5 transition-all duration-200 hover:border-indigo-400 hover:bg-indigo-50/80 hover:shadow-md"
            >
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <span className="text-base font-bold text-indigo-900">继续旧草稿</span>
              </div>
              <p className="text-[13px] text-indigo-700/70 leading-relaxed">
                保留已有的评估结果和修改记录。
              </p>
            </button>

            <button
              onClick={onRestart}
              className="group relative flex flex-col text-left rounded-xl border-2 border-slate-200 bg-white p-5 transition-all duration-200 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md"
            >
              <div className="flex items-center gap-3 mb-2">
                <RotateCcw className="w-5 h-5 text-slate-600" />
                <span className="text-base font-bold text-slate-800">重新开始</span>
              </div>
              <p className="text-[13px] text-slate-500 leading-relaxed">
                清除旧数据，重新解析当前资料。
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DraftChoiceStep;
