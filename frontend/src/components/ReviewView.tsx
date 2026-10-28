import { lazy, Suspense, useState } from "react";
import { ArrowRight, Check, Download, Info, Plus } from "lucide-react";
import type { Metric } from "../TrendChart";
import type { Dashboard, Persona, View } from "../types";
import { MOODS, PEOPLE } from "./config";
import SourceLink from "./SourceLink";

const TrendChart = lazy(() => import("../TrendChart"));
const METRIC_LABELS: Record<Metric, string> = {
  sleep: "睡眠",
  activity: "活动",
  mood: "心情",
};

export default function ReviewView({
  dashboard,
  persona,
  onNavigate,
  onEditDay,
  onAddAction,
  busy,
}: {
  dashboard: Dashboard;
  persona: Persona;
  onNavigate: (view: View) => void;
  onEditDay: (day: string) => void;
  onAddAction: (title: string) => void;
  busy: boolean;
}) {
  const [metric, setMetric] = useState<Metric>("sleep");
  const [period, setPeriod] = useState<"week" | "month">("week");
  const monthly = period === "month";
  const history = monthly ? dashboard.monthHistory : dashboard.history;
  const review = monthly ? dashboard.monthReview : dashboard.review;
  const focus = dashboard.knowledge.find(
    (item) => item.id === dashboard.review.focusId,
  );
  const monthFocus = dashboard.monthReview.focusIds
    .map((id) => dashboard.knowledge.find((item) => item.id === id))
    .filter((item) => item !== undefined);

  function exportRecords() {
    const exportData = {
      persona,
      exportedAt: new Date().toISOString(),
      demo: true,
      periodDays: monthly ? 30 : 7,
      history,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `xike-demo-${persona.toLowerCase()}-${monthly ? "30d" : "7d"}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="page-wrap review-view">
      <header className="page-header">
        <span className="kicker">REVIEW / {PEOPLE[persona].short}</span>
        <div className="page-header-row">
          <h1>
            把日常，
            <br />
            <em>看得更清楚。</em>
          </h1>
          <button
            type="button"
            className="button-outline"
            onClick={exportRecords}
          >
            <Download size={19} />
            导出当前记录
          </button>
        </div>
        <p>从一周到一个月，只呈现你填下的事实，不给健康打分。</p>
      </header>
      <div className="review-period" role="group" aria-label="选择回顾时段">
        <div className="segmented">
          <button
            type="button"
            className={!monthly ? "selected" : ""}
            aria-pressed={!monthly}
            onClick={() => setPeriod("week")}
          >
            近 7 天
          </button>
          <button
            type="button"
            className={monthly ? "selected" : ""}
            aria-pressed={monthly}
            onClick={() => setPeriod("month")}
          >
            近 30 天
          </button>
        </div>
        <span>
          已记录 {review.daysRecorded} / {monthly ? 30 : 7} 天
        </span>
      </div>
      <div className={`review-figures ${monthly ? "monthly" : ""}`}>
        <div>
          <span>记录天数</span>
          <strong>
            {review.daysRecorded}
            <small>天</small>
          </strong>
        </div>
        <div>
          <span>日均睡眠</span>
          <strong>
            {review.daysRecorded ? review.averageSleepHours : "—"}
            <small>小时</small>
          </strong>
        </div>
        <div>
          <span>日均活动</span>
          <strong>
            {review.daysRecorded ? review.averageActivityMinutes : "—"}
            <small>分钟</small>
          </strong>
        </div>
        {monthly && (
          <div>
            <span>平均心情</span>
            <strong>
              {review.daysRecorded ? dashboard.monthReview.averageMood : "—"}
              <small>/ 5</small>
            </strong>
          </div>
        )}
      </div>
      <section className="section-block review-chart-section">
        <div className="section-heading">
          <div>
            <span className="kicker">01 / 轨迹</span>
            <h2>{monthly ? "三十天的生活节律" : "数据会说话，结论要谨慎。"}</h2>
          </div>
          <div className="segmented" aria-label="选择趋势指标">
            {(["sleep", "activity", "mood"] as Metric[]).map((item) => (
              <button
                key={item}
                type="button"
                className={metric === item ? "selected" : ""}
                aria-pressed={metric === item}
                onClick={() => setMetric(item)}
              >
                {METRIC_LABELS[item]}
              </button>
            ))}
          </div>
        </div>
        <div className="review-chart-surface">
          <Suspense fallback={<div className="trend-chart" />}>
            <TrendChart
              history={history}
              metric={metric}
              periodDays={monthly ? 30 : 7}
              endDay={dashboard.currentDay}
            />
          </Suspense>
        </div>
        <div className="review-chart-footer">
          <Info size={18} />
          <p>{review.observation}</p>
        </div>
      </section>
      {monthly ? (
        <section className="section-block monthly-guidance">
          <div className="section-heading">
            <div>
              <span className="kicker">02 / 生活方式参考</span>
              <h2>有依据的小调整</h2>
            </div>
          </div>
          <p className="guidance-intro">
            依据自填记录选择阅读方向；记录不等于医学评估，活动时长也不代表运动强度。
          </p>
          <div className="guidance-list">
            {monthFocus.map((item, index) => (
              <article key={item.id}>
                <span className="guidance-number">
                  0{index + 1} / {item.category}
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                  <SourceLink
                    name={item.sourceName}
                    date={item.sourceDate}
                    url={item.sourceUrl}
                  />
                </div>
                {item.action && (
                  <button
                    type="button"
                    className="guidance-action"
                    disabled={
                      busy ||
                      dashboard.actions.some(
                        (action) => action.title === item.action,
                      )
                    }
                    onClick={() => onAddAction(item.action!)}
                  >
                    {dashboard.actions.some(
                      (action) => action.title === item.action,
                    ) ? (
                      <Check size={18} />
                    ) : (
                      <Plus size={18} />
                    )}
                    {dashboard.actions.some(
                      (action) => action.title === item.action,
                    )
                      ? "已加入行动"
                      : "加入行动"}
                  </button>
                )}
              </article>
            ))}
          </div>
          <p className="guidance-disclaimer">
            如症状持续、影响生活或需要诊疗与用药判断，请咨询专业人员。资料内容请以原文为准。
          </p>
        </section>
      ) : (
        <section className="section-block review-context">
          <div className="section-heading">
            <div>
              <span className="kicker">02 / 下一步</span>
              <h2>从观察走向行动</h2>
            </div>
          </div>
          <div className="context-grid">
            <div>
              <span className="context-label">资料焦点</span>
              <h3>{focus?.title ?? "选择一个关注点"}</h3>
              <p>{focus?.summary ?? "记录更多日常信息后再回看。"}</p>
              {focus && (
                <SourceLink
                  name={focus.sourceName}
                  date={focus.sourceDate}
                  url={focus.sourceUrl}
                />
              )}
            </div>
            <button
              type="button"
              className="button-dark"
              onClick={() => onNavigate("checkin")}
            >
              更新今天的记录
              <ArrowRight size={18} />
            </button>
          </div>
        </section>
      )}
      <details className="record-details">
        <summary>
          查看每日原始记录 <span>{history.length} 条</span>
        </summary>
        <div className="table-scroll">
          <table className="history-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>睡眠</th>
                <th>活动</th>
                <th>心情</th>
                <th>备注</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.day}>
                  <td>{item.day}</td>
                  <td>{item.sleepHours} 小时</td>
                  <td>{item.activityMinutes} 分钟</td>
                  <td>{MOODS[item.mood - 1]}</td>
                  <td>{item.note || "—"}</td>
                  <td>
                    <button
                      type="button"
                      className="table-edit"
                      onClick={() => onEditDay(item.day)}
                    >
                      编辑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
