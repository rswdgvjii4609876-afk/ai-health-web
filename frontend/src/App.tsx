import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  Activity,
  BookOpen,
  CalendarDays,
  Check,
  HeartPulse,
  MessageCircle,
  RefreshCw,
  Trash2,
  Type,
  UserRound,
  X,
} from "lucide-react";
import { api, apiError } from "./api";
import AccountView from "./components/AccountView";
import AssistantView from "./components/AssistantView";
import CheckinView from "./components/CheckinView";
import KnowledgeView from "./components/KnowledgeView";
import ReviewView from "./components/ReviewView";
import TodayView from "./components/TodayView";
import { NAV, PEOPLE } from "./components/config";
import type {
  ActionItem,
  AccountInfo,
  ChatMessage,
  CheckinInput,
  Dashboard,
  Persona,
  SavedQuestion,
  View,
} from "./types";

const EMPTY_FORM: CheckinInput = {
  sleepHours: 7,
  activityMinutes: 30,
  mood: 3,
  note: "",
};
const ICONS = {
  today: Activity,
  review: CalendarDays,
  knowledge: BookOpen,
  assistant: MessageCircle,
};

const VIEWS: View[] = [
  "today",
  "checkin",
  "review",
  "knowledge",
  "assistant",
  "account",
];
const REMOTE_BROWSER = !["localhost", "127.0.0.1"].includes(
  window.location.hostname,
);

function recentDays(today: string, count: number): string[] {
  const [year, month, day] = today.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Array.from({ length: count }, (_, index) => {
    const value = new Date(date);
    value.setDate(value.getDate() - index);
    return [value.getFullYear(), value.getMonth() + 1, value.getDate()]
      .map((part, position) =>
        position === 0 ? String(part) : String(part).padStart(2, "0"),
      )
      .join("-");
  });
}

function initialView(): View {
  const requested = window.location.hash.slice(1) as View;
  return VIEWS.includes(requested) ? requested : "today";
}

function initialPersona(): Persona {
  const value = localStorage.getItem("xike-persona");
  return value === "WORKER" || value === "SENIOR" || value === "LEARNER"
    ? value
    : "STUDENT";
}

export default function App() {
  const [persona, setPersona] = useState<Persona>(initialPersona);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [accountReady, setAccountReady] = useState(false);
  const [accountEpoch, setAccountEpoch] = useState(0);
  const [view, setView] = useState<View>(initialView);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [form, setForm] = useState<CheckinInput>(EMPTY_FORM);
  const [selectedDay, setSelectedDay] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [savedQuestions, setSavedQuestions] = useState<SavedQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState("");
  const [question, setQuestion] = useState("");
  const [useRecords, setUseRecords] = useState(false);
  const [aiMode, setAiMode] = useState("mock");
  const [emailMode, setEmailMode] = useState<"local" | "smtp">("local");
  const [largeText, setLargeText] = useState(
    () => localStorage.getItem("xike-large-text") === "true",
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const requestId = useRef(0);
  const questionsRequestId = useRef(0);

  const load = useCallback(async (selected: Persona) => {
    const currentRequest = ++requestId.current;
    try {
      const data = await api.dashboard(selected);
      if (currentRequest !== requestId.current) return;
      setDashboard(data);
      setSelectedDay(data.currentDay);
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

  const loadQuestions = useCallback(async (selected: Persona) => {
    const currentRequest = ++questionsRequestId.current;
    setQuestionsLoading(true);
    setQuestionsError("");
    try {
      const items = await api.questions(selected);
      if (currentRequest === questionsRequestId.current)
        setSavedQuestions(items);
    } catch (cause) {
      if (currentRequest === questionsRequestId.current)
        setQuestionsError(apiError(cause));
    } finally {
      if (currentRequest === questionsRequestId.current)
        setQuestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void api
      .account()
      .then((info) => {
        if (!active) return;
        setAccount(info);
        if (info?.persona) setPersona(info.persona);
        if (info && !info.profileComplete) {
          setView("account");
          window.location.hash = "account";
        }
      })
      .catch(() => {
        if (active) setAccount(null);
      })
      .finally(() => {
        if (active) setAccountReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!accountReady || (account && !account.profileComplete)) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        await load(persona);
        if (!cancelled) await loadQuestions(persona);
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [load, loadQuestions, persona, accountReady, account, accountEpoch]);
  useEffect(() => {
    void api
      .health()
      .then((health) => {
        setAiMode(health.aiMode);
        setEmailMode(health.emailMode);
      })
      .catch(() => setAiMode("mock"));
  }, []);
  useEffect(() => {
    localStorage.setItem("xike-persona", persona);
  }, [persona]);
  useEffect(() => {
    localStorage.setItem("xike-large-text", String(largeText));
  }, [largeText]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const onHashChange = () => setView(initialView());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  useEffect(() => {
    const onExpired = () => {
      ++requestId.current;
      ++questionsRequestId.current;
      setAccount(null);
      setDashboard(null);
      setMessages([]);
      setSavedQuestions([]);
      setView("account");
      window.location.hash = "account";
      setNotice("登录已过期，请重新验证邮箱");
    };
    window.addEventListener("xike-session-expired", onExpired);
    return () => window.removeEventListener("xike-session-expired", onExpired);
  }, []);

  function navigate(next: View) {
    if (account && !account.profileComplete && next !== "account") return;
    if (next === "checkin" && dashboard) {
      setSelectedDay(dashboard.currentDay);
      setForm(
        dashboard.today
          ? {
              sleepHours: dashboard.today.sleepHours,
              activityMinutes: dashboard.today.activityMinutes,
              mood: dashboard.today.mood,
              note: dashboard.today.note ?? "",
            }
          : EMPTY_FORM,
      );
    }
    setView(next);
    window.location.hash = next;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editDay(day: string) {
    const record = dashboard?.monthHistory.find((item) => item.day === day);
    if (!record) return;
    setSelectedDay(day);
    setForm({
      sleepHours: record.sleepHours,
      activityMinutes: record.activityMinutes,
      mood: record.mood,
      note: record.note ?? "",
    });
    setView("checkin");
    window.location.hash = "checkin";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectDay(day: string) {
    const record = dashboard?.monthHistory.find((item) => item.day === day);
    setSelectedDay(day);
    setForm(
      record
        ? {
            sleepHours: record.sleepHours,
            activityMinutes: record.activityMinutes,
            mood: record.mood,
            note: record.note ?? "",
          }
        : EMPTY_FORM,
    );
  }

  function changePersona(next: Persona) {
    if (next === persona) return;
    ++requestId.current;
    ++questionsRequestId.current;
    setDashboard(null);
    setLoading(true);
    setError("");
    setMessages([]);
    setSavedQuestions([]);
    setQuestionsError("");
    setQuestion("");
    setUseRecords(false);
    setPersona(next);
  }

  function accountChanged(next: AccountInfo) {
    ++requestId.current;
    ++questionsRequestId.current;
    setAccount(next);
    setDashboard(null);
    setMessages([]);
    setSavedQuestions([]);
    setUseRecords(false);
    setLoading(true);
    if (next.persona) setPersona(next.persona);
    setAccountEpoch((current) => current + 1);
    setView(next.profileComplete ? "today" : "account");
    window.location.hash = next.profileComplete ? "today" : "account";
  }

  function accountExited(deleted: boolean) {
    ++requestId.current;
    ++questionsRequestId.current;
    setAccount(null);
    setPersona("STUDENT");
    setDashboard(null);
    setMessages([]);
    setSavedQuestions([]);
    setUseRecords(false);
    setLoading(true);
    setAccountEpoch((current) => current + 1);
    setNotice(deleted ? "演示账号及记录已删除" : "已退出账号，返回匿名演示");
    setView("today");
    window.location.hash = "today";
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
      await api.checkinDay(persona, selectedDay, form);
      await load(persona);
      setNotice("记录已保存，回顾已更新");
      navigate(selectedDay === dashboard?.currentDay ? "today" : "review");
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
          ? { ...current, actions: [added, ...current.actions] }
          : current,
      );
      setNotice("已加入今天的行动");
    } catch (cause) {
      setNotice(apiError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function deleteAction(id: string) {
    setBusy(true);
    try {
      await api.deleteAction(id);
      setDashboard((current) =>
        current
          ? {
              ...current,
              actions: current.actions.filter((item) => item.id !== id),
            }
          : current,
      );
      setNotice("行动已移除");
    } catch (cause) {
      setNotice(apiError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function clearWorkspace() {
    setBusy(true);
    try {
      await api.clearWorkspace();
      ++questionsRequestId.current;
      setMessages([]);
      setSavedQuestions([]);
      setQuestion("");
      setUseRecords(false);
      setConfirmReset(false);
      setDashboard(null);
      setLoading(true);
      await load(persona);
      await loadQuestions(persona);
      setNotice(
        account
          ? "当前账号的演示记录已清除"
          : "演示数据已清除，已载入新的示例工作区",
      );
      navigate("today");
    } catch (cause) {
      setNotice(apiError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function ask(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    const contextTopicId = messages.at(-1)?.response?.sources[0]?.id ?? null;
    if (view !== "assistant") navigate("assistant");
    setMessages((current) => [...current, { role: "user", text: clean }]);
    setQuestion("");
    setBusy(true);
    try {
      const response = await api.ask(
        persona,
        clean,
        contextTopicId,
        useRecords,
      );
      setMessages((current) => [
        ...current,
        { role: "assistant", text: response.content, response },
      ]);
      await loadQuestions(persona);
    } catch (cause) {
      setMessages((current) => [
        ...current,
        { role: "assistant", text: apiError(cause) },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function deleteSavedQuestion(id: string) {
    try {
      await api.deleteQuestion(persona, id);
      setSavedQuestions((current) => current.filter((item) => item.id !== id));
      setNotice("历史提问已删除");
    } catch (cause) {
      setNotice(apiError(cause));
    }
  }

  function openSavedQuestion(item: SavedQuestion) {
    setMessages([
      { role: "user", text: item.question },
      {
        role: "assistant",
        text: item.response.content,
        response: item.response,
      },
    ]);
  }

  return (
    <div className={`app ${largeText ? "large-text" : ""}`}>
      <header className="site-header">
        <div className="header-inner">
          <button
            className="wordmark"
            type="button"
            onClick={() => navigate("today")}
            aria-label="息刻首页"
          >
            <span className="wordmark-symbol">
              <HeartPulse size={24} strokeWidth={2.4} />
            </span>
            <span>
              息刻<small>XIKE</small>
            </span>
          </button>
          <nav className="desktop-nav" aria-label="主导航">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                className={view === item.id ? "active" : ""}
                aria-current={view === item.id ? "page" : undefined}
                onClick={() => navigate(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="header-tools">
            <button
              type="button"
              className="font-toggle"
              aria-label={largeText ? "使用标准字号" : "放大字号"}
              title={largeText ? "标准字号" : "放大字号"}
              aria-pressed={largeText}
              onClick={() => setLargeText(!largeText)}
            >
              <Type size={20} />
              <span>{largeText ? "A" : "A+"}</span>
            </button>
            {!account && (
              <label className="profile-picker">
                <span className="profile-dot">
                  {PEOPLE[persona].label.slice(0, 1)}
                </span>
                <select
                  aria-label="切换演示人群"
                  value={persona}
                  disabled={busy || loading}
                  onChange={(event) =>
                    changePersona(event.target.value as Persona)
                  }
                >
                  <option value="STUDENT">大学生</option>
                  <option value="LEARNER">学生</option>
                  <option value="WORKER">职场人士</option>
                  <option value="SENIOR">年长者</option>
                </select>
              </label>
            )}
            <button
              type="button"
              className="account-link"
              onClick={() => {
                if (REMOTE_BROWSER && emailMode === "local") {
                  setNotice("邮箱账号仅在本机演示；请使用匿名工作区体验");
                  return;
                }
                navigate("account");
              }}
              title={account ? "我的账号" : "邮箱登录或注册"}
              aria-label={account ? "我的账号" : "邮箱登录或注册"}
            >
              <UserRound size={19} />
              <span>
                {account
                  ? account.profileComplete && account.persona
                    ? PEOPLE[account.persona].label
                    : "完成资料"
                  : "登录 / 注册"}
              </span>
            </button>
          </div>
        </div>
      </header>
      <main id="main">
        {error && (
          <div className="page-wrap error-banner" role="alert">
            <span>{error}</span>
            <button type="button" onClick={retry}>
              <RefreshCw size={18} />
              重试
            </button>
          </div>
        )}
        {notice && (
          <div className="toast" role="status">
            <Check size={18} />
            {notice}
            <button
              type="button"
              aria-label="关闭"
              onClick={() => setNotice("")}
            >
              <X size={17} />
            </button>
          </div>
        )}
        {!accountReady ? (
          <div className="page-wrap loading-state">正在检查演示账号…</div>
        ) : view === "account" && REMOTE_BROWSER && emailMode === "local" ? (
          <div className="page-wrap loading-state">
            邮箱账号仅在本机演示；请使用匿名工作区体验。
          </div>
        ) : view === "account" || (account && !account.profileComplete) ? (
          <AccountView
            account={account}
            emailMode={emailMode}
            onAuthenticated={accountChanged}
            onProfileSaved={accountChanged}
            onSignedOut={() => accountExited(false)}
            onDeleted={() => accountExited(true)}
            onBack={() => navigate("today")}
          />
        ) : loading && !dashboard ? (
          <div className="page-wrap loading-state">正在载入演示画像…</div>
        ) : (
          dashboard && (
            <>
              {view === "today" && (
                <TodayView
                  dashboard={dashboard}
                  persona={persona}
                  accountMode={Boolean(account)}
                  busy={busy}
                  onNavigate={navigate}
                  onAsk={(text) => void ask(text)}
                  onAddAction={(title) => void addAction(title)}
                  onToggleAction={(action) => void toggleAction(action)}
                  onDeleteAction={(id) => void deleteAction(id)}
                />
              )}
              {view === "checkin" && (
                <CheckinView
                  form={form}
                  selectedDay={selectedDay}
                  availableDays={recentDays(dashboard.currentDay, 30)}
                  busy={busy}
                  onChange={setForm}
                  onSelectDay={selectDay}
                  onSave={(event) => void saveCheckin(event)}
                  onNavigate={navigate}
                />
              )}
              {view === "review" && (
                <ReviewView
                  dashboard={dashboard}
                  persona={persona}
                  onNavigate={navigate}
                  onEditDay={editDay}
                  onAddAction={(title) => void addAction(title)}
                  busy={busy}
                />
              )}
              {view === "knowledge" && (
                <KnowledgeView
                  knowledge={dashboard.knowledge}
                  actions={dashboard.actions}
                  busy={busy}
                  onAsk={(text) => void ask(text)}
                  onAddAction={(title) => void addAction(title)}
                />
              )}
              {view === "assistant" && (
                <AssistantView
                  persona={persona}
                  messages={messages}
                  savedQuestions={savedQuestions}
                  questionsLoading={questionsLoading}
                  questionsError={questionsError}
                  question={question}
                  busy={busy}
                  actions={dashboard.actions}
                  aiMode={aiMode}
                  useRecords={useRecords}
                  onUseRecordsChange={setUseRecords}
                  onQuestionChange={setQuestion}
                  onAsk={(text) => void ask(text)}
                  onAddAction={(title) => void addAction(title)}
                  onClear={() => {
                    setMessages([]);
                    setQuestion("");
                  }}
                  onOpenSavedQuestion={openSavedQuestion}
                  onDeleteSavedQuestion={(id) => void deleteSavedQuestion(id)}
                  onRetryQuestions={() => void loadQuestions(persona)}
                />
              )}
            </>
          )
        )}
      </main>
      <footer className="site-footer">
        <div className="layout-max">
          <span>息刻 XIKE · 健康素养 Demo</span>
          <div className="footer-reset">
            {confirmReset ? (
              <div role="group" aria-label="确认清除演示数据">
                <span>清除当前浏览器的演示数据？</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void clearWorkspace()}
                >
                  确认清除
                </button>
                <button type="button" onClick={() => setConfirmReset(false)}>
                  取消
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmReset(true)}>
                <Trash2 size={16} aria-hidden="true" />
                清除演示数据
              </button>
            )}
          </div>
          <span>
            示例数据 / {aiMode === "compatible" ? "模型实验模式" : "Mock 助手"}{" "}
            / 非医疗服务
          </span>
        </div>
      </footer>
      <nav className="mobile-nav" aria-label="移动端主导航">
        {NAV.map((item) => {
          const Icon = ICONS[item.id];
          return (
            <button
              key={item.id}
              type="button"
              className={view === item.id ? "active" : ""}
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => navigate(item.id)}
            >
              <Icon size={23} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
