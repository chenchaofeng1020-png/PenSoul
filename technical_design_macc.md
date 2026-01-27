# MACC (Multi-Agent Collaboration Core) 技术架构升级方案

## 1. 核心目标
将 PenSoul 从一个“基于 Prompt 的对话系统”升级为“**数据库驱动的多 Agent 协同系统**”。
实现《高端写手.md》中定义的：
- **老 K**（风格提取与存储）
- **诸葛**（基于人设数据的选题生成）
- **阿强**（读取人设数据进行写作）
三者之间的数据流转与能力解耦。

---

## 2. 架构核心变更

| 维度 | 当前状态 (Current) | 目标状态 (Target) |
| :--- | :--- | :--- |
| **人设定义** | 前端静态数组 (`const PERSONAS = [...]`) | **数据库表驱动** (`personas` table) |
| **Agent 能力** | 仅靠 Prompt 文本指令 | **Function Calling (工具调用)** |
| **数据流转** | 对话上下文 (Context Window) | **共享状态库 (Shared State DB)** |
| **输出形式** | 纯文本 / Markdown | **结构化 UI (Canvas/Cards)** |

---

## 3. 详细设计

### 3.1 数据库模型设计 (Database Schema)

我们需要将人设持久化，以便不同的 Agent 可以读取同一个配置。

#### A. `personas` 表 (人设核心表)
存储人设的基础信息和核心配置。

```sql
create table personas (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id), -- 属于哪个用户
  name text not null, -- 例如 "硬核技术流"
  avatar_style text, -- 头像风格配置
  role_definition text, -- 基础人设 Prompt (Who you are)
  
  -- 核心：风格 DNA (由老 K 提取并写入，阿强读取)
  style_dna jsonb default '{}'::jsonb, 
  /* style_dna 结构示例:
  {
    "tone": "冷峻、客观",
    "methodology": ["先列数据", "再讲故事", "最后升华"],
    "forbidden_words": ["小编", "亲"],
    "sentence_length": "short"
  }
  */

  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
```

#### B. `agent_tools` 表 (技能注册表 - 可选，或代码硬编码)
为了简化，初期可以将工具定义在代码中，通过 `tool_definitions.js` 管理。

---

### 3.2 Agent Skills 体系 (原技能协议)

我们引入当下流行的 **Agent Skills** 概念，将 Agent 的能力封装为**可插拔、原子化、自描述**的技能模块。这不仅是 Function Calling，更是 Agent 的“肢体”延伸。

**Skill 定义标准：**

每个 Skill 都是一个独立的类或函数，包含：
1.  **Manifest (技能清单)**: 描述技能名称、用途、参数 Schema (JSON Schema)。
2.  **Executor (执行器)**: 实际运行的 TypeScript/Python 代码（含数据库操作、API 调用）。
3.  **Feedback (反馈机制)**: 执行结果的结构化返回，供 LLM 进行下一步决策。

**PenSoul 核心 Skills 规划：**

| 拥有者 | Skill ID | 描述 | 动作 (Side Effect) |
| :--- | :--- | :--- | :--- |
| **老 K** | `extract_style_dna` | 从文本/URL中逆向提取风格 | 调用 LLM 分析 -> 更新 `personas` 表 |
| **诸葛** | `search_market_trends` | (可选) 联网搜索当前热门话题 | 调用 Bing/Google API -> 返回摘要 |
| **诸葛** | `save_strategy_cards` | 保存策划好的选题方案 | 写入 `ideation_topics` 表 -> 触发前端看板更新 |
| **卓伟** | `deep_research` | 针对特定关键词进行深度挖掘 | 爬取多源信息 -> 生成 `Intelligence Report` |
| **大智** | `create_outline_tree` | 生成结构化的文章大纲树 | 写入 `outlines` 表 |
| **大智** | `write_section_content` | 撰写具体章节内容 | 写入 `drafts` 表 (流式更新) |

**通信流程 (Skill Invocation Flow)：**

1.  **User**: "帮我生成3个关于 AI 的选题"
2.  **Runtime (Brain)**: 诸葛 (LLM) 思考后，决定调用技能。
    *   `Thought`: 用户需要选题 -> 我需要生成卡片 -> 调用 `save_strategy_cards`。
    *   `Call`: `save_strategy_cards({ cards: [...] })`
3.  **Skill Layer (Hand)**:
    *   拦截指令。
    *   验证参数 (Zod/AJV)。
    *   **执行数据库操作** (写入 Supabase)。
4.  **Feedback (Eye)**:
    *   返回执行结果: `{"status": "success", "count": 3, "ids": [...]}`
5.  **Frontend**: 监听数据库变化 -> **实时渲染右侧看板**。

**代码实现示例 (Skill Definition):**

```javascript
// skills/ZhugeSkills.js
export const SaveStrategyCards = {
  // 1. Manifest (供 LLM 理解)
  definition: {
    name: "save_strategy_cards",
    description: "当用户确认选题方向后，保存具体的选题卡片到策略看板",
    parameters: {
      type: "object",
      properties: {
        cards: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "选题标题" },
              angle: { type: "string", description: "切入角度" },
              hook: { type: "string", description: "核心卖点/钩子" },
              rationale: { type: "string", description: "推荐理由" }
            }
          }
        }
      },
      required: ["cards"]
    }
  },

  // 2. Executor (实际干活)
  execute: async ({ cards, session_id }) => {
    const { data, error } = await supabase
      .from('ideation_topics')
      .insert(cards.map(c => ({ ...c, session_id })))
      .select();
    
    if (error) throw new Error(error.message);
    return `成功保存了 ${data.length} 个选题卡片。`;
  }
};
```

---

### 3.3 协同工作流 (Collaboration Workflow)

#### 场景：从风格提取到选题生成

**Step 1: 风格提取 (老 K)**
1. 用户在“人设实验室”上传一篇样文。
2. 系统调用 **LLM (Analysis Mode)** 分析文本。
3. 系统调用工具 `update_persona_dna(persona_id, { style_dna })`。
4. **结果**：数据库中该人设的 `style_dna` 字段被更新。

**Step 2: 选题策划 (诸葛)**
1. 用户进入“选题会议室”，选择“硬核技术流”人设。
2. **System Prompt 注入**：
   ```text
   你现在是诸葛。
   当前服务的用户人设配置如下（这是你的约束条件）：
   - 风格：${persona.style_dna.tone}
   - 价值观：${persona.style_dna.values}
   请基于此风格策划选题。
   ```
3. 诸葛生成选题，确保符合“硬核”风格（例如不生成标题党）。

---

## 4. 实施路线图 (Implementation Roadmap)

### Phase 1: 基础设施 (Infrastructure)
- [ ] 创建 `personas` 数据库表及对应的 Mock 数据存储。
- [ ] 封装 `AgentRuntime` 类：统一处理 System Prompt 组装和 Tool Call 解析。

### Phase 2: 人设实验室 (Persona Lab)
- [ ] 开发 **L1 人设列表页**：增删改查 `personas`。
- [ ] 开发 **L2 深度分析工作台**：
    - 左侧：上传/粘贴文本的交互。
    - 后端：实现“逆向工程”Prompt，解析文本并提取 DNA。
    - 右侧：可视化展示提取出的 DNA (JSON 数据)。

### Phase 3: 改造选题会议室 (Refactor Ideation)
- [ ] 接入真实的 `personas` 数据（不再使用静态数组）。
- [ ] 升级诸葛的 API，使其能读取当前人设的 `style_dna`。
- [ ] 将“生成 JSON”逻辑升级为标准的 Tool Call 模式，提高稳定性。

---

## 5. 立即执行建议

建议从 **Phase 1 (数据库与基础 API)** 开始。
1. 我将为您创建 `personas` 的 Supabase 迁移文件。
2. 更新 `api.js` 支持人设的 CRUD。
3. 更新前端 `SessionNavigator` 读取真实人设列表。
