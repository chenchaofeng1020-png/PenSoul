import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calculator, X } from 'lucide-react';

export function EstimationWorkspaceDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  sourceLabel,
  headerContent,
  children,
  widthClass = 'w-[min(78vw,1320px)]'
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';

      const handleEsc = (event) => {
        if (event.key === 'Escape') {
          onClose();
        }
      };

      window.addEventListener('keydown', handleEsc);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleEsc);
      };
    }

    const timer = setTimeout(() => setIsVisible(false), 250);
    document.body.style.overflow = 'unset';
    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!isVisible && !isOpen) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex justify-end">
      <button
        type="button"
        aria-label="关闭人天评估"
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        className={`relative h-full ${widthClass} max-w-full bg-slate-50 shadow-2xl ring-1 ring-slate-200/50 transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col overflow-hidden">
          <div className="border-b border-slate-200/60 bg-white/80 px-6 py-3 backdrop-blur-xl z-20">
            <div className="flex items-center justify-between gap-6">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm shadow-blue-200/50">
                  <Calculator className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <h2 className="truncate text-lg font-bold tracking-tight text-slate-800">
                      {title}
                    </h2>
                    {sourceLabel ? (
                      <span
                        className="max-w-[420px] truncate rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200/50"
                        title={sourceLabel}
                      >
                        {sourceLabel}
                      </span>
                    ) : null}
                  </div>
                  {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
                </div>
              </div>

              {headerContent ? (
                <div className="min-w-0 flex-1">
                  {headerContent}
                </div>
              ) : null}

              <button
                onClick={onClose}
                className="group rounded-xl p-2 bg-white border border-slate-200/60 shadow-sm transition-all hover:bg-slate-50 hover:shadow hover:scale-105 active:scale-95"
              >
                <X className="h-4 w-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden bg-white">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default EstimationWorkspaceDrawer;
