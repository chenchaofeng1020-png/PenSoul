# 智能选题功能模块开发计划

根据您的要求，我将把“智能选题”作为一个独立的功能模块进行开发，不与现有的“趋势雷达”混淆。以下是详细的实施计划：

## 阶段一：前端路由与导航配置 (Frontend Setup)
**目标**: 在侧边栏新增入口，并配置独立的工作台页面。

1.  **侧边栏菜单更新 (`src/components/Sidebar.jsx`)**
    *   在 `menuItems` 数组中新增一项：
        ```javascript
        { icon: '💡', label: '智能选题', path: '/smart-topic' }
        ```
    *   位置建议放在“趋势雷达”之后，“内容规划”之前。

2.  **主应用路由配置 (`src/App.jsx`)**
    *   在主渲染逻辑中增加对 `selectedCategory === '智能选题'` 的判断。
    *   关联渲染新组件 `<SmartTopicWorkbench />`。

3.  **新建工作台容器组件 (`src/components/SmartTopic/SmartTopicWorkbench.jsx`)**
    *   这将是该模块的主入口文件。
    *   采用“左-中-右”三栏布局（符合 PRD 的操作流）：
        *   **左侧**: 灵感收集箱 (Inspiration Inbox)
        *   **中间**: 角度实验室 (Angle Lab) - 核心操作区
        *   **右侧**: 选题预览与大纲生成 (Preview & Framework)

---

## 阶段二：数据库与后端接口 (Backend & DB)
**目标**: 建立独立的业务域数据模型，彻底隔离产品规划数据。

1.  **数据库迁移 (`supabase/migrations/`)**
    *   创建 `create_content_domain.sql`，包含两张新表：
        *   `inspiration_inbox`: 存储素材（链接/文本）。
        *   `content_topics`: 存储选题方案与大纲（状态：draft -> planned）。

2.  **后端 API 实现 (`server/index.cjs`)**
    *   **灵感管理**: `POST /api/inbox/add`, `GET /api/inbox/list`
    *   **选题生成**: `POST /api/trends/generate-topic` (基于素材生成选题)
    *   **大纲生成**: `POST /api/trends/generate-framework` (基于选题生成大纲)

---

## 阶段三：核心功能组件开发 (Core Components)
**目标**: 实现 PRD 描述的三大核心交互模块。

1.  **灵感收集箱组件 (`InspirationInbox.jsx`)**
    *   支持手动粘贴文本/链接。
    *   展示已收藏的素材列表（支持多选）。

2.  **角度实验室组件 (`AngleLab.jsx`)**
    *   **输入区**: 接收从左侧选择的素材。
    *   **模式选择**: 5 个可视化卡片（反常识、细分、盘点、情绪、借势）。
    *   **生成触发**: 调用后端接口生成选题。

3.  **结果展示组件 (`TopicCard.jsx` & `FrameworkPreview.jsx`)**
    *   展示生成的 3 个选题方案。
    *   点击方案后弹出/展开大纲预览。

---

## 阶段四：联调与热点雷达打通 (Integration)
**目标**: 实现“从热点到选题”的流畅跳转。

1.  **热点雷达改造 (`TrendRadarPage.jsx`)**
    *   在热点卡片上增加“+ 加入选题灵感”按钮。
    *   点击后调用 `/api/inbox/add` 接口将热点存入灵感箱，并提示用户“已加入智能选题工作台”。

---

## 执行顺序
1.  **P0**: 创建数据库表结构 + 后端基础接口（确保数据有地方存）。
2.  **P1**: 前端 Sidebar 入口 + 页面框架搭建（确保能看到页面）。
3.  **P2**: 核心组件开发（灵感箱 -> 实验室 -> 大纲）。
4.  **P3**: 联调热点雷达的一键收藏功能。

请确认此计划是否符合您的“独立功能模块”要求？确认后我将从 **P0 数据库迁移** 开始执行。
