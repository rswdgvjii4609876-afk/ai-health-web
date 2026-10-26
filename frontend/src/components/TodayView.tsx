import { lazy, Suspense, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  Check,
  Clock3,
  MessageCircle,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import type { ActionItem, Dashboard, Persona, View } from "../types";
import { MOODS, PEOPLE } from "./config";
import SourceLink from "./SourceLink";

const TrendChart = lazy(() => import("../TrendChart"));

interface Props {
  dashboard: Dashboard;
  persona: Persona;
  busy: boolean;
  onNavigate: (view: View) => void;
  onAsk: (question: string) => void;
  onAddAction: (title: string) => void;
  onToggleAction: (action: ActionItem) => void;
  onDeleteAction: (id: string) => void;
}

export default function TodayView({
  dashboard,
  persona,
  busy,
  onNavigate,
  onAsk,
  onAddAction,
  onToggleAction,
  onDeleteAction,
}: Props) {
  const [quickQuestion, setQuickQuestion] = useState("");
  const [actionTitle, setActionTitle] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const focus =
    dashboard.knowledge.find((item) => item.id === dashboard.review.focusId) ??
    dashboard.knowledge[0];
  const completed = dashboard.actions.filter((item) => item.completed).length;
  const [date] = useState(() =>
    new Intl.DateTimeFormat("zh-CN", {
      month: "long",
      day: "numeric",
      weekday: "long",
    }).format(new Date()),
  );

  function submitQuestion(event: FormEvent) {
    event.preventDefault();
    if (!quickQuestion.trim()) return;
    onAsk(quickQuestion.trim());
    setQuickQuestion("");
  }

  function submitAction(event: FormEvent) {
    event.preventDefault();
    if (!actionTitle.trim()) return;
    onAddAction(actionTitle.trim());
    setActionTitle("");
  }

  return (
    <div className="today-view">
      <section className="today-band">
        <div className="layout-max">
          <div className="band-meta">
            <span>XIKE / HEALTH STUDIO</span>
            <span>
              {date} · {PEOPLE[persona].label}
            </span>
          </div>
          <div className="today-band-grid">
            <div className="today-title-block">
              <p className="kicker light-kicker">你的日常，正在形成线索</p>
              <h1>
                今天，
                <br />
                <em>照看自己的节律。</em>
              </h1>
              <p className="lead-copy">{PEOPLE[persona].intro}</p>
              <button
                className="button-accent"
                type="button"
                onClick={() => onNavigate("checkin")}
              >
                <Plus size={20} />
                记录今天
                <ArrowRight size={20} />
              </button>
            </div>
            <div className="today-readout" aria-label="今日记录快照">
              <div className="readout-top">
                <span>今日快照</span>
                <span>01 / 03</span>
              </div>
              <div className="readout-item">
                <span>睡眠</span>
                <strong>
                  {dashboard.today?.sleepHours ?? "—"}
                  <small>小时</small>
                </strong>
              </div>
              <div className="readout-item">
                <span>活动</span>
                <strong>
                  {dashboard.today?.activityMinutes ?? "—"}
                  <small>分钟</small>
                </strong>
              </div>
              <div className="readout-item">
                <span>心情</span>
                <strong className="mood-readout">
                  {dashboard.today ? MOODS[dashboard.today.mood - 1] : "—"}
                </strong>
              </div>
              <p>{dashboard.today?.note || "今天还没有留下备注。"}</p>
            </div>
          </div>
          <form className="quick-ask" onSubmit={submitQuestion}>
            <div className="quick-ask-label">
              <MessageCircle size={22} />
              <span>
                有个问题？<b>直接问息刻</b>
              </span>
            </div>
            <input
              aria-label="向息刻助手提问"
              value={quickQuestion}
              onChange={(event) => setQuickQuestion(event.target.value)}
              maxLength={400}
              placeholder={PEOPLE[persona].prompts[0]}
            />
            <button
              type="submit"
              disabled={!quickQuestion.trim()}
              aria-label="发送问题"
              title="发送问题"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </section>

      <div className="layout-max content-stack">
        <section className="section-block overview-review">
          <div className="section-heading">
            <div>
              <span className="kicker">01 / 变化</span>
              <h2>
                七天的记录，
                <br />
                比一天更有故事。
              </h2>
            </div>
            <button
              className="text-button"
              type="button"
              onClick={() => onNavigate("review")}
            >
              打开完整回顾
              <ArrowRight size={20} />
            </button>
          </div>
          <div className="overview-review-grid">
            <div className="overview-chart">
              <div className="chart-heading">
                <span>睡眠节律</span>
                <strong>
                  {dashboard.review.averageSleepHours}
                  <small>小时 / 日均</small>
                </strong>
              </div>
              <Suspense fallback={<div className="trend-chart" />}>
                <TrendChart history={dashboard.history} metric="sleep" />
              </Suspense>
            </div>
            <div className="review-observation">
              <span className="index-mark">7D / REVIEW</span>
              <h3>{dashboard.review.daysRecorded} 天记录</h3>
              <p>{dashboard.review.observation}</p>
              <span className="review-caveat">
                只描述变化，不评判健康状态。
              </span>
            </div>
          </div>
        </section>

        <section className="section-block focus-section">
          <div className="section-heading">
            <div>
              <span className="kicker">02 / 关注</span>
              <h2>从一件小事开始</h2>
            </div>
          </div>
          {focus && (
            <div className="focus-layout">
              <div className="focus-number">
                {String(dashboard.knowledge.indexOf(focus) + 1).padStart(
                  2,
                  "0",
                )}
              </div>
              <div className="focus-copy">
                <span>
                  {focus.category} · 为 {PEOPLE[persona].label} 推荐
                </span>
                <h3>{focus.title}</h3>
                <p>{focus.summary}</p>
                <SourceLink
                  name={focus.sourceName}
                  date={focus.sourceDate}
                  url={focus.sourceUrl}
                />
              </div>
              <div className="focus-actions">
                <button
                  className="button-dark"
                  type="button"
                  onClick={() => onAsk(`${focus.title}，我可以从哪里开始？`)}
                >
                  围绕它提问
                  <ArrowRight size={18} />
                </button>
                {focus.action && (
                  <button
                    className="text-button"
                    type="button"
                    disabled={
                      busy ||
                      dashboard.actions.some(
                        (item) => item.title === focus.action,
                      )
                    }
                    onClick={() => onAddAction(focus.action!)}
                  >
                    <Plus size={18} />
                    {dashboard.actions.some(
                      (item) => item.title === focus.action,
                    )
                      ? "已加入行动"
                      : "设为小行动"}
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="section-block action-section">
          <div className="section-heading">
            <div>
              <span className="kicker">03 / 行动</span>
              <h2>真正做过的，才属于今天。</h2>
            </div>
            <span className="completion-count">
              {completed} / {dashboard.actions.length} 已完成
            </span>
          </div>
          <div className="action-board">
            <div className="action-board-list">
              {dashboard.actions.length ? (
                dashboard.actions.map((action) => (
                  <div
                    className={`action-entry ${action.completed ? "is-complete" : ""}`}
                    key={action.id}
                  >
                    <label>
                      <input
                        type="checkbox"
                        checked={action.completed}
                        disabled={busy}
                        onChange={() => onToggleAction(action)}
                      />
                      <span className="action-check">
                        <Check size={16} />
                      </span>
                      <span>{action.title}</span>
                    </label>
                    {deleteId === action.id ? (
                      <div className="delete-confirm">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteAction(action.id);
                            setDeleteId(null);
                          }}
                        >
                          确认移除
                        </button>
                        <button type="button" onClick={() => setDeleteId(null)}>
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        className="icon-button"
                        type="button"
                        title="移除行动"
                        aria-label={`移除行动：${action.title}`}
                        onClick={() => setDeleteId(action.id)}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="empty-hint">
                  还没有小行动。写下一件今天愿意做的事。
                </p>
              )}
            </div>
            <form className="action-add" onSubmit={submitAction}>
              <Plus size={20} />
              <input
                aria-label="添加小行动"
                value={actionTitle}
                onChange={(event) => setActionTitle(event.target.value)}
                maxLength={100}
                placeholder="添加一件适合自己的小行动"
              />
              <button type="submit" disabled={busy || !actionTitle.trim()}>
                添加
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
        </section>
        <p className="page-disclaimer">
          <Clock3 size={16} />
          示例画像与内存数据仅供体验；不用于诊断，后端重启后恢复初始数据。
        </p>
      </div>
    </div>
  );
}
