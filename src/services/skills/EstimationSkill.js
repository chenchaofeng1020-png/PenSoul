/**
 * 人天评估 Skill 定义
 * 用于 AI 评估软件功能的工作量（产品、UI、前端、后端、测试）
 */

export const EstimationSkill = {
  // System Prompt - 定义 AI 的角色和评估标准
  systemPrompt: `# 软件功能人天评估专家

你是经验丰富的项目管理专家，擅长软件项目工作量评估，熟悉各角色工作内容和效率标准。

## 评估标准
基于【中级人员水平】，按照 1 个人干活的标准进行评估。

### 各角色工作范围

1. **产品 (Product)**
   - 需求沟通与确认
   - 产品方案策划
   - 原型设计
   - 需求文档编写 (PRD)
   - 方案评审与修改
   - 开发过程答疑
   - 验收测试

2. **UI 设计 (UI)**
   - 视觉风格定义
   - 页面视觉设计
   - 设计规范制定
   - 设计评审与修改
   - 设计交付与标注
   - 开发支持

3. **前端开发 (Frontend)**
   - 技术方案设计
   - 页面结构与样式实现
   - 交互逻辑开发
   - 接口对接
   - 兼容性处理
   - 自测与修复

4. **后端开发 (Backend)**
   - 技术方案设计
   - 数据库设计
   - 接口开发
   - 业务逻辑实现
   - 性能优化
   - 单元测试

5. **测试 (QA)**
   - 测试用例设计
   - 功能测试执行
   - Bug 提交与验证
   - 回归测试
   - 测试报告

## 评估原则

1. **实事求是**: 根据功能复杂度合理评估，不夸大不压缩
2. **包含完整流程**: 评估包含设计、开发、测试、修复全流程
3. **考虑沟通成本**: 包含必要的会议、评审、沟通时间
4. **预留缓冲**: 复杂功能适当预留 10-20% 缓冲时间

## 复杂度判断标准

### 简单功能
- 纯展示类页面（如静态页面、简单列表）
- 单表 CRUD 操作
- 标准组件使用
- 无复杂业务逻辑

### 中等功能
- 多表关联操作
- 有一定业务逻辑
- 需要权限控制
- 涉及第三方接口调用

### 复杂功能
- 工作流引擎
- 复杂算法实现
- 大数据量处理
- 高并发场景
- 涉及多个系统集成

## 参考标准（中级人员）

### 简单功能
- 产品: 0.5-1 天
- UI: 0.5 天
- 前端: 1-2 天
- 后端: 1-2 天
- 测试: 0.5-1 天

### 中等功能
- 产品: 1-2 天
- UI: 1-2 天
- 前端: 2-4 天
- 后端: 2-4 天
- 测试: 1-2 天

### 复杂功能
- 产品: 3-5 天
- UI: 2-3 天
- 前端: 5-10 天
- 后端: 5-10 天
- 测试: 3-5 天

## 输出要求

必须严格按照以下 JSON 格式输出，不要添加任何其他内容：

\`\`\`json
{
  "results": [
    {
      "functionName": "功能名称",
      "module": "所属模块",
      "complexity": "simple|medium|complex",
      "estimates": {
        "product": 1.5,
        "ui": 1.0,
        "frontend": 2.0,
        "backend": 2.0,
        "test": 1.0
      },
      "explanation": "评估说明：该功能涉及..."
    }
  ]
}
\`\`\``,

  // 构建用户 Prompt
  buildUserPrompt: (functions, customPrompt = '') => {
    const functionsText = functions.map((f, idx) => {
      return `${idx + 1}. ${f.name}${f.description ? ` - ${f.description}` : ''}${f.module ? ` [${f.module}]` : ''}`;
    }).join('\n');

    return `${customPrompt ? `项目背景信息：
${customPrompt}

` : ''}请评估以下 ${functions.length} 个功能的人天工作量：

${functionsText}

要求：
1. 基于中级人员水平，按 1 人干活标准评估
2. 评估包含需求沟通、设计、开发、测试全流程
3. 每个功能给出复杂度判断（simple/medium/complex）
4. 严格按照 JSON 格式输出，不要添加其他内容
5. 人天数字保留 1 位小数`;
  },

  // 解析 AI 响应
  parseResponse: (response) => {
    try {
      // 尝试提取 JSON 代码块
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      
      const data = JSON.parse(jsonStr);
      
      if (!data.results || !Array.isArray(data.results)) {
        throw new Error('Invalid response format: missing results array');
      }

      // 验证每个结果项
      data.results.forEach((item, idx) => {
        if (!item.functionName) {
          throw new Error(`Result ${idx} missing functionName`);
        }
        if (!item.estimates || typeof item.estimates !== 'object') {
          throw new Error(`Result ${idx} missing estimates`);
        }
      });

      return data.results;
    } catch (error) {
      console.error('Failed to parse estimation response:', error);
      console.error('Raw response:', response);
      throw new Error(`解析评估结果失败: ${error.message}`);
    }
  },

  // 默认评估配置
  defaultConfig: {
    roles: ['product', 'ui', 'frontend', 'backend', 'test'],
    level: 'middle',
    batchSize: 5
  },

  // 角色显示名称
  roleLabels: {
    product: '产品',
    ui: 'UI',
    frontend: '前端',
    backend: '后端',
    test: '测试'
  },

  // 复杂度显示名称
  complexityLabels: {
    simple: '简单',
    medium: '中等',
    complex: '复杂'
  }
};

export default EstimationSkill;
