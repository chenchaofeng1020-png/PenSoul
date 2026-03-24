import { useState, useMemo } from 'react';
import {
  Calculator,
  Download,
  Edit2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  BarChart3,
  PieChart,
  Clock,
  Users
} from 'lucide-react';
import {
  ROLE_CONFIG,
  COMPLEXITY_CONFIG,
  calculateTotalDays,
  calculateRoleTotals,
  calculateModuleTotals
} from '../../utils/estimationTypes';

export function EstimationReport({ report, onClose, onSave, embedded = false }) {
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [expandedModules, setExpandedModules] = useState(() => {
    // 默认展开所有模块
    const modules = [...new Set(report.results.map(r => r.module || '未分类'))];
    const expanded = {};
    modules.forEach(m => expanded[m] = true);
    return expanded;
  });

  // 计算统计数据
  const summary = useMemo(() => {
    return {
      totalFunctions: report.results.length,
      totalDays: calculateTotalDays(report.results),
      roleTotals: calculateRoleTotals(report.results),
      moduleTotals: calculateModuleTotals(report.results)
    };
  }, [report.results]);

  // 按模块分组
  const groupedResults = useMemo(() => {
    const groups = {};
    report.results.forEach(result => {
      const module = result.module || '未分类';
      if (!groups[module]) groups[module] = [];
      groups[module].push(result);
    });
    return groups;
  }, [report.results]);

  // 切换模块展开
  const toggleModule = (module) => {
    setExpandedModules(prev => ({
      ...prev,
      [module]: !prev[module]
    }));
  };

  // 开始编辑单元格
  const startEdit = (resultId, role, value) => {
    setEditingCell({ resultId, role });
    setEditValue(value.toString());
  };

  // 保存编辑
  const saveEdit = () => {
    if (!editingCell) return;

    const newValue = parseFloat(editValue);
    if (isNaN(newValue) || newValue < 0) {
      setEditingCell(null);
      return;
    }

    // 更新数据
    const result = report.results.find(r => r.functionId === editingCell.resultId);
    if (result) {
      result.estimates[editingCell.role] = newValue;
    }

    setEditingCell(null);
  };

  // 导出 Markdown
  const exportMarkdown = () => {
    const markdown = generateMarkdownReport(report, summary);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `人天评估报告_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 导出 Excel
  const exportExcel = () => {
    // 简化的 CSV 导出
    const headers = ['功能名称', '模块', '复杂度', '产品', 'UI', '前端', '后端', '测试', '小计'];
    const rows = report.results.map(r => [
      r.functionName,
      r.module,
      COMPLEXITY_CONFIG[r.complexity]?.label || r.complexity,
      r.estimates.product,
      r.estimates.ui,
      r.estimates.frontend,
      r.estimates.backend,
      r.estimates.test,
      calculateTotalDays(r)
    ]);

    const csv = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `人天评估报告_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const content = (
    <div className={`${embedded ? 'h-full flex flex-col' : 'bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Calculator className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">人天评估报告</h2>
              <p className="text-sm text-gray-500">
                {report.productId} · {new Date(report.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportMarkdown}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4" />
              导出 Markdown
            </button>
            <button
              onClick={exportExcel}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              导出 Excel
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <BarChart3 className="w-4 h-4" />
                <span className="text-xs font-medium">总人天</span>
              </div>
              <div className="text-2xl font-bold text-gray-800">{summary.totalDays.toFixed(1)}</div>
              <div className="text-xs text-gray-500">天</div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <PieChart className="w-4 h-4" />
                <span className="text-xs font-medium">功能数量</span>
              </div>
              <div className="text-2xl font-bold text-gray-800">{summary.totalFunctions}</div>
              <div className="text-xs text-gray-500">个</div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
              <div className="flex items-center gap-2 text-purple-600 mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-medium">平均人天/功能</span>
              </div>
              <div className="text-2xl font-bold text-gray-800">
                {(summary.totalDays / summary.totalFunctions).toFixed(1)}
              </div>
              <div className="text-xs text-gray-500">天</div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4">
              <div className="flex items-center gap-2 text-orange-600 mb-2">
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium">模块数量</span>
              </div>
              <div className="text-2xl font-bold text-gray-800">
                {Object.keys(summary.moduleTotals).length}
              </div>
              <div className="text-xs text-gray-500">个</div>
            </div>
          </div>

          {/* Role Distribution */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">角色人天分布</h3>
            <div className="grid grid-cols-5 gap-4">
              {Object.entries(ROLE_CONFIG).map(([key, role]) => {
                const days = summary.roleTotals[key];
                const percentage = summary.totalDays > 0
                  ? ((days / summary.totalDays) * 100).toFixed(1)
                  : 0;

                return (
                  <div key={key} className="text-center">
                    <div
                      className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center"
                      style={{ backgroundColor: `${role.color}20` }}
                    >
                      <span className="text-lg font-bold" style={{ color: role.color }}>
                        {days.toFixed(1)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">{role.label}</div>
                    <div className="text-xs text-gray-400">{percentage}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed List */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">详细评估清单</h3>
              <span className="text-xs text-gray-500">点击数字可编辑</span>
            </div>

            <div className="divide-y divide-gray-100">
              {Object.entries(groupedResults).map(([module, results]) => (
                <div key={module}>
                  {/* Module Header */}
                  <button
                    onClick={() => toggleModule(module)}
                    className="w-full px-6 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {expandedModules[module] ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="font-medium text-gray-700">{module}</span>
                      <span className="text-xs text-gray-500">({results.length} 个功能)</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      小计: <strong>{results.reduce((sum, r) => sum + calculateTotalDays(r), 0).toFixed(1)}</strong> 天
                    </div>
                  </button>

                  {/* Module Content */}
                  {expandedModules[module] && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50/50 text-xs text-gray-500">
                            <th className="px-4 py-2 text-left">功能名称</th>
                            <th className="px-4 py-2 text-center w-20">复杂度</th>
                            {Object.keys(ROLE_CONFIG).map(role => (
                              <th key={role} className="px-4 py-2 text-center w-16">
                                {ROLE_CONFIG[role].label}
                              </th>
                            ))}
                            <th className="px-4 py-2 text-center w-16">小计</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {results.map((result, idx) => (
                            <tr key={result.functionId || idx} className="border-t border-gray-50 hover:bg-gray-50/50">
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-800">{result.functionName}</div>
                                {result.explanation && (
                                  <div className="text-xs text-gray-400 mt-0.5">{result.explanation}</div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className="inline-block px-2 py-0.5 text-xs rounded-full"
                                  style={{
                                    backgroundColor: COMPLEXITY_CONFIG[result.complexity]?.bgColor || '#f3f4f6',
                                    color: COMPLEXITY_CONFIG[result.complexity]?.color || '#6b7280'
                                  }}
                                >
                                  {COMPLEXITY_CONFIG[result.complexity]?.label || result.complexity}
                                </span>
                              </td>
                              {Object.keys(ROLE_CONFIG).map(role => {
                                const isEditing = editingCell?.resultId === result.functionId && editingCell?.role === role;
                                const value = result.estimates[role];

                                return (
                                  <td key={role} className="px-4 py-3 text-center">
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={saveEdit}
                                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                                        className="w-14 px-1 py-0.5 text-center text-sm border border-blue-500 rounded focus:outline-none"
                                        autoFocus
                                        step="0.5"
                                        min="0"
                                      />
                                    ) : (
                                      <button
                                        onClick={() => startEdit(result.functionId, role, value)}
                                        className="px-2 py-1 hover:bg-blue-50 rounded transition-colors"
                                      >
                                        {value.toFixed(1)}
                                      </button>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="px-4 py-3 text-center font-medium text-blue-600">
                                {calculateTotalDays(result).toFixed(1)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            关闭
          </button>
          {onSave && (
            <button
              onClick={() => onSave(report)}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              保存到交付列表
            </button>
          )}
        </div>
      </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      {content}
    </div>
  );
}

// 生成 Markdown 报告
function generateMarkdownReport(report, summary) {
  let markdown = `# 人天评估报告\n\n`;
  markdown += `**评估日期**: ${new Date(report.createdAt).toLocaleString()}\n\n`;
  markdown += `**功能总数**: ${summary.totalFunctions} 个\n\n`;
  markdown += `**总人天**: ${summary.totalDays.toFixed(1)} 天\n\n`;

  markdown += `## 角色人天分布\n\n`;
  markdown += `| 角色 | 人天 | 占比 |\n`;
  markdown += `|------|------|------|\n`;
  Object.entries(summary.roleTotals).forEach(([role, days]) => {
    const percentage = summary.totalDays > 0
      ? ((days / summary.totalDays) * 100).toFixed(1)
      : 0;
    const roleNames = { product: '产品', ui: 'UI', frontend: '前端', backend: '后端', test: '测试' };
    markdown += `| ${roleNames[role]} | ${days.toFixed(1)} | ${percentage}% |\n`;
  });
  markdown += `\n`;

  markdown += `## 详细评估清单\n\n`;

  // 按模块分组
  const moduleGroups = {};
  report.results.forEach(result => {
    const module = result.module || '未分类';
    if (!moduleGroups[module]) moduleGroups[module] = [];
    moduleGroups[module].push(result);
  });

  Object.entries(moduleGroups).forEach(([module, items]) => {
    markdown += `### ${module}\n\n`;
    markdown += `| 功能 | 复杂度 | 产品 | UI | 前端 | 后端 | 测试 | 小计 |\n`;
    markdown += `|------|--------|------|-----|------|------|------|------|\n`;

    items.forEach(item => {
      const subtotal = calculateTotalDays(item);
      const complexityLabels = { simple: '简单', medium: '中等', complex: '复杂' };
      markdown += `| ${item.functionName} | ${complexityLabels[item.complexity] || item.complexity} | `;
      markdown += `${item.estimates.product} | ${item.estimates.ui} | `;
      markdown += `${item.estimates.frontend} | ${item.estimates.backend} | `;
      markdown += `${item.estimates.test} | ${subtotal.toFixed(1)} |\n`;
    });

    const moduleTotal = items.reduce((sum, item) => sum + calculateTotalDays(item), 0);
    markdown += `| **模块小计** | | | | | | | **${moduleTotal.toFixed(1)}** |\n\n`;
  });

  return markdown;
}

export default EstimationReport;
