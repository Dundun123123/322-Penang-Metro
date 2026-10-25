# 三台电脑共用 MySQL

需要 MySQL 8.4、Node.js 22.12+，三台电脑的 Tailscale 在线。数据库主机必须开机、不休眠并运行 MySQL；DBeaver 可关闭。

## 1. 数据库主机操作一次

原有七张表及上一轮新增字段需已创建：app_user、auth_session、notice、report、report_event、notice_subscription、notice_image。使用 root 在 DBeaver 执行 `db/mysql/001-shared-uploads.sql`，添加第八张 `uploaded_file` 并放宽两个原字段长度。已有数据库账号对 `penang_metro.*` 的 SELECT/INSERT/UPDATE/DELETE 授权覆盖新表，无需授予建表权限。网站启动不会自动建表或修改结构。

新安装的空数据库可使用 `db/mysql/schema.sql` 创建完整结构。该脚本的 CREATE IF NOT EXISTS 不负责修复旧表缺失的字段。

## 2. 每人设置自己的 .env.local

在项目根目录复制 `.env.example` 为 `.env.local`；已有文件时直接编辑，不要覆盖自己的密码。不要把 `.env.local` 提交到 GitHub，数据库变量不要使用 NEXT_PUBLIC_ 前缀。

| 设置        | 你的电脑         | CYY              | JYY              |
| ----------- | ---------------- | ---------------- | ---------------- |
| DB_HOST     | 127.0.0.1        | 100.95.95.88     | 100.95.95.88     |
| DB_PORT     | 3306             | 3306             | 3306             |
| DB_NAME     | penang_metro     | penang_metro     | penang_metro     |
| DB_USER     | metro_app        | metro_cyy        | metro_jyy        |
| DB_PASSWORD | metro_app 的密码 | metro_cyy 的密码 | metro_jyy 的密码 |

例如 CYY 的文件：

```dotenv
DB_HOST=100.95.95.88
DB_PORT=3306
DB_NAME=penang_metro
DB_USER=metro_cyy
DB_PASSWORD="填写自己账号的密码"
LOCAL_SETUP_KEY=
```

只有创建首个施工团队账号的电脑需要填写一个随机 `LOCAL_SETUP_KEY`。共享库中已有团队账号后，其余电脑可直接通过 `/team/login` 登录同一个网站账号。MySQL 数据库账号与网页登录账号是两套账号。

## 3. 每人安装、检查、运行

拉取此改动所在分支后执行：

```powershell
npm ci
npm run db:check
npm run dev
```

打开 `http://localhost:5173`。`db:check` 只读检查连接身份、八张表的必要字段以及图片上传所需的包大小，不会新增测试账号或修改数据。修改 .env.local 后重启网站。

如果提示 max_allowed_packet 不足，用 root 执行 `SET PERSIST max_allowed_packet = 67108864;`，然后重启网站以建立新连接。5 MB 图片以二进制参数传输时需留足包大小余量。

正式展示可改用 `npm run build` 和 `npm start`。

## 4. 三人验证

1. CYY 在自己的网页注册一个居民账号；你在 DBeaver 的 app_user 表应能看到该账号。
2. JYY 在自己的网页使用同一居民账号登录，确认账号共享。
3. CYY 提交一份带图片的报告；你用施工团队账号在自己网页查看报告和图片，并更新处理状态。
4. CYY 刷新报告进度，应看到更新；订阅设置也会随账号跨电脑共享。
5. 你发布带图片的公告；两位组员刷新网页，应能读取正文和图片。

共享数据在重新查询或刷新后显示，目前没有推送式实时刷新。各浏览器仍需分别登录。

## 数据与故障排查

- 本版没有 SQLite 回退：MySQL 不可达时会报错，不会偷偷写入另一份本地数据库。
- 原 SQLite 中的账号、公告、报告和本地图片不会自动迁移；旧文件保留。如 MySQL 是空库，需重新注册和创建公告。
- `ECONNREFUSED` / 超时：确认主机 MySQL、Tailscale、3306 防火墙规则和目标 IP。
- `Access denied`：检查每人的 DB_USER/DB_PASSWORD，以及 MySQL 账号来源 IP 是否对应其 Tailscale 地址。
- 缺表或缺字段：使用 root 完成此前的结构升级和本次图片表脚本。
- 备份整个 MySQL 数据库，包括 uploaded_file。小组开发将图片集中在数据库中，避免另开文件服务。

## 开发验证（仅限独立测试数据库）

`npm run test:shared` 会创建测试账号、报告、公告并清理，仅在独立测试库和两个测试网站实例上运行。通过 SMOKE_BASE_URL、SMOKE_SECOND_BASE_URL 指定两个地址，SMOKE_ALLOW_WRITES=1 明确允许测试数据写入。不要对小组实际数据库运行这个测试。
