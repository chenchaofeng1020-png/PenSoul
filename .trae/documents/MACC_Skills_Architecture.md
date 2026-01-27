# MACC Agent Skills 架构升级需求文档

## 1. 背景与目标

当前 PenSoul 系统中已存在多个角色鲜明的 Agent（如诸葛、老K、大智等），它们构成了 **MACC (Multi-Agent Content Creation)** 的核心版图。目前这些 Agent 的能力（Skills）大多隐含在 System Prompt 或硬编码在业务逻辑中，缺乏统一的管理和调度机制。

本需求旨在基于 `AgentOrchestration.jsx` 中定义的 **MACC Agent 编排逻辑**，构建一套**基于技能（Skill-based）的自动化编排系统**。

**核心目标：**
1.  **技能实体化**：将每个 Agent 的能力封装为独立的 Skill 对象。
2.  **自主调度**：赋予 Agent 识别意图并自主调用 Skill 的能力。
3.  **智能协作**：实现“自己能做直接做，自己不能做摇人做”的智能路由机制。

---

## 2. 核心概念定义

### 2.1 Skill (技能)
Skill 是系统中最小的功能执行单元。每个 Skill 包含以下元数据：
- **ID**: 唯一标识符 (e.g., `web_search`, `analyze_style_dna`)
- **Name**: 技能名称 (e.g., "全网搜索", "风格DNA分析")
- **Owner**: 所属 Agent (e.g., `zhuo_wei`, `old_k`)
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
    - **Self-Call (本我调用)**: 若归属自己 -> 执行本地函数，无需切换上下文。
    - **Cross-Agent Call (跨体调用)**: 若归属他人 -> 构造 Prompt 唤起目标 Agent，并将当前上下文作为输入传递。

---

## 3. Agent 与 Skills 矩阵

基于 `AgentOrchestration.jsx` 的定义，系统包含以下核心 Agent 及其专属技能：

### 3.1 灵魂捕手·老 K (old_k)
*   **角色定位**: 认知逆向工程师
*   **核心技能**:
    1.  **`analyze_style_dna` (分析风格 DNA)**
        - **描述**: 从用户提供的样文中提取语言风格、句式结构和认知模式。
        - **输入**: `sample_text` (样文内容)
        - **输出**: Style DNA JSON 对象

### 3.2 算命先生·诸葛 (zhuge)
*   **角色定位**: 内容战略家
*   **核心技能**:
    1.  **`summarize_session_title` (总结会话标题)**
        - **描述**: 根据当前对话内容生成简短精炼的标题。
        - **输入**: `chat_history`
        - **输出**: 标题字符串
    2.  **`generate_topic_cards` (生成选题卡片)**
        - **描述**: 基于调研和分析，生成 3 个具体的选题方案卡片。
        - **输入**: `research_summary`, `user_intent`
        - **输出**: 选题卡片列表 JSON

### 3.3 爆肝写手·大智 (da_zhi)
*   **角色定位**: 内容创作主笔
*   **核心技能**:
    1.  **`generate_research_brief` (生成调研清单)**
        - **描述**: 在写作前列出需要查阅的资料清单。
        - **输入**: `topic`, `outline`
    2.  **`create_outline` (生成大纲)**
        - **描述**: 根据选题和 DNA 生成文章结构大纲。
        - **输入**: `topic`, `style_dna`
    3.  **`write_chapter` (撰写章节)**
        - **描述**: 按照大纲撰写具体章节内容。
        - **输入**: `chapter_title`, `key_points`
    4.  **`fix_segment` (修改段落)**
        - **描述**: 针对特定段落进行润色或修改。
        - **输入**: `original_text`, `instruction`

### 3.4 八卦狗仔·卓伟 (zhuo_wei)
*   **角色定位**: 情报搜集员
*   **核心技能**:
    1.  **`execute_research` (执行深度调研)**
        - **别名**: `web_search`
        - **描述**: 联网搜索最新信息、数据和事实，必须提供来源链接。
        - **输入**: `query` (搜索关键词), `focus_years` (年份偏好)
        - **输出**: 调研报告与来源链接

### 3.5 毒舌判官·包租婆 (bao_zu_po)
*   **角色定位**: 审稿人
*   **核心技能**:
    1.  **`review_article` (审阅文章)**
        - **描述**: 对大智写好的章节或全文进行毒舌点评，指出逻辑漏洞和禁忌词。
        - **输入**: `content`, `criteria`
        - **输出**: 评审意见列表

---

## 4. 自动化编排逻辑 (Orchestration Logic)

### 4.1 核心原则
- **Agent 自主性**: 每个 Agent 的 System Prompt 中都将注入**所有可用 Skills 的描述**（不仅是自己的，也包括队友的）。
- **决策机制**: Agent 根据用户输入，自行判断：
    - "这事我能做吗？" -> 能 -> 调用自己的 Skill (Self-Call)。
    - "这事我做不了，但有人能做吗？" -> 有 -> 调用队友的 Skill (Cross-Agent Call)。
    - "都不行？" -> 询问用户。

### 4.2 运行时流程 (Runtime Flow)

#### 场景一：诸葛自主调用 (Self-Call)
> **用户**: "把刚才的对话总结个标题。"
1.  **Zhuge**: 收到消息，分析意图。
2.  **Zhuge**: 识别到匹配自身技能 `summarize_session_title`。
3.  **Zhuge**: 发起 Tool Call: `call('summarize_session_title')`。
4.  **Runtime**: 拦截调用，发现是 owner 是自己，立即执行本地函数。
5.  **Runtime**: 将结果返回给 Zhuge。
6.  **Zhuge**: 输出最终回复。

#### 场景二：诸葛协同卓伟 (Cross-Agent Call)
> **用户**: "我想写关于 DeepSeek 的文章，先帮我查查它最近有什么新闻。"
1.  **Zhuge**: 收到消息，分析意图 -> 需要外部信息。
2.  **Zhuge**: 识别到匹配 **卓伟** 的技能 `execute_research`。
3.  **Zhuge**: 决定发起协同，输出思考过程：
    - *"这个问题涉及到最新的科技动态，我需要让卓伟去查一下..."*
4.  **Zhuge**: 发起 Tool Call: `call('execute_research', { query: 'DeepSeek 最新新闻' })`。
5.  **Runtime**: 拦截调用，发现 owner 是 `zhuo_wei`。
6.  **Runtime**: 
    - 暂停 Zhuge 的生成。
    - **激活 Zhuo Wei Agent**，传入 Prompt: "诸葛请求你调查：DeepSeek 最新新闻"。
7.  **Zhuo Wei**: 执行搜索，生成报告。
8.  **Runtime**: 获得 Zhuo Wei 的输出，将其作为 Tool Output 返回给 Zhuge。
9.  **Zhuge**: 读取报告，结合自己的战略能力，生成选题建议给用户。

---

## 5. UI 交互需求

1.  **思考过程透明化**:
    - 在聊天界面中，必须展示 Agent 的思考路径。
    - 例如：显示 `[系统] 诸葛 正在呼叫 卓伟 进行调研...` 的状态条。
2.  **中间产物卡片**:
    - 当卓伟完成调研时，不应只把文本塞给诸葛，而应在 UI 上渲染一个可折叠的 **"调研报告卡片"**。
    - 当老K完成分析时，渲染 **"风格DNA卡片"**。
    - 点击卡片可查看详细内容，确保用户对过程“可控、可见”。

## 6. 实施计划

1.  **Skill Registry 构建**: 建立全局技能注册表。
2.  **Agent Prompt 增强**: 修改 `AgentRuntime`，在构造 Prompt 时动态插入 `Available Skills` 列表。
3.  **Tool Call Handler 开发**: 实现通用的工具调用拦截与路由逻辑。
4.  **前端组件开发**: 开发用于展示协同状态和中间产物的 UI 组件。

---
**注**：此文档为最终实施依据，未经允许不得随意更改代码逻辑。
