# MACC Agent Skills 架构升级需求文档

## 1. 背景与目标

当前 PenSoul 系统中已存在多个角色鲜明的 Agent（如诸葛、老K、大智等），它们构成了 **MACC (Multi-Agent Content Creation)** 的核心版图。目前这些 Agent 的能力（Skills）大多隐含在 System Prompt 或硬编码在业务逻辑中，缺乏统一的管理和调度机制。

本需求旨在基于 **MACC Agent 编排逻辑**，构建一套**基于技能（Skill-based）的自动化编排系统**。核心目标是：
1.  **技能实体化**：将每个 Agent 的能力封装为独立的 Skill 对象。
2.  **自主调度**：赋予 Agent 识别意图并自主调用 Skill 的能力。
3.  **跨 Agent 协作**：实现“自己能做直接做，自己不能做摇人做”的智能路由。

---

## 2. 核心概念定义

### 2.1 Skill (技能)
Skill 是系统中最小的功能执行单元。
每个 Skill 包含以下元数据：
- **ID**: 唯一标识符 (e.g., `web_search`, `analyze_style_dna`)
- **Name**: 技能名称 (e.g., "全网搜索", "风格DNA分析")
- **Owner**: 所属 Agent (e.g., "卓伟", "老K")
- **Description**: 技能描述 (用于 LLM 理解何时调用)
- **Parameters**: 入参定义 (JSON Schema)
- **ExecutionType**: 执行类型
    - `SELF_FUNCTION`: 当前 Agent 本地执行的代码逻辑。
    - `DELEGATE_AGENT`: 需调用其他 Agent 完成的任务。

### 2.2 Orchestrator (编排器)
位于 `AgentRuntime` 中的核心逻辑层，负责：
1.  解析 LLM 输出的 Tool Call 指令。
2.  查询 Skill Registry 判断技能归属。
3.  **路由分发**：
    - 若归属自己 -> 执行本地函数。
    - 若归属他人 -> 构造 Prompt 唤起目标 Agent。

---

## 3. Agent 与 Skills 矩阵

基于 `AgentOrchestration.jsx` 中的定义，系统包含以下核心 Agent 及其专属技能：

### 3.1 灵魂捕手·老 K (Soul Catcher)
*   **角色定位**: 认知逆向工程师
*   **核心技能**:
    1.  **`analyze_style_dna` (分析风格 DNA)**
        - **描述**: 从用户提供的样文中提取语言风格、句式结构和认知模式。
        - **输入**: 样文文本 (Sample Text)
        - **输出**: Style DNA JSON 对象

### 3.2 算命先生·诸葛 (The Strategist)
*   **角色定位**: 内容战略家
*   **核心技能**:
    1.  **`summarize_session_title` (总结会话标题)**
        - **描述**: 根据当前对话内容生成简短精炼的标题。
        - **输入**: 对话历史
        - **输出**: 标题字符串
    2.  **`generate_topic_cards` (生成选题卡片)**
        - **描述**: 基于调研和分析，生成 3 个具体的选题方案卡片。
        - **输入**: 调研结论、用户意图
        - **输出**: 选题卡片列表 JSON

### 3.3 卓伟 (The Researcher)
*   **角色定位**: 全网信息调研员
*   **核心技能**:
    1.  **`web_search` (全网搜索)**
        - **描述**: 联网搜索最新信息、数据和事实。
        - **输入**: 查询关键词 (Query)
        - **输出**: 调研报告与来源链接
    2.  **`verify_fact` (事实核查)**
        - **描述**: 验证某个观点的真实性。
        - **输入**: 待核查陈述
        - **输出**: 核查结果

### 3.4 爆肝写手·大智 (The Writer)
*   **角色定位**: 内容创作主笔
*   **核心技能**:
    1.  **`generate_research_brief` (生成调研清单)**
        - **描述**: 在写作前列出需要查阅的资料清单。
    2.  **`create_outline` (生成大纲)**
        - **描述**: 根据选题和 DNA 生成文章结构大纲。
    3.  **`write_chapter` (撰写章节)**
        - **描述**: 按照大纲撰写具体章节内容。
    4.  **`fix_segment` (修改段落)**
        - **描述**: 针对特定段落进行润色或修改。

### 3.5 毒舌判官·包租婆 (The Critic)
*   **角色定位**: 内容质检官
*   **核心技能**:
    1.  **`review_chapter` (章节评审)**
        - **描述**: 对大智写好的章节进行毒舌点评，指出逻辑漏洞。
    2.  **`score_content` (内容打分)**
        - **描述**: 基于特定标准给文章打分。

---

## 4. 系统架构设计

### 4.1 数据结构 (Schema)

在数据库或配置文件中新增 `skills` 定义：

```json
[
  {
    "id": "web_search",
    "name": "全网搜索",
    "owner_agent_id": "zhuowei",
    "description": "当需要查询最新数据、新闻或事实时使用。",
    "parameters": {
      "type": "object",
      "properties": {
        "query": { "type": "string", "description": "搜索关键词" }
      }
    }
  },
  {
    "id": "analyze_style_dna",
    "name": "风格分析",
    "owner_agent_id": "old_k",
    "description": "当用户提供样文并希望模仿其风格时使用。",
    "parameters": {
      "type": "object",
      "properties": {
        "text": { "type": "string", "description": "样文内容" }
      }
    }
  }
]
```

### 4.2 运行机制 (Runtime Logic)

#### 场景 A：诸葛自己想生成选题 (Self-Call)
1.  **User**: "帮我生成几个关于 AI 的选题。"
2.  **Zhuge (LLM)**: 思考后决定调用 `generate_topic_cards`。
    - 输出: `{"tool_call": "generate_topic_cards", "args": {...}}`
3.  **Runtime**: 检测到 `generate_topic_cards` 属于 `zhuge` (自己)。
4.  **Action**: 直接执行本地逻辑（或再次 Prompt LLM 按特定格式输出），无需切换 Agent。
5.  **Result**: 返回结果给 User。

#### 场景 B：诸葛需要调研 (Cross-Agent Call)
1.  **User**: "查一下昨天 OpenAI 发布了什么。"
2.  **Zhuge (LLM)**: 思考后决定调用 `web_search`。
    - 输出: `{"tool_call": "web_search", "args": {"query": "OpenAI 昨天发布内容"}}`
3.  **Runtime**: 检测到 `web_search` 属于 `zhuowei` (他人)。
4.  **Action**: 
    - 挂起诸葛的上下文。
    - 实例化 **卓伟 (Zhuowei)** Agent。
    - 将 `query` 作为输入发送给卓伟。
5.  **Zhuowei**: 执行搜索，生成报告。
6.  **Runtime**: 将卓伟的报告作为 `Tool Output` 返回给诸葛。
7.  **Zhuge**: 消化报告，继续回答用户。

---

## 5. 交互与 UI 需求

1.  **技能注册表**: 在 Agent 设置页面，允许为每个 Agent 勾选或配置其拥有的 Skill。
2.  **执行状态可视化**:
    - 当 Agent 调用自身技能时，显示轻量级 Loading (e.g., "诸葛正在思考选题...").
    - 当 Agent 调用其他 Agent 时，显示协作状态 (e.g., "诸葛 ➡️ 委托 卓伟 进行全网搜索...").
    - 必须保留生成的中间产物（如调研报告、DNA分析报告）的可访问性。

## 6. 实施步骤

1.  **配置迁移**: 提取 `AgentOrchestration.jsx` 中的 `skills` 字段，建立统一的 `SKILLS_REGISTRY` 常量或数据库表。
2.  **Prompt 升级**: 更新所有 Agent 的 System Prompt，注入其可用的 Tool Definitions（包含自己的和其他常用 Agent 的技能）。
3.  **Runtime 改造**: 升级 `AgentRuntime.run()` 方法，支持通用的 `tool_call` 解析与路由逻辑。
4.  **测试验证**: 验证诸葛调用卓伟、老K调用大智等跨 Agent 链路。

---

**注**：本设计遵循“高内聚、低耦合”原则，Agent 仅关注“我需要什么技能”，而不需要关心“这个技能背后是谁在跑”，由 Runtime 统一处理路由。
