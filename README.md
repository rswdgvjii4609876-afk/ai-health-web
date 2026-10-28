# 息刻 / AI Health Web

面向大学生、职场人士和年长者的 AI 原生健康素养 Web 应用 Demo。当前版本侧重完整的前后端交互与可信来源展示，不提供诊断或治疗方案。默认使用 Mock 助手，可选实验性的模型适配器。

## 当前可体验

- 切换大学生、学生、职场人士、年长者四类独立演示画像，查看七日示例数据；最近 30 天的空白日期也可补记。
- 默认在本机用邮箱和页面显示的演示验证码注册或登录；一个邮箱只对应一个账号。可选 SMTP 投递通道尚未经过真实送达测试。首次登录选择年龄段和身份；可跳过健康情况，或单独同意保存宽泛健康分类。账号拥有独立的空白工作区，支持修改资料、退出登录和删除账号及数据。
- 填写睡眠、活动、心情与简短备注，编辑最近 30 天的任意一天，数据写入 H2 并在后端重启后保留。
- 切换 7 天与 30 天回顾，查看有缺口标记的 ECharts 趋势、记录覆盖率和原始记录，并导出当前时段的示例 JSON。月度页面按规则挑选生活方式资料，附原始出处，不做健康评分或诊断。
- 搜索和筛选人工整理的健康知识，打开原始出处；创建、完成或移除小行动。
- 从首页的画像场景问题直接提问；在独立助手中查看回答、展开参考资料、继续追问并把小行动加入列表。问答成功后保存在当前工作区；可检索、重新打开最近 100 条、单条删除，完整清除工作区时一并删除。近七天记录上下文默认关闭，只有勾选后才用于相关话题的描述性汇总。默认 Mock 按关键词匹配最多两条资料；有限追问沿用上一条资料主题，资料范围外明确拒答。可通过后端环境变量启用兼容 Chat Completions 的实验性模型适配器；**默认未配置真实模型，也不是 RAG**。
- 首页与独立助手采用“记录 → 求证 → 行动 → 回顾”路径。助手展示命中的主题词、资料来源和适用边界；资料不足时拒绝推断，用药与紧急问题优先转介。实验模型的引用编号必须属于本次提供的资料，否则回退 Mock。编号检查不等于事实核验。

四类画像均为虚构示例。匿名浏览器通过 HttpOnly Cookie 获得独立工作区，画像之间也隔离；登录后使用账号专属工作区，既不继承匿名示例，也不读取其他账号数据。页面底部可清除当前工作区的记录、行动和提问。**默认本机模式只在页面返回验证码，不证明邮箱归属；可选 SMTP 模式尚未经过真实邮箱联调，账号系统不是生产级鉴权。**请只用虚构邮箱，勿输入真实病历、身份信息或其他敏感数据。H2 默认使用本地文件，重启后保留演示记录；数据库文件不会提交 Git。历史提问不会自动过期，当前仅返回最近 100 条，使用者可单条删除或清除工作区。

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

已完成首次构建和依赖安装后，可在项目根目录双击 `start-demo.cmd`：它会检查并启动前后端，在就绪后打开浏览器；不会修改 PowerShell 执行策略。若电脑重启或演示服务停止，重新运行即可。首次运行仍按下面步骤安装与构建。

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

后端测试覆盖数据库启动、画像数据、7/30 天回顾、多来源 Mock 引用与拒答、最近 30 天的记录编辑、历史提问保存与隔离及删除、行动管理、输入校验、工作区清除、邮箱账号及资料填写、可选模型请求及风险回退。另有十条资料路径评测样例和旧问答数据兼容测试。

## API 与配置

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/api/health` | 服务、AI 与邮箱投递模式状态 |
| POST | `/api/account/code` | 生成邮箱验证码；本机模式返回 `demoCode`，SMTP 模式不返回验证码 |
| POST | `/api/account/verify` | 验证后注册或登录，设置账号会话 Cookie |
| GET / PUT | `/api/account/me` / `/api/account/profile` | 读取资料 / 首次填写或修改资料 |
| POST / DELETE | `/api/account/logout` / `/api/account` | 退出 / 删除账号及其数据 |
| GET | `/api/dashboard?persona=STUDENT` | 概览、7/30 天回顾、历史、行动、知识 |
| PUT | `/api/checkins/today?persona=STUDENT` | 保存今日记录 |
| PUT | `/api/checkins/{yyyy-MM-dd}?persona=STUDENT` | 保存最近 30 天的指定日期 |
| POST | `/api/assistant` | 问答并保存提问与回答；请求可带 `contextTopicId` 与 `useRecords`，后者默认关闭 |
| GET | `/api/questions?persona=STUDENT` | 查询当前工作区该画像最近 100 条问答 |
| DELETE | `/api/questions/{id}?persona=STUDENT` | 删除单条问答 |
| POST | `/api/actions` | 添加小行动 |
| PATCH | `/api/actions/{id}` | 更新完成状态 |
| DELETE | `/api/actions/{id}` | 移除小行动 |
| DELETE | `/api/workspace` | 清除当前浏览器的演示记录、行动与提问，重置匿名 Cookie |

画像枚举：`STUDENT`、`LEARNER`、`WORKER`、`SENIOR`。邮箱验证码 5 分钟有效、使用一次失效，同一邮箱生成间隔 60 秒，连续输错 5 次作废；默认本机模式仅允许回环地址访问。账号会话保留 7 天，首次填写资料前不可访问业务 API。年龄段仅提供 18 岁及以上，健康分类选填且要求单独同意。账号资料只调整知识排序与首页关注点，不构成诊断，也不会自动发送给模型。限制和上线前工作见 `docs/account-security.md`。可通过 `DB_URL`、`DB_USERNAME`、`DB_PASSWORD` 覆盖数据库连接。`.env.example` 是变量清单，Spring Boot 不会自动载入 `.env`。H2 控制台默认关闭。切换 MySQL 时还需增加驱动并检查 schema 兼容性。

默认 `AI_PROVIDER=mock`，无需模型密钥。若已有兼容 Chat Completions 的服务，可在**后端进程环境**设置 `AI_PROVIDER=compatible`、`AI_CHAT_URL`（完整 HTTPS 接口地址）、`AI_MODEL` 和 `AI_API_KEY`。此适配器只把匹配到的人工摘要和问题发给模型；若用户主动勾选记录授权，还会发送该话题相关的演示记录汇总。紧急、药物及无资料的问题仍由 Mock 规则处理，模型不可用时回退 Mock。模型输出尚无逐句事实核验，属于实验功能，不能视为医疗建议或经过验证的 RAG。`.env.example` 仅是变量清单，不会自动加载。前端不接触密钥；不要将 API Key、口令或真实健康数据提交 Git。

模型请求最多要求 384 个输出 token，`AI_DAILY_CALL_LIMIT` 默认限制每个后端进程每 UTC 日尝试 100 次；设为 `0` 可禁止付费请求并回退 Mock。此计数在进程重启后重置，不能代替腾讯云控制台的预算与用量控制。

计划使用腾讯云服务器承载最终作品；**模型供应商尚未确定**。现有兼容适配器可以实验性连接符合 Chat Completions 格式的服务。若后续选择腾讯云 TokenHub，可参考其官方 [API 使用说明](https://cloud.tencent.com/document/product/1823/130078) 和 [语言模型列表](https://cloud.tencent.com/document/product/1823/130079)，按实际开通地域配置接口地址与模型。当前没有真实密钥或服务联调。模型回复必须包含本次资料编号 `[S1]` 等才会展示；这仅验证编号，不验证每句话的医学事实。腾讯云服务器的准备与公开访问前的安全门槛见 `docs/tencent-cloud-deployment.md`。

默认 `AUTH_EMAIL_MODE=local`，只在本机页面展示演示验证码。可选 `AUTH_EMAIL_MODE=smtp` 需要在**后端进程环境**设置 `SPRING_MAIL_HOST`、`SPRING_MAIL_PORT`、`SPRING_MAIL_USERNAME`、`SPRING_MAIL_PASSWORD` 与 `AUTH_MAIL_FROM`；使用 STARTTLS 的 587 端口为默认示例。此模式不会把验证码返回前端；邮件发送失败返回 503。SMTP 已通过伪造发送器的接口测试，尚未真实投递。不要提交邮件口令或把当前版本直接部署到公网。

月度生活方式提示的规则与来源见 `docs/health-guidance.md`。30 天记录不会自动发送给模型；助手的记录授权仍仅针对最近 7 天。

## 参赛材料

`docs/demo.md` 记录演示路径、技术结构、资料来源与已知限制。[8 页技术文档](output/pdf/xike-technical-report.pdf) 已生成，源文件为 `docs/technical-report.html`；[提交状态](docs/submission-status.md) 记录已完成项及待联调项。当前未部署，真实模型与邮件投递尚未完成。

参赛者：汪善知；学校：广州南方学院；团队：暴力炸。指导教师信息未提供。
