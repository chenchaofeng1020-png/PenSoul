# 产品鸭竞品管理系统后端设计文档

## 1. 项目概述

### 1.1 项目背景
产品鸭是一个专业的竞品分析管理平台，旨在帮助产品团队高效地管理和分析竞品信息，制定产品策略和路线图。

### 1.2 技术栈
- **后端框架**: PHP 8.0+ (原生PHP + 自定义路由)
- **数据库**: SQLite (开发环境) / MySQL (生产环境)
- **认证**: JWT (JSON Web Token)
- **架构模式**: MVC (Model-View-Controller)
- **依赖管理**: Composer

## 2. 前端功能分析

### 2.1 核心功能模块

#### 2.1.1 用户认证模块
- **登录页面** (`LoginPage`): 用户登录和注册
- **状态管理**: 全局登录状态、用户信息管理
- **Token管理**: JWT token的存储和刷新

#### 2.1.2 产品管理模块
- **产品选择**: 支持多产品切换
- **产品创建**: 新建产品功能
- **产品信息**: 产品详情展示和编辑

#### 2.1.3 竞品管理模块
- **竞品列表** (`CompetitorList`): 展示所有竞品信息
- **竞品详情** (`CompetitorDetailPage`, `NewCompetitorDetailPage`): 详细的竞品信息展示
- **竞品分析** (`CompetitorAnalysisPage`): 竞品功能分析和对比
- **添加竞品**: 支持批量添加和单个添加

#### 2.1.4 路线图管理模块
- **路线图页面** (`RoadmapPage`): 产品路线图规划和管理
- **多视图支持**: 列表视图、时间轴视图、看板视图
- **任务管理**: Epic、Milestone、Task等不同类型的任务
- **状态跟踪**: 计划中、进行中、已完成等状态管理

#### 2.1.5 功能分析模块
- **功能对比**: 竞品功能详细对比分析
- **分析报告**: 生成和保存分析结果
- **评论系统**: 支持团队协作讨论

### 2.2 数据流分析

#### 2.2.1 状态管理
前端使用React的useState和useEffect进行状态管理，主要状态包括：
- `isLoggedIn`: 登录状态
- `currentUser`: 当前用户信息
- `currentProduct`: 当前选中的产品
- `competitors`: 竞品列表数据
- `selectedCompetitors`: 选中的竞品
- `productDetails`: 产品详情数据
- `userProducts`: 用户关联的产品列表

#### 2.2.2 数据获取模式
- **初始化加载**: 页面加载时检查登录状态并获取基础数据
- **按需加载**: 根据用户操作动态加载相关数据
- **实时更新**: 数据变更后立即更新UI状态

### 2.3 API调用模式分析

根据前端代码分析，发现以下API调用模式：

#### 2.3.1 认证相关API
```javascript
// 用户注册
POST http://localhost:8000/api/auth/register
// 用户登录  
POST http://localhost:8000/api/auth/login
```

#### 2.3.2 产品管理API
```javascript
// 获取用户产品列表
GET http://localhost:8000/api/products
// 创建/更新产品
POST/PUT http://localhost:8000/api/products
```

#### 2.3.3 竞品管理API
```javascript
// 获取产品的竞品列表
GET http://localhost:8000/api/products/{productId}/competitors
// 添加竞品
POST http://localhost:8000/api/products/{productId}/competitors
```

#### 2.3.4 分析和评论API
```javascript
// 获取竞品分析
GET http://localhost:8000/api/competitor-analyses?competitor_id={id}
GET http://localhost:8000/api/competitors/{id}/analyses
// 保存分析结果
POST http://localhost:8000/api/competitors/{id}/analyses
// 获取评论
GET http://localhost:8000/api/comments?competitor_id={id}
```

## 3. 后端架构设计

### 3.1 整体架构

```
backend/
├── public/                 # Web服务器入口
│   ├── index.php          # 主入口文件，路由配置
│   └── .htaccess          # Apache重写规则
├── src/                   # 源代码目录
│   ├── Config/            # 配置文件
│   │   └── Database.php   # 数据库配置
│   ├── Controllers/       # 控制器层
│   ├── Models/           # 数据模型层
│   ├── Core/             # 核心组件
│   │   └── Router.php    # 路由系统
│   ├── Middleware/       # 中间件
│   │   └── AuthMiddleware.php # 认证中间件
│   └── Utils/            # 工具类
│       ├── JWT.php       # JWT处理
│       └── Response.php  # 响应处理
├── database/             # 数据库相关
│   └── schema.sql        # 数据库结构
├── vendor/               # Composer依赖
└── .env                  # 环境配置
```

### 3.2 设计模式

#### 3.2.1 MVC模式
- **Model**: 负责数据访问和业务逻辑
- **View**: 由前端React应用负责
- **Controller**: 处理HTTP请求，调用Model，返回JSON响应

#### 3.2.2 中间件模式
- **AuthMiddleware**: JWT token验证
- **CORS中间件**: 跨域请求处理
- **错误处理中间件**: 统一异常处理

#### 3.2.3 路由模式
- **RESTful API**: 遵循REST设计原则
- **资源嵌套**: 支持嵌套资源路由
- **参数提取**: 自动提取路径参数

## 4. 数据库设计

### 4.1 现有数据表结构

#### 4.1.1 用户表 (users)
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    avatar VARCHAR(255) DEFAULT NULL,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL
);
```

#### 4.1.2 产品表 (products)
```sql
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    logo VARCHAR(255) DEFAULT NULL,
    owner_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### 4.1.3 竞品表 (competitors)
```sql
CREATE TABLE competitors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    slogan VARCHAR(255) DEFAULT NULL,
    description TEXT,
    logo VARCHAR(255) DEFAULT NULL,
    website VARCHAR(255) DEFAULT NULL,
    help_doc_url VARCHAR(255) DEFAULT NULL,
    api_doc_url VARCHAR(255) DEFAULT NULL,
    main_customers JSON DEFAULT NULL,
    recent_updates JSON DEFAULT NULL,
    last_updated DATE DEFAULT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);
```

#### 4.1.4 用户产品关联表 (user_products)
```sql
CREATE TABLE user_products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    role ENUM('owner', 'admin', 'member', 'viewer') DEFAULT 'member',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_product (user_id, product_id)
);
```

### 4.2 需要新增的数据表

根据前端功能分析，需要新增以下数据表：

#### 4.2.1 路线图项目表 (roadmap_items)
```sql
CREATE TABLE roadmap_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    type ENUM('Epic', 'Milestone', 'Task', 'Feature') NOT NULL,
    status ENUM('计划中', '进行中', '已完成', '已取消') DEFAULT '计划中',
    owner VARCHAR(100),
    start_date DATE,
    end_date DATE,
    tags JSON DEFAULT NULL,
    description TEXT,
    priority ENUM('高', '中', '低') DEFAULT '中',
    progress INT DEFAULT 0,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_product_id (product_id),
    INDEX idx_status (status),
    INDEX idx_type (type)
);
```

#### 4.2.2 竞品分析表 (competitor_analyses)
```sql
CREATE TABLE competitor_analyses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    competitor_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    analysis_type ENUM('功能分析', '用户体验', '商业模式', '技术架构', '其他') DEFAULT '功能分析',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (competitor_id) REFERENCES competitors(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_competitor_id (competitor_id),
    INDEX idx_analysis_type (analysis_type)
);
```

#### 4.2.3 评论表 (comments)
```sql
CREATE TABLE comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    competitor_id INT NOT NULL,
    analysis_id INT DEFAULT NULL,
    content TEXT NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (competitor_id) REFERENCES competitors(id) ON DELETE CASCADE,
    FOREIGN KEY (analysis_id) REFERENCES competitor_analyses(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_competitor_id (competitor_id),
    INDEX idx_analysis_id (analysis_id)
);
```

#### 4.2.4 竞品功能表 (competitor_features)
```sql
CREATE TABLE competitor_features (
    id INT PRIMARY KEY AUTO_INCREMENT,
    competitor_id INT NOT NULL,
    feature_name VARCHAR(200) NOT NULL,
    feature_description TEXT,
    category VARCHAR(100),
    has_feature BOOLEAN DEFAULT TRUE,
    feature_quality ENUM('优秀', '良好', '一般', '较差') DEFAULT '良好',
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (competitor_id) REFERENCES competitors(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_competitor_id (competitor_id),
    INDEX idx_category (category)
);
```

## 5. API接口设计

### 5.1 认证接口

#### 5.1.1 用户注册
```
POST /api/auth/register
Content-Type: application/json

Request Body:
{
    "username": "string",
    "email": "string", 
    "password": "string",
    "full_name": "string"
}

Response:
{
    "success": true,
    "message": "注册成功",
    "data": {
        "user": {
            "id": 1,
            "username": "testuser",
            "email": "test@example.com",
            "full_name": "测试用户"
        },
        "token": "jwt_token_string"
    }
}
```

#### 5.1.2 用户登录
```
POST /api/auth/login
Content-Type: application/json

Request Body:
{
    "email": "string",
    "password": "string"
}

Response:
{
    "success": true,
    "message": "登录成功",
    "data": {
        "user": {
            "id": 1,
            "username": "testuser",
            "email": "test@example.com",
            "full_name": "测试用户"
        },
        "token": "jwt_token_string"
    }
}
```

#### 5.1.3 获取当前用户信息
```
GET /api/auth/me
Authorization: Bearer {token}

Response:
{
    "success": true,
    "data": {
        "id": 1,
        "username": "testuser",
        "email": "test@example.com",
        "full_name": "测试用户",
        "avatar": null,
        "status": "active"
    }
}
```

### 5.2 产品管理接口

#### 5.2.1 获取用户产品列表
```
GET /api/products
Authorization: Bearer {token}

Response:
{
    "success": true,
    "data": [
        {
            "id": 1,
            "name": "产品鸭",
            "description": "专业的竞品分析管理平台",
            "logo": null,
            "owner_id": 1,
            "is_active": true,
            "role": "owner",
            "created_at": "2024-01-01T00:00:00Z"
        }
    ]
}
```

#### 5.2.2 创建产品
```
POST /api/products
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
    "name": "string",
    "description": "string",
    "logo": "string" // optional
}

Response:
{
    "success": true,
    "message": "产品创建成功",
    "data": {
        "id": 2,
        "name": "新产品",
        "description": "产品描述",
        "logo": null,
        "owner_id": 1,
        "is_active": true
    }
}
```

### 5.3 竞品管理接口

#### 5.3.1 获取产品竞品列表
```
GET /api/products/{productId}/competitors
Authorization: Bearer {token}

Response:
{
    "success": true,
    "data": [
        {
            "id": 1,
            "product_id": 1,
            "name": "Axure RP",
            "slogan": "专业的原型设计工具",
            "description": "Axure RP是一款专业的快速原型设计工具...",
            "logo": null,
            "website": "https://www.axure.com",
            "help_doc_url": "https://docs.axure.com",
            "api_doc_url": "https://developer.axure.com/api",
            "main_customers": ["微软", "苹果", "谷歌", "亚马逊"],
            "recent_updates": ["新增组件库功能", "优化交互设计", "支持团队协作"],
            "last_updated": "2024-01-15",
            "created_at": "2024-01-01T00:00:00Z"
        }
    ]
}
```

#### 5.3.2 添加竞品
```
POST /api/products/{productId}/competitors
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
    "name": "string",
    "slogan": "string", // optional
    "description": "string", // optional
    "logo": "string", // optional
    "website": "string", // optional
    "help_doc_url": "string", // optional
    "api_doc_url": "string", // optional
    "main_customers": ["string"], // optional
    "recent_updates": ["string"], // optional
    "last_updated": "2024-01-15" // optional
}

Response:
{
    "success": true,
    "message": "竞品添加成功",
    "data": {
        "id": 4,
        "product_id": 1,
        "name": "新竞品",
        // ... 其他字段
    }
}
```

### 5.4 路线图管理接口

#### 5.4.1 获取产品路线图
```
GET /api/products/{productId}/roadmap
Authorization: Bearer {token}
Query Parameters:
- status: string (optional) - 筛选状态
- type: string (optional) - 筛选类型
- search: string (optional) - 搜索关键词

Response:
{
    "success": true,
    "data": [
        {
            "id": 1,
            "product_id": 1,
            "title": "多视图路线图（列表/时间轴/看板）",
            "type": "Epic",
            "status": "进行中",
            "owner": "产品经理A",
            "start_date": "2024-10-01",
            "end_date": "2024-11-30",
            "tags": ["路线图", "前端"],
            "description": "实现产品路线图的多视图展现和基础筛选功能",
            "priority": "高",
            "progress": 60,
            "created_at": "2024-01-01T00:00:00Z"
        }
    ]
}
```

#### 5.4.2 创建路线图项目
```
POST /api/products/{productId}/roadmap
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
    "title": "string",
    "type": "Epic|Milestone|Task|Feature",
    "status": "计划中|进行中|已完成|已取消", // optional, default: "计划中"
    "owner": "string", // optional
    "start_date": "2024-01-01", // optional
    "end_date": "2024-12-31", // optional
    "tags": ["string"], // optional
    "description": "string", // optional
    "priority": "高|中|低", // optional, default: "中"
    "progress": 0 // optional, default: 0
}

Response:
{
    "success": true,
    "message": "路线图项目创建成功",
    "data": {
        "id": 10,
        "product_id": 1,
        "title": "新功能开发",
        // ... 其他字段
    }
}
```

#### 5.4.3 更新路线图项目
```
PUT /api/roadmap/{id}
Authorization: Bearer {token}
Content-Type: application/json

Request Body: (同创建接口，所有字段可选)

Response:
{
    "success": true,
    "message": "路线图项目更新成功",
    "data": {
        // 更新后的完整数据
    }
}
```

#### 5.4.4 删除路线图项目
```
DELETE /api/roadmap/{id}
Authorization: Bearer {token}

Response:
{
    "success": true,
    "message": "路线图项目删除成功"
}
```

### 5.5 竞品分析接口

#### 5.5.1 获取竞品分析列表
```
GET /api/competitors/{competitorId}/analyses
Authorization: Bearer {token}

Response:
{
    "success": true,
    "data": [
        {
            "id": 1,
            "competitor_id": 1,
            "title": "功能对比分析",
            "content": "详细的分析内容...",
            "analysis_type": "功能分析",
            "created_by": 1,
            "created_at": "2024-01-01T00:00:00Z",
            "author": {
                "id": 1,
                "full_name": "分析师A"
            }
        }
    ]
}
```

#### 5.5.2 创建竞品分析
```
POST /api/competitors/{competitorId}/analyses
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
    "title": "string",
    "content": "string",
    "analysis_type": "功能分析|用户体验|商业模式|技术架构|其他" // optional
}

Response:
{
    "success": true,
    "message": "分析创建成功",
    "data": {
        "id": 2,
        "competitor_id": 1,
        "title": "新分析",
        "content": "分析内容",
        "analysis_type": "功能分析",
        "created_by": 1,
        "created_at": "2024-01-01T00:00:00Z"
    }
}
```

### 5.6 评论接口

#### 5.6.1 获取评论列表
```
GET /api/comments
Authorization: Bearer {token}
Query Parameters:
- competitor_id: int (required) - 竞品ID
- analysis_id: int (optional) - 分析ID

Response:
{
    "success": true,
    "data": [
        {
            "id": 1,
            "competitor_id": 1,
            "analysis_id": null,
            "content": "这个分析很有价值",
            "created_by": 1,
            "created_at": "2024-01-01T00:00:00Z",
            "author": {
                "id": 1,
                "full_name": "评论者A"
            }
        }
    ]
}
```

#### 5.6.2 创建评论
```
POST /api/comments
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
    "competitor_id": 1,
    "analysis_id": 1, // optional
    "content": "string"
}

Response:
{
    "success": true,
    "message": "评论创建成功",
    "data": {
        "id": 2,
        "competitor_id": 1,
        "analysis_id": 1,
        "content": "新评论",
        "created_by": 1,
        "created_at": "2024-01-01T00:00:00Z"
    }
}
```

## 6. 控制器设计

### 6.1 控制器职责划分

#### 6.1.1 AuthController
- 用户注册、登录、登出
- Token刷新和验证
- 用户信息管理

#### 6.1.2 ProductController  
- 产品CRUD操作
- 产品统计信息
- 用户产品权限管理

#### 6.1.3 CompetitorController
- 竞品CRUD操作
- 竞品批量操作
- 竞品统计信息

#### 6.1.4 RoadmapController (需新增)
- 路线图项目CRUD操作
- 路线图筛选和搜索
- 路线图统计和报表

#### 6.1.5 CompetitorAnalysisController
- 竞品分析CRUD操作
- 分析内容管理
- 分析统计

#### 6.1.6 CommentController
- 评论CRUD操作
- 评论审核管理

### 6.2 控制器基类设计

```php
<?php

namespace App\Controllers;

use App\Utils\Response;
use App\Utils\JWT;

abstract class BaseController
{
    protected $user;
    
    public function __construct()
    {
        $this->user = $this->getCurrentUser();
    }
    
    protected function getCurrentUser()
    {
        $token = $this->getBearerToken();
        if (!$token) {
            return null;
        }
        
        try {
            $payload = JWT::decode($token);
            return $payload['user'] ?? null;
        } catch (Exception $e) {
            return null;
        }
    }
    
    protected function getBearerToken()
    {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';
        
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return $matches[1];
        }
        
        return null;
    }
    
    protected function validateRequired($data, $fields)
    {
        foreach ($fields as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                Response::error("字段 {$field} 是必需的", 400);
                return false;
            }
        }
        return true;
    }
    
    protected function getRequestData()
    {
        $input = file_get_contents('php://input');
        return json_decode($input, true) ?? [];
    }
}
```

## 7. 中间件设计

### 7.1 认证中间件

```php
<?php

namespace App\Middleware;

use App\Utils\Response;
use App\Utils\JWT;

class AuthMiddleware
{
    public function handle()
    {
        $token = $this->getBearerToken();
        
        if (!$token) {
            Response::error('未提供认证token', 401);
            return;
        }
        
        try {
            $payload = JWT::decode($token);
            
            // 验证token是否过期
            if (isset($payload['exp']) && $payload['exp'] < time()) {
                Response::error('Token已过期', 401);
                return;
            }
            
            // 将用户信息存储到全局变量中
            $GLOBALS['current_user'] = $payload['user'] ?? null;
            
        } catch (Exception $e) {
            Response::error('无效的token', 401);
            return;
        }
    }
    
    private function getBearerToken()
    {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';
        
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return $matches[1];
        }
        
        return null;
    }
}
```

### 7.2 CORS中间件

```php
<?php

namespace App\Middleware;

class CorsMiddleware
{
    public function handle()
    {
        // 设置CORS头
        header('Access-Control-Allow-Origin: http://localhost:3000');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Allow-Credentials: true');
        
        // 处理预检请求
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit;
        }
    }
}
```

## 8. 数据模型设计

### 8.1 基础模型类

```php
<?php

namespace App\Models;

use App\Config\Database;
use PDO;

abstract class BaseModel
{
    protected $db;
    protected $table;
    protected $primaryKey = 'id';
    protected $fillable = [];
    
    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }
    
    public function find($id)
    {
        $stmt = $this->db->prepare("SELECT * FROM {$this->table} WHERE {$this->primaryKey} = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function findAll($conditions = [], $orderBy = null, $limit = null)
    {
        $sql = "SELECT * FROM {$this->table}";
        $params = [];
        
        if (!empty($conditions)) {
            $whereClause = [];
            foreach ($conditions as $field => $value) {
                $whereClause[] = "{$field} = ?";
                $params[] = $value;
            }
            $sql .= " WHERE " . implode(' AND ', $whereClause);
        }
        
        if ($orderBy) {
            $sql .= " ORDER BY {$orderBy}";
        }
        
        if ($limit) {
            $sql .= " LIMIT {$limit}";
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function create($data)
    {
        $data = $this->filterFillable($data);
        $fields = array_keys($data);
        $placeholders = array_fill(0, count($fields), '?');
        
        $sql = "INSERT INTO {$this->table} (" . implode(', ', $fields) . ") VALUES (" . implode(', ', $placeholders) . ")";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(array_values($data));
        
        return $this->find($this->db->lastInsertId());
    }
    
    public function update($id, $data)
    {
        $data = $this->filterFillable($data);
        $fields = array_keys($data);
        $setClause = array_map(function($field) {
            return "{$field} = ?";
        }, $fields);
        
        $sql = "UPDATE {$this->table} SET " . implode(', ', $setClause) . " WHERE {$this->primaryKey} = ?";
        $params = array_merge(array_values($data), [$id]);
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        
        return $this->find($id);
    }
    
    public function delete($id)
    {
        $stmt = $this->db->prepare("DELETE FROM {$this->table} WHERE {$this->primaryKey} = ?");
        return $stmt->execute([$id]);
    }
    
    protected function filterFillable($data)
    {
        if (empty($this->fillable)) {
            return $data;
        }
        
        return array_intersect_key($data, array_flip($this->fillable));
    }
}
```

### 8.2 具体模型类

#### 8.2.1 RoadmapItem模型 (需新增)

```php
<?php

namespace App\Models;

class RoadmapItem extends BaseModel
{
    protected $table = 'roadmap_items';
    protected $fillable = [
        'product_id', 'title', 'type', 'status', 'owner',
        'start_date', 'end_date', 'tags', 'description',
        'priority', 'progress', 'created_by'
    ];
    
    public function findByProduct($productId, $filters = [])
    {
        $sql = "SELECT * FROM {$this->table} WHERE product_id = ?";
        $params = [$productId];
        
        // 状态筛选
        if (!empty($filters['status']) && $filters['status'] !== '全部') {
            $sql .= " AND status = ?";
            $params[] = $filters['status'];
        }
        
        // 类型筛选
        if (!empty($filters['type'])) {
            $sql .= " AND type = ?";
            $params[] = $filters['type'];
        }
        
        // 搜索筛选
        if (!empty($filters['search'])) {
            $sql .= " AND (title LIKE ? OR description LIKE ? OR owner LIKE ?)";
            $searchTerm = '%' . $filters['search'] . '%';
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }
        
        $sql .= " ORDER BY created_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getStatsByProduct($productId)
    {
        $sql = "SELECT 
                    status,
                    COUNT(*) as count,
                    type,
                    AVG(progress) as avg_progress
                FROM {$this->table} 
                WHERE product_id = ? 
                GROUP BY status, type";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$productId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
```

## 9. 错误处理和日志

### 9.1 统一错误处理

```php
<?php

namespace App\Utils;

class ErrorHandler
{
    public static function handleException($exception)
    {
        // 记录错误日志
        error_log('API Error: ' . $exception->getMessage() . ' in ' . $exception->getFile() . ':' . $exception->getLine());
        
        // 根据异常类型返回不同的错误响应
        if ($exception instanceof ValidationException) {
            Response::error($exception->getMessage(), 400);
        } elseif ($exception instanceof AuthException) {
            Response::error($exception->getMessage(), 401);
        } elseif ($exception instanceof NotFoundException) {
            Response::error($exception->getMessage(), 404);
        } else {
            // 生产环境不暴露具体错误信息
            $message = ($_ENV['APP_DEBUG'] ?? false) ? $exception->getMessage() : '服务器内部错误';
            Response::error($message, 500);
        }
    }
}
```

### 9.2 自定义异常类

```php
<?php

namespace App\Exceptions;

class ValidationException extends \Exception {}
class AuthException extends \Exception {}
class NotFoundException extends \Exception {}
class BusinessException extends \Exception {}
```

## 10. 安全考虑

### 10.1 输入验证
- 所有用户输入都需要进行验证和过滤
- 使用参数化查询防止SQL注入
- 对文件上传进行类型和大小限制

### 10.2 认证和授权
- 使用JWT进行无状态认证
- 实现基于角色的访问控制(RBAC)
- Token过期时间设置合理

### 10.3 数据保护
- 密码使用bcrypt加密存储
- 敏感数据传输使用HTTPS
- 实现请求频率限制

### 10.4 CORS配置
- 严格配置允许的域名
- 限制允许的HTTP方法
- 验证请求头

## 11. 性能优化

### 11.1 数据库优化
- 合理设计索引
- 使用连接池
- 实现查询缓存

### 11.2 API优化
- 实现分页查询
- 使用压缩传输
- 添加缓存机制

### 11.3 代码优化
- 使用自动加载
- 实现单例模式
- 减少不必要的数据库查询

## 12. 部署和运维

### 12.1 环境配置
- 开发、测试、生产环境分离
- 使用环境变量管理配置
- 实现配置热更新

### 12.2 监控和日志
- 实现API访问日志
- 添加性能监控
- 设置异常告警

### 12.3 备份和恢复
- 定期数据库备份
- 实现数据恢复机制
- 版本控制和回滚

## 13. 总结

本文档详细分析了产品鸭竞品管理系统的前端功能和交互逻辑，并基于此设计了完整的后端架构。主要包括：

1. **前端功能分析**: 深入分析了用户认证、产品管理、竞品管理、路线图管理等核心功能模块
2. **数据流分析**: 梳理了前端的状态管理和数据获取模式
3. **API需求分析**: 识别了所有前端需要的API接口
4. **后端架构设计**: 采用MVC模式，设计了清晰的分层架构
5. **数据库设计**: 基于现有结构，补充了路线图、分析、评论等新表
6. **API接口设计**: 设计了RESTful风格的完整API接口
7. **安全和性能**: 考虑了认证、授权、输入验证、性能优化等方面

该设计方案能够完全支持前端的所有功能需求，同时具备良好的扩展性和维护性。建议按照此文档进行后端开发，并在实施过程中根据实际情况进行适当调整。