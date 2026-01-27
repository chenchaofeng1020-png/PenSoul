# 开发计划：AI 智能选题助手 (Phase 1)

基于 `PRD_AI_Topic_Generator.md`，我们将开发任务拆解为以下 4 个阶段。目标是在本轮迭代中完成核心的“AI 选题生成”与“入库”闭环。

## Phase 1: 后端基础与 API 代理 (Backend & API Proxy)
**目标**：建立与火山引擎的安全通信通道，封装 Prompt 逻辑。

1.  **环境配置**
    - [ ] 申请/配置火山引擎 API Key (Volcengine Ark)。
    - [ ] 在 `.env` 中添加 `VOLCENGINE_API_KEY`, `VOLCENGINE_MODEL` 等变量。

2.  **API 路由开发 (`/api/ai/suggest-topics`)**
    - [ ] 创建后端 API 路由处理前端请求。
    - [ ] **Prompt 构建器**：实现 `buildTopicPrompt(context, preferences)` 函数，将前端传入的产品规划数据（画像、消息、功能等）转化为结构化 Prompt。
    - [ ] **火山引擎调用**：封装 `callVolcengineArk` 函数，处理请求发送、超时控制与错误重试。
    - [ ] **结果解析与校验**：确保返回 JSON 格式，并校验字段完整性（`title`, `outline`, `platform` 等）。

## Phase 2: 前端组件与交互 (Frontend UI/UX)
**目标**：提供直观的配置面板与结果展示。

1.  **入口与状态管理**
    - [ ] 在 `ContentPlanningManager.jsx` (或对应父组件) 顶部添加“✨ AI 灵感选题”按钮。
    - [ ] 创建 `AiTopicGenerator` 组件，管理配置状态（平台、受众、发散度等）与生成结果状态。

2.  **配置抽屉/模态框**
    - [ ] 实现配置表单：
        - 数据源选择（Checkbox Group）。
        - 创意发散度滑块/选择器（Temperature 控制）。
        - 目标平台与形式（Select/Tag）。
        - 自定义关键词输入框。

3.  **结果展示卡片**
    - [ ] 设计并实现 `TopicCard` 组件：
        - 展示标题、角度、平台标签、大纲预览。
        - 操作按钮：编辑（微调）、采纳（入库）、删除。
    - [ ] 实现骨架屏 (Skeleton) 或 Loading 状态，优化等待体验。

## Phase 3: 业务逻辑集成 (Business Logic Integration)
**目标**：打通从“规划数据”到“内容日历”的数据流。

1.  **上下文提取**
    - [ ] 在前端（或后端）实现 `extractProductContext` 工具函数，从 `productData` 中提取画像、竞品、功能卡片等关键信息，作为 API 请求的 Payload。

2.  **一键入库**
    - [ ] 在 `TopicCard` 上实现“采纳”逻辑。
    - [ ] 调用 `createContentItem` API，将 AI 生成的 `title`, `platform`, `outline` (存入 `body` 或 `meta_data`) 写入 Supabase。
    - [ ] 自动刷新内容日历，显示新添加的计划。

## Phase 4: 优化与测试 (Refinement & QA)
**目标**：确保生成质量与系统稳定性。

1.  **Prompt 调优**
    - [ ] 测试不同 Temperature 下的生成效果，确保“不呆板”。
    - [ ] 验证“反直觉”、“情绪共鸣”等指令的生效情况。

2.  **边界情况处理**
    - [ ] 处理上下文缺失（如无画像数据）时的默认行为。
    - [ ] 处理 API 超时或限流的错误提示。

3.  **UI 细节优化**
    - [ ] 增加 Markdown 渲染支持（针对大纲）。
    - [ ] 移动端适配检查。

---

**下一步行动建议**：
我们将从 **Phase 1 (后端 API)** 开始，优先打通 AI 调用链路。请确认是否已有火山引擎的 API Key，或者我先使用 Mock 数据进行开发？
