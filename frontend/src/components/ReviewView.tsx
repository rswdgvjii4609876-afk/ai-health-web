import { lazy, Suspense, useState } from "react";
import { ArrowRight, Download, Info } from "lucide-react";
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
}: {
  dashboard: Dashboard;
  persona: Persona;
  onNavigate: (view: View) => void;
  onEditDay: (day: string) => void;
}) {
  const [metric, setMetric] = useState<Metric>("sleep");
  const focus = dashboard.knowledge.find(
    (item) => item.id === dashboard.review.focusId,
  );

  function exportRecords() {
    const exportData = {
      persona,
      exportedAt: new Date().toISOString(),
      demo: true,
      history: dashboard.history,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `xike-demo-${persona.toLowerCase()}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="page-wrap review-view">
      <header className="page-header">
        <span className="kicker">REVIEW / {PEOPLE[persona].short}</span>
        <div className="page-header-row">
          <h1>
            把这一周，
            <br />
            <em>看得更清楚。</em>
          </h1>
          <button
            type="button"
            className="button-outline"
            onClick={exportRecords}
          >
            <Download size={19} />
            导出示例记录
          </button>
        </div>
        <p>七日回顾只呈现你填下的事实，不给健康打分。</p>
      </header>
      <div className="review-figures">
        <div>
          <span>记录天数</span>
          <strong>
            {dashboard.review.daysRecorded}
            <small>天</small>
          </strong>
        </div>
        <div>
          <span>日均睡眠</span>
          <strong>
            {dashboard.review.averageSleepHours}
            <small>小时</small>
          </strong>
        </div>
        <div>
          <span>日均活动</span>
          <strong>
            {dashboard.review.averageActivityMinutes}
            <small>分钟</small>
          </strong>
        </div>
      </div>
      <section className="section-block review-chart-section">
        <div className="section-heading">
          <div>
            <span className="kicker">01 / 轨迹</span>
            <h2>数据会说话，结论要谨慎。</h2>
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
            <TrendChart history={dashboard.history} metric={metric} />
          </Suspense>
        </div>
        <div className="review-chart-footer">
          <Info size={18} />
          <p>{dashboard.review.observation}</p>
        </div>
      </section>
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
      <details className="record-details">
        <summary>
          查看每日原始记录 <span>{dashboard.history.length} 条</span>
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
              {dashboard.history.map((item) => (
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
