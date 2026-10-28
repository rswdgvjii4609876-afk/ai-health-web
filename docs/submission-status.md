# 参赛提交状态（2026-10-28）

## 已完成并可复核

- 前后端源码、Maven Wrapper、依赖锁文件、环境变量示例、README、AGENTS 与 Git 历史。
- 本机演示的四类画像、30 天记录、7/30 天回顾、知识卡片与来源、行动、历史提问、独立助手、演示邮箱账号。
- 8 页技术 PDF：`output/pdf/xike-technical-report.pdf`；可编辑源文件 `docs/technical-report.html`，截图在 `docs/images/`。
- 本机可手动上传的运行包：`output/release/xike-runtime.zip`（含 JAR、前端静态文件与 Linux 部署示例；构建产物不提交 Git）。
- 后端 `mvnw.cmd -q verify`：29 项测试、0 失败；前端 `npm.cmd run format:check`、`lint`、`build` 通过。
- 模型适配器在本地模拟 HTTP 提供商下验证请求、引用检查、回退与单进程每日调用上限。

## 提交前需要的外部条件

1. **真实模型：**腾讯云服务器的购买不包含 TokenHub API 密钥。若采用 TokenHub，需在用户自己的控制台开通服务、选择地域与模型、设置预算，并将密钥仅注入后端环境。当前没有真实模型联调记录。
2. **腾讯云实例：**已从用户截图确认 Lighthouse 香港三区 2 核 2GB、40GB SSD 和已分配的公网 IPv4；操作系统、域名及登录方式仍待确认，没有远程登录或部署证据。现有邮箱账号、H2 与防护不足以公开接收真实健康资料。
3. **正式邮箱：**默认验证码只在本机显示；SMTP 通道未做真实送达测试。公开部署前需补齐验证码滥用防护、会话及跨站请求保护、数据保留与备份恢复。
4. **来源与健康内容：**7 条摘要需逐条复核原文及适用边界；若要作为正式健康服务，还需专业审核与安全评测。
5. **比赛提交：**当前 Git 无远端仓库；需建立公开 GitHub/Gitee 仓库或评审权限、核对个人中心实际提交入口和截止时间、录制演示视频并上传所需材料。具体规则以赛事后台为准。

## 本机复核

```powershell
cd frontend
npm.cmd ci
npm.cmd run format:check
npm.cmd run lint
npm.cmd run build

cd ../backend
.\mvnw.cmd verify
```

本机启动方法见根目录 README。不要把密钥、口令或真实个人健康数据放进截图、文档或 Git。
