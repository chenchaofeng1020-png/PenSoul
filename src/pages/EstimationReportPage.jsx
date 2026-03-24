import { useState, useEffect, useMemo } from 'react';
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
  Users,
  Share2,
  Printer,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Building2,
  Briefcase,
  Palette,
  Code2,
  Server,
  TestTube2,
  TrendingUp,
  Calendar,
  Hash
} from 'lucide-react';
import {
  ROLE_CONFIG,
  COMPLEXITY_CONFIG,
  calculateTotalDays,
  calculateRoleTotals,
  calculateModuleTotals
} from '../utils/estimationTypes';

// 角色图标映射
const ROLE_ICONS = {
  product: Briefcase,
  ui: Palette,
  frontend: Code2,
  backend: Server,
  test: TestTube2
};

export function EstimationReportPage({ reportId: propReportId }) {
  // 优先使用 prop，否则从 URL hash 解析
  const hash = window.location.hash;
  const match = hash.match(/^#\/estimation\/(.+)$/);
  const reportId = propReportId || (match ? match[1] : null);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [expandedModules, setExpandedModules] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (reportId) {
      loadReport();
    }
  }, [reportId]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3002/api/smart/estimation/report/${reportId}`);
      if (!response.ok) {
        throw new Error('报告不存在或已过期');
      }
      const data = await response.json();
      setReport(data);
      
      // 默认展开所有模块
      const modules = [...new Set(data.results.map(r => r.module || '未分类'))];
      const expanded = {};
      modules.forEach(m => expanded[m] = true);
      setExpandedModules(expanded);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 计算统计数据
  const summary = useMemo(() => {
    if (!report) return null;
    const roleTotals = calculateRoleTotals(report.results);
    const totalDays = Object.values(roleTotals).reduce((sum, days) => sum + days, 0);
    return {
      totalFunctions: report.results.length,
      totalDays,
      roleTotals,
      moduleTotals: calculateModuleTotals(report.results)
    };
  }, [report]);

  // 按模块分组
  const groupedResults = useMemo(() => {
    if (!report) return {};
    const groups = {};
    report.results.forEach(result => {
      const module = result.module || '未分类';
      if (!groups[module]) groups[module] = [];
      groups[module].push(result);
    });
    return groups;
  }, [report]);

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
    if (!editingCell || !report) return;

    const newValue = parseFloat(editValue);
    if (isNaN(newValue) || newValue < 0) {
      setEditingCell(null);
      return;
    }

    // 更新数据
    const result = report.results.find(r => r.functionId === editingCell.resultId);
    if (result) {
      result.estimates[editingCell.role] = newValue;
      setHasChanges(true);
    }

    setEditingCell(null);
  };

  // 保存报告
  const handleSave = async () => {
    try {
      const response = await fetch(`http://localhost:3002/api/smart/estimation/report/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results: report.results,
          config: report.config
        })
      });

      if (!response.ok) throw new Error('保存失败');

      const updatedReport = await response.json();
      setReport(updatedReport);
      setHasChanges(false);
      
      // 显示成功提示
      alert('保存成功！');
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败: ' + err.message);
    }
  };

  // 导出 Markdown
  const exportMarkdown = () => {
    if (!report || !summary) return;
    
    let markdown = `# 人天评估报告\n\n`;
    markdown += `> **评估日期**: ${new Date(report.createdAt).toLocaleString()}\n\n`;
    markdown += `> **功能总数**: ${summary.totalFunctions} 个\n\n`;
    markdown += `> **总人天**: ${summary.totalDays.toFixed(1)} 天\n\n`;

    markdown += `## 📊 角色人天分布\n\n`;
    markdown += `| 角色 | 人天 | 占比 |\n`;
    markdown += `|------|------|------|\n`;
    Object.entries(summary.roleTotals).forEach(([role, days]) => {
      const percentage = summary.totalDays > 0 ? ((days / summary.totalDays) * 100).toFixed(1) : 0;
      const roleNames = { product: '产品', ui: 'UI', frontend: '前端', backend: '后端', test: '测试' };
      markdown += `| ${roleNames[role]} | ${days.toFixed(1)} | ${percentage}% |\n`;
    });
    markdown += `\n`;

    markdown += `## 📋 详细评估清单\n\n`;
    Object.entries(groupedResults).forEach(([module, items]) => {
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
    if (!report) return;
    
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

  // 分享链接
  const shareReport = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert('链接已复制到剪贴板！');
    });
  };

  // 打印报告
  const printReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Calculator className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-gray-500">加载报告中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">出错了</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (!report || !summary) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Title */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  人天评估报告
                </h1>
                <p className="text-xs text-gray-500 flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  {new Date(report.createdAt).toLocaleDateString()}
                  <span className="text-gray-300">|</span>
                  <Hash className="w-3 h-3" />
                  {reportId.slice(-8)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={shareReport}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">分享</span>
              </button>
              <button
                onClick={printReport}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">打印</span>
              </button>
              <div className="h-6 w-px bg-gray-200 mx-1" />
              <button
                onClick={exportMarkdown}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Markdown</span>
              </button>
              <button
                onClick={exportExcel}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Excel</span>
              </button>
              {hasChanges && (
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
                >
                  <Save className="w-4 h-4" />
                  <span className="text-sm font-medium">保存修改</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* 第一行：功能数量、模块数量 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-sm text-gray-500">功能数量</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{summary.totalFunctions}</div>
            <div className="text-xs text-gray-400 mt-1">个</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-orange-500" />
              </div>
              <span className="text-sm text-gray-500">模块数量</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {Object.keys(summary.moduleTotals).length}
            </div>
            <div className="text-xs text-gray-400 mt-1">个</div>
          </div>

          {/* 第二行：总人天、平均人天 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow ring-2 ring-blue-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-sm text-gray-500">总人天</span>
            </div>
            <div className="text-3xl font-bold text-blue-600">{summary.totalDays.toFixed(1)}</div>
            <div className="text-xs text-gray-400 mt-1">天</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow ring-2 ring-purple-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <span className="text-sm text-gray-500">平均人天/功能</span>
            </div>
            <div className="text-3xl font-bold text-purple-600">
              {(summary.totalDays / summary.totalFunctions).toFixed(1)}
            </div>
            <div className="text-xs text-gray-400 mt-1">天</div>
          </div>
        </div>

        {/* Role Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-400" />
            角色人天分布
          </h2>
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(ROLE_CONFIG).map(([key, role]) => {
              const days = summary.roleTotals[key];
              const percentage = summary.totalDays > 0
                ? ((days / summary.totalDays) * 100).toFixed(1)
                : 0;
              const Icon = ROLE_ICONS[key];

              return (
                <div key={key} className="text-center">
                  <div
                    className="w-16 h-16 rounded-2xl mx-auto mb-3 flex flex-col items-center justify-center transition-transform hover:scale-105"
                    style={{ backgroundColor: `${role.color}15` }}
                  >
                    <Icon className="w-6 h-6 mb-1" style={{ color: role.color }} />
                    <span className="text-lg font-bold" style={{ color: role.color }}>
                      {days.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-700">{role.label}</div>
                  <div className="text-xs text-gray-400">{percentage}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-400" />
              详细评估清单
            </h2>
            <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
              点击数字可编辑
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {Object.entries(groupedResults).map(([module, results]) => (
              <div key={module}>
                {/* Module Header */}
                <button
                  onClick={() => toggleModule(module)}
                  className="w-full px-6 py-4 bg-gray-50/50 hover:bg-gray-50 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expandedModules[module] ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="font-semibold text-gray-800">{module}</span>
                    <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                      {results.length} 个功能
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    模块小计: <strong className="text-blue-600">
                      {results.reduce((sum, r) => sum + calculateTotalDays(r), 0).toFixed(1)}
                    </strong> 天
                  </div>
                </button>

                {/* Module Content */}
                {expandedModules[module] && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50/30 text-xs text-gray-500 border-b border-gray-100">
                          <th className="px-6 py-3 text-left font-medium">功能名称</th>
                          <th className="px-4 py-3 text-center font-medium w-24">复杂度</th>
                          {Object.keys(ROLE_CONFIG).map(role => (
                            <th key={role} className="px-3 py-3 text-center font-medium w-20">
                              {ROLE_CONFIG[role].label}
                            </th>
                          ))}
                          <th className="px-4 py-3 text-center font-medium w-20">小计</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {results.map((result, idx) => (
                          <tr key={result.functionId || idx} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-medium text-gray-900">{result.functionName}</div>
                              {result.explanation && (
                                <div className="text-xs text-gray-400 mt-1 line-clamp-2">{result.explanation}</div>
                              )}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span
                                className="inline-block px-2.5 py-1 text-xs font-medium rounded-full"
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
                                <td key={role} className="px-3 py-4 text-center">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={saveEdit}
                                      onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                                      className="w-16 px-2 py-1 text-center text-sm border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                      autoFocus
                                      step="0.5"
                                      min="0"
                                    />
                                  ) : (
                                    <button
                                      onClick={() => startEdit(result.functionId, role, value)}
                                      className="px-3 py-1.5 hover:bg-blue-50 rounded-lg transition-colors text-gray-700 hover:text-blue-600 font-medium"
                                    >
                                      {value.toFixed(1)}
                                    </button>
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-4 py-4 text-center">
                              <span className="font-bold text-blue-600">
                                {calculateTotalDays(result).toFixed(1)}
                              </span>
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

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-gray-400">
          <p>由 AI 智能评估生成 · 仅供参考</p>
        </footer>
      </main>
    </div>
  );
}

export default EstimationReportPage;
