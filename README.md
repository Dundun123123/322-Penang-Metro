# Mutiara Line Community Desk

This is the full-stack CMT322 Penang LRT Mutiara Line community platform. It supports English, Chinese and Malay, and stores notices, issue reports, response history and alert preferences in D1. Optional report photos are stored in R2.

The site is a student project. Do not publish unverified construction or traffic information as an official notice.

## Main flows

- Project team: use the separate `/team/login` entrance, sign in, open `/team`, claim the first administrator account with the one-time setup key, create a notice in draft or published state, edit or archive notices, inspect reports and photos, and add status updates with optional Chinese and Malay translations. Authentication alone does not grant team permissions.
- Community member: browse published notice summaries without signing in. Opening a full notice goes through `/login` and returns to that notice after sign-in. Signed-in users can choose alert categories and submit an issue with an optional image, then track it by reference number. Anyone holding a valid report reference and access code can track that report.
- Language: choose English, 中文 or Bahasa Melayu from the header. The interface preference is saved in the browser. Staff-authored content falls back to English when a translation is missing.

## Access and storage

Hosted private access uses Sites sign-in. Report creation and alert preferences require a signed-in account. Reports are visible to their owner or to someone holding the reference and access code. Project team operations require an administrator record. The first administrator must claim the role using ADMIN_SETUP_KEY, stored as a Sites secret.

The site uses DB for D1 and BUCKET for R2, declared in .openai/hosting.json. The first migration is in drizzle/. Local development can set a test key in an ignored .dev.vars file.

## Windows 本地安装与运行

以下步骤在 **PowerShell** 中执行。完整功能版代码位于 `D:\PenangLRTCommunityHub\site`；上一级目录中的 `index.html` 是早期静态原型，不能直接打开它来使用数据库、上传或管理功能。

### 1. 准备环境与打开代码

安装 Node.js **22.13.0 或更新版本**（安装时包含 npm）。在 PowerShell 中检查：

```powershell
node --version
npm --version
```

用 VS Code 选择“文件 → 打开文件夹”，打开 `D:\PenangLRTCommunityHub\site`。然后打开 VS Code 的“终端 → 新建终端”；也可以直接使用 Windows PowerShell。

### 2. 安装依赖

```powershell
cd D:\PenangLRTCommunityHub\site
npm ci
```

`npm ci` 会按 `package-lock.json` 安装依赖。已有 `node_modules` 且依赖未变化时，可以跳过。`npm run db:generate` **不是首次安装步骤**，仅在修改 `db/schema.ts` 后生成新的数据库迁移时使用。

### 3. 首次初始化本地数据库

先构建项目，以生成本地 Wrangler 配置：

```powershell
npm run build
```

然后执行项目现有的第一条迁移：

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_amused_husk.sql
```

此命令只操作本地 `.wrangler/state` 中的测试数据库，不会修改线上数据。同一个本地数据库**不要重复执行**已执行过的迁移。今后若新增迁移，按文件顺序只执行尚未执行的 SQL 文件。

### 4. 启动并在浏览器打开

```powershell
npm run dev
```

保持这个终端窗口运行，浏览器访问 **http://localhost:5173/**。停止服务时在终端按 `Ctrl+C`。居民登录页为 `/login`，施工团队入口为 `/team/login`。本地预览通过内置模拟登录测试流程，不是线上真实账号验证。

### 5. 可选：启用本地管理员功能

首次进入 `http://localhost:5173/admin` 时，若需创建本地管理员，在 `site` 文件夹中新建**不提交到 Git** 的 `.dev.vars` 文件，填入一行本地测试密钥：

```text
ADMIN_SETUP_KEY=请替换为你自己设置的本地测试密钥
```

重启 `npm run dev`，通过本地登录入口登录后，在 `/admin` 输入同一密钥以激活首位管理员。请勿在 README、截图或 Git 中写入真实线上密钥；本地密钥与线上环境是分开的。

### 6. 可选：让同一局域网内的手机访问

电脑和手机须连接同一个 Wi-Fi／局域网。先在电脑的 PowerShell 中运行 `ipconfig`，找到电脑当前网络的 **IPv4 地址**（例如 `192.168.31.174`）。关闭已有的开发服务，然后在 `site` 文件夹内运行：

```powershell
cd D:\PenangLRTCommunityHub\site
$env:SITE_LAN_HOST = '192.168.31.174'  # 换成你电脑当前的 IPv4 地址
npm run dev
```

保持终端运行，在手机浏览器打开 `http://192.168.31.174:5173/`（IP 换成你的实际地址）。电脑 IP 变化后，需要重新设置 `SITE_LAN_HOST` 并重启服务。若 Windows 防火墙弹出提示，只允许在**专用网络**访问；不要开放到公用网络或互联网。若手机仍打不开，检查两台设备是否在同一网络、路由器是否开启设备隔离，以及防火墙是否阻止 5173 端口。

**安全提示：**这是开发预览，登录是本地模拟账号，同一局域网访问者可能共用该测试身份；它仅适合可信网络上的演示和测试，不适合公开使用或存放真实个人资料。需要真实多人登录时，应使用正式托管部署与访问控制。结束演示后按 `Ctrl+C` 停止服务；新开终端或执行 `Remove-Item Env:SITE_LAN_HOST` 即恢复默认只在本机访问。

**局域网登录限制：**Sites 内置的模拟登录只接受本机 `localhost/127.0.0.1` 请求。手机通过 `192.168.x.x` 可以浏览公开首页和公告摘要，但在此开发预览中无法完成登录，因此不能在手机上打开受保护的详情、提交报告或进入团队工作台。不要通过放宽模拟登录的安全检查来解决；真实手机登录需要正式托管站点的身份验证与合适的访问权限。目前线上站点仍保持私有。

### 常见问题

- `node` 或 `npm` 无法识别：安装符合版本要求的 Node.js，关闭并重新打开终端。
- `localhost:5173` 无法访问：确认 `npm run dev` 仍在运行，并查看终端中的实际端口或报错；不要双击 `index.html`。
- 提示数据库表不存在：确认已成功完成第 3 步，并且命令在 `site` 文件夹内运行。
- 端口 5173 被占用：关闭占用该端口的旧开发服务，再运行 `npm run dev`。

开发人员可运行 `node scripts/smoke-local.mjs` 检查本地完整流程；该脚本会在本地数据库创建测试公告、报告和订阅记录，且首次管理员初始化需要将 `.dev.vars` 的 `ADMIN_SETUP_KEY` 设为 `local-test-setup-key`。不要对线上网站运行此脚本。

## Operational notes

This version provides in-app category alerts. Email or SMS delivery would require an external delivery provider and credentials. The site starts owner-private; access for additional project team members or the wider public must be configured separately before real use.
