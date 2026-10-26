# 息刻 / AI Health Web

面向大学生、职场人士和老年人的 AI 原生健康素养 Web 应用。本仓库目前仅包含可运行的工程基础；健康建议、RAG 和正式 AI 对话尚未实现。

## 目录

- `frontend/`：React、TypeScript、Vite、Tailwind CSS；已安装 ECharts 和 Axios。
- `backend/`：Java 21、Spring Boot、Maven Wrapper、Spring Web、JDBC、H2。
- `docs/`：后续存放技术方案、测试记录和参赛 PDF 的源材料。
- `AGENTS.md`：协作与代码修改约定。

## 开发环境

- Node.js 24（Vite 要求 Node.js 20.19+ 或 22.12+）
- npm 11
- JDK 21
- Windows PowerShell 中使用 `npm.cmd`，避免 `npm.ps1` 被执行策略阻止。
- 不需要全局 Maven，使用 `backend/mvnw.cmd`。

## 启动与验证

前端：

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
npm.cmd run lint
npm.cmd run build
```

后端（另开终端）：

```powershell
cd backend
.\mvnw.cmd test
.\mvnw.cmd package
.\mvnw.cmd spring-boot:run
```

前端默认访问 `http://localhost:5173/`，后端默认监听 `http://localhost:8080/`。当前尚无业务 REST 端点。首次运行 Maven Wrapper 会下载 Maven 发行包。

## 配置

开发阶段默认使用内存 H2：`jdbc:h2:mem:aihealth;DB_CLOSE_DELAY=-1`。可用 `DB_URL`、`DB_USERNAME`、`DB_PASSWORD` 环境变量覆盖连接信息。内存数据库在进程退出后清空。切换 MySQL 时再加入对应驱动并设置环境变量。

`backend/src/main/java/com/aihealth/backend/ai/` 中定义了 `AiService` 及 Mock 实现。Mock 只返回未接入提示，不提供健康建议。真实模型提供商尚未选定；未来通过环境变量配置密钥，绝不把密钥写入源码或提交 Git。根目录 `.env.example` 仅是变量示例，Spring Boot 不会自动读取 `.env` 文件。

## 提交材料

参赛时需保留 Git 历史，并补充团队信息、部署说明和不超过 30 页的技术 PDF。当前没有部署配置。

## 团队信息

队员、学校与指导教师信息待参赛者提供后填写。
