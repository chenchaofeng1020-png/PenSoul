/**
 * 人天评估功能类型定义
 */

// 评估模式
export const EstimationMode = {
  AUTO: 'auto',       // 全自动AI评估（原有模式）
  MANUAL_AI: 'manual_ai'  // 人工+AI混合评估（新模式）
};

// 项目类型
export const ProjectType = {
  NEW_BUILD: 'new_build',
  SECONDARY_DEV: 'secondary_dev',
  HYBRID: 'hybrid'
};

// 交付口径
export const DeliveryCaliber = {
  INTERNAL: 'internal',
  VENDOR: 'vendor',
  MVP: 'mvp'
};

export const EstimationUnitType = {
  PAGE_FLOW: 'page_flow',
  MODULE: 'module',
  BACKEND: 'backend_capability',
  INTEGRATION: 'integration',
  CONFIG: 'configuration'
};

export const DeliveryType = {
  NEW_BUILD: 'new_build',
  DIRECT_REUSE: 'direct_reuse',
  CONFIG_CUSTOMIZATION: 'config_customization',
  SECONDARY_DEVELOPMENT: 'secondary_development'
};

export const ReuseLevel = {
  R0: 'r0',
  R1: 'r1',
  R2: 'r2',
  R3: 'r3',
  R4: 'r4'
};

export const DiffType = {
  COPYWRITING: 'copywriting',
  FIELD: 'field',
  CONFIG: 'config',
  PROCESS: 'process',
  PERMISSION: 'permission',
  DATA: 'data',
  INTEGRATION: 'integration',
  PAGE: 'page',
  MIGRATION: 'migration',
  COMPATIBILITY: 'compatibility'
};

export const FulfillmentLevel = {
  FULLY_MET: 'fully_met',
  BASICALLY_MET: 'basically_met',
  PARTIALLY_MET: 'partially_met',
  CUSTOM_REQUIRED: 'custom_required'
};

// 功能项（扩展支持人工+AI混合评估）
export const FunctionItem = {
  id: '',
  name: '',
  description: '',
  module: '',
  
  // 用户补充的背景信息（简化为单个文本字段）
  userContext: '',
  
  // 评估模式: 'manual' | 'ai' | 'hybrid'
  estimationMode: 'manual',
  
  // 最终评估结果
  estimates: {
    product: 0,
    ui: 0,
    frontend: 0,
    backend: 0,
    test: 0
  },
  
  // AI评估详情
  aiEstimation: {
    estimates: {
      product: 0,
      ui: 0,
      frontend: 0,
      backend: 0,
      test: 0
    },
    complexity: 'simple',
    // 各角色评估说明
    roleExplanations: {
      product: '',
      ui: '',
      frontend: '',
      backend: '',
      test: ''
    },
    confidence: 0.8
  },
  
  // 状态: 'pending' | 'evaluated' | 'confirmed'
  status: 'pending',
  evaluatedAt: null,
  confirmedAt: null
};

// 人天评估结果
export const EstimationResult = {
  functionId: '',
  functionName: '',
  module: '',
  complexity: 'simple', // 'simple' | 'medium' | 'complex'
  estimates: {
    product: 0,
    ui: 0,
    frontend: 0,
    backend: 0,
    test: 0
  },
  explanation: ''
};

// 评估配置
export const EstimationConfig = {
  roles: ['product', 'ui', 'frontend', 'backend', 'test'],
  level: 'middle', // 'junior' | 'middle' | 'senior'
  batchSize: 5,
  customPrompt: ''
};

// 评估报告
export const EstimationReport = {
  id: '',
  productId: '',
  createdAt: '',
  config: EstimationConfig,
  results: [],
  summary: {
    totalFunctions: 0,
    totalDays: 0,
    roleTotals: {
      product: 0,
      ui: 0,
      frontend: 0,
      backend: 0,
      test: 0
    },
    moduleTotals: {}
  }
};

// 评估任务状态
export const EstimationTaskStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ERROR: 'error'
};

// 评估向导状态（人工+AI模式）
export const WizardState = {
  DRAFT_CHOICE: 'draft_choice', // 选择草稿或重新开始
  IMPORT: 'import',           // 导入功能清单
  PARSE: 'parse',             // 解析中
  OVERVIEW: 'overview',       // AI整体理解
  SCOPE: 'scope',             // 评估口径确认
  UNIT_CONFIRM: 'unit_confirm', // 交付项确认
  EVALUATION: 'evaluation',   // 评估主界面
  EVALUATING: 'evaluating',   // AI评估中
  REVIEW: 'review',           // 汇总审核
  COMPLETED: 'completed'      // 完成
};

// 评估任务
export const EstimationTask = {
  id: '',
  productId: '',
  status: EstimationTaskStatus.PENDING,
  config: EstimationConfig,
  functions: [],
  results: [],
  currentBatch: 0,
  totalBatches: 0,
  progress: 0,
  error: null,
  createdAt: '',
  updatedAt: ''
};

// 角色配置
export const ROLE_CONFIG = {
  product: {
    key: 'product',
    label: '产品',
    color: '#3B82F6',
    icon: 'ClipboardList'
  },
  ui: {
    key: 'ui',
    label: 'UI',
    color: '#8B5CF6',
    icon: 'Palette'
  },
  frontend: {
    key: 'frontend',
    label: '前端',
    color: '#10B981',
    icon: 'Code'
  },
  backend: {
    key: 'backend',
    label: '后端',
    color: '#F59E0B',
    icon: 'Server'
  },
  test: {
    key: 'test',
    label: '测试',
    color: '#EF4444',
    icon: 'CheckCircle'
  }
};

// 复杂度配置
export const COMPLEXITY_CONFIG = {
  simple: {
    key: 'simple',
    label: '简单',
    color: '#10B981',
    bgColor: '#D1FAE5'
  },
  medium: {
    key: 'medium',
    label: '中等',
    color: '#F59E0B',
    bgColor: '#FEF3C7'
  },
  complex: {
    key: 'complex',
    label: '复杂',
    color: '#EF4444',
    bgColor: '#FEE2E2'
  }
};

// 人员水平配置
export const LEVEL_CONFIG = {
  junior: {
    key: 'junior',
    label: '初级',
    multiplier: 1.3
  },
  middle: {
    key: 'middle',
    label: '中级',
    multiplier: 1.0
  },
  senior: {
    key: 'senior',
    label: '高级',
    multiplier: 0.7
  }
};

export const PROJECT_TYPE_OPTIONS = [
  { key: ProjectType.NEW_BUILD, label: '新建项目', description: '从 0 到 1 搭建，默认按完整开发口径评估' },
  { key: ProjectType.SECONDARY_DEV, label: '二开项目', description: '基于已有功能进行配置、改造或二次开发' },
  { key: ProjectType.HYBRID, label: '混合项目', description: '部分新建、部分复用，适合版本迭代或平台增强' }
];

export const DELIVERY_CALIBER_OPTIONS = [
  { key: DeliveryCaliber.INTERNAL, label: '内部研发口径', description: '偏研发视角，适合内部排期和资源评估' },
  { key: DeliveryCaliber.VENDOR, label: '乙方交付口径', description: '包含沟通、联调、上线与交付缓冲，更保守' },
  { key: DeliveryCaliber.MVP, label: 'MVP压缩口径', description: '优先压缩范围，帮助快速形成最小可交付版本' }
];

export const DELIVERY_TYPE_OPTIONS = [
  { key: DeliveryType.NEW_BUILD, label: '新建开发', description: '没有可复用能力，按完整开发评估' },
  { key: DeliveryType.DIRECT_REUSE, label: '直接复用', description: '已有功能基本满足，仅做确认、验证或轻微调整' },
  { key: DeliveryType.CONFIG_CUSTOMIZATION, label: '配置型二开', description: '主要通过规则、模板、权限、参数配置完成交付' },
  { key: DeliveryType.SECONDARY_DEVELOPMENT, label: '改造型二开', description: '基于已有能力做局部开发、流程改造或兼容处理' }
];

export const REUSE_LEVEL_OPTIONS = [
  { key: ReuseLevel.R0, label: 'R0 完全新建', ratioLabel: '约 100% 新开发', ratioRange: [0.9, 1] },
  { key: ReuseLevel.R1, label: 'R1 高度复用', ratioLabel: '约 20%-40% 新开发', ratioRange: [0.2, 0.4] },
  { key: ReuseLevel.R2, label: 'R2 中度复用', ratioLabel: '约 40%-70% 新开发', ratioRange: [0.4, 0.7] },
  { key: ReuseLevel.R3, label: 'R3 低度复用', ratioLabel: '约 70%-90% 新开发', ratioRange: [0.7, 0.9] },
  { key: ReuseLevel.R4, label: 'R4 伪复用', ratioLabel: '名义二开，实质接近新建', ratioRange: [0.9, 1] }
];

export const FULFILLMENT_OPTIONS = [
  {
    key: FulfillmentLevel.FULLY_MET,
    label: '完全满足',
    description: '已有功能基本可直接使用，仅需确认和少量适配。',
    deliveryType: DeliveryType.DIRECT_REUSE,
    reuseLevel: ReuseLevel.R1,
    hasExistingCapability: true,
    ratioLabel: '建议按少量补充和验证工作量评估'
  },
  {
    key: FulfillmentLevel.BASICALLY_MET,
    label: '基本满足',
    description: '已有能力主体可用，需要少量配置、文案或规则调整。',
    deliveryType: DeliveryType.CONFIG_CUSTOMIZATION,
    reuseLevel: ReuseLevel.R2,
    hasExistingCapability: true,
    ratioLabel: '建议按轻量二开和回归成本评估'
  },
  {
    key: FulfillmentLevel.PARTIALLY_MET,
    label: '部分满足',
    description: '已有能力只能覆盖一部分，需要较明显的改造或补充开发。',
    deliveryType: DeliveryType.SECONDARY_DEVELOPMENT,
    reuseLevel: ReuseLevel.R3,
    hasExistingCapability: true,
    ratioLabel: '建议按中等二开和回归成本评估'
  },
  {
    key: FulfillmentLevel.CUSTOM_REQUIRED,
    label: '需要定制',
    description: '现有能力无法支撑，建议按定制开发为主进行评估。',
    deliveryType: DeliveryType.NEW_BUILD,
    reuseLevel: ReuseLevel.R0,
    hasExistingCapability: false,
    ratioLabel: '建议按完整定制开发口径评估'
  }
];

export const DIFF_TYPE_OPTIONS = [
  { key: DiffType.COPYWRITING, label: '文案/展示差异' },
  { key: DiffType.FIELD, label: '字段差异' },
  { key: DiffType.CONFIG, label: '配置规则差异' },
  { key: DiffType.PROCESS, label: '流程差异' },
  { key: DiffType.PERMISSION, label: '权限差异' },
  { key: DiffType.DATA, label: '数据结构差异' },
  { key: DiffType.INTEGRATION, label: '接口/第三方差异' },
  { key: DiffType.PAGE, label: '页面结构差异' },
  { key: DiffType.MIGRATION, label: '历史数据迁移' },
  { key: DiffType.COMPATIBILITY, label: '现网兼容影响' }
];

export const DEFAULT_SCOPE_CONFIG = {
  projectType: ProjectType.HYBRID,
  deliveryCaliber: DeliveryCaliber.VENDOR,
  teamLevel: 'middle',
  includeProduct: true,
  includeUI: true,
  includeFrontend: true,
  includeBackend: true,
  includeQA: true,
  includeIntegration: true,
  includeLaunch: true,
  includeProjectManagement: true,
  includeTraining: false,
  includeBuffer: true
};

export const DEFAULT_REUSE_ASSESSMENT = {
  deliveryType: DeliveryType.NEW_BUILD,
  reuseLevel: ReuseLevel.R0,
  reuseSource: '',
  diffTypes: [],
  hasExistingCapability: false,
  hasCompatibilityImpact: false,
  needsRegression: false,
  needsMigration: false,
  notes: ''
};

export const UNIT_TYPE_OPTIONS = [
  { key: EstimationUnitType.PAGE_FLOW, label: '页面/流程型' },
  { key: EstimationUnitType.MODULE, label: '模块型' },
  { key: EstimationUnitType.BACKEND, label: '后台能力型' },
  { key: EstimationUnitType.INTEGRATION, label: '集成型' },
  { key: EstimationUnitType.CONFIG, label: '配置型' }
];

// 默认分批大小选项
export const BATCH_SIZE_OPTIONS = [3, 5, 10, 15, 20];

// 计算总人天
export function calculateTotalDays(result) {
  if (!result || !result.estimates) return 0;
  return Object.values(result.estimates).reduce((sum, days) => sum + days, 0);
}

// 计算角色总计
export function calculateRoleTotals(results) {
  const totals = {
    product: 0,
    ui: 0,
    frontend: 0,
    backend: 0,
    test: 0
  };

  results.forEach(result => {
    if (result.estimates) {
      Object.keys(totals).forEach(role => {
        totals[role] += result.estimates[role] || 0;
      });
    }
  });

  return totals;
}

// 计算模块总计
export function calculateModuleTotals(results) {
  const totals = {};

  results.forEach(result => {
    const module = result.module || '未分类';
    if (!totals[module]) {
      totals[module] = {
        count: 0,
        days: 0
      };
    }
    totals[module].count += 1;
    totals[module].days += calculateTotalDays(result);
  });

  return totals;
}

// 生成报告摘要
export function generateReportSummary(results) {
  const totalFunctions = results.length;
  const roleTotals = calculateRoleTotals(results);
  const moduleTotals = calculateModuleTotals(results);
  const totalDays = Object.values(roleTotals).reduce((sum, days) => sum + days, 0);

  return {
    totalFunctions,
    totalDays,
    roleTotals,
    moduleTotals
  };
}

// 本地存储键名
export const ESTIMATION_DRAFT_KEY = 'estimation_draft';

// 创建新的功能项
export function createFunctionItem(data = {}) {
  return {
    id: data.id || `func_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: data.name || '',
    description: data.description || '',
    module: data.module || '未分类',
    sourceFunctions: data.sourceFunctions || [],
    unitType: data.unitType || EstimationUnitType.MODULE,
    suggestedReason: data.suggestedReason || '',
    reuseHint: data.reuseHint || '',
    riskHints: data.riskHints || [],
    reuseAssessment: createReuseAssessment(data.reuseAssessment || {}),
    userContext: '',
    estimationMode: 'manual',
    estimates: {
      product: 0,
      ui: 0,
      frontend: 0,
      backend: 0,
      test: 0
    },
    aiEstimation: null, // 默认无AI评估结果，评估后才设置
    status: 'pending',
    evaluatedAt: null,
    confirmedAt: null
  };
}

export function createEstimationUnit(data = {}) {
  return {
    id: data.id || `unit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: data.name || '未命名交付项',
    module: data.module || '未分类',
    type: data.type || EstimationUnitType.MODULE,
    suggestedReason: data.suggestedReason || '',
    riskHints: data.riskHints || [],
    reuseHint: data.reuseHint || '',
    reuseAssessment: createReuseAssessment(data.reuseAssessment || {}),
    sourceFunctionIds: data.sourceFunctionIds || []
  };
}

export function createReuseAssessment(data = {}) {
  return {
    ...DEFAULT_REUSE_ASSESSMENT,
    ...data,
    diffTypes: Array.isArray(data.diffTypes) ? data.diffTypes : DEFAULT_REUSE_ASSESSMENT.diffTypes
  };
}

export function getFulfillmentOption(reuseAssessment = DEFAULT_REUSE_ASSESSMENT) {
  const assessment = createReuseAssessment(reuseAssessment);

  if (assessment.reuseLevel === ReuseLevel.R4) {
    return FULFILLMENT_OPTIONS[FULFILLMENT_OPTIONS.length - 1];
  }

  const matchedByReuseLevel = FULFILLMENT_OPTIONS.find(option => option.reuseLevel === assessment.reuseLevel);
  if (matchedByReuseLevel) {
    return matchedByReuseLevel;
  }

  const matchedByDeliveryType = FULFILLMENT_OPTIONS.find(option => option.deliveryType === assessment.deliveryType);
  return matchedByDeliveryType || FULFILLMENT_OPTIONS[FULFILLMENT_OPTIONS.length - 1];
}

export function applyFulfillmentSelection(level, reuseAssessment = DEFAULT_REUSE_ASSESSMENT) {
  const selected = FULFILLMENT_OPTIONS.find(option => option.key === level) || FULFILLMENT_OPTIONS[FULFILLMENT_OPTIONS.length - 1];
  const current = createReuseAssessment(reuseAssessment);

  return {
    ...DEFAULT_REUSE_ASSESSMENT,
    notes: current.notes || '',
    deliveryType: selected.deliveryType,
    reuseLevel: selected.reuseLevel,
    hasExistingCapability: selected.hasExistingCapability
  };
}

function inferReuseDefaults(unit = {}, scopeConfig = DEFAULT_SCOPE_CONFIG) {
  const combinedText = `${unit.name || ''} ${unit.reuseHint || ''} ${unit.suggestedReason || ''}`;
  const scopeProjectType = scopeConfig?.projectType;
  const looksReuse = /(复用|沿用|已有|二开|改造|兼容)/.test(combinedText);
  const looksConfig = /(配置|参数|模板|规则|权限)/.test(`${unit.name || ''} ${unit.type || ''}`);

  if (looksReuse || scopeProjectType === ProjectType.SECONDARY_DEV) {
    if (looksConfig) {
      return {
        hasExistingCapability: true,
        deliveryType: DeliveryType.CONFIG_CUSTOMIZATION,
        reuseLevel: ReuseLevel.R1,
        diffTypes: [DiffType.CONFIG]
      };
    }

    return {
      hasExistingCapability: true,
      deliveryType: DeliveryType.SECONDARY_DEVELOPMENT,
      reuseLevel: ReuseLevel.R2,
      diffTypes: []
    };
  }

  return DEFAULT_REUSE_ASSESSMENT;
}

function inferUnitTypeFromName(name = '') {
  const text = String(name || '');
  if (/(对接|同步|集成|接口|回调|企微|银行|支付|短信|邮件)/.test(text)) return EstimationUnitType.INTEGRATION;
  if (/(配置|规则|策略|模板|参数|权限)/.test(text)) return EstimationUnitType.CONFIG;
  if (/(任务|队列|服务|引擎|归档|计算|处理|调度)/.test(text)) return EstimationUnitType.BACKEND;
  if (/(页面|列表|详情|表单|工作台|画像|弹窗|抽屉|看板|流程)/.test(text)) return EstimationUnitType.PAGE_FLOW;
  return EstimationUnitType.MODULE;
}

function stripActionWords(name = '') {
  const stripped = String(name || '')
    .replace(/[【】[\]()（）]/g, '')
    .replace(/(新增|新建|创建|编辑|修改|删除|查看|查询|管理|配置|设置|同步|导入|导出|维护|展示|操作|详情|列表|功能|模块)/g, '')
    .replace(/\s+/g, '')
    .trim();

  return stripped || String(name || '').trim();
}

function buildUnitSeed(functionItem = {}) {
  const normalizedName = stripActionWords(functionItem.name);
  const module = functionItem.module || '未分类';
  const seedKey = `${module}::${normalizedName.slice(0, 8) || functionItem.name}`;
  return {
    seedKey,
    normalizedName,
    module
  };
}

function buildUnitRiskHints(functions = []) {
  const text = functions.map(item => `${item.name} ${item.description || ''}`).join(' ');
  const risks = [];

  if (/(权限|角色|鉴权|状态|流转|审批)/.test(text)) {
    risks.push('涉及权限或状态流转，评估时注意联调和回归成本');
  }
  if (/(同步|对接|集成|接口|企微|银行|支付|短信|邮件)/.test(text)) {
    risks.push('涉及外部集成或接口协作，需重点关注联调和问题排查');
  }
  if (functions.length >= 4) {
    risks.push('单元内包含较多来源功能，建议确认是否需要进一步拆分');
  }

  return risks;
}

export function suggestEstimationUnits(parsedFunctions = []) {
  const grouped = new Map();

  parsedFunctions.forEach(functionItem => {
    const { seedKey, normalizedName, module } = buildUnitSeed(functionItem);
    if (!grouped.has(seedKey)) {
      grouped.set(seedKey, {
        module,
        normalizedName,
        items: []
      });
    }
    grouped.get(seedKey).items.push(functionItem);
  });

  const units = [];
  const assignments = {};

  grouped.forEach(group => {
    const firstItem = group.items[0];
    const baseName = group.normalizedName.length >= 2 ? group.normalizedName : firstItem.name;
    const unitName = group.items.length === 1 ? firstItem.name : `${baseName}交付项`;
    const unit = createEstimationUnit({
      name: unitName,
      module: group.module,
      type: inferUnitTypeFromName(unitName),
      suggestedReason: group.items.length === 1
        ? '当前资料中该能力相对独立，先保留为单独交付项'
        : '这些功能共享同一主题或交付边界，建议合并为同一交付项评估，减少功能点拆分导致的低估',
      riskHints: buildUnitRiskHints(group.items),
      reuseHint: /(复用|沿用|已有|二开|改造|兼容)/.test(group.items.map(item => `${item.name} ${item.description || ''}`).join(' '))
        ? '疑似已有能力二开，建议确认复用比例和回归范围'
        : '',
      reuseAssessment: /(复用|沿用|已有|二开|改造|兼容)/.test(group.items.map(item => `${item.name} ${item.description || ''}`).join(' '))
        ? {
          hasExistingCapability: true,
          deliveryType: DeliveryType.SECONDARY_DEVELOPMENT,
          reuseLevel: ReuseLevel.R2
        }
        : DEFAULT_REUSE_ASSESSMENT,
      sourceFunctionIds: group.items.map(item => item.id)
    });

    units.push(unit);
    group.items.forEach(item => {
      assignments[item.id] = unit.id;
    });
  });

  return {
    units,
    assignments
  };
}

export function buildLocalOverallSummary(parsedFunctions = [], units = []) {
  const modules = Array.from(new Set(parsedFunctions.map(item => item.module || '未分类'))).slice(0, 4);
  const unitTypes = units.map(unit => unit.type);
  const integrationCount = unitTypes.filter(type => type === EstimationUnitType.INTEGRATION).length;
  const configCount = unitTypes.filter(type => type === EstimationUnitType.CONFIG).length;
  const reuseCount = units.filter(unit => /复用|二开|已有|改造|兼容/.test(`${unit.reuseHint || ''} ${unit.suggestedReason || ''}`)).length;

  return {
    overview: `本次需求主要围绕 ${modules.length > 0 ? modules.join('、') : '核心业务处理'} 等业务域展开，建议按交付边界而不是零散功能点进行打包评估。`,
    businessDomains: modules.length > 0 ? modules : ['核心业务处理'],
    mergeLogic: [
      '共享同一业务对象、同一流程链路或同一交付边界的需求，建议合并到同一交付项评估',
      integrationCount > 0
        ? '涉及外部集成或多端协同的需求，拆散评估容易低估联调和回归成本'
        : '同一模块下但分别写在不同端的需求，通常更适合按完整交付包评估'
    ],
    riskFocus: [
      integrationCount > 0 ? '存在多端或外部集成需求，需重点关注联调、回归和兼容影响' : '',
      configCount > 0 ? '配置、规则、权限类需求容易被低估，需确认是否涉及逻辑改造' : '',
      reuseCount > 0 ? '疑似存在二开 / 复用场景，需确认复用比例和回归范围' : ''
    ].filter(Boolean).slice(0, 3),
    reviewFocus: [
      '重点确认哪些需求应该合并为同一交付项，而不是按端或按页面拆散评估',
      '重点确认哪些需求属于配置 / 二开 / 复用，避免按全新开发或纯配置误判',
      '重点确认是否遗漏了权限、联调、测试回归、上线支持等交付成本'
    ]
  };
}

export function convertUnitsToFunctionItems(units = [], parsedFunctions = [], assignments = {}, scopeConfig = DEFAULT_SCOPE_CONFIG) {
  return units
    .map(unit => {
      const members = parsedFunctions.filter(item => assignments[item.id] === unit.id);
      if (members.length === 0) return null;
      const inferredReuse = inferReuseDefaults(unit, scopeConfig);

      const descriptionLines = members.map(item => {
        const detail = item.description ? `：${item.description}` : '';
        return `- ${item.name}${detail}`;
      });

      return createFunctionItem({
        id: unit.id,
        name: unit.name,
        description: descriptionLines.join('\n'),
        module: unit.module,
        unitType: unit.type,
        suggestedReason: unit.suggestedReason,
        reuseHint: unit.reuseHint,
        riskHints: unit.riskHints,
        reuseAssessment: createReuseAssessment(unit.reuseAssessment || inferredReuse),
        sourceFunctions: members.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          module: item.module
        }))
      });
    })
    .filter(Boolean);
}

export function getReuseSummary(reuseAssessment = DEFAULT_REUSE_ASSESSMENT) {
  const assessment = createReuseAssessment(reuseAssessment);
  const fulfillment = getFulfillmentOption(assessment);
  const deliveryTypeLabel = DELIVERY_TYPE_OPTIONS.find(option => option.key === assessment.deliveryType)?.label || '新建开发';
  const reuseLevelLabel = fulfillment.label;
  const ratioLabel = fulfillment.ratioLabel;
  const diffLabels = DIFF_TYPE_OPTIONS
    .filter(option => assessment.diffTypes.includes(option.key))
    .map(option => option.label);

  return {
    fulfillmentKey: fulfillment.key,
    fulfillmentLabel: fulfillment.label,
    fulfillmentDescription: fulfillment.description,
    deliveryTypeLabel,
    reuseLevelLabel,
    ratioLabel,
    diffLabels
  };
}

export function calculateReuseBreakdown(results = []) {
  return results.reduce((acc, item) => {
    const subtotal = calculateTotalDays(item);
    const deliveryType = item.reuseAssessment?.deliveryType || DeliveryType.NEW_BUILD;
    const reuseLevel = item.reuseAssessment?.reuseLevel || ReuseLevel.R0;

    if (deliveryType === DeliveryType.NEW_BUILD) {
      acc.newBuildDays += subtotal;
      acc.newBuildCount += 1;
    } else {
      acc.reuseDays += subtotal;
      acc.reuseCount += 1;
    }

    acc.byReuseLevel[reuseLevel] = (acc.byReuseLevel[reuseLevel] || 0) + subtotal;
    return acc;
  }, {
    newBuildDays: 0,
    newBuildCount: 0,
    reuseDays: 0,
    reuseCount: 0,
    byReuseLevel: {}
  });
}

export function createScopeConfig(data = {}) {
  return {
    ...DEFAULT_SCOPE_CONFIG,
    ...data
  };
}

export function getScopeSummary(scopeConfig = DEFAULT_SCOPE_CONFIG) {
  const scope = createScopeConfig(scopeConfig);
  const projectTypeLabel = PROJECT_TYPE_OPTIONS.find(option => option.key === scope.projectType)?.label || '混合项目';
  const caliberLabel = DELIVERY_CALIBER_OPTIONS.find(option => option.key === scope.deliveryCaliber)?.label || '乙方交付口径';
  const includedItems = [];

  if (scope.includeProduct) includedItems.push('产品方案');
  if (scope.includeUI) includedItems.push('UI设计');
  if (scope.includeFrontend) includedItems.push('前端开发');
  if (scope.includeBackend) includedItems.push('后端开发');
  if (scope.includeQA) includedItems.push('测试回归');
  if (scope.includeIntegration) includedItems.push('联调集成');
  if (scope.includeLaunch) includedItems.push('上线支持');
  if (scope.includeProjectManagement) includedItems.push('项目沟通');
  if (scope.includeTraining) includedItems.push('培训交接');
  if (scope.includeBuffer) includedItems.push('风险缓冲');

  return {
    projectTypeLabel,
    caliberLabel,
    includedItems,
    teamLevelLabel: LEVEL_CONFIG[scope.teamLevel]?.label || '中级'
  };
}

// 保存评估草稿到 localStorage
export function saveEstimationDraft(draft) {
  try {
    localStorage.setItem(ESTIMATION_DRAFT_KEY, JSON.stringify({
      ...draft,
      savedAt: new Date().toISOString()
    }));
    return true;
  } catch (e) {
    console.error('保存评估草稿失败:', e);
    return false;
  }
}

// 从 localStorage 读取评估草稿
export function loadEstimationDraft() {
  try {
    const draft = localStorage.getItem(ESTIMATION_DRAFT_KEY);
    return draft ? JSON.parse(draft) : null;
  } catch (e) {
    console.error('读取评估草稿失败:', e);
    return null;
  }
}

// 清除评估草稿
export function clearEstimationDraft() {
  try {
    localStorage.removeItem(ESTIMATION_DRAFT_KEY);
    return true;
  } catch (e) {
    console.error('清除评估草稿失败:', e);
    return false;
  }
}

// 计算评估进度
export function calculateEvaluationProgress(functions) {
  const total = functions.length;
  const evaluated = functions.filter(f => f.status === 'evaluated' || f.status === 'confirmed').length;
  const confirmed = functions.filter(f => f.status === 'confirmed').length;
  
  return {
    total,
    evaluated,
    confirmed,
    pending: total - evaluated,
    percentage: total > 0 ? Math.round((confirmed / total) * 100) : 0
  };
}

export default {
  EstimationMode,
  FunctionItem,
  EstimationResult,
  EstimationConfig,
  EstimationReport,
  EstimationTask,
  EstimationTaskStatus,
  WizardState,
  ROLE_CONFIG,
  COMPLEXITY_CONFIG,
  LEVEL_CONFIG,
  BATCH_SIZE_OPTIONS,
  ProjectType,
  DeliveryCaliber,
  PROJECT_TYPE_OPTIONS,
  DELIVERY_CALIBER_OPTIONS,
  DEFAULT_SCOPE_CONFIG,
  EstimationUnitType,
  DeliveryType,
  ReuseLevel,
  DiffType,
  FulfillmentLevel,
  UNIT_TYPE_OPTIONS,
  DELIVERY_TYPE_OPTIONS,
  REUSE_LEVEL_OPTIONS,
  FULFILLMENT_OPTIONS,
  DIFF_TYPE_OPTIONS,
  ESTIMATION_DRAFT_KEY,
  calculateTotalDays,
  calculateRoleTotals,
  calculateModuleTotals,
  generateReportSummary,
  createFunctionItem,
  createEstimationUnit,
  createReuseAssessment,
  getFulfillmentOption,
  applyFulfillmentSelection,
  createScopeConfig,
  suggestEstimationUnits,
  buildLocalOverallSummary,
  convertUnitsToFunctionItems,
  getScopeSummary,
  getReuseSummary,
  calculateReuseBreakdown,
  saveEstimationDraft,
  loadEstimationDraft,
  clearEstimationDraft,
  calculateEvaluationProgress
};
