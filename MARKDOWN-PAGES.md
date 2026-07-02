# Monolith Markdown 页面 vs 全栈开发：能力边界与选型指南

> **摘要**：Monolith 的「页面管理」功能让人眼前一亮——在后台写一段 Markdown 就能生成一个功能齐全的页面，自带代码高亮、KaTeX 数学公式、视频嵌入和 SEO 元标签。但它能替代自定义开发吗？本文从实现原理出发，系统对比 Markdown 页面与友链这类全栈功能的能力差异，划出清晰的边界线，并提供一份可复用的 AI 提示词，让 Agent 帮你判断该用哪种方式、自动生成页面。

---

## 访问方式

Markdown 创建的页面通过固定路由访问：

```
https://你的域名/page/{slug}
```

例如：
- 后台创建 slug 为 `about` 的页面 → 访问 `https://blog.sharpfort.net/page/about`
- 后台创建 slug 为 `links` 的页面 → 访问 `https://blog.sharpfort.net/page/links`

> ⚠️ 注意区分：`/links` 是友链功能（我们手写的 React 组件），`/page/links` 才是 Markdown 页面。两者路由完全不同。

---

## 实现原理

### 数据流

```
后台 /admin/pages
  │  填写：标题 / Slug / Markdown 内容 / 排序 / 是否发布 / 是否显示导航
  ▼
POST /api/admin/pages  →  D1 pages 表 (upsert)
  │
  ▼
前台 /page/:slug
  │  路由匹配 → DynamicPage 组件
  │  GET /api/pages/:slug → 读取 pages 表
  ▼
renderMarkdown(content)
  │  marked (解析) + highlight.js (代码高亮)
  │  + KaTeX (数学公式) + DOMPurify (XSS 过滤)
  ▼
HTML 输出 → 浏览器渲染
```

### 核心渲染器

`renderMarkdown()` 是 Monolith 前端最复杂的工具函数，位于 `client/src/lib/markdown.ts`：

| 处理层 | 工具 | 作用 |
|--------|------|------|
| 数学预处理 | KaTeX | 在 Markdown 解析前将 `$...$` / `$$...$$` 转为 HTML |
| Markdown 解析 | marked (GFM) | 将 Markdown 文本解析为 HTML 结构 |
| 代码增强 | highlight.js | 17 种语言语法高亮 + 标题栏 + 行高亮 + 复制按钮 |
| 安全过滤 | DOMPurify | 白名单净化，允许 iframe/video/math 等安全标签，屏蔽 <form>/<script> |
| 图片 | 原生懒加载 | `loading="lazy"` + 渐入动画 |
| 视频 | URL 检测 | 自动识别 YouTube/Bilibili/MP4 链接并转换为嵌入播放器 |

---

## 能力矩阵

### ✅ Markdown 页面能做的

| 能力 | 说明 |
|------|------|
| 富文本排版 | 标题、段落、粗体、斜体、删除线、引用、分割线 |
| 代码展示 | 17 种语言高亮、标题栏（`title="文件名"`）、行高亮（`{1,3-5}`）、一键复制 |
| 数学公式 | KaTeX 行内公式 `$E=mc^2$` 和块级公式 `$$...$$ |
| 表格 | GFM 表格 + 响应式滚动包裹 |
| 图片 | 懒加载 + 自适应圆角 + 标题行 |
| 视频 | YouTube / Bilibili / MP4/WebM 直链播放 |
| 外部链接 | 自动 `target="_blank"` |
| SEO | 自动注入 Open Graph / Twitter Card / JSON-LD |
| 导航栏 | 勾选「显示导航」即出现在顶部菜单 |
| 目录 | 自动从 h2-h4 提取生成 TOC 侧边栏 |
| 缓存 | Cloudflare 边缘缓存，全球 <50ms |

### ❌ Markdown 页面不能做的

| 缺失能力 | 根本原因 |
|----------|----------|
| **数据库查询** | Markdown 是纯文本字符串，没有查询引擎 |
| **列表渲染** | 无法从 D1/R2 读取数据并动态生成列表 |
| **表单提交** | DOMPurify 白名单屏蔽 `<form>`/`<input>`/`<button>` |
| **用户交互** | 无 React 状态管理，无 `useState`/`useEffect` |
| **API 调用** | 无 JS 运行时，`fetch()` 不存在 |
| **条件渲染** | 无「加载中」「空状态」「错误重试」等状态展示 |
| **权限控制** | 无法区分公开视图和管理视图 |
| **实时更新** | 修改后需刷新页面，无 WebSocket/轮询 |

---

## 边界：什么时候用哪种

| 场景 | 方案 | 原因 |
|------|------|------|
| About / 关于我 | **Markdown 页面** | 纯展示，无交互 |
| Privacy Policy / 隐私政策 | **Markdown 页面** | 法律文本，一次写定 |
| Terms of Service | **Markdown 页面** | 静态条款 |
| 项目展示 / Portfolio | **Markdown 页面** | 图文展示即可 |
| 使用指南 / 文档 | **Markdown 页面** | 导读性内容 |
| 友链声明页（纯文字） | **Markdown 页面** | 说明性文字 |
| 动态友链列表 + 提交/审核 | **全栈开发** | 需数据库查询、表单、权限 |
| 评论系统 | **全栈开发** | 用户输入 + 审核流程 |
| 留言板 | **全栈开发** | 需表单提交 + 存储 |
| 搜索功能 | **全栈开发** | 需后端检索算法 |
| 数据仪表盘 | **全栈开发** | 需聚合查询 + 图表 |

> **简单记法**：只要涉及“用户输入东西”或“从数据库取东西出来给用户看”，就必须走全栈开发。否则 Markdown 页面 5 分钟搞定。

## 可复用的 AI 提示词

当你需要在 Monolith 中新增一个页面时，把下面的提示词发给 AI Agent：

```markdown
我需要在 Monolith 博客中新增一个页面，请先帮我分析这个页面应该用哪个方案。

我的需求是：[在这里描述你的页面要做什么]

请按以下步骤帮我：

1. **方案判断**：分析这个页面是「纯内容展示」还是需要「数据查询/用户交互」，告诉我应该用 Markdown 页面还是全栈开发。

2. **如果是 Markdown 页面**，请询问我以下信息：
   - 页面标题（必填）
   - URL Slug（如 about、friends，建议用英文小写连字符）
   - 内容取向：偏技术文档 / 个人介绍 / 项目展示 / 其他
   - 是否需要显示在顶部导航栏
   - 是否需要目录 TOC
   然后根据我的回答，生成完整的 Markdown 内容，包括：
   - 合适的标题层级结构
   - 表格（如有对照信息）
   - 代码示例（如适用）
   - 图片/视频占位（如需要）

3. **如果是全栈开发**，请告诉我需要新增哪些文件和 API，给出完整的实现方案（就像开发友链功能那样）。

4. 生成后，告诉我如何在后台创建/部署这个页面。
```

### 简化版（你已经知道要用 Markdown）

```markdown
帮我在 Monolith 后台创建一个 Markdown 页面。
标题：[你的标题]
Slug：[url-slug]
内容方向：[技术文档 / 个人介绍 / 项目展示 / 隐私政策 / 其他]
显示在导航栏：[是 / 否]
需要 TOC：[是 / 否]

请生成完整的 Markdown 内容。
```

---

## 文章元信息

| 字段 | 值 |
|------|------|
| **标题** | `Monolith Markdown 页面 vs 全栈开发：能力边界与选型指南` |
| **分类** | `教程` |
| **标签** | `Monolith` `Markdown` `Cloudflare` `博客开发` `全栈` |
| **系列** | `Monolith 博客定制` |
| **Slug** | `monolith-markdown-vs-fullstack` |
