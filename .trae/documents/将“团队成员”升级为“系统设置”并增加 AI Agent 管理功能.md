这是一个非常有价值的功能升级！将 AI 提示词（Agents）配置化，不仅能让系统更灵活，还能让非技术人员（如产品经理或运营）直接参与到 AI 效果的调优中。您的想法非常靠谱，我为您细化了以下实施方案：

### 核心设计思路：配置化 + 热更新

目前的提示词都硬编码在 `server/index.cjs` 中。我们要做的就是将它们提取出来，存入数据库，并提供一个管理界面。

### 1. 数据库设计 (Schema Design)
我们需要两张新表来存储 Agent 配置：

*   **`agents` 表**: 定义 Agent 的元数据。
    *   `id`: 唯一标识 (如 `idea_mentor`, `topic_generator`) - *关键：用字符串 ID 方便代码引用*
    *   `name`: 显示名称 (如 "创业导师", "选题策划")
    *   `description`: 描述 (如 "负责在创意孵化阶段提供指导")
    *   `system_prompt`: **核心字段**，存储当前的系统提示词
    *   `model_config`: JSON 字段，存储模型参数 (如 `{ "temperature": 0.7, "model": "gpt-4" }`)
    *   `is_active`: 开关状态
    *   `updated_at`: 更新时间

*   **`agent_versions` 表 (可选后续迭代)**: 用于版本控制，记录每次修改的历史，方便回滚。本次先做 MVP，只用单表。

### 2. 路由与菜单重构 (Frontend)
*   **重命名菜单**: 将侧边栏的“团队成员”改为“设置”。
*   **设置子模块**:
    *   **团队管理**: 原有的团队成员功能迁移至此。
    *   **Agent 管理**: 新增模块，展示所有可用 Agent 卡片。

### 3. Agent 管理功能 (Frontend - New Page)
*   **列表页**: 展示系统中的 6 个核心 Agent（创业导师、内容分析师、产品经理、增长黑客、战略专家、通用顾问）。
*   **编辑抽屉**: 点击 Agent 卡片，弹出一个侧边栏（Drawer）：
    *   左侧：Prompt 编辑区（支持 Markdown 高亮）。
    *   右侧（高级）：模型参数配置（Temperature, Max Tokens）。
    *   **调试功能 (Playground)**: 最重要的功能。允许用户在修改 Prompt 后，直接在当前窗口输入一段测试文本，实时查看该 Prompt 的输出效果，确认无误后再保存。

### 4. 后端改造 (Backend Refactor)
*   **Prompt 加载机制**:
    *   启动时：从数据库加载所有 Agent 配置到内存缓存 (`agentCache`)。
    *   运行时：代码中不再使用硬编码的 `const SYSTEM_PROMPT = ...`，而是调用 `getAgentPrompt('idea_mentor')`。
    *   更新时：提供 `PUT /api/agents/:id` 接口，更新数据库并刷新内存缓存，实现**热更新**（无需重启服务）。
*   **初始化脚本**: 编写一个迁移脚本，将目前 `server/index.cjs` 中硬编码的 6 个 Prompt 写入数据库作为初始数据。

### 5. 实施步骤
1.  **数据库准备**: 创建 `agents` 表并插入初始数据。
2.  **后端 API**: 实现 `GET /api/agents` 和 `PUT /api/agents/:id`。
3.  **后端替换**: 修改 `server/index.cjs`，将硬编码 Prompt 替换为动态获取逻辑。
4.  **前端重构**: 修改 Sidebar，新建 `SettingsPage`，集成 `TeamMemberPage` 和新的 `AgentManager`。

您觉得这个细化方案如何？如果没问题，我们可以先从**数据库迁移**和**后端改造**开始。
