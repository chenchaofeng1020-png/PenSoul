# 产品鸭子 (Product Duck) - 后端API

一个专业的产品管理和竞品分析平台的后端API服务。

## 技术栈

- **PHP 8.0+** - 后端开发语言
- **MySQL 8.0+** - 数据库
- **JWT** - 身份认证
- **RESTful API** - API设计规范
- **PSR-4** - 自动加载规范

## 项目结构

```
backend/
├── public/                 # Web根目录
│   ├── index.php          # 应用入口文件
│   ├── .htaccess          # Apache重写规则
│   └── uploads/           # 文件上传目录
├── src/                   # 源代码目录
│   ├── Config/            # 配置文件
│   │   └── Database.php   # 数据库配置
│   ├── Controllers/       # 控制器
│   │   ├── AuthController.php      # 用户认证
│   │   ├── ProductController.php   # 产品管理
│   │   ├── CompetitorController.php # 竞品管理
│   │   └── UploadController.php    # 文件上传
│   ├── Models/            # 数据模型
│   │   ├── User.php       # 用户模型
│   │   ├── Product.php    # 产品模型
│   │   └── Competitor.php # 竞品模型
│   ├── Middleware/        # 中间件
│   │   └── AuthMiddleware.php # 认证中间件
│   ├── Utils/             # 工具类
│   │   ├── Response.php   # 响应处理
│   │   └── JWT.php        # JWT处理
│   └── Core/              # 核心类
│       └── Router.php     # 路由处理
├── database/              # 数据库相关
│   └── init.sql          # 数据库初始化脚本
├── vendor/                # 依赖包目录
│   └── autoload.php       # 自动加载
├── .env                   # 环境配置文件
├── .env.example           # 环境配置示例
├── test_api.html          # API测试工具
└── README.md              # 项目说明
```

## 快速开始

### 1. 安装依赖

```bash
cd backend
composer install
```

### 2. 配置环境

```bash
# 复制环境配置文件
cp .env.example .env

# 编辑配置文件
vim .env
```

配置数据库连接信息：
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=product_duck
DB_USER=root
DB_PASS=your_password

JWT_SECRET=your-secret-key-here
```

### 3. 创建数据库

```sql
-- 导入数据库结构
mysql -u root -p < database/schema.sql
```

### 4. 启动开发服务器

```bash
# 使用PHP内置服务器
composer start

# 或者手动启动
php -S localhost:8000 -t public
```

### 5. 测试API

访问 http://localhost:8000/api/ 查看API信息

## API文档

### 认证相关

#### 用户注册
```http
POST /api/auth/register
Content-Type: application/json

{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
}
```

#### 用户登录
```http
POST /api/auth/login
Content-Type: application/json

{
    "email": "test@example.com",
    "password": "password123"
}
```

#### 获取当前用户信息
```http
GET /api/user
Authorization: Bearer <your-jwt-token>
```

#### 刷新Token
```http
POST /api/auth/refresh
Authorization: Bearer <your-jwt-token>
```

### 产品管理

#### 获取产品列表
```http
GET /api/products?page=1&limit=10&search=关键词
Authorization: Bearer <your-jwt-token>
```

#### 获取产品详情
```http
GET /api/products/{id}
Authorization: Bearer <your-jwt-token>
```

#### 创建产品
```http
POST /api/products
Content-Type: application/json
Authorization: Bearer <your-jwt-token>

{
    "name": "产品名称",
    "slogan": "产品口号",
    "description": "产品描述",
    "website_url": "https://example.com",
    "documentation_url": "https://docs.example.com",
    "logo_url": "https://example.com/logo.png",
    "main_customers": "主要客户群体"
}
```

#### 更新产品
```http
PUT /api/products/{id}
Content-Type: application/json
Authorization: Bearer <your-jwt-token>

{
    "name": "更新的产品名称",
    "slogan": "更新的产品口号"
}
```

#### 删除产品
```http
DELETE /api/products/{id}
Authorization: Bearer <your-jwt-token>
```

#### 获取产品统计
```http
GET /api/products/{id}/stats
Authorization: Bearer <your-jwt-token>
```

### 竞品管理

#### 获取产品的竞品列表
```http
GET /api/products/{productId}/competitors?page=1&limit=10&search=关键词
Authorization: Bearer <your-jwt-token>
```

#### 获取用户所有竞品
```http
GET /api/competitors?page=1&limit=10&search=关键词
Authorization: Bearer <your-jwt-token>
```

#### 获取竞品详情
```http
GET /api/products/{productId}/competitors/{id}
Authorization: Bearer <your-jwt-token>
```

#### 创建竞品
```http
POST /api/products/{productId}/competitors
Content-Type: application/json
Authorization: Bearer <your-jwt-token>

{
    "name": "竞品名称",
    "slogan": "竞品口号",
    "description": "竞品描述",
    "website_url": "https://competitor.com",
    "documentation_url": "https://docs.competitor.com",
    "logo_url": "https://competitor.com/logo.png",
    "main_customers": "主要客户群体"
}
```

#### 更新竞品
```http
PUT /api/products/{productId}/competitors/{id}
Content-Type: application/json
Authorization: Bearer <your-jwt-token>

{
    "name": "更新的竞品名称",
    "slogan": "更新的竞品口号"
}
```

#### 删除竞品
```http
DELETE /api/products/{productId}/competitors/{id}
Authorization: Bearer <your-jwt-token>
```

#### 批量删除竞品
```http
POST /api/products/{productId}/competitors/batch-delete
Content-Type: application/json
Authorization: Bearer <your-jwt-token>

{
    "ids": [1, 2, 3]
}
```

#### 获取竞品统计
```http
GET /api/products/{productId}/competitors/stats
Authorization: Bearer <your-jwt-token>
```

### 文件上传

#### 上传Logo
```http
POST /api/upload/logo
Content-Type: multipart/form-data
Authorization: Bearer <your-jwt-token>

logo: <file>
```

#### 上传图片
```http
POST /api/upload/image
Content-Type: multipart/form-data
Authorization: Bearer <your-jwt-token>

image: <file>
```

#### 删除文件
```http
DELETE /api/upload/file
Content-Type: application/json
Authorization: Bearer <your-jwt-token>

{
    "filename": "logo_1234567890_abcdef.png"
}
```

#### 获取上传配置
```http
GET /api/upload/config
Authorization: Bearer <your-jwt-token>
```

### 响应格式

成功响应：
```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": {},
  "timestamp": 1640995200
}
```

错误响应：
```json
{
  "success": false,
  "code": 400,
  "message": "错误信息",
  "data": null,
  "timestamp": 1640995200
}
```

## 功能特性

### 🔐 用户认证系统
- 用户注册/登录
- JWT Token认证
- 密码安全加密
- Token刷新机制

### 📦 产品管理
- 产品CRUD操作
- 产品信息管理（名称、口号、描述、官网等）
- 产品统计信息
- 用户权限控制

### 🏆 竞品分析
- 竞品CRUD操作
- 竞品信息管理
- 批量操作支持
- 竞品统计分析

### 📁 文件管理
- Logo/图片上传
- 文件类型验证
- 文件大小限制
- 安全文件存储

### 🛡️ 安全特性
- JWT身份认证
- 密码哈希加密
- SQL注入防护
- XSS攻击防护
- CORS跨域支持

## 开发指南

### 添加新的API接口

1. 在 `src/Controllers/` 目录下创建或修改控制器
2. 在 `public/index.php` 中添加路由
3. 如需数据库操作，在 `src/Models/` 目录下创建或修改模型

### 中间件使用

在路由中添加中间件：
```php
$router->get('/api/protected', [Controller::class, 'method'], [AuthMiddleware::class]);
```

### 数据验证

控制器中使用验证方法：
```php
private function validateData($data) {
    $errors = [];
    
    if (empty($data['name'])) {
        $errors['name'] = '名称不能为空';
    }
    
    return empty($errors) ? true : $errors;
}
```

## 数据库设计

### 核心表结构

- **users** - 用户表
- **products** - 产品表
- **competitors** - 竞品表
- **user_products** - 用户产品关联表

### 关系设计

- 用户与产品：多对多关系（通过user_products表）
- 产品与竞品：一对多关系
- 支持软删除和状态管理

## 部署说明

### 环境要求

- PHP 8.0 或更高版本
- MySQL 8.0 或更高版本
- Apache/Nginx Web服务器
- 支持URL重写

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd product_duck/backend
   ```

2. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，配置数据库连接等信息
   ```

3. **创建数据库**
   ```bash
   mysql -u root -p < database/init.sql
   ```

4. **设置文件权限**
   ```bash
   chmod 755 public/uploads
   chmod 644 .env
   ```

5. **配置Web服务器**
   - 将Web根目录指向 `public/` 文件夹
   - 确保支持URL重写

### 生产环境配置

1. **安全配置**
   - 修改JWT密钥为强密码
   - 配置HTTPS
   - 设置适当的文件权限
   - 禁用PHP错误显示

2. **性能优化**
   - 启用OPcache
   - 配置数据库连接池
   - 设置适当的缓存策略

### Web服务器配置

#### Apache
确保启用了 `mod_rewrite` 模块，`.htaccess` 文件已配置URL重写规则。

#### Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/backend/public;
    index index.php;

    # 安全头设置
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # 文件上传目录
    location /uploads {
        location ~* \.(php|phtml|php3|php4|php5|pl|py|jsp|asp|sh|cgi)$ {
            deny all;
        }
    }
}
```

## 测试

### API测试工具

项目包含了一个HTML测试工具 `test_api.html`，可以直接在浏览器中测试所有API接口。

### 测试用户

数据库初始化脚本包含了测试用户：
- 用户名：`admin`，邮箱：`admin@productduck.com`，密码：`password`
- 用户名：`demo`，邮箱：`demo@productduck.com`，密码：`password`

### 手动测试

使用curl或Postman等工具测试API：

```bash
# 用户登录
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@productduck.com","password":"password"}'

# 获取产品列表
curl -X GET http://localhost/api/products \
  -H "Authorization: Bearer <your-token>"
```

## 故障排除

### 常见问题

1. **404错误**
   - 检查Web服务器配置
   - 确认URL重写规则正确

2. **数据库连接失败**
   - 检查.env文件中的数据库配置
   - 确认数据库服务正在运行

3. **JWT Token无效**
   - 检查JWT_SECRET配置
   - 确认Token格式正确

4. **文件上传失败**
   - 检查uploads目录权限
   - 确认PHP上传配置

## 安全注意事项

1. **JWT密钥安全**：确保JWT_SECRET使用强密码
2. **数据库安全**：使用专用数据库用户，限制权限
3. **文件上传安全**：验证文件类型，限制文件大小
4. **HTTPS**：生产环境必须使用HTTPS
5. **输入验证**：所有用户输入都需要验证和过滤
6. **错误处理**：不要在生产环境中暴露敏感错误信息
7. **访问控制**：实施适当的用户权限控制

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License

## 联系方式

如有问题或建议，请联系项目维护者。