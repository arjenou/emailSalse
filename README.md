# Kylon Outreach

面向中国企业的日本市场 B2B 自动开发 SaaS MVP。

## 架构

- `apps/web`: Next.js Web 应用，部署到 Vercel
- `apps/api`: Cloudflare Worker API，绑定 D1 和 R2
- `apps/automation`: 独立 Node.js 自动化 Worker，后续接入 Playwright 和 AI Provider
- `packages/core`: 共享领域模型、状态机和 Credits 规则

MVP 使用 D1 `jobs` 表作为数据库队列，不依赖 Redis 或 BullMQ。所有外联提交默认使用 `DRY_RUN=true`，只有配置真实浏览器执行器并明确关闭 dry-run 后才允许对外提交。

## 当前实现

- 响应式落地页与产品控制台
- Product 和 Campaign 创建表单
- Campaign Start / Pause 状态流转
- D1 完整初始数据模型与本地演示数据
- D1 Job 原子抢锁、完成与失败接口
- Credits 成功扣费与 `reference_id` 幂等约束
- 每分钟 JST Campaign 调度和 Active Run 跳过规则
- R2 私有成功证据元数据模型
- 独立 Automation Worker 与默认 dry-run 保护

真实企业发现、AI Provider、合规检测和 Playwright 表单适配器仍需接入供应商与站点策略后再开启 live mode。

## 本地启动

```bash
npm install
cp .env.example .env.local
npm run dev:api
npm run dev:web
```

另开终端运行自动化 Worker：

```bash
npm run dev:automation
```

初始化本地 D1：

```bash
cd apps/api
npx wrangler d1 migrations apply kylon-outreach --local
npx wrangler d1 execute kylon-outreach --local --file seeds/local_demo.sql
```

## 关键安全约束

- 只有确认提交成功才扣除 1 Credit
- `credit_ledger(workspace_id, reference_id)` 唯一，确保重试不重复扣费
- Job 必须通过条件更新抢锁
- CAPTCHA、禁止营业联系、不确定提交结果均不发送且不扣费
- R2 bucket 保持私有，D1 只保存 object key 和 metadata

## Cloudflare 部署

- Worker API: `https://kylon-outreach-api.wangyunjie1101.workers.dev`
- D1: `kylon-outreach`（APAC）
- R2: `kylon-outreach-evidence`（private）
- Cron: 每分钟检查一次 JST Campaign 计划

生产环境的 `/v1/*` 和 `/internal/*` 均要求 Worker Secret。`/health` 保持公开。前端部署到 Vercel 后，应通过经过用户认证的 Next.js 服务端代理调用 `/v1/*`，不要把 Worker Secret 放进 `NEXT_PUBLIC_*` 环境变量。
