# PHP后端环境安装指南

## 当前安装状态

### 正在进行的安装
- ✅ Homebrew 已安装 (版本 4.6.3)
- 🔄 PHP 正在安装中 (通过 brew install php)
- ⏳ MySQL 待安装
- ⏳ Composer 待安装

### 已修复的问题
- ✅ 修复了 Homebrew 镜像源配置问题
- ✅ 重置了 homebrew-core 和 homebrew-cask 的远程源

## 安装进度

### 第一步：PHP 环境
```bash
# 当前正在执行
brew install php
```

### 第二步：MySQL 数据库
```bash
# 待执行
brew install mysql
brew services start mysql
```

### 第三步：Composer 依赖管理
```bash
# 待执行
brew install composer
```

### 第四步：项目依赖安装
```bash
# 进入后端目录
cd backend

# 安装 Composer 依赖（如果需要）
composer install
```

### 第五步：数据库配置
```bash
# 启动 MySQL 服务
brew services start mysql

# 创建数据库
mysql -u root -p
CREATE DATABASE product_duck;
USE product_duck;
source database/init.sql;
```

### 第六步：启动开发服务器
```bash
# 启动 PHP 内置服务器
php -S localhost:8000 -t public/
```

## 项目结构说明

```
backend/
├── .env                    # 环境配置文件
├── .env.example           # 环境配置示例
├── composer.json          # Composer 依赖配置
├── public/
│   ├── index.php         # 应用入口文件
│   └── .htaccess         # Apache 重写规则
├── src/
│   ├── Config/           # 配置文件
│   ├── Controllers/      # 控制器
│   ├── Models/          # 数据模型
│   ├── Middleware/      # 中间件
│   └── Utils/           # 工具类
├── database/
│   ├── init.sql         # 数据库初始化脚本
│   └── schema.sql       # 数据库结构
└── test_api.html        # API 测试工具
```

## 已实现的功能

### 用户认证系统
- 用户注册 API
- 用户登录 API
- JWT 认证中间件
- 密码加密存储

### 产品管理模块
- 产品 CRUD 操作
- 用户产品关联
- 产品统计信息

### 竞品分析模块
- 竞品 CRUD 操作
- 竞品与产品关联
- 批量操作支持

### 文件上传功能
- Logo 上传
- 图片上传
- 文件类型验证
- 安全性保护

## API 端点

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/user` - 获取用户信息

### 产品管理
- `GET /api/products` - 获取产品列表
- `POST /api/products` - 创建产品
- `GET /api/products/{id}` - 获取产品详情
- `PUT /api/products/{id}` - 更新产品
- `DELETE /api/products/{id}` - 删除产品

### 竞品管理
- `GET /api/competitors` - 获取竞品列表
- `POST /api/competitors` - 创建竞品
- `GET /api/competitors/{id}` - 获取竞品详情
- `PUT /api/competitors/{id}` - 更新竞品
- `DELETE /api/competitors/{id}` - 删除竞品

### 文件上传
- `POST /api/upload/logo` - 上传 Logo
- `POST /api/upload/image` - 上传图片
- `DELETE /api/upload/{filename}` - 删除文件

## 环境要求

- PHP 8.0+
- MySQL 5.7+ 或 8.0+
- Composer
- 支持 URL 重写的 Web 服务器

## 安全特性

- JWT 认证
- 密码哈希存储
- SQL 注入防护
- CORS 支持
- 文件上传安全验证
- 输入数据验证

## 故障排除

### 常见问题

1. **PHP 命令未找到**
   ```bash
   # 检查 PHP 是否正确安装
   which php
   php --version
   ```

2. **数据库连接失败**
   - 检查 MySQL 服务是否启动
   - 验证 .env 文件中的数据库配置
   - 确认数据库和用户权限

3. **权限问题**
   ```bash
   # 设置上传目录权限
   chmod 755 public/uploads
   ```

## 下一步操作

1. 等待 PHP 安装完成
2. 安装 MySQL 和 Composer
3. 配置数据库连接
4. 测试 API 接口
5. 部署到生产环境

---

**注意**: 当前 PHP 安装可能需要一些时间，请耐心等待。如果安装时间过长，可以考虑使用其他安装方式或检查网络连接。