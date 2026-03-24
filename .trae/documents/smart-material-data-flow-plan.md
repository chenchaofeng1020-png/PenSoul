# 智能资料助手 - 数据流修复计划

## 问题确认

用户的问题是：**选择产品资料后，点击打开内容为空**

## 当前数据流分析

### 1. 数据创建流程 (ProductDataSelectorModal.jsx)

```
用户选择项目 → 点击"添加为文档" → handleConfirm() → generateDocument() → onConfirm()
```

**关键代码位置：**

* 第188-208行: `handleConfirm` 函数

* 第210-302行: `generateDocument` 函数

**逻辑确认：**

* ✅ `generateDocument` 函数存在且逻辑完整

* ✅ 生成的文档包含 `content` 字段（markdown格式）

* ✅ `onConfirm` 回调被调用，传入 `{fileName, fileType, content, selectedItems}`

### 2. 数据存储流程 (SourceManager.jsx)

```
onConfirm → handleAddProductData() → POST /api/smart/sources → 保存到 db.json
```

**关键代码位置：**

* 第64-86行: `handleAddProductData` 函数

**逻辑确认：**

* ✅ 正确调用 API 存储数据

* ✅ 传递 `content: data.content`

* ✅ 成功后将数据添加到 `sources` 状态

### 3. 数据展示流程 (SourceManager.jsx + DocumentDetailModal.jsx)

```
点击文档 → handleViewDetail() → setSelectedDocument() → DocumentDetailModal 显示
```

**关键代码位置：**

* 第88-91行: `handleViewDetail` 函数

* DocumentDetailModal.jsx 第44-46行: 显示 `document.content`

**逻辑确认：**

* ✅ 点击事件正确设置 `selectedDocument`

* ✅ Modal 正确接收并显示 `document.content`

### 4. 后端 API (server/index.cjs)

```
POST /api/smart/sources → 存储到 db.smart_sources 数组 → saveDb()
GET /api/smart/sources → 返回 db.smart_sources 中匹配 productId 的数据
```

**关键代码位置：**

* 第4521-4536行: POST 接口

**逻辑确认：**

* ✅ 正确存储 `content` 字段

* ✅ 正确返回完整数据

## 数据存储位置确认

**数据存储在：本地 JSON 文件 (db.json)**

路径：`/Users/code/PenSoul/db.json`

字段映射：

```javascript
{
  "smart_sources": [
    {
      "id": "src-xxx",
      "product_id": "xxx",
      "file_name": "产品规划资料_2026/3/8.md",
      "file_type": "product_data",
      "content": "# 产品名称规划资料\n\n生成时间：...",  // ← markdown 内容
      "status": "processed",
      "created_at": "2026-03-08T..."
    }
  ]
}
```

## 潜在问题点

### 问题1: 字段名不一致

前端传递的字段名 vs 后端存储的字段名：

| 前端传递       | 后端存储        | 状态     |
| ---------- | ----------- | ------ |
| `fileName` | `file_name` | ✅ 正确映射 |
| `fileType` | `file_type` | ✅ 正确映射 |
| `content`  | `content`   | ✅ 正确映射 |

### 问题2: 后端返回数据的字段名

后端返回的数据使用 snake\_case (`file_name`, `file_type`)，前端组件使用的是 camelCase (`fileName`, `fileType`)。

**在 SourceManager.jsx 中：**

* 第140行: `source.file_name` ✅ 正确（后端返回 snake\_case）

* 第94-95行: `s.file_type` ✅ 正确

**在 DocumentDetailModal.jsx 中：**

* 第23行: `document.file_name` ✅ 正确

* 第28行: `document.file_type` ✅ 正确

* 第45行: `document.content` ✅ 正确

### 问题3: 可能的数据加载问题

需要检查 `SmartMaterialPage.jsx` 中是否正确加载了 sources 数据。

## 修复计划

### 步骤1: 检查数据加载逻辑

检查 `SmartMaterialPage.jsx` 是否正确从 API 加载 sources 数据并传递给 `SourceManager`。

### 步骤2: 添加调试日志

在关键位置添加 console.log 以追踪数据流：

1. `handleAddProductData` - 确认接收到的数据
2. API 响应后 - 确认返回的数据包含 content
3. `handleViewDetail` - 确认传递的 source 对象

### 步骤3: 验证数据存储

检查 `db.json` 文件，确认数据是否正确存储。

## 结论

**当前代码逻辑是正确的**，数据流完整：

1. ✅ ProductDataSelectorModal 生成 markdown 文档
2. ✅ SourceManager 接收并调用 API 存储
3. ✅ 后端 API 正确存储 content 字段
4. ✅ DocumentDetailModal 正确显示 content

如果内容为空，可能原因：

1. 数据加载时 sources 未正确传递
2. db.json 中数据损坏或格式错误
3. 页面刷新后数据未重新加载

