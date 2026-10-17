# Mutiara Line Community Desk（完全本地版）

这是 CMT322 Penang LRT Mutiara Line 社区平台的完整本地版本。界面使用 React/Next.js，但运行、账号、数据库和图片文件都在本机，不使用 Sites、ChatGPT 登录、Cloudflare D1 或 R2。

## 系统结构

- 居民、通行者、商户：无需登录即可看施工公告概览；查看全文、提交问题和保存提醒时使用本地居民账号。
- 施工团队：使用独立的 `/team/login` 入口和本地团队账号；可以发布施工公告、查看居民报告和更新处理状态。
- 数据库：`data/mutiara-community.db`（SQLite）。
- 上传图片：`data/uploads/`。
- 登录会话：保存在 SQLite 中，通过仅限 HTTP 的 Cookie 识别，有效期 7 天。
- 界面语言：English、中文、Bahasa Melayu。

`data/` 和 `.env.local` 已被 Git 忽略，不应提交或分享。备份网站数据时，应同时备份整个 `data` 文件夹。

## Windows 本地部署（新电脑）

安装 Git 和 Node.js 22.12.0 或更新版本。打开 PowerShell，检查版本并克隆仓库：

```powershell
git --version
node --version
npm --version
cd $env:USERPROFILE
git clone https://github.com/Dundun123123/322-Penang-Metro.git
cd .\322-Penang-Metro
npm ci
```

如果想放在其他位置，请在 `git clone` 前切换到目标文件夹；如果 GitHub 要求登录，请使用有权访问该仓库的账号完成认证。下列命令都应在仓库根目录执行。复制可公开上传的环境变量模板：

```powershell
Copy-Item .env.example .env.local
notepad .env.local
```

可以在 PowerShell 中生成随机密钥：

```powershell
$secretBytes = New-Object byte[] 32
$randomGenerator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$randomGenerator.GetBytes($secretBytes)
$randomGenerator.Dispose()
[System.BitConverter]::ToString($secretBytes).Replace('-', '')
```

把输出的字符串填在 `.env.local` 的 `LOCAL_SETUP_KEY=` 后面，保存。`.env.example` 只列出变量名，不包含可直接使用的密钥；`.env.local` 是每台电脑自己的秘密文件，不要上传。网站运行不需要其他环境变量，也不需要单独安装数据库。第一次启动时会自动创建 SQLite 文件和示例公告。

构建并启动正式本地服务：

```powershell
npm run build
npm start
```

电脑打开 `http://localhost:5173/`，施工团队入口是 `http://localhost:5173/team`。保持此 PowerShell 窗口运行；关闭窗口或让电脑休眠都会使网站暂时无法访问。停止服务时按 `Ctrl+C`。

同一局域网的手机可以用这台电脑的 IPv4 地址访问。另开一个 PowerShell 窗口运行 `ipconfig`，找到当前 Wi-Fi 或以太网适配器的 IPv4 地址，然后在手机打开 `http://该地址:5173/`（例如 `http://192.168.31.174:5173/`）。也可以尝试 `http://电脑名称:5173/`，电脑名称用 `hostname` 查看；如果手机无法解析名称，请使用 IPv4 地址。电脑和手机必须处于同一可信局域网；Windows 防火墙询问时只允许“专用网络”，不要开放路由器的公网端口。地图底图和地点搜索仍需要互联网。

## 启动开发版本

仅在修改代码时使用；先停止占用 5173 端口的正式服务，再在项目根目录运行：

```powershell
npm run dev
```

开发模式同样使用 5173 端口，但正式展示建议使用上面的 `npm run build` 和 `npm start`。

## 创建账号

### 居民账号

打开 `/login`，选择“创建居民账号”，输入姓名、邮箱和至少 8 位密码。账号和密码哈希只保存在本机 SQLite 中。

### 第一个施工团队账号

打开 `/team/login`。系统没有团队账号时会显示首次设置表单，需要填写本机 `.env.local` 中的 `LOCAL_SETUP_KEY`。不要把该密钥写入文档或提交到 GitHub。首次创建团队账号后建议更换设置密钥并重启网站；系统已有团队账号后，网页不会再允许创建首个团队账号。

## 在一条公告中绘制多条施工路段

施工团队登录 `/team` 后，新建或选择公告，在“绘制施工路段”中搜索道路或地标。先沿第一段道路依次点击起点、转弯点和终点；遇到同时施工的分支，点击“新增路段”，再为新路段绘制节点。点击“路段 1”“路段 2”等按钮可切换正在编辑的路段。“撤销上一点”和“删除当前路段”只作用于选中的路段。完成后点击“保存公告”。

已绘制的路段会一起显示在公告详情及“查看完整地图”页面。旧公告的单条路线会自动作为“路段 1”读取；地图底图和道路搜索需要联网。

## 更新已经部署的网站

先在运行网站的 PowerShell 窗口按 `Ctrl+C` 停止服务。在仓库根目录执行：

```powershell
git pull --ff-only
npm ci
npm run build
npm start
```

更新代码不会自动删除被 Git 忽略的 `.env.local` 和 `data/`，但更新前仍应备份数据。如果 `git pull --ff-only` 因本地代码改动而停止，不要强制覆盖；先处理本地改动。

## 搬迁和备份数据

GitHub 仓库只包含代码。居民账号、公告、报告和图片保存在项目根目录的 `data/`，密钥在 `.env.local`。搬迁到另一台电脑时，先停止旧电脑的网站，备份并复制**整个** `data/` 文件夹和 `.env.local` 到新电脑的仓库根目录，然后再启动新电脑的网站。不要只复制单个 `.db` 文件，也不要把这两个私有内容提交到 GitHub。

## 常见问题

- 手机打不开：确认电脑与手机在同一网络，检查 Windows 防火墙是否允许 Node.js 访问专用网络，并确认路由器没有开启设备隔离。
- 端口被占用：关闭原来的 Node.js 服务，再运行启动命令。
- 忘记居民或团队密码：当前版本没有邮件找回功能。可由维护人员直接管理本地数据库，或删除 `data` 文件夹重新初始化；删除 `data` 会永久删除所有账号、公告、报告和图片，操作前务必备份。
- 迁移电脑：先按上面的搬迁步骤停止旧服务，再复制完整的 `data/` 和 `.env.local`。
- 外网访问：此配置只用于本机和可信局域网。不要把 5173 端口直接暴露到互联网；若要公开上线，需要 HTTPS、反向代理、备份和更严格的安全配置。

## 主要命令

```powershell
npm run dev    # 开发模式，修改代码后自动刷新
npm run build  # 检查并构建正式版本
npm start      # 运行已构建的正式版本
npm run lint   # 代码检查
npm run typecheck # TypeScript 类型检查
```

## GitHub CI

`.github/workflows/ci.yml` 会在推送到 `main` 和针对 `main` 的 Pull Request 时运行：`npm ci`、lint、TypeScript 类型检查和正式构建。CI 只验证代码，不使用本机 `.env.local`、数据库或上传图片，也不会自动部署到本地电脑。部署更新仍按上面的“更新已经部署的网站”步骤手动执行。
