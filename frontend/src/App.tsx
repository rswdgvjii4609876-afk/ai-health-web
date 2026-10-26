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
  Type,
  X,
} from "lucide-react";
import { api, apiError } from "./api";
import AssistantView from "./components/AssistantView";
import CheckinView from "./components/CheckinView";
import KnowledgeView from "./components/KnowledgeView";
import ReviewView from "./components/ReviewView";
import TodayView from "./components/TodayView";
import { NAV, PEOPLE } from "./components/config";
import type {
  ActionItem,
  ChatMessage,
  CheckinInput,
  Dashboard,
  Persona,
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

const VIEWS: View[] = ["today", "checkin", "review", "knowledge", "assistant"];

function initialView(): View {
  const requested = window.location.hash.slice(1) as View;
  return VIEWS.includes(requested) ? requested : "today";
}

function initialPersona(): Persona {
  const value = localStorage.getItem("xike-persona");
  return value === "WORKER" || value === "SENIOR" ? value : "STUDENT";
}

export default function App() {
  const [persona, setPersona] = useState<Persona>(initialPersona);
  const [view, setView] = useState<View>(initialView);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [form, setForm] = useState<CheckinInput>(EMPTY_FORM);
  const [selectedDay, setSelectedDay] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [largeText, setLargeText] = useState(
    () => localStorage.getItem("xike-large-text") === "true",
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const requestId = useRef(0);

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
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const onHashChange = () => setView(initialView());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function navigate(next: View) {
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
    const record = dashboard?.history.find((item) => item.day === day);
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
    const record = dashboard?.history.find((item) => item.day === day);
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

  async function ask(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    if (view !== "assistant") navigate("assistant");
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
                <option value="WORKER">职场人士</option>
                <option value="SENIOR">年长者</option>
              </select>
            </label>
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
        {loading && !dashboard ? (
          <div className="page-wrap loading-state">正在载入演示画像…</div>
        ) : (
          dashboard && (
            <>
              {view === "today" && (
                <TodayView
                  dashboard={dashboard}
                  persona={persona}
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
                  availableDays={[
                    ...new Set([
                      ...dashboard.history.map((item) => item.day),
                      dashboard.currentDay,
                    ]),
                  ].sort()}
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
                  question={question}
                  busy={busy}
                  actions={dashboard.actions}
                  onQuestionChange={setQuestion}
                  onAsk={(text) => void ask(text)}
                  onAddAction={(title) => void addAction(title)}
                  onClear={() => {
                    setMessages([]);
                    setQuestion("");
                  }}
                />
              )}
            </>
          )
        )}
      </main>
      <footer className="site-footer">
        <div className="layout-max">
          <span>息刻 XIKE · 健康素养 Demo</span>
          <span>示例数据 / Mock 助手 / 非医疗服务</span>
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
