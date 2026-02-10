# Supabase 使用指南（控制台左侧菜单详解）

> 本文基于 Supabase 控制台左侧菜单，从**真实开发视角**系统讲解每个模块的作用、使用场景与注意事项。  
> 适合：个人开发 / 中小项目 / Go + Supabase / 前后端一体化架构。

---

## 🧭 Project Overview（项目总览）

**项目的“驾驶舱”**

### 功能
- 项目运行状态（Running / Paused）
- API URL
- `anon public key`
- `service_role key`
- 数据库连接信息
- 当前套餐（Free / Pro）

### 使用场景
- 配置前后端 `.env`
- 初始化 Supabase Client
- 排查部署 / 鉴权问题

### 注意事项
- ❗ `service_role_key` **只能用于后端 / Edge Function**
- ❗ 前端永远只使用 `anon public key`

---

## 🗂️ Table Editor（表编辑器）

**数据库的可视化管理界面（类似 Excel）**

### 功能
- 新建 / 编辑表
- 添加字段（UUID / JSONB / Enum）
- 手动 CRUD 数据
- 查看表关系（外键）

### 适合
- 原型期快速建表
- 临时修改字段
- Debug 数据

### 建议
- 正式项目：**表结构优先使用 SQL Editor 管理**
- Table Editor 更偏向“辅助工具”

---

## 🧠 SQL Editor（核心模块）

**真正掌控 Supabase 的地方**

### 能做什么
- 建表 / 改表
- 写 Trigger / Function
- 开启 Realtime
- 写 RLS（行级安全）
- 数据迁移（Migration）

### 示例
```sql
create table posts (
  id uuid primary key default gen_random_uuid(),
  title text,
  created_at timestamp default now()
);
```

### 高级用法
- `auth.uid()` 获取当前用户
- `security definer` 函数
- 触发 Realtime 事件

> Supabase 会不会用，80% 取决于 SQL 能力

---

## 🛢️ Database（数据库设置）

**PostgreSQL 本体配置**

### 包含
- Extensions（pgcrypto / uuid-ossp / pgvector）
- Replication（Realtime 依赖）
- Backups
- Connection Pooling

### 使用场景
- 开启 `gen_random_uuid()`
- 启用向量搜索（AI）
- 性能调优

---

## 🔐 Authentication（用户认证）

**开箱即用的用户系统**

### 支持方式
- Email + Password
- Magic Link
- OAuth（GitHub / Google / Apple）
- 匿名登录

### 核心表
- `auth.users`
- `auth.sessions`

### 实战要点
- Auth ≠ 数据权限
- 必须搭配 **RLS** 使用

---

## 📦 Storage（对象存储）

**文件上传与管理**

### 功能
- Bucket 管理
- Public / Private
- Signed URL
- 文件 CRUD

### 适合
- 头像
- 附件
- 报表导出

### 推荐结构
```
avatars/{user_id}.png
files/{project_id}/{uuid}.pdf
```

---

## ⚡ Edge Functions（云函数）

**Deno + TypeScript Serverless**

### 能做
- 复杂业务逻辑
- 第三方 API 调用
- Webhook
- 使用 `service_role_key`

### 与 Go 的关系
- Go：主后端
- Edge Function：补充能力

---

## 🔄 Realtime（实时能力）

**WebSocket 实时系统**

### 支持
1. 表数据变更监听
2. Broadcast 广播
3. Presence 在线状态

### 应用场景
- 聊天
- 实时通知
- 协同编辑
- 后台实时刷新

### 注意
- 表需开启 replication
- RLS 决定可见性

---

## 🧠 Advisors（顾问）

**自动性能 & 安全分析**

### 会提示
- 缺失索引
- 慢查询
- RLS 风险

### 建议
- 上线前必看

---

## 📈 Observability（可观测性）

**运行状态监控**

### 包含
- API 请求
- Realtime 连接
- Edge Function 执行
- 错误率

---

## 📜 Logs（日志）

**问题排查神器**

### 包含
- API Logs
- Database Logs
- Auth Logs
- Function Logs

---

## 📚 API Docs（接口文档）

**自动生成数据库 API 文档**

### 内容
- 表 CRUD 示例
- JS / curl 示例
- 权限说明

---

## 🔌 Integrations（集成）

**第三方服务对接**

- Stripe
- Vercel
- GitHub
- Logflare

---

## ⚙️ Project Settings（项目设置）

**项目级配置**

### 包含
- API Keys
- CORS
- 域名
- 项目暂停 / 删除
- 账单

### 注意
- ❗ 防止泄露 Service Role Key
- ❗ 生产环境慎删项目

---

## ✅ 总结

Supabase =  
**PostgreSQL + Auth + Storage + Realtime + Serverless 的全家桶**

非常适合：
- 独立开发者
- 中小型项目
- Go / Node / 前端全栈架构

---

*文档生成：ChatGPT*  
