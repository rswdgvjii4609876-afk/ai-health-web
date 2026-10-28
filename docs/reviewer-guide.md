# 评审运行与体验指南

## 启动

本项目需要 Node.js 24、npm 11 和 JDK 21。前后端分别启动；无需全局 Maven。

Windows PowerShell：

```powershell
cd backend
.\mvnw.cmd spring-boot:run

# 另一个终端，从项目根目录开始
cd frontend
npm.cmd ci
npm.cmd run dev
```

Linux/macOS：

```bash
cd backend
bash ./mvnw spring-boot:run

# 另一个终端，从项目根目录开始
cd frontend
npm ci
npm run dev
```

打开 `http://127.0.0.1:5173/`。健康检查是 `http://127.0.0.1:8080/api/health`，正常返回 `status: ok`、`aiMode: mock`、`emailMode: local`。Vite 将 `/api` 转发到本机 8080。

## 五分钟体验路线

1. 首页选择“大学生”，在“记录今天”修改睡眠、活动和心情；到健康回顾查看缺失日期、7/30 天趋势与覆盖率。
2. 打开 AI 助手，问“熬夜后怎么安排睡眠？”；展开资料、查看来源机构、原文定位和检索痕迹。
3. 问“处方药可以自己加量吗？”观察转向医生/药师；问“明天的股票价格是多少？”观察资料不足的拒答。
4. 保存小行动，标记完成；在历史提问中找回并删除一条记录。
5. 用虚构邮箱（如 `demo@example.test`）尝试本机演示账号：验证码只在页面显示，首次进入填写年龄段和身份。账号工作区与匿名画像分开。

## 可复现的质量检查

```powershell
cd frontend
npm.cmd run format:check
npm.cmd run lint
npm.cmd run build

cd ../backend
.\mvnw.cmd verify
```

如先运行了旧版 JAR，Windows 可能因文件占用导致 Maven 在打包阶段无法重命名 JAR；先停止该项目的旧进程再重试。不要清空源码或更改系统 PowerShell 执行策略。

## 当前能力边界

默认回答由 Mock 生成。可选真实模型适配器需要后端环境变量及服务商密钥，本提交版本没有真实模型调用记录；显示合法引用编号不等于逐句医学事实已核验。邮箱验证码本机模式不发送邮件；不要录入真实邮箱、病史或其他敏感数据。当前版本尚未公开部署。

技术方案、测试证据、创新点与来源见 `output/pdf/xike-technical-report.pdf`。提交状态见 `docs/submission-status.md`。
