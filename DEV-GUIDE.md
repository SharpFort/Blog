# Monolith 新增页面开发经验总结

## 任务回顾

为 Monolith 博客新增「友链（Friend Links）」功能，涉及：
- 后端：新增数据表、存储接口、D1 适配器方法、API 路由
- 前端：新增页面组件、API 客户端函数、路由注册、导航栏链接
- 改动文件：10+ 个

---

## 弯路与教训

### 1. ❌ PowerShell Set-Content 破坏 UTF-8 中文编码

**现象**：用 Set-Content -NoNewline 写入代码文件后，中文字符全部变成乱码，导致 TypeScript 编译报 Unterminated string literal。

**原因**：PowerShell 5.1 的 Set-Content 默认使用系统编码（Windows 上为 GBK），不保留原文件的 UTF-8 BOM。同时 -NoNewline 会去掉末尾换行，与 -replace 配合不当可能截断多字节字符边界。

**正确做法**：永远不要用 PowerShell 的文本替换修改源代码文件。改用 Node.js 脚本：

`javascript
const fs = require("fs");
let content = fs.readFileSync(filePath, "utf8");
content = content.replace(marker, replacement);
fs.writeFileSync(filePath, content, "utf8");
`

### 2. ❌ -replace 操作中的 PowerShell 转义地狱

**现象**：PowerShell 的反引号 `  ` 是转义字符，代码中的模板字面量 ` `` 会被解释为转义序列。同时 $ 触发变量展开，密码类字符串含 $ 会导致解析错误。

**教训**：不要在 PowerShell 命令行中拼接包含模板字面量、$ 符号的代码字符串。

### 3. ❌ 用注释文本做文件插入锚点不可靠

**现象**：想用 /* ── 健康检查端点 ──... */ 作为插入点标记，但因为文件中该行的 ─ 数量与预期不同，匹配失败静默跳过。

**教训**：用 Node.js 脚本按**行号**或**精确子串**（如 pp.get("/api/health"）定位插入点，并在写入后立即校验：

`javascript
const lines = fs.readFileSync(fp, "utf8").split(/\r?\n/);
const idx = lines.findIndex(l => l.includes('app.get("/api/health"'));
lines.splice(idx, 0, ...newLines);
fs.writeFileSync(fp, lines.join("\n"), "utf8");

// 写入后立即验证
const verify = fs.readFileSync(fp, "utf8");
if (!verify.includes(expectedContent)) throw new Error("Insertion failed");
`

### 4. ❌ 忘记更新 ensureSchemaBaseline() 校验表

**现象**：新增 riend_links 表后，Worker 启动时 ensureSchemaBaseline() 检查到该表不满足 equiredTableColumns 而抛错，所有请求返回 500。

**原因**：D1Adapter 的 ensureSchemaBaseline() 在每次请求时校验所有必要表的结构。新增表后必须同步更新 equiredTableColumns：

`	ypescript
const requiredTableColumns = {
    // ... 已有表
    friend_links: ["id", "site_name", "url", "approved", "created_at"],
};
`

**教训**：新增数据表后，检查所有自适应器（D1 / Turso / PG）是否有对应的表结构校验逻辑。

### 5. ❌ 修改 IDatabase 接口后忘记更新所有适配器

**现象**：在 IDatabase 接口添加 5 个友链方法后，TypeScript 报错 TursoAdapter 和 PostgresAdapter 未实现这些方法。

**教训**：Monolith 使用适配器模式，修改 interface IDatabase 必须同步修改 3 个实现：
- storage/db/d1.ts — 完整实现
- storage/db/turso.ts — 至少给存根（	hrow new Error(...)）
- storage/db/postgres.ts — 同上

### 6. ❌ 推送后发现路由不生效 — 文件重置陷阱

**现象**：后端 API 返回 404，因为 index.ts 中的路由没有被部署。

**原因**：之前为了修复编码错误执行过 git checkout -- server/，把 wrangler.toml 和 index.ts 一并还原了。重新部署时 wrangler.toml 中的 database_id 变回上游占位 ID，导致部署失败。修复 wrangler.toml 后重新部署 Worker，但 index.ts 尚未重新打补丁。

**教训**：
- git checkout -- path/ 会影响该目录下**所有**文件
- 打完补丁后验证对关键配置（wrangler.toml、index.ts）的内容
- 部署前后用 curl /api/health 和 curl /api/links 做冒烟测试

### 7. ✅ 正确的开发工作流

总结下来，在 Monolith 中新增功能模块的推荐流程：

`
1. 规划：确定需要的表、API 端点、前端路由
       │
2. 后端：schema.ts → interfaces.ts → d1.ts → turso.ts/pg.ts → index.ts
       │
3. 验证：npx tsc --noEmit（先通过类型检查）
       │
4. 建表：npx wrangler d1 execute ... --remote --command "CREATE TABLE ..."
       │
5. 部署后端：npx wrangler deploy → curl /api/health 验证
       │
6. 前端：api.ts → pages/xxx.tsx → app.tsx → navbar.tsx
       │
7. 构建前端：npm run build → 验证无错误
       │
8. 部署前端：npx wrangler pages deploy dist
       │
9. 冒烟测试：curl /api/xxx + 浏览器访问 /xxx
`

### 8. 💡 文件修改工具选型

| 工具 | 适用场景 | 风险 |
|------|----------|------|
| PowerShell Set-Content | 纯 ASCII 配置 | ❌ 破坏 UTF-8 中文 |
| PowerShell -replace | wrangler.toml 简单值替换 | ⚠️ 反引号多时危险 |
| Node.js .cjs 脚本 | 任何源代码修改 | ✅ 安全可靠 |
| 
ode -e "..." | 单行简单操作 | ❌ 模板字面量会炸 |

**结论**：对源代码文件的任何修改，统一使用 .cjs 脚本文件执行。

---

## 本次改动清单

| 文件 | 改动 |
|------|------|
| server/src/db/schema.ts | +riendLinks 表定义 |
| server/src/storage/interfaces.ts | +FriendLink 类型 + 5 个接口方法 |
| server/src/storage/db/d1.ts | +6 个方法 + ensureFriendLinksTable |
| server/src/storage/db/turso.ts | +5 个存根方法 |
| server/src/storage/db/postgres.ts | +5 个存根方法 |
| server/src/index.ts | +5 个 API 路由 |
| client/src/lib/api.ts | +6 个前端 API 函数 |
| client/src/pages/links.tsx | **新建**友链页面 |
| client/src/app.tsx | +/links 路由 |
| client/src/components/navbar.tsx | +友链导航项 |
