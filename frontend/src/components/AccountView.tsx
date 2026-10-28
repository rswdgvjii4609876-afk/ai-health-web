import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LogOut,
  Mail,
  Pencil,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { api } from "../api";
import type { AccountInfo, AgeBand, HealthTag, Persona } from "../types";

const AGES: { id: AgeBand; label: string }[] = [
  { id: "AGE_18_24", label: "18–24 岁" },
  { id: "AGE_25_44", label: "25–44 岁" },
  { id: "AGE_45_59", label: "45–59 岁" },
  { id: "AGE_60_PLUS", label: "60 岁及以上" },
];
const ROLES: { id: Persona; label: string; detail: string }[] = [
  { id: "STUDENT", label: "大学生", detail: "校园学习与生活" },
  { id: "LEARNER", label: "学生", detail: "学习与日常节律" },
  { id: "WORKER", label: "职场人士", detail: "工作、久坐与休息" },
  { id: "SENIOR", label: "年长者", detail: "居家安全与活动" },
];
const TAGS: { id: HealthTag; label: string }[] = [
  { id: "SLEEP", label: "睡眠相关" },
  { id: "MOBILITY", label: "行动或关节相关" },
  { id: "CARDIOVASCULAR", label: "心血管相关" },
  { id: "METABOLIC", label: "代谢相关" },
];

function accountError(cause: unknown): string {
  if (axios.isAxiosError(cause)) {
    if (!cause.response) return "无法连接本地后端，请确认服务正在运行。";
    if (cause.response.status === 429) return "请求过于频繁，请稍后重试。";
    if (cause.response.status === 403) return "演示验证码仅能在本机使用。";
    if (cause.response.status === 503) return "邮件暂时无法发送，请稍后重试。";
    if (cause.response.status === 401) return "登录已过期，请重新验证邮箱。";
    if (cause.response.status === 400) return "请检查邮箱、验证码或资料填写。";
  }
  return "操作未完成，请稍后重试。";
}

export default function AccountView({
  account,
  emailMode,
  onAuthenticated,
  onProfileSaved,
  onSignedOut,
  onDeleted,
  onBack,
}: {
  account: AccountInfo | null;
  emailMode: "local" | "smtp";
  onAuthenticated: (account: AccountInfo) => void;
  onProfileSaved: (account: AccountInfo) => void;
  onSignedOut: () => void;
  onDeleted: () => void;
  onBack: () => void;
}) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [cooldown, setCooldown] = useState(0);
  const [editing, setEditing] = useState(false);
  const [ageBand, setAgeBand] = useState<AgeBand | "">(account?.ageBand ?? "");
  const [persona, setPersona] = useState<Persona | "">(account?.persona ?? "");
  const [healthTags, setHealthTags] = useState<HealthTag[]>(
    account?.healthTags ?? [],
  );
  const [sensitiveConsent, setSensitiveConsent] = useState(
    Boolean(account?.healthTags.length),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api.requestEmailCode(email.trim());
      setDemoCode(result.demoCode ?? "");
      setStage("code");
      setCooldown(60);
    } catch (cause) {
      setError(accountError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api.verifyEmail(email.trim(), code.trim());
      setCode("");
      setDemoCode("");
      onAuthenticated(result);
    } catch (cause) {
      setError(accountError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!ageBand || !persona) {
      setError("请选择年龄段和身份。");
      return;
    }
    if (healthTags.length && !sensitiveConsent) {
      setError("填写健康情况前需要单独同意；也可以取消选择，跳过此项。");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api.saveProfile({
        ageBand,
        persona,
        healthTags,
        sensitiveConsent,
      });
      setEditing(false);
      onProfileSaved(result);
    } catch (cause) {
      setError(accountError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setError("");
    try {
      await api.logout();
      onSignedOut();
    } catch (cause) {
      setError(accountError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (
      !window.confirm(
        "永久删除这个演示账号、健康记录、行动和提问历史？此操作无法撤销。",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api.deleteAccount();
      onDeleted();
    } catch (cause) {
      setError(accountError(cause));
    } finally {
      setBusy(false);
    }
  }

  function toggleTag(tag: HealthTag) {
    const next = healthTags.includes(tag)
      ? healthTags.filter((item) => item !== tag)
      : [...healthTags, tag];
    setHealthTags(next);
    if (!next.length) setSensitiveConsent(false);
  }

  return (
    <div className="account-view page-wrap">
      {(!account || account.profileComplete) && (
        <button type="button" className="back-link" onClick={onBack}>
          <ArrowLeft size={18} /> 返回应用
        </button>
      )}
      <header className="page-header account-header">
        <span className="kicker">ACCOUNT / 私人演示空间</span>
        <h1>
          {!account
            ? "用邮箱开始。"
            : account.profileComplete && !editing
              ? "你的资料。"
              : "先认识你。"}
        </h1>
        <p>
          {!account
            ? emailMode === "local"
              ? "一个邮箱对应一个演示账号。请使用虚构邮箱，勿填写真实个人或医疗信息。"
              : "一个邮箱对应一个账号。验证码会发送到该邮箱；请勿填写真实病历。"
            : account.profileComplete && !editing
              ? "这些选择只调整资料顺序与首页关注点，不形成医疗判断。"
              : "首次登录请填写年龄段和身份；健康情况可以完全跳过。演示仅面向 18 岁及以上。"}
        </p>
      </header>

      {error && (
        <div className="account-error" role="alert">
          {error}
        </div>
      )}

      {!account && (
        <section className="account-auth" aria-label="邮箱登录或注册">
          <div className="account-auth-main">
            <div className="account-step">
              <span>01</span>
              <h2>{stage === "email" ? "邮箱登录 / 注册" : "输入验证码"}</h2>
            </div>
            {stage === "email" ? (
              <form onSubmit={(event) => void requestCode(event)}>
                <label htmlFor="account-email">邮箱地址</label>
                <div className="account-field">
                  <Mail size={20} />
                  <input
                    id="account-email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={
                      emailMode === "local"
                        ? "demo@example.test"
                        : "name@example.com"
                    }
                  />
                </div>
                <button
                  className="button-dark"
                  type="submit"
                  disabled={busy || !email.trim()}
                >
                  {busy ? "处理中…" : "获取验证码"}
                  <ArrowRight size={18} />
                </button>
              </form>
            ) : (
              <form onSubmit={(event) => void verify(event)}>
                <p className="account-email-line">
                  {email}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setStage("email");
                      setCode("");
                    }}
                  >
                    更换邮箱
                  </button>
                </p>
                <label htmlFor="account-code">六位验证码</label>
                <div className="account-field">
                  <ShieldCheck size={20} />
                  <input
                    id="account-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={code}
                    onChange={(event) =>
                      setCode(event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="000000"
                  />
                </div>
                <div className="account-code-actions">
                  <button
                    className="button-dark"
                    type="submit"
                    disabled={busy || code.length !== 6}
                  >
                    {busy ? "验证中…" : "验证并继续"}
                    <ArrowRight size={18} />
                  </button>
                  <button
                    type="button"
                    className="account-text-button"
                    disabled={busy || cooldown > 0}
                    onClick={(event) => void requestCode(event)}
                  >
                    {cooldown ? `${cooldown} 秒后重试` : "重新发送"}
                  </button>
                </div>
              </form>
            )}
          </div>
          <aside
            className={`account-demo-note ${stage === "code" ? "is-code" : ""}`}
          >
            <span>
              {emailMode === "local" ? "LOCAL DEMO" : "EMAIL VERIFICATION"}
            </span>
            <h3>{emailMode === "local" ? "本地演示验证" : "邮箱验证"}</h3>
            {emailMode === "smtp" ? (
              <div className="account-demo-code muted">
                <Mail size={30} aria-hidden="true" />
              </div>
            ) : demoCode ? (
              <strong className="account-demo-code">{demoCode}</strong>
            ) : (
              <div className="account-demo-code muted">••••••</div>
            )}
            <p>
              {emailMode === "local"
                ? "验证码只显示在本机页面，5 分钟有效，使用后失效；不会发送邮件，也不证明邮箱归属。"
                : stage === "code"
                  ? "验证码已发送至邮箱，5 分钟有效，使用后失效。请检查收件箱及垃圾邮件。"
                  : "验证码将发送至邮箱，5 分钟有效。请确认邮箱地址可用。"}
            </p>
          </aside>
        </section>
      )}

      {account && (!account.profileComplete || editing) && (
        <form
          className="account-profile-form"
          onSubmit={(event) => void saveProfile(event)}
        >
          <div className="account-section-heading">
            <span>01 / 基础信息</span>
            <h2>选择适合你的入口</h2>
          </div>
          <label className="account-age-field" htmlFor="age-band">
            年龄段
            <select
              id="age-band"
              value={ageBand}
              required
              onChange={(event) => setAgeBand(event.target.value as AgeBand)}
            >
              <option value="">请选择</option>
              {AGES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="account-role-field">
            <legend>当前身份</legend>
            <div className="account-role-options">
              {ROLES.map((item) => (
                <label
                  key={item.id}
                  className={persona === item.id ? "selected" : ""}
                >
                  <input
                    type="radio"
                    name="persona"
                    value={item.id}
                    checked={persona === item.id}
                    onChange={() => setPersona(item.id)}
                  />
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="account-section-heading">
            <span>02 / 选填</span>
            <h2>过往健康情况</h2>
          </div>
          <p className="account-section-note">
            只选宽泛分类，不填写疾病名称、检查报告或病历；留空不会影响使用。
          </p>
          <fieldset className="account-tag-field">
            <legend className="sr-only">健康情况分类</legend>
            <div className="account-tag-options">
              {TAGS.map((item) => (
                <label
                  key={item.id}
                  className={healthTags.includes(item.id) ? "selected" : ""}
                >
                  <input
                    type="checkbox"
                    checked={healthTags.includes(item.id)}
                    onChange={() => toggleTag(item.id)}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </fieldset>
          {healthTags.length > 0 && (
            <label className="account-consent">
              <input
                type="checkbox"
                checked={sensitiveConsent}
                onChange={(event) => setSensitiveConsent(event.target.checked)}
              />
              <span>
                我单独同意将以上健康分类保存在本机演示数据库，用于调整知识排序；可随时取消选择并保存以清除。
              </span>
            </label>
          )}
          <div className="account-form-footer">
            {editing && (
              <button
                type="button"
                className="account-text-button"
                onClick={() => setEditing(false)}
              >
                取消
              </button>
            )}
            <button className="button-dark" type="submit" disabled={busy}>
              {busy ? "保存中…" : "保存并进入"}
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
      )}

      {account?.profileComplete && !editing && (
        <section className="account-summary">
          <div className="account-summary-grid">
            <div>
              <span>邮箱</span>
              <strong>{account.email}</strong>
            </div>
            <div>
              <span>年龄段</span>
              <strong>
                {AGES.find((item) => item.id === account.ageBand)?.label}
              </strong>
            </div>
            <div>
              <span>当前身份</span>
              <strong>
                {ROLES.find((item) => item.id === account.persona)?.label}
              </strong>
            </div>
            <div>
              <span>健康情况</span>
              <strong>
                {account.healthTags.length
                  ? account.healthTags
                      .map((tag) => TAGS.find((item) => item.id === tag)?.label)
                      .join("、")
                  : "未填写"}
              </strong>
            </div>
          </div>
          <button
            type="button"
            className="button-outline"
            onClick={() => setEditing(true)}
          >
            <Pencil size={18} /> 修改资料
          </button>
          <div className="account-management">
            <button type="button" onClick={() => void logout()} disabled={busy}>
              <LogOut size={18} /> 退出登录
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => void deleteAccount()}
              disabled={busy}
            >
              <Trash2 size={18} /> 删除账号及数据
            </button>
          </div>
        </section>
      )}
      <p className="account-footnote">
        <Check size={16} /> 账号会话保留 7
        天。演示数据库只在本机，不适合存放真实个人健康信息。
      </p>
    </div>
  );
}
