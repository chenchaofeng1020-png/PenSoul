## 目标与约束
- 部署前端到 Vercel；后端能力由 Vercel Functions 提供。
- 数据库、认证、文件存储由 Supabase 承载。
- 保持前端 UI 与交互不变，仅替换数据层与 API 访问。

## 总体架构
- 前端：Vite React SPA 托管在 Vercel（静态资源通过 CDN）。
- API：`/api/*` 使用 Vercel Serverless（必要场景可选 Edge Functions）。
- 数据层：Supabase Postgres（含 RLS）；`supabase-js` 在前端读写受限数据，敏感操作走服务端函数。
- 存储：Supabase Storage（桶 `screenshots`）存放图片，前端获取签名 URL 或公开 URL。
- 认证：Supabase Auth（魔术链接 + OAuth），前端维护会话；服务端基于 `Authorization` Bearer 校验。

## 环境与配置
- Vercel 项目环境变量：
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`（仅服务端函数使用，不暴露给前端）
- 前端使用 `import.meta.env.VITE_*`；服务端函数通过 `process.env.*`。
- 将原 `http://localhost:8000` 改为相对路径 `/api`（生产自动指向 Vercel 域名）。

## 数据库 Schema（建议）
- 表：
  - `profiles`：`id uuid`（与 Auth 对齐），`email text`，`created_at timestamptz`
  - `products`：`id uuid`，`owner_id uuid`，`name text`，`description text`，`created_at`
  - `competitors`：`id uuid`，`product_id uuid`，`name text`，`url text`，`created_at`
  - `screenshots`：`id uuid`，`product_id uuid`，`competitor_id uuid`，`storage_path text`，`created_at`
- 外键：`products.owner_id -> profiles.id`；`competitors.product_id -> products.id`；`screenshots.product_id/competitor_id`。
- 索引：`products(owner_id)`，`competitors(product_id)`，`screenshots(product_id, competitor_id)`。
- RLS（示例）：
  - `products`: `using (owner_id = auth.uid())`, `check (owner_id = auth.uid())`
  - `competitors`: `using (product_id in (select id from products where owner_id = auth.uid()))`
  - `screenshots`: 同 `competitors` 规则。

## 存储策略
- 建立 Storage 桶 `screenshots`。
- 上传：前端调用 `/api/screenshots/upload`，服务端用 `SUPABASE_SERVICE_ROLE_KEY` 写入并返回 `path` 与 `signedUrl`。
- 浏览：前端用 `signedUrl` 或将桶设为公开并直接拼接公共 URL（默认用签名 URL 更安全）。

## API 映射与接口
- 替换现有接口（保持函数签名与调用点不变）：
  - `GET /api/products`：按 `auth.uid()` 返回用户产品列表。
  - `POST /api/products`：创建产品（body: `name`, `description`）。
  - `PUT /api/products/:id`、`DELETE /api/products/:id`：更新/删除（RLS 保证权限）。
  - `GET /api/competitors?productId=...`、`POST /api/competitors`：管理竞品。
  - `POST /api/screenshots/upload`：上传图片，返回 `{id, path, signedUrl}`。
  - `DELETE /api/screenshots/:id`：删除图片与存储对象。
- 服务端：`api/` 目录下每个文件导出处理函数，内部用 `@supabase/supabase-js` + 服务密钥。

## 前端改造点（不改 UI）
- 新增 `src/lib/supabaseClient.ts`：
  ```ts
  import { createClient } from '@supabase/supabase-js'
  export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL!, import.meta.env.VITE_SUPABASE_ANON_KEY!)
  ```
- 认证：在应用入口监听 `supabase.auth.onAuthStateChange`，将用户态注入现有状态管理（不改组件结构）。
- 数据获取：将原始 `fetch('http://localhost:8000/api/products')` 改为 `fetch('/api/products')` 或直接用 `supabase.from('products').select('*')`（若当前逻辑更适配接口统一，则优先 `/api/*`）。
- 上传：`CompetitorScreenshots.jsx` 内把文件选择后传给 `POST /api/screenshots/upload`，使用返回的 `signedUrl` 展示图片。
- 错误处理：保持现有 UI 显示逻辑，只替换数据源与异常文案。

## 实现步骤与里程碑
1. 初始化 Supabase 项目与环境变量；创建表、索引、RLS、Storage 桶。
2. 新建 Vercel 项目，绑定本仓库；配置环境变量；设置构建 `npm run build` 与输出目录 `dist/`。
3. 编写 `/api/*` 函数：`products`, `competitors`, `screenshots` 的 CRUD 与上传；本地联调。
4. 引入 `supabase-js`；实现 Auth（登录/登出 UI 不变，增加会话校验）。
5. 替换前端数据请求为 `/api/*`（或直连 Supabase）并验证各页面流程。
6. 部署到 Vercel Preview；灰度验证；再 Promote 到 Production。

## 权限与安全
- 服务端函数仅使用 `SUPABASE_SERVICE_ROLE_KEY`；前端仅使用 `anon key`。
- 校验请求体与 MIME 类型，限制最大文件大小；拦截非法扩展名。
- 所有表启用 RLS；必要操作通过服务端进行。

## 性能与成本
- 读多写少的查询可直连 Supabase（前端）以减少冷启动；敏感写入走服务端。
- 图片通过 Storage + CDN；列表查询分页（`limit/offset`）。
- 监控：Vercel Analytics + Supabase Logs；错误上报可接入 Sentry（可选）。

## 回滚与兼容
- 保留原数据访问层接口，增加开关 `USE_SUPABASE`，必要时可回退到原后端（若仍保留）。
- 预留 API 兼容层，确保 UI 不变，便于分步迁移。

## 交付物
- Supabase SQL 初始化脚本（表/索引/RLS）。
- `api/products.ts`、`api/competitors.ts`、`api/screenshots.ts` 等服务端函数。
- `src/lib/supabaseClient.ts` 与最小化的前端数据层改造。
- 部署到 Vercel 的 Preview 链接与环境配置说明。