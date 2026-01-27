## 目标与范围
- 目标：基于用户输入的初始想法，由 AI 自动补全并扩展产品规划信息，覆盖产品定义、用户画像、竞争分析、功能卡片、产品介绍五大模块。
- 范围（MVP）：
  - 单输入框（支持 2,000—4,000 字符）→ 结构化 JSON 输出（含置信度与来源标注）。
  - 可视化 Diff 合并到各模块，支持逐项接受/拒绝。
  - 生成过程状态提示、失败提示与重试。

## 用户体验与交互
- 入口位置：产品规划页右上角新增“AI 产品规划助手”按钮；或在各模块顶部工具栏加入“AI 自动补全”。
- 面板布局：右侧抽屉/侧栏（不遮挡主内容），包含：
  - 输入区：多行输入框、提示词模板、示例占位；可选择生成范围（全部/某模块）。
  - 生成区：分组卡片展示建议项（产品定义/画像/竞争/功能卡片/产品介绍），每组提供“全部应用/逐项应用”。
  - 合并预览：逐字段对比（AI 建议 vs 现有值），支持应用后回滚。
- 反馈机制：
  - 进度条与阶段提示（解析→草案→结构化→校验→映射）。
  - 错误反馈统一为“生成失败”并附简要原因，提供重试与降级方案（仅生成部分模块）。

## 前端实现（与现有代码的映射）
- 容器组件：建议新增 `AiProductPlanningAssistant`（参考 `AiPositioningAssistant` 的使用方式），在 `ProductDataManager.jsx` 中挂载：
  - 产品定义（basic/wizard）：`src/components/ProductDataManager.jsx` 中 activeTab 为 wizard/basic 的区域（示例：产品定义渲染约 800–1060 行）。
  - 功能卡片：列表/编辑区域约 `1148–1242`。
  - 产品介绍（messaging）：列表/编辑区域约 `2067–2283`。
  - 用户画像（stories）：列表/编辑区域约 `2290–2355`。
  - 资料库（docs）：添加文档区域约 `3008–3087`（可用于引用来源）。
- 状态合并：利用现有 setState 与 API 写入方法（如 `addProductFeatureCard`、`addProductMessaging`、`addProductStory`、`updateProduct` 等），在“应用建议”时调用对应写入函数；采用乐观更新，失败时回滚。
- 可视化 Diff：对每个字段展示 AI 建议与当前值；数组类（功能卡片/画像/话术）逐条显示并支持“追加/替换/跳过”。

## 后端接口设计
- 新增 API：`POST /api/ai/product-planning/generate`
  - 请求体：
    - `idea` string：用户输入的想法（必填）
    - `scope` enum：`all | basic | personas | competitors | features | messaging`
    - `context` object：当前产品已有字段（可选，用于结合现状补全）
  - 响应体：结构化建议 JSON（见下文 Schema），包含 `metadata`（模型、成本、耗时、警告）。
- 可选接口：`POST /api/ai/product-planning/apply`
  - 后端统一写入并返回更新后的实体（用于保证一致性与审计）；如前端已稳定，可先前端直写现有 API。
- 技术细节：
  - 支持流式（SSE）返回，前端分阶段展示。
  - 速率限制与配额控制；加入缓存键（idea+productId+scope）。

## 模型与 Prompt 策略
- 系统提示：定义“产品规划协同助手”的角色与输出规范，要求：
  - 输出仅为 JSON；字段含义与业务边界清晰；拒绝虚构硬事实（如竞品数据准确来源说明）。
- 用户提示：对 `idea` 进行规范化，引导补齐目标用户、要解决的问题、业务场景、成功标准。
- Few-shot：为各模块提供 1–2 个优质示例（中文），提升稳定性。
- 约束：
  - 竞品信息优先基于用户已有竞品数据进行分析；若生成竞品名称，标注“待验证”。
  - 优先输出可落地的字段与卡片结构，避免长段落无结构。

## 输出 JSON Schema（示例）
```json
{
  "basic": {
    "name": "string",
    "tagline": "string",
    "positioning": "string",
    "target_audience": "string",
    "overview_short": "string",
    "industry": "string",
    "category": "string"
  },
  "personas": [
    { "who": "string", "role_tag": "string", "user_goal": "string", "max_pain": "string", "existing_solution": "string", "our_solution": "string", "is_primary": false }
  ],
  "competitors": {
    "summary": "string",
    "highlights": "string",
    "suggested_list": [ { "name": "string", "positioning": "string", "slogan": "string" } ]
  },
  "features": [
    { "name": "string", "module": "string", "launch_date": "string", "intro_source": "string", "intro_scenario": "string", "intro_problem": "string", "intro_solution": "string", "intro_effect": "string" }
  ],
  "messaging": [
    { "persona": "string", "channel": "string", "pain": "string", "anchor_message": "string" }
  ],
  "metadata": { "confidence": 0.0, "warnings": ["string"], "sources": ["string"] }
}
```
- 字段与现有前端状态/接口一一映射：
  - 产品定义：`updateProduct` 与 `formData`（name/tagline/positioning 等）。
  - 用户画像：`addProductStory`、`updateProductStory`（stories 数据结构与 UI 约 `2290–2355`）。
  - 功能卡片：`addProductFeatureCard`、`updateProductFeatureCard`（约 `1148–1242`）。
  - 话术：`addProductMessaging`、`updateProductMessaging`（约 `2067–2283`）。
  - 竞品：沿用现有 `competitors` 管理组件，先追加建议项到草稿，不直接落库。

## 写入与合并策略
- 基本信息：提供“覆盖/仅追加空字段/生成草稿描述”三种模式。
- 数组类：逐条接受/拒绝；接受后立刻调用对应写入 API 并乐观更新，失败回滚（已有逻辑可复用）。
- 冲突解决：若本地有未保存编辑，弹提示并提供合并选项；保持单一来源（前端或后端统一应用）。

## 错误处理与提示
- 统一错误：生成失败→“生成失败，请稍后重试”；写入失败→“保存失败”。
- 网络与模型错误细分：429（限流）/ 5xx（模型不可用）/ JSON 解析失败（自动重试一次）。

## 权限与安全
- 仅登录用户可用；操作记录审计（用户ID、时间、变更摘要）。
- 敏感信息过滤（避免生成或提交个人/企业机密）。

## 性能与成本控制
- 结果缓存（按 idea+scope+productId）。
- 大输入截断与摘要；分模块生成减少 token 成本。
- 前端懒加载助手组件（与现有 `lazy()` 模式一致）。

## 实施步骤（MVP → 增强）
1. 前端：新增助手面板与 UI；Scope 选择、Diff 视图、逐项应用按钮。
2. 后端：实现 `/api/ai/product-planning/generate`，返回上述 JSON；加入限流与日志。
3. 映射：将 JSON 建议映射至对应状态与 API；完成乐观更新与回滚。
4. 校验：Zod/自定义校验确保输出满足前端字段约束（长度、URL、必填）。
5. 体验：进度/错误提示统一，完善文案与示例提示词。
6. 验证：针对不同 `scope` 的端到端测试；灰度发布（特性开关）。

## 评估指标
- 生成质量：被接受比例、人工编辑量减少、覆盖字段数。
- 效率：从输入到应用的平均耗时、失败率。
- 使用率：打开率、生成次数、按模块使用频次。

## 风险与缓解
- 风险：模型幻觉导致不准的竞品/数据。
  - 措施：为竞品建议标注“待验证”，不直接落库；对定量结论加入置信度与来源；限制字段长度与结构化输出。
- 风险：合并冲突/覆盖现有内容。
  - 措施：默认仅填空；强制 Diff 确认；可回滚。

## 未来增强
- 检索增强：基于项目内资料库（docs）为模型提供上下文提取，提升准确率。
- 多轮对话：允许用户对某模块进行迭代修正（例如“再多给两个画像”）。
- 竞品外部检索：接入安全的 Web 检索并做信息来源标注（需合规评审）。
- 模型选择与成本：支持不同模型与预算策略（快/准/省）。

—— 以上为完整的产品方案草案。如确认，我将按该方案实施 MVP：新增助手面板、生成接口与 JSON 映射，并完成端到端落库与回滚。