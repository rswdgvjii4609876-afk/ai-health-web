import { lazy, Suspense, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  MessageCircle,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type { ActionItem, Dashboard, Persona, View } from "../types";
import { MOODS, PEOPLE } from "./config";
import SourceLink from "./SourceLink";

const TrendChart = lazy(() => import("../TrendChart"));

interface Props {
  dashboard: Dashboard;
  persona: Persona;
  accountMode: boolean;
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
  accountMode,
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
              <p className="kicker light-kicker">你的健康素养工作台</p>
              <h1>
                先看清问题，
                <br />
                <em>再改变一点。</em>
              </h1>
              <p className="lead-copy">
                {PEOPLE[persona].intro}{" "}
                用记录发现线索，用原始资料核对说法，再把答案变成一件能完成的小事。
              </p>
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
                <span>{dashboard.today ? "已记录" : "待记录"}</span>
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
                想求证？<b>问息刻</b>
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
          <div className="quick-prompts" aria-label="常见问题">
            {PEOPLE[persona].prompts.map((prompt) => (
              <button key={prompt} type="button" onClick={() => onAsk(prompt)}>
                {prompt}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="journey-section layout-max" aria-label="使用流程">
        <div className="journey-heading">
          <span className="kicker">YOUR PATH / 三步开始</span>
          <strong>问题有依据，改变有回声。</strong>
        </div>
        <div className="journey-grid">
          <button type="button" onClick={() => onNavigate("checkin")}>
            <span className="journey-index">01 / 记录</span>
            <BookOpen size={27} />
            <strong>留下今天的线索</strong>
            <small>
              {dashboard.today
                ? "今天已记录，可以继续编辑"
                : "睡眠、活动与心情，三项就够"}
            </small>
            <ArrowRight size={19} className="journey-arrow" />
          </button>
          <button type="button" onClick={() => onNavigate("assistant")}>
            <span className="journey-index">02 / 求证</span>
            <ShieldCheck size={27} />
            <strong>看见回答的来处</strong>
            <small>提出疑问，核对资料与适用范围</small>
            <ArrowRight size={19} className="journey-arrow" />
          </button>
          <button type="button" onClick={() => onNavigate("review")}>
            <span className="journey-index">03 / 回顾</span>
            <Check size={27} />
            <strong>让小行动持续发生</strong>
            <small>
              {completed}/{dashboard.actions.length} 件小行动已完成 ·{" "}
              {dashboard.review.daysRecorded} 天有记录
            </small>
            <ArrowRight size={19} className="journey-arrow" />
          </button>
        </div>
      </section>

      <div className="layout-max content-stack">
        <section className="section-block overview-review">
          <div className="section-heading">
            <div>
              <span className="kicker">01 / 变化</span>
              <h2>近七天，发生了什么？</h2>
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
                  {dashboard.review.daysRecorded
                    ? dashboard.review.averageSleepHours
                    : "—"}
                  <small>小时 / 日均</small>
                </strong>
              </div>
              <Suspense fallback={<div className="trend-chart" />}>
                <TrendChart
                  history={dashboard.history}
                  metric="sleep"
                  periodDays={7}
                  endDay={dashboard.currentDay}
                />
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
              <h2>今天的小行动</h2>
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
          {accountMode
            ? "账号记录仅保存在本机演示数据库；可从页脚清除，不用于诊断。"
            : "示例画像仅供体验；记录按浏览器隔离，可从页脚清除，不用于诊断。"}
        </p>
      </div>
    </div>
  );
}
