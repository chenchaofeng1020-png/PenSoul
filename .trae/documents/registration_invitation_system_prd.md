# 产品需求文档：系统注册邀请码机制 (Registration Invitation System)

## 1. 需求背景与目标
当前系统处于早期/私有化部署阶段，为了控制用户质量、防止恶意注册以及管理系统访问权限，需要引入**注册邀请码机制**。
**核心目标**：仅持有有效邀请码的用户才能完成账号注册。

## 2. 用户流程 (User Flow)

1.  **用户进入注册页**：
    *   页面除了原本的“邮箱”、“密码”、“确认密码”外，新增**“邀请码”**必填输入框。
2.  **提交注册**：
    *   用户填写完信息后点击“注册”。
    *   前端将（邮箱、密码、邀请码）发送给后端。
3.  **系统校验**：
    *   后端接收请求，优先校验**邀请码的有效性**（是否存在、是否过期、是否已达到使用次数上限）。
    *   **校验失败**：提示“邀请码无效或已过期”，阻断注册流程。
    *   **校验成功**：
        *   执行账号创建逻辑（写入 Supabase Auth）。
        *   **扣减**邀请码的可用次数或标记为已使用。
        *   记录该用户是由哪个邀请码邀请注册的（便于溯源）。
4.  **注册成功**：
    *   用户自动登录并跳转至首页。

## 3. 功能模块详情

### 3.1 邀请码管理（后台/数据库层）
由于目前暂无超级管理员后台，初期通过**数据库直接管理** 来生成邀请码。

*   **属性定义**：
    *   `code`: 邀请码字符串（如 `WELCOME2024` 或随机串 `A7B2X9`）。
    *   `type`: 类型（`one_time` 一次性 / `multi_use` 多次通用）。
    *   `max_uses`: 最大可使用次数（通用码可设为 9999，一次性码设为 1）。
    *   `used_count`: 当前已使用次数。
    *   `expires_at`: 过期时间（可选）。
    *   `is_active`: 启用状态开关。

### 3.2 注册页改造（前端）
*   **UI 变更**：
    *   在 `/register` 或 `/login`（切换到注册模式时）增加 `Input` 组件：邀请码。
    *   文案提示：“请输入您的专属邀请码”。
*   **交互逻辑**：
    *   注册按钮点击时，不再直接调用 `supabase.auth.signUp`（**重要安全变更**）。
    *   改为调用后端接口 `POST /api/auth/register`。

### 3.3 注册接口（后端）
*   **新增 API**: `POST /api/auth/register`
*   **逻辑伪代码**：
    ```javascript
    1. 接收 { email, password, inviteCode }
    2. 查询数据库表 system_invitation_codes WHERE code = inviteCode
    3. IF (无记录 OR 已停用 OR 已过期 OR used_count >= max_uses):
           RETURN 400 "邀请码无效"
    4. 调用 Supabase Admin API 创建用户 (admin.createUser)
    5. 更新邀请码使用数据 (used_count + 1)
    6. RETURN 200 "注册成功"
    ```

## 4. 数据库设计 (Database Schema)

需要在 Supabase（或本地 db.json）中新增一张表 `system_invitation_codes`。

| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | UUID/String | 主键 |
| `code` | String | **唯一索引**，邀请码文本 |
| `type` | String | 'one_time' (一次性) / 'unlimited' (无限) |
| `max_uses` | Integer | 最大使用次数 (默认 1) |
| `used_count` | Integer | 已使用次数 (默认 0) |
| `expires_at` | Timestamp | 过期时间 (可空) |
| `created_at` | Timestamp | 创建时间 |
| `created_by` | String | 创建人 (可选) |

同时，建议在 `products` 或用户相关表中预留字段（如 `registered_via_code`），用于记录用户是使用哪个码注册的。

## 5. 安全性考量 (Security)

1.  **防绕过**：
    *   必须关闭 Supabase 前端的“允许直接注册”功能（在 Supabase Dashboard -> Authentication -> Settings 中关闭 `Enable Email Signup`），或者在代码层面完全移除前端直接调用 `signUp` 的逻辑，强制走后端 API。
    *   *注：由于我们想保持架构简单，目前推荐方案是：前端仅通过后端 API 注册，后端 API 负责“验码+创建”。即便 Supabase 侧未关闭公开注册，只要前端入口守住且后端是唯一注册通道即可满足 90% 的需求。*

2.  **防爆破**：
    *   邀请码输入错误超过 5 次/分钟，对该 IP 进行临时封禁（可选，二期需求）。

## 6. 实施计划 (Implementation Plan)

1.  **Step 1: 数据库准备**
    *   在 Supabase 创建 `system_invitation_codes` 表。
    *   手动插入几个初始邀请码（如 `DUCK2025`）。
2.  **Step 2: 后端接口开发**
    *   实现 `POST /api/auth/register`。
    *   实现验码与 Supabase Admin User Creation 的串联。
3.  **Step 3: 前端改造**
    *   修改注册表单，增加邀请码字段。
    *   对接新的注册 API。
4.  **Step 4: 测试验证**
    *   使用无效码 -> 注册失败。
    *   使用有效码 -> 注册成功 -> 码次数扣减。

---
**确认反馈**：
请确认以上方案是否符合您的预期？
如果确认，我们将按照此方案开始进行开发。建议先从**数据库表创建**和**后端接口**开始。
