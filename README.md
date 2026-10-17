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

## Windows 首次安装

要求 Node.js 22.12.0 或更新版本。打开 PowerShell：

```powershell
node --version
npm --version
cd D:\PenangLRTCommunityHub\site
npm ci
```

不需要单独安装数据库。网站第一次启动时会自动创建 SQLite 文件和示例公告。

## 启动开发版本

```powershell
cd D:\PenangLRTCommunityHub\site
npm run dev
```

电脑打开 `http://localhost:5173/`。网站默认监听所有本地网卡，所以同一局域网的手机可以打开 `http://电脑IPv4地址:5173/`。当前电脑地址可用下面命令查询：

```powershell
ipconfig
```

例如电脑 IPv4 是 `192.168.31.174`，手机就打开 `http://192.168.31.174:5173/`。电脑和手机必须处于同一 Wi-Fi／局域网。Windows 防火墙询问时只允许“专用网络”。

## 创建账号

### 居民账号

打开 `/login`，选择“创建居民账号”，输入姓名、邮箱和至少 8 位密码。账号和密码哈希只保存在本机 SQLite 中。

### 第一个施工团队账号

打开 `/team/login`。系统没有团队账号时会显示首次设置表单，需要填写本机 `.env.local` 中的 `LOCAL_SETUP_KEY`。不要把该密钥写入文档或提交到 GitHub。首次创建团队账号后建议更换设置密钥并重启网站；系统已有团队账号后，网页不会再允许创建首个团队账号。

## 在一条公告中绘制多条施工路段

施工团队登录 `/team` 后，新建或选择公告，在“绘制施工路段”中搜索道路或地标。先沿第一段道路依次点击起点、转弯点和终点；遇到同时施工的分支，点击“新增路段”，再为新路段绘制节点。点击“路段 1”“路段 2”等按钮可切换正在编辑的路段。“撤销上一点”和“删除当前路段”只作用于选中的路段。完成后点击“保存公告”。

已绘制的路段会一起显示在公告详情及“查看完整地图”页面。旧公告的单条路线会自动作为“路段 1”读取；地图底图和道路搜索需要联网。

## 正式本地运行

先构建一次：

```powershell
cd D:\PenangLRTCommunityHub\site
npm run build
npm start
```

`npm start` 同样监听 `0.0.0.0:5173`，可从电脑和同一局域网手机访问。保持 PowerShell 窗口运行；停止时按 `Ctrl+C`。

## 常见问题

- 手机打不开：确认电脑与手机在同一网络，检查 Windows 防火墙是否允许 Node.js 访问专用网络，并确认路由器没有开启设备隔离。
- 端口被占用：关闭原来的 Node.js 服务，再运行启动命令。
- 忘记居民或团队密码：当前版本没有邮件找回功能。可由维护人员直接管理本地数据库，或删除 `data` 文件夹重新初始化；删除 `data` 会永久删除所有账号、公告、报告和图片，操作前务必备份。
- 迁移电脑：复制整个项目，并额外确保 `data` 文件夹和 `.env.local` 一起复制。
- 外网访问：此配置只用于本机和可信局域网。不要把 5173 端口直接暴露到互联网；若要公开上线，需要 HTTPS、反向代理、备份和更严格的安全配置。

## 主要命令

```powershell
npm run dev    # 开发模式，修改代码后自动刷新
npm run build  # 检查并构建正式版本
npm start      # 运行已构建的正式版本
npm run lint   # 代码检查
```
