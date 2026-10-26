# 息刻 / AI Health Web

面向大学生、职场人士和年长者的 AI 原生健康素养 Web 应用 Demo。当前版本侧重完整的前后端交互与可信来源展示，不提供诊断、治疗方案或正式模型对话。

## 当前可体验

- 切换三类独立演示画像，查看各自的七日示例数据。
- 填写每日睡眠、活动、心情与简短备注，数据写入 H2。
- 使用 ECharts 查看变化趋势，并在表格中核对具体记录。
- 浏览人工整理的健康知识摘要，打开原始来源，加入小行动并标记完成。
- 使用独立助手进行基础问答演示：关键词匹配已有资料、展示引用出处；资料范围外明确拒答。它是 `AiService` 的 Mock 实现，**未接入真实大模型，也不是 RAG**。

三类画像均为虚构示例，彼此数据隔离，但**没有用户登录与鉴权**。请勿输入真实病历、身份信息或其他敏感数据。H2 为内存数据库，后端停止后记录重置。

## 技术栈与目录

| 层 | 技术 | 目录 |
| --- | --- | --- |
| 前端 | React、TypeScript、Vite、Tailwind CSS、ECharts、Axios、Lucide | `frontend/` |
| 后端 | Java 21、Spring Boot 4、Maven Wrapper、REST、JDBC | `backend/` |
| 数据 | 开发阶段 H2；后续可评估 MySQL | `backend/src/main/resources/` |
| 文档 | 演示流程、架构与边界 | `docs/` |

协作约定见 `AGENTS.md`。

## 本地运行

需 Node.js 24、npm 11、JDK 21。Windows PowerShell 使用 `npm.cmd`，不要修改执行策略。不需要全局 Maven。

终端一：

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

终端二：

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

访问 `http://127.0.0.1:5173/`。Vite 将 `/api` 代理到本机 `8080`。后端默认只监听 `127.0.0.1`；`GET http://127.0.0.1:8080/api/health` 可检查状态。

## 验证

```powershell
cd frontend
npm.cmd run lint
npm.cmd run build
```

```powershell
cd backend
.\mvnw.cmd verify
```

后端测试覆盖数据库启动、三类画像数据、Mock 引用、范围外拒答、每日记录、行动勾选和输入校验。

## API 与配置

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/api/health` | 服务与 AI 模式状态 |
| GET | `/api/dashboard?persona=STUDENT` | 概览、历史、行动、知识 |
| PUT | `/api/checkins/today?persona=STUDENT` | 保存今日记录 |
| POST | `/api/assistant` | Mock 基础问答 |
| POST | `/api/actions` | 添加小行动 |
| PATCH | `/api/actions/{id}` | 更新完成状态 |

画像枚举：`STUDENT`、`WORKER`、`SENIOR`。可通过 `DB_URL`、`DB_USERNAME`、`DB_PASSWORD` 覆盖数据库连接。`.env.example` 是变量清单，Spring Boot 不会自动载入 `.env`。H2 控制台默认关闭。切换 MySQL 时还需增加驱动并检查 schema 兼容性。

真实模型提供商暂未决定。后续应在 `AiService` 后新增实现，由后端环境变量读取密钥；前端不接触密钥。不要将 API Key、口令或真实健康数据提交 Git。

## 参赛材料

`docs/demo.md` 记录演示路径、技术结构、资料来源与已知限制。提交前仍需补充团队信息、测试与部署证据，以及不超过 30 页的技术 PDF；当前未部署。

团队成员、学校、指导教师：待填写。
