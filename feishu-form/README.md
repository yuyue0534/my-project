# 飞书表单 - 极简协作表单系统

## 🎯 产品理念

参考飞书表单的设计哲学，打造一个**3分钟即可创建**的极简表单系统：

- ✨ **极简设计** - 扁平化 Schema，无复杂嵌套
- 🚀 **快速上手** - 直观的拖拽式界面
- 📊 **即时协作** - 实时数据收集与统计
- 💡 **专注核心** - 只做表单该做的事

## 🏗️ 技术架构

### 前端
- **React 18** - 组件化开发
- **Tailwind CSS v3** - 原子化样式
- **React Router** - 路由管理
- **Vite** - 快速构建工具

### 后端
- **Fastify** - 高性能 Node.js 框架
- **SQLite3** - 轻量级本地数据库
- **Better-SQLite3** - 同步数据库操作

## 📦 安装与运行

### 1️⃣ 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 2️⃣ 启动服务

```bash
# 启动后端服务（终端1）
cd backend
npm start
# 服务将运行在 http://localhost:3001

# 启动前端服务（终端2）
cd frontend
npm run dev
# 应用将运行在 http://localhost:3000
```

### 3️⃣ 访问应用

打开浏览器访问：`http://localhost:3000`

## 🎨 核心功能

### ✅ 表单管理
- 创建表单（3分钟快速创建）
- 编辑表单（实时预览）
- 删除表单
- 表单列表查看

### ✅ 字段类型
- 📝 单行文本
- 📄 多行文本
- 🔢 数字
- 📧 邮箱（自动校验）
- 📱 手机号（自动校验）
- 📅 日期
- ⭕ 单选
- ☑️ 多选
- 📋 下拉选择

### ✅ 数据收集
- 在线填写表单
- 字段必填校验
- 格式自动验证
- 提交成功反馈

### ✅ 数据统计
- 📊 统计概览（总回复数、字段数量）
- 📈 选项分布图（单选/多选数据可视化）
- 📝 回复列表（完整数据查看）
- 🎯 实时数据更新

## 🗂️ 项目结构

```
feishu-form/
├── backend/                 # 后端服务
│   ├── server.js           # Fastify 服务器
│   ├── database.js         # 数据库初始化
│   ├── utils.js            # 工具函数
│   └── package.json
│
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── components/    # 可复用组件
│   │   │   ├── FormField.jsx      # 表单字段组件
│   │   │   └── FieldEditor.jsx    # 字段编辑器
│   │   ├── pages/         # 页面组件
│   │   │   ├── HomePage.jsx       # 首页
│   │   │   ├── FormEditorPage.jsx # 编辑页
│   │   │   ├── FormViewPage.jsx   # 填写页
│   │   │   └── StatsPage.jsx      # 统计页
│   │   ├── utils/         # 工具函数
│   │   │   └── api.js     # API 调用
│   │   ├── styles/        # 样式文件
│   │   │   └── index.css
│   │   ├── App.jsx        # 主应用
│   │   └── main.jsx       # 入口文件
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── README.md
```

## 💾 数据库设计

### 表单表 (forms)
```sql
- id: TEXT PRIMARY KEY
- title: TEXT NOT NULL
- description: TEXT
- fields: TEXT (JSON)       # 扁平化字段配置
- settings: TEXT (JSON)     # 表单设置
- creator: TEXT
- created_at: INTEGER
- updated_at: INTEGER
```

### 提交表 (submissions)
```sql
- id: TEXT PRIMARY KEY
- form_id: TEXT
- data: TEXT (JSON)         # 扁平化提交数据
- submitter: TEXT
- submitted_at: INTEGER
```

## 🔑 设计原则

### 1. 扁平化优先
- Schema 无嵌套，易理解
- 数据结构简单，易协作
- 统计分析轻松，易可视化

### 2. 功能克制
❌ **不做**：子表、复杂联动、自定义逻辑、数据模型版本
✅ **只做**：数据收集、快速统计、简单协作

### 3. 用户体验
- 3分钟创建表单
- 零学习成本
- 即填即看

## 🚀 API 接口

### 表单管理
- `GET /api/forms` - 获取表单列表
- `GET /api/forms/:id` - 获取单个表单
- `POST /api/forms` - 创建表单
- `PUT /api/forms/:id` - 更新表单
- `DELETE /api/forms/:id` - 删除表单

### 数据提交
- `POST /api/forms/:id/submit` - 提交表单
- `GET /api/forms/:id/submissions` - 获取提交列表
- `GET /api/forms/:id/stats` - 获取统计数据

## 📝 使用示例

### 创建表单
1. 点击"创建表单"
2. 填写表单标题和描述
3. 添加需要的字段类型
4. 配置字段属性（标题、必填、选项等）
5. 点击"创建表单"

### 收集数据
1. 分享表单链接给填写者
2. 填写者在线填写并提交
3. 实时查看统计数据

## 🎯 未来规划

- [ ] 表单模板库
- [ ] 数据导出（Excel/CSV）
- [ ] 表单主题定制
- [ ] 移动端优化
- [ ] 批量操作
- [ ] 表单复制功能

## 📄 License

MIT License

---

**Made with ❤️ by Claude**
