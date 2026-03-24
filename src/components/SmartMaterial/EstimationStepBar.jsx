import { Check } from 'lucide-react';

function getStepStatus(index, currentIndex) {
  if (index < currentIndex) return 'completed';
  if (index === currentIndex) return 'current';
  return 'upcoming';
}

export function EstimationStepBar({ steps = [], currentStep }) {
  const currentIndex = Math.max(steps.findIndex(step => step.key === currentStep), 0);

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max items-start gap-0">
        {steps.map((step, index) => {
          const status = getStepStatus(index, currentIndex);
          const isCurrent = status === 'current';
          const isCompleted = status === 'completed';

          return (
            <div key={step.key} className="flex min-w-[220px] items-start">
              <div className="flex w-full items-start gap-3">
                <div className="flex flex-col items-center pt-0.5">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                      isCompleted
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : isCurrent
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-400'
                    }`}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  {index < steps.length - 1 ? (
                    <div className="mt-2 h-10 w-px bg-slate-200 lg:hidden" />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-semibold ${
                    isCurrent || isCompleted ? 'text-slate-900' : 'text-slate-400'
                  }`}>
                    {step.title}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    {step.description}
                  </div>
                </div>
              </div>

              {index < steps.length - 1 ? (
                <div className="mx-4 mt-4 hidden h-px flex-1 bg-slate-200 lg:block" />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default EstimationStepBar;
