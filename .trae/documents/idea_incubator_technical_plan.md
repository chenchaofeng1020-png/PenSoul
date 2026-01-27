# 灵感孵化器 (Idea Incubator) 技术开发方案

## 1. 总体架构

本功能旨在为用户提供一个轻量级的灵感记录与孵化环境。技术架构上将沿用现有的 React + Express + 本地JSON/Supabase 双模存储架构。

### 1.1 核心流程
1.  **前端**：新增独立路由 `/ideas`，包含列表页和对话详情页。入口位于 Sidebar 下拉菜单。
2.  **后端**：新增 `/api/ideas` 相关接口，处理 CRUD 和 AI 对话请求。
3.  **存储**：
    *   **本地开发模式**：扩展 `server/db.json`，新增 `ideas` 字段。
    *   **生产模式 (Supabase)**：新增 `ideas` 表（需编写 SQL migration）。
4.  **AI 服务**：复用现有的 OpenAI Client 封装，新增专门的 Prompt Template 用于“灵感孵化”场景。

---

## 2. 数据库设计

### 2.1 JSON 数据结构 (本地开发)
在 `server/db.json` 的根对象中新增 `ideas` 数组。

```json
{
  "ideas": [
    {
      "id": "idea-uuid-1",
      "owner_id": "user-id",
      "title": "关于智能药盒的想法",
      "status": "incubating", // incubating (孵化中) | converted (已转化) | archived (已归档)
      "created_at": "2023-10-27T10:00:00Z",
      "updated_at": "2023-10-27T10:05:00Z",
      "messages": [
        {
          "role": "ai",
          "content": "你好！我是你的产品顾问。请告诉我你有什么新想法？",
          "created_at": "..."
        },
        {
          "role": "user",
          "content": "我想做一个针对独居老人的智能药盒。",
          "created_at": "..."
        }
      ],
      "structured_data": {
        "name": "智能药盒",
        "target_audience": "独居老人及其子女",
        "pain_points": ["容易忘记吃药", "子女无法远程确认"],
        "product_category": "智能硬件/健康管理",
        "core_features": ["定时提醒", "服药监测", "远程APP通知"]
      },
      "converted_product_id": null // 如果已转化，存储对应的 product_id
    }
  ]
}
```

### 2.2 Supabase Schema (生产环境)
需创建 `ideas` 表：

```sql
create table ideas (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references auth.users(id) not null,
  title text,
  status text default 'incubating',
  messages jsonb default '[]',
  structured_data jsonb default '{}',
  converted_product_id uuid references products(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

---

## 3. API 接口设计

### 3.1 基础 CRUD
| 方法 | 路径 | 描述 | 参数/Body |
| :--- | :--- | :--- | :--- |
| GET | `/api/ideas` | 获取当前用户的灵感列表 | Query: `owner_id` |
| GET | `/api/ideas/:id` | 获取单个灵感详情 | - |
| POST | `/api/ideas` | 创建新灵感 | `{ title: "..." }` |
| PUT | `/api/ideas/:id` | 更新灵感 (标题/状态/结构化数据) | `{ title, status, structured_data }` |
| DELETE | `/api/ideas/:id` | 删除灵感 | - |

### 3.2 AI 对话交互
| 方法 | 路径 | 描述 | Body |
| :--- | :--- | :--- | :--- |
| POST | `/api/ideas/:id/chat` | 发送消息并获取 AI 回复 | `{ message: "用户输入", context: {...} }` |

**逻辑说明**：
1.  接收用户消息，追加到 DB 的 `messages` 数组。
2.  构建 System Prompt，包含“产品顾问”的人设。
3.  调用 LLM，获取回复。
4.  **关键步骤**：并在后台尝试从对话上下文中提取/更新 `structured_data` (可以是一个并行的 AI 调用，或者要求 AI 在返回特定格式的 XML/JSON 块以便提取)。
    *   *优化策略*：为了响应速度，可以先流式返回对话内容，然后再异步调用一次“信息提取”接口更新结构化数据；或者要求 AI 在一次回复中同时返回 `<thinking>` (用于提取) 和 `<reply>` (用于展示)。
5.  将 AI 回复和更新后的结构化数据存回 DB。
6.  返回 AI 回复及最新的结构化数据给前端。

### 3.3 转化为产品
| 方法 | 路径 | 描述 | Body |
| :--- | :--- | :--- | :--- |
| POST | `/api/ideas/:id/convert` | 将灵感转为正式产品 | `{ product_name: "..." }` |

**逻辑说明**：
1.  读取 `ideas` 表中的 `structured_data`。
2.  在 `products` 表中创建新记录，映射字段：
    *   `name` <- `product_name`
    *   `description` <- `pain_points` + `solutions` 的摘要
    *   `target_audience` <- `target_audience`
    *   ...其他字段映射
3.  更新 `ideas` 记录状态为 `converted`，并记录 `converted_product_id`。
4.  返回新创建的 `product_id`。

---

## 4. 前端开发方案

### 4.1 路由配置 (`App.jsx`)
新增路由：
*   `/ideas`: 灵感列表页
*   `/ideas/:id`: 灵感孵化工作台

### 4.2 组件设计

#### 4.2.1 `Sidebar.jsx` 修改
*   在左上角下拉菜单中增加 `Idea Incubator` 入口。
*   点击跳转至 `/ideas`。

#### 4.2.2 `IdeaListPage.jsx`
*   **布局**：卡片式网格布局或列表布局。
*   **内容**：显示灵感标题、最后更新时间、状态标签。
*   **交互**：点击卡片进入详情；点击“+”浮动按钮创建新灵感。

#### 4.2.3 `IdeaChatPage.jsx` (核心)
*   **布局**：左右分栏 (Mobile端改为 Tab 切换)。
    *   **左侧 (70%)**：聊天窗口 (`ChatInterface`)。
    *   **右侧 (30%)**：结构化数据面板 (`StructuredDataPanel`)。
*   **ChatInterface**：
    *   消息流展示 (User 右，AI 左)。
    *   Markdown 渲染支持。
    *   输入框。
*   **StructuredDataPanel**：
    *   展示由 AI 自动提取的 Key-Value 信息 (产品名、Slogan、受众、痛点等)。
    *   支持手动编辑 (以防 AI 提取错误)。
    *   底部常驻“🚀 转为产品”按钮。

### 4.3 状态管理
*   使用 `useContext` 或简单的 React State 管理当前灵感数据。
*   聊天过程中，AI 返回的 `structured_data` 变化应实时反映在右侧面板。

---

## 5. AI Prompt 设计策略

### 5.1 System Prompt 核心设定
```javascript
const SYSTEM_PROMPT = `
你是一位经验丰富的互联网产品专家和创业导师。
你的任务是协助用户通过对话，将一个模糊的灵感打磨成清晰的产品方案。

【你的能力】
1. 引导提问：不要一次性问太多问题，每次只抛出1-2个关键问题，引导用户思考（如用户画像、核心痛点、商业模式）。
2. 结构化思维：在对话中敏锐捕捉关键信息。
3. 鼓励与批判：在鼓励用户创新的同时，也要客观指出潜在风险。

【输出要求】
请务必严格返回 JSON 格式，不要包含 markdown 代码块标记，结构如下：
{
  "reply": "你的回复内容，使用亲切、专业的口吻，支持 Markdown。",
  "extracted_info": {
    "product_name": "...", 
    "target_audience": "...", 
    "pain_points": ["..."], 
    "solutions": ["..."], 
    "unique_selling_point": "..."
  }
}
注意：extracted_info 中只填写从当前对话中能明确确认或推断出的信息；如果某些字段之前已确认且本次无修改，可以不返回或返回原值；如果尚未涉及，请留空或不返回该字段。
`
```

---

## 6. 实施计划

### Phase 1: 基础框架搭建
1.  修改后端 `server/index.cjs`，添加 `ideas` 相关的 DB 初始化逻辑。
2.  实现 `GET /api/ideas` 和 `POST /api/ideas` 接口。
3.  修改前端 `Sidebar`，添加入口。
4.  开发 `IdeaListPage`，实现新建和列表展示。

### Phase 2: 核心对话功能
1.  开发 `IdeaChatPage` 基础 UI (左右分栏)。
2.  实现后端 `POST /api/ideas/:id/chat` 接口，对接 LLM。
3.  联调前端发送消息与 AI 回复展示。

### Phase 3: 结构化提取与转化
1.  优化 Prompt，实现对话同时提取结构化数据。
2.  前端实现右侧面板的数据展示与实时更新。
3.  实现 `POST /api/ideas/:id/convert` 接口。
4.  前端联调“转为产品”流程。

### Phase 4: 优化与测试
1.  UI/UX 细节打磨 (加载状态、Markdown样式)。
2.  测试全流程：新建 -> 对话 -> 提取 -> 转化 -> 跳转。
