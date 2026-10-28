# 邮箱账号的演示与实验通道

## 当前实现

- 邮箱转为小写后在数据库中设唯一约束，一个邮箱最多对应一个账号。注册与登录共用六位验证码。验证码由安全随机数生成，只保存加盐摘要于后端内存，五分钟有效、使用一次失效；同一邮箱六十秒内不能重发，连续输错五次作废。本机模式仅接受回环地址监听、回环客户端和本机 Host，出现代理转发头时拒绝请求，防止误挂到反向代理后泄露验证码。
- **默认 `AUTH_EMAIL_MODE=local`：验证码在 API 响应和本机页面显示，不发送邮件，也无法证明邮箱归属。**必须使用虚构邮箱，例如 `demo@example.test`。服务重启后未用验证码失效。
- 可选 `AUTH_EMAIL_MODE=smtp` 使用后端邮件发送器；需由进程环境提供 `SPRING_MAIL_HOST`、`SPRING_MAIL_PORT`、`SPRING_MAIL_USERNAME`、`SPRING_MAIL_PASSWORD` 和 `AUTH_MAIL_FROM`。SMTP 模式不在响应中返回验证码；发送失败返回 503，且不会启动该邮箱的重发冷却。已用伪造发送器完成接口测试，**尚未向真实邮箱投递或验证服务商配置**。仅凭这一通道也不能把整套账号系统视作可公开使用。
- 验证成功后生成随机账号会话，数据库只保存令牌摘要，浏览器用 HttpOnly、SameSite=Lax Cookie 保存令牌；HTTP 本地演示不设 Secure，HTTPS 请求会设 Secure。七天后过期，退出和删除时失效。账号工作区与匿名浏览器工作区及其他账号隔离。首次填写资料前，账号业务 API 拒绝访问。
- 资料包含 18 岁以上年龄段、自选身份及选填的宽泛健康分类。选择健康分类需另行勾选同意；清除分类时删除已存分类，删除账号时删除资料、会话、记录、行动和提问。健康分类只用于知识排序与首页关注点，不自动送入 AI 请求；不构成个体化医疗判断。

## 尚不能公开使用

当前没有真实 SMTP 送达测试、完整的滥用防护、生产级 CSRF 防护、数据库加密、数据保留期和备份删除流程。H2 本地文件内的邮箱及健康分类未加密。不要输入真实邮箱、病史或其他个人健康数据，不要直接在公网部署。

上线前需要引入可信邮件服务、验证邮件交付与限流、完善会话与跨站请求防护、加密和密钥管理、隐私告知及敏感信息处理流程，并重新进行安全和可用性测试。关于一次性验证码、认证和会话的通用设计，可参考 [NIST SP 800-63B](https://pages.nist.gov/800-63-4/sp800-63b.html)、[OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) 与 [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)。
