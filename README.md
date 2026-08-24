# Kylon Outreach

供个人使用的日本 B2B 企业发现与联系表单自动化工具。前端部署在 Vercel，API、D1 数据库与 R2 截图存储位于 Cloudflare；Playwright Worker 默认在本机运行。

## 已实现

- Workspace、产品与 Campaign 的真实管理页面
- 公开企业目录抓取，或通过可选的 Brave Search 搜索公开来源
- 官网解析、Lead Score、联系表单发现与禁止营业联系检测
- Playwright 自动填写日文联系表单并保存截图
- 可见 CAPTCHA、禁止推销声明、无法确认结果时自动停止
- D1 任务队列、锁租约、失败重试与 R2 证据存储
- 管理后台 Basic Auth；Cloudflare Worker Secret 只存在服务端

付费和 Credits 不参与当前执行链路。默认 `DRY_RUN=true`：系统会填写表单并截图，但绝不会点击提交。

## 第一次本地启动

需要 Node.js 20 以上。在仓库根目录执行：

```bash
npm install
npx playwright install chromium
cp .env.example .env.local
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.dev.vars.example apps/api/.dev.vars
```

把三个文件中的 Worker Secret 改成同一个值。然后初始化本地数据库：

```bash
cd apps/api
npx wrangler d1 migrations apply email-salse --local
cd ../..
```

分别打开三个终端：

```bash
npm run dev:api
npm run dev:web
npm run dev:automation
```

打开 `http://localhost:3000/dashboard/settings`，按顺序完成 Workspace、产品和 Campaign。没有 Brave Search Key 时，在 Campaign 中至少填写一个公开的企业目录或参展商名单网址。

## 线上结构

- Web: `https://email.yingmu-tech.com`
- API: `https://email.api.yingmu-tech.com`
- Cloudflare Worker: `email-salse-api`
- D1: `email-salse`
- R2: `email-salse-evidence`

Vercel 项目需要配置 `apps/web/.env.example` 中的四个变量。Cloudflare Worker 需要设置 `WORKER_SHARED_SECRET`，本机 `.env.local` 的 `AUTOMATION_WORKER_TOKEN` 必须与之相同。

## 开启真实提交

先在 `DRY_RUN=true` 下检查外联记录和截图。只有你明确接受目标来源、文案与站点行为后，才把 `.env.local` 改为 `DRY_RUN=false` 并重启 Worker。提交任务不会自动重试，以避免重复发送。
