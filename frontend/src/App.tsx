import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  ExternalLink,
  HeartPulse,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { api, apiError } from "./api";
import type { Metric } from "./TrendChart";
import type {
  ActionItem,
  AiResponse,
  CheckinInput,
  Dashboard,
  Persona,
  View,
} from "./types";

const PERSONAS: Record<
  Persona,
  { label: string; caption: string; initials: string; prompts: string[] }
> = {
  STUDENT: {
    label: "大学生",
    caption: "学业与生活节律",
    initials: "学",
    prompts: [
      "最近总熬夜，怎样调整作息？",
      "复习压力大时可以做什么？",
      "久坐学习怎么增加活动？",
    ],
  },
  WORKER: {
    label: "职场人士",
    caption: "工作与日常平衡",
    initials: "职",
    prompts: [
      "工作时久坐，有什么小调整？",
      "下班后怎么安排休息？",
      "压力持续影响生活怎么办？",
    ],
  },
  SENIOR: {
    label: "年长者",
    caption: "稳健生活与安全",
    initials: "长",
    prompts: [
      "在家怎样留意跌倒风险？",
      "日常活动要注意什么？",
      "用药信息应该向谁确认？",
    ],
  },
};

const NAV: { id: View; label: string; icon: typeof Activity }[] = [
  { id: "today", label: "今日概览", icon: LayoutDashboard },
  { id: "checkin", label: "每日记录", icon: HeartPulse },
  { id: "trends", label: "变化趋势", icon: Activity },
  { id: "knowledge", label: "健康知识", icon: BookOpen },
  { id: "assistant", label: "AI 助手", icon: MessageCircle },
];

const EMPTY_FORM: CheckinInput = {
  sleepHours: 7,
  activityMinutes: 30,
  mood: 3,
  note: "",
};
const MOODS = ["很低落", "不太好", "一般", "还不错", "很好"];
const TrendChart = lazy(() => import("./TrendChart"));

function initialPersona(): Persona {
  const value = localStorage.getItem("xike-persona");
  return value === "WORKER" || value === "SENIOR" ? value : "STUDENT";
}

function Stat({
  label,
  value,
  unit,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  unit: string;
  icon: typeof Activity;
  tone: string;
}) {
  return (
    <div className="stat-item">
      <div className={`stat-icon ${tone}`}>
        <Icon size={19} />
      </div>
      <span className="eyebrow">{label}</span>
      <strong>
        {value}
        <small>{unit}</small>
      </strong>
    </div>
  );
}

function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function SourceLink({
  name,
  date,
  url,
}: {
  name: string;
  date: string;
  url: string;
}) {
  return (
    <a
      className="source-link"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <ShieldCheck size={14} />
      {name} · {date}
      <ExternalLink size={13} />
    </a>
  );
}

function App() {
  const [persona, setPersona] = useState<Persona>(initialPersona);
  const [view, setView] = useState<View>("today");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [largeText, setLargeText] = useState(
    () => localStorage.getItem("xike-large-text") === "true",
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [form, setForm] = useState<CheckinInput>(EMPTY_FORM);
  const [metric, setMetric] = useState<Metric>("sleep");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string; response?: AiResponse }[]
  >([]);
  const [todayLabel] = useState(() =>
    new Intl.DateTimeFormat("zh-CN", {
      month: "long",
      day: "numeric",
      weekday: "long",
    }).format(new Date()),
  );
  const requestId = useRef(0);

  const load = useCallback(async (selected: Persona) => {
    const currentRequest = ++requestId.current;
    try {
      const data = await api.dashboard(selected);
      if (currentRequest !== requestId.current) return;
      setDashboard(data);
      setForm(
        data.today
          ? {
              sleepHours: data.today.sleepHours,
              activityMinutes: data.today.activityMinutes,
              mood: data.today.mood,
              note: data.today.note ?? "",
            }
          : EMPTY_FORM,
      );
    } catch (cause) {
      if (currentRequest !== requestId.current) return;
      setDashboard(null);
      setError(apiError(cause));
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(persona), 0);
    return () => window.clearTimeout(timer);
  }, [load, persona]);
  useEffect(() => {
    localStorage.setItem("xike-persona", persona);
  }, [persona]);
  useEffect(() => {
    localStorage.setItem("xike-large-text", String(largeText));
  }, [largeText]);
  useEffect(() => {
    if (notice) {
      const timer = window.setTimeout(() => setNotice(""), 4500);
      return () => window.clearTimeout(timer);
    }
  }, [notice]);

  const go = (next: View) => {
    setView(next);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  function changePersona(next: Persona) {
    if (next === persona) return;
    ++requestId.current;
    setDashboard(null);
    setLoading(true);
    setError("");
    setMessages([]);
    setQuestion("");
    setPersona(next);
  }

  function retry() {
    setLoading(true);
    setError("");
    void load(persona);
  }

  async function saveCheckin(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.checkin(persona, form);
      await load(persona);
      setNotice("今日记录已保存");
      go("today");
    } catch (cause) {
      setNotice(apiError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function toggleAction(action: ActionItem) {
    setBusy(true);
    try {
      const updated = await api.updateAction(action.id, !action.completed);
      setDashboard((current) =>
        current
          ? {
              ...current,
              actions: current.actions.map((item) =>
                item.id === updated.id ? updated : item,
              ),
            }
          : current,
      );
    } catch (cause) {
      setNotice(apiError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function addAction(title: string) {
    setBusy(true);
    try {
      const added = await api.addAction(persona, title);
      setDashboard((current) =>
        current
          ? { ...current, actions: [...current.actions, added] }
          : current,
      );
      setNotice("已加入我的小行动");
    } catch (cause) {
      setNotice(apiError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function ask(text = question) {
    const clean = text.trim();
    if (!clean || busy) return;
    setMessages((current) => [...current, { role: "user", text: clean }]);
    setQuestion("");
    setBusy(true);
    try {
      const response = await api.ask(persona, clean);
      setMessages((current) => [
        ...current,
        { role: "assistant", text: response.content, response },
      ]);
    } catch (cause) {
      setMessages((current) => [
        ...current,
        { role: "assistant", text: apiError(cause) },
      ]);
    } finally {
      setBusy(false);
    }
  }

  const profile = PERSONAS[persona];
  const currentNav = NAV.find((item) => item.id === view)!;
  const completed =
    dashboard?.actions.filter((item) => item.completed).length ?? 0;
  const featured = dashboard?.knowledge[0];

  return (
    <div className={`app-shell ${largeText ? "large-text" : ""}`}>
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Activity size={23} strokeWidth={2.4} />
          </div>
          <div>
            <strong>息刻</strong>
            <span>AI 健康素养</span>
          </div>
        </div>
        <div className="side-label">个人空间</div>
        <nav aria-label="主要导航" className="side-nav">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`nav-item ${view === id ? "active" : ""}`}
              onClick={() => go(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {id === "assistant" && <i>Mock</i>}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <div className="privacy-note">
            <ShieldCheck size={17} />
            <span>本地演示 · 不上传真实健康档案</span>
          </div>
          <button
            className="text-size-button"
            type="button"
            onClick={() => setLargeText(!largeText)}
            aria-pressed={largeText}
          >
            <Settings2 size={17} />
            {largeText ? "标准字号" : "放大字号"}
          </button>
        </div>
      </aside>
      {menuOpen && (
        <button
          className="mobile-scrim"
          aria-label="关闭导航"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              type="button"
              aria-label="打开导航"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb">健康工作台</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{currentNav.label}</strong>
          </div>
          <div className="topbar-right">
            <span className="demo-badge">
              <span />
              演示模式
            </span>
            <label className="persona-select">
              <span className="persona-avatar">{profile.initials}</span>
              <select
                value={persona}
                disabled={busy || loading}
                onChange={(event) =>
                  changePersona(event.target.value as Persona)
                }
                aria-label="切换体验人群"
              >
                <option value="STUDENT">大学生</option>
                <option value="WORKER">职场人士</option>
                <option value="SENIOR">年长者</option>
              </select>
              <ChevronDown size={15} />
            </label>
          </div>
        </header>
        <main className="main-content">
          {error && (
            <div className="error-banner" role="alert">
              {error}
              <button type="button" onClick={retry}>
                <RefreshCw size={16} />
                重试
              </button>
            </div>
          )}
          {notice && (
            <div className="toast" role="status">
              {notice}
              <button
                type="button"
                aria-label="关闭提示"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {loading && !dashboard ? (
            <div className="loading-state">正在载入演示数据...</div>
          ) : (
            dashboard && (
              <>
                {view === "today" && (
                  <>
                    <div className="page-intro">
                      <div>
                        <div className="eyebrow intro-eyebrow">
                          <Sun size={15} />
                          {todayLabel}
                        </div>
                        <h1>今天，先照顾好自己。</h1>
                        <p>
                          {profile.label} · {profile.caption}
                          。看见自己的节律，从一个小行动开始。
                        </p>
                      </div>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => go("checkin")}
                      >
                        <Plus size={18} />
                        记录今天
                      </button>
                    </div>
                    <div className="data-disclaimer">
                      <CircleHelp size={17} />
                      当前为独立演示画像，数据仅在本次后端运行期间保存，不用于医疗判断。
                    </div>
                    <div className="stats-row">
                      <Stat
                        label="昨夜睡眠"
                        value={dashboard.today?.sleepHours ?? "—"}
                        unit="小时"
                        icon={Clock3}
                        tone="mint"
                      />
                      <Stat
                        label="今日活动"
                        value={dashboard.today?.activityMinutes ?? "—"}
                        unit="分钟"
                        icon={Activity}
                        tone="coral"
                      />
                      <Stat
                        label="此刻心情"
                        value={
                          dashboard.today
                            ? MOODS[dashboard.today.mood - 1]
                            : "—"
                        }
                        unit=""
                        icon={HeartPulse}
                        tone="lavender"
                      />
                    </div>
                    <div className="dashboard-grid">
                      <section className="surface-section">
                        <SectionTitle
                          title="近七日节律"
                          subtitle="变化比单次数字更值得关注"
                          action={
                            <button
                              type="button"
                              className="link-button"
                              onClick={() => go("trends")}
                            >
                              查看趋势
                              <ArrowRight size={16} />
                            </button>
                          }
                        />
                        <Suspense fallback={<div className="trend-chart" />}>
                          <TrendChart
                            history={dashboard.history}
                            metric="sleep"
                          />
                        </Suspense>
                      </section>
                      <section className="surface-section">
                        <SectionTitle
                          title="我的小行动"
                          subtitle={`${completed} / ${dashboard.actions.length} 已完成`}
                        />
                        {dashboard.actions.length ? (
                          <div className="action-list">
                            {dashboard.actions.map((action) => (
                              <label
                                className={`action-row ${action.completed ? "done" : ""}`}
                                key={action.id}
                              >
                                <input
                                  type="checkbox"
                                  checked={action.completed}
                                  disabled={busy}
                                  onChange={() => void toggleAction(action)}
                                />
                                <span className="custom-check">
                                  <Check size={14} />
                                </span>
                                <span>{action.title}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <p className="muted">
                            还没有行动，从知识卡片或助手中添加一个吧。
                          </p>
                        )}
                        <button
                          type="button"
                          className="subtle-button"
                          onClick={() => go("assistant")}
                        >
                          <Sparkles size={17} />
                          问问助手
                          <ArrowRight size={15} />
                        </button>
                      </section>
                    </div>
                    {featured && (
                      <section className="feature-strip">
                        <div className="feature-symbol">
                          <BookOpen size={22} />
                        </div>
                        <div>
                          <span className="eyebrow">
                            为你精选 · {featured.category}
                          </span>
                          <h2>{featured.title}</h2>
                          <p>{featured.summary}</p>
                          <SourceLink
                            name={featured.sourceName}
                            date={featured.sourceDate}
                            url={featured.sourceUrl}
                          />
                        </div>
                        <button
                          type="button"
                          className="icon-button feature-arrow"
                          title="查看知识库"
                          aria-label="查看知识库"
                          onClick={() => go("knowledge")}
                        >
                          <ArrowRight size={20} />
                        </button>
                      </section>
                    )}
                  </>
                )}
                {view === "checkin" && (
                  <>
                    <div className="page-heading">
                      <span className="eyebrow">每日记录</span>
                      <h1>记录今天的状态</h1>
                      <p>
                        几项简单记录，帮助你回看自己的生活节律。请勿填写敏感病历或身份证明信息。
                      </p>
                    </div>
                    <form
                      className="checkin-form"
                      onSubmit={(event) => void saveCheckin(event)}
                    >
                      <div className="form-grid">
                        <label className="field">
                          <span>
                            <Clock3 size={19} />
                            昨夜睡眠
                          </span>
                          <div className="number-field">
                            <input
                              type="number"
                              min="0"
                              max="24"
                              step="0.1"
                              required
                              value={form.sleepHours}
                              onChange={(event) =>
                                setForm({
                                  ...form,
                                  sleepHours: Number(event.target.value),
                                })
                              }
                            />
                            <em>小时</em>
                          </div>
                        </label>
                        <label className="field">
                          <span>
                            <Activity size={19} />
                            今日活动
                          </span>
                          <div className="number-field">
                            <input
                              type="number"
                              min="0"
                              max="1440"
                              step="1"
                              required
                              value={form.activityMinutes}
                              onChange={(event) =>
                                setForm({
                                  ...form,
                                  activityMinutes: Number(event.target.value),
                                })
                              }
                            />
                            <em>分钟</em>
                          </div>
                        </label>
                      </div>
                      <fieldset className="mood-field">
                        <legend>
                          <HeartPulse size={19} />
                          此刻心情
                        </legend>
                        <div className="mood-options">
                          {MOODS.map((label, index) => (
                            <label
                              key={label}
                              className={
                                form.mood === index + 1 ? "selected" : ""
                              }
                            >
                              <input
                                type="radio"
                                name="mood"
                                value={index + 1}
                                checked={form.mood === index + 1}
                                onChange={() =>
                                  setForm({ ...form, mood: index + 1 })
                                }
                              />
                              <strong>{index + 1}</strong>
                              <span>{label}</span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <label className="field note-field">
                        <span>
                          给今天留一句话 <small>选填，最多 240 字</small>
                        </span>
                        <textarea
                          maxLength={240}
                          rows={4}
                          placeholder="例如：今天任务较多，晚上想早点休息"
                          value={form.note}
                          onChange={(event) =>
                            setForm({ ...form, note: event.target.value })
                          }
                        />
                      </label>
                      <div className="form-footer">
                        <span>演示数据将于后端停止时清空</span>
                        <button
                          type="submit"
                          className="primary-button"
                          disabled={busy}
                        >
                          <Check size={18} />
                          {busy ? "保存中..." : "保存记录"}
                        </button>
                      </div>
                    </form>
                  </>
                )}
                {view === "trends" && (
                  <>
                    <div className="page-heading">
                      <span className="eyebrow">个人趋势</span>
                      <h1>看见变化的方向</h1>
                      <p>
                        近七日演示记录。图表仅用于自我观察，不形成健康评分或医学结论。
                      </p>
                    </div>
                    <div className="trend-toolbar">
                      <div className="segmented" aria-label="趋势指标">
                        {(["sleep", "activity", "mood"] as Metric[]).map(
                          (item) => (
                            <button
                              type="button"
                              key={item}
                              aria-pressed={metric === item}
                              className={metric === item ? "selected" : ""}
                              onClick={() => setMetric(item)}
                            >
                              {item === "sleep"
                                ? "睡眠"
                                : item === "activity"
                                  ? "活动"
                                  : "心情"}
                            </button>
                          ),
                        )}
                      </div>
                      <span>最近 7 天</span>
                    </div>
                    <div className="chart-area">
                      <Suspense fallback={<div className="trend-chart" />}>
                        <TrendChart
                          history={dashboard.history}
                          metric={metric}
                        />
                      </Suspense>
                    </div>
                    <SectionTitle
                      title="每日记录"
                      subtitle="点击每日记录可修改今天的数据"
                      action={
                        <button
                          className="link-button"
                          type="button"
                          onClick={() => go("checkin")}
                        >
                          编辑今天
                          <ArrowRight size={16} />
                        </button>
                      }
                    />
                    <div className="table-scroll">
                      <table className="history-table">
                        <thead>
                          <tr>
                            <th>日期</th>
                            <th>睡眠</th>
                            <th>活动</th>
                            <th>心情</th>
                            <th>记录</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboard.history.map((item) => (
                            <tr key={item.day}>
                              <td>{item.day}</td>
                              <td>{item.sleepHours} 小时</td>
                              <td>{item.activityMinutes} 分钟</td>
                              <td>{MOODS[item.mood - 1]}</td>
                              <td>{item.note || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
                {view === "knowledge" && (
                  <>
                    <div className="page-heading">
                      <span className="eyebrow">可信资料</span>
                      <h1>健康知识库</h1>
                      <p>
                        围绕日常生活的小问题，查看资料摘要与原始出处。内容经过人工整理，非个体诊疗建议。
                      </p>
                    </div>
                    <div className="knowledge-list">
                      {dashboard.knowledge.map((item, index) => (
                        <article className="knowledge-item" key={item.id}>
                          <div className="knowledge-index">
                            {String(index + 1).padStart(2, "0")}
                          </div>
                          <div className="knowledge-copy">
                            <span className="eyebrow">{item.category}</span>
                            <h2>{item.title}</h2>
                            <p>{item.summary}</p>
                            <SourceLink
                              name={item.sourceName}
                              date={item.sourceDate}
                              url={item.sourceUrl}
                            />
                          </div>
                          {item.action && (
                            <button
                              className="outline-button"
                              type="button"
                              disabled={
                                busy ||
                                dashboard.actions.some(
                                  (action) => action.title === item.action,
                                )
                              }
                              onClick={() => void addAction(item.action!)}
                            >
                              {dashboard.actions.some(
                                (action) => action.title === item.action,
                              ) ? (
                                <Check size={16} />
                              ) : (
                                <Plus size={16} />
                              )}
                              {dashboard.actions.some(
                                (action) => action.title === item.action,
                              )
                                ? "已添加"
                                : "设为行动"}
                            </button>
                          )}
                        </article>
                      ))}
                    </div>
                  </>
                )}
                {view === "assistant" && (
                  <>
                    <div className="page-heading assistant-heading">
                      <div>
                        <span className="eyebrow">独立助手 · Mock 演示</span>
                        <h1>有问题，先聊聊</h1>
                        <p>
                          助手根据已整理的资料生成演示回答，并展示来源；目前未接入真实大模型。
                        </p>
                      </div>
                      <div className="assistant-status">
                        <span />
                        资料检索演示
                      </div>
                    </div>
                    <div className="chat-area">
                      {messages.length === 0 ? (
                        <div className="chat-empty">
                          <div className="chat-symbol">
                            <Sparkles size={28} />
                          </div>
                          <h2>从一个具体问题开始</h2>
                          <p>选择下方话题，或输入你想了解的日常健康问题。</p>
                          <div className="prompt-list">
                            {profile.prompts.map((prompt) => (
                              <button
                                key={prompt}
                                type="button"
                                onClick={() => void ask(prompt)}
                              >
                                {prompt}
                                <ArrowRight size={16} />
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="message-list" aria-live="polite">
                          {messages.map((message, index) => (
                            <div
                              className={`message ${message.role}`}
                              key={`${index}-${message.role}`}
                            >
                              <div className="message-avatar">
                                {message.role === "assistant" ? (
                                  <Sparkles size={17} />
                                ) : (
                                  profile.initials
                                )}
                              </div>
                              <div className="message-body">
                                <span className="message-name">
                                  {message.role === "assistant"
                                    ? "息刻助手 · Mock"
                                    : "我"}
                                </span>
                                <p>{message.text}</p>
                                {message.response && (
                                  <>
                                    {message.response.sources.length > 0 && (
                                      <div className="answer-sources">
                                        <span>参考来源</span>
                                        {message.response.sources.map(
                                          (source) => (
                                            <SourceLink
                                              key={source.id}
                                              name={source.sourceName}
                                              date={source.sourceDate}
                                              url={source.sourceUrl}
                                            />
                                          ),
                                        )}
                                      </div>
                                    )}
                                    {message.response.suggestedAction && (
                                      <button
                                        type="button"
                                        className="outline-button"
                                        disabled={
                                          busy ||
                                          dashboard.actions.some(
                                            (action) =>
                                              action.title ===
                                              message.response!.suggestedAction,
                                          )
                                        }
                                        onClick={() =>
                                          void addAction(
                                            message.response!.suggestedAction!,
                                          )
                                        }
                                      >
                                        <Plus size={16} />
                                        {dashboard.actions.some(
                                          (action) =>
                                            action.title ===
                                            message.response!.suggestedAction,
                                        )
                                          ? "已加入小行动"
                                          : `加入小行动：${message.response.suggestedAction}`}
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                          {busy && (
                            <div className="replying">正在整理资料...</div>
                          )}
                        </div>
                      )}
                    </div>
                    <form
                      className="chat-compose"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void ask();
                      }}
                    >
                      <input
                        aria-label="向助手提问"
                        maxLength={400}
                        value={question}
                        onChange={(event) => setQuestion(event.target.value)}
                        placeholder="输入你的问题，例如：最近睡得晚怎么办？"
                      />
                      <button
                        type="submit"
                        aria-label="发送问题"
                        title="发送问题"
                        disabled={!question.trim() || busy}
                      >
                        <Send size={19} />
                      </button>
                    </form>
                    <p className="chat-caution">
                      仅供健康素养学习。急症请拨打
                      120；药物与诊疗问题请咨询医生或药师。
                    </p>
                  </>
                )}
              </>
            )
          )}
        </main>
      </div>
      <nav className="mobile-bottom-nav" aria-label="移动端导航">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={view === id ? "active" : ""}
            onClick={() => go(id)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
