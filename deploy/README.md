# Lighthouse 评审演示部署包

`output/release/xike-runtime.zip` 是本机已构建的上传包，内含 `app.jar`、`web/` 静态站点和本说明。它不含源码、数据库文件、真实邮箱、密码或模型密钥。前端 API 固定使用同源 `/api`。

## 已知实例

用户截图确认中国香港三区的 Tencent Cloud Lighthouse 轻量应用服务器：2 核、2GB 内存、40GB SSD，已分配公网 IPv4。操作系统与域名尚未确认。本目录的 systemd、Nginx 文件**仅适用于 Linux**，需要在确认镜像、域名和证书路径后编辑，再执行。若实例是 Windows Server，不能直接使用这些文件。

## 目标运行方式

1. 在本机构建并上传 `xike-runtime.zip`，不要在 2GB 实例上运行 Node 与 Maven 编译。解压后将 `app.jar` 和 `web/` 放到 `/opt/xike/`，为服务用户准备可写的 `/var/lib/xike/`。
2. Linux 系统安装 Java 21 运行时与 Nginx。将 `xike.service.example` 按实际路径和用户调整后注册为 systemd 服务；后端仅监听 `127.0.0.1:8080`，Java 堆上限示例为 512MB。
3. 将 `xike.env.example` 复制到 `/etc/xike/xike.env` 并设为仅服务用户和管理员可读。默认 `AI_PROVIDER=mock`。真实模型的 `AI_API_KEY` 只在服务器私有环境文件或可信密钥管理中设置，绝不上传到仓库或放进 ZIP。
4. 配好域名、HTTPS 证书与评审访问口令后，调整 `nginx-https.conf.example`。Nginx 提供 `web/`，把 `/api/` 代理到后端。先检查 Nginx 配置，再启用站点。Lighthouse 实例防火墙只允许必要的 80/443 与受限管理入口；不要开放 8080、5173 或数据库端口。
5. 使用真实域名复查首页、助手、记录、回顾、删除与窄屏视图。后台检查 `/api/health` 与服务日志，且不要把密钥或个人数据写进日志。

## 必须保留的演示边界

默认邮箱模式 `local` 会拒绝代理请求；远程前端会明确提示邮箱账号仅供本机演示，评审站点使用匿名工作区。若要开放邮箱账号，必须先完成正式邮件投递、滥用防护、跨站请求防护和敏感数据保护。评审站点应通过 HTTPS 与访问口令限制访问，只使用虚构示例数据。当前 H2 文件库没有按生产医疗数据要求加密、备份与保留期管理。

腾讯云 [Lighthouse 实例防火墙文档](https://cloud.tencent.com/document/product/1207/44577/)说明如何限制来源与端口。系统确认后再执行针对该镜像的安装与登录步骤。
