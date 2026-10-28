import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { Checkin } from "./types";

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

export type Metric = "sleep" | "activity" | "mood";

const METRICS = {
  sleep: { name: "睡眠", unit: "小时", color: "#168b7a", max: 10 },
  activity: { name: "活动", unit: "分钟", color: "#d46c4b", max: undefined },
  mood: { name: "心情", unit: "分", color: "#6373ad", max: 5 },
} as const;

export default function TrendChart({
  history,
  metric,
  periodDays,
  endDay,
}: {
  history: Checkin[];
  metric: Metric;
  periodDays: number;
  endDay: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    const config = METRICS[metric];
    const [year, month, day] = endDay.split("-").map(Number);
    const last = new Date(year, month - 1, day);
    const dates = Array.from({ length: periodDays }, (_, index) => {
      const date = new Date(last);
      date.setDate(date.getDate() - periodDays + index + 1);
      return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
        .map((part, position) =>
          position === 0 ? String(part) : String(part).padStart(2, "0"),
        )
        .join("-");
    });
    const records = new Map(history.map((item) => [item.day, item]));
    chart.setOption({
      animationDuration: 450,
      grid: { left: 44, right: 18, top: 24, bottom: 40 },
      tooltip: {
        trigger: "axis",
        backgroundColor: "#fff",
        borderColor: "#e1e6e3",
        textStyle: { color: "#26332e", fontSize: 14 },
        valueFormatter: (value: unknown) => `${value} ${config.unit}`,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: dates.map((date) => date.slice(5).replace("-", "/")),
        axisLine: { lineStyle: { color: "#cbd6d0" } },
        axisTick: { show: false },
        axisLabel: {
          color: "#53675b",
          fontSize: 14,
          interval: periodDays === 30 ? 4 : 0,
        },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: config.max,
        splitLine: { lineStyle: { color: "#e9eeeb" } },
        axisLabel: { color: "#53675b", fontSize: 14 },
      },
      series: [
        {
          name: config.name,
          type: "line",
          data: dates.map((date) => {
            const item = records.get(date);
            if (!item) return null;
            return metric === "sleep"
              ? item.sleepHours
              : metric === "activity"
                ? item.activityMinutes
                : item.mood;
          }),
          connectNulls: false,
          smooth: true,
          symbolSize: 8,
          itemStyle: { color: config.color },
          lineStyle: { width: 3 },
          areaStyle: { color: config.color, opacity: 0.08 },
        },
      ],
    });
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [history, metric, periodDays, endDay]);

  return (
    <div
      ref={ref}
      className="trend-chart"
      role="img"
      aria-label={`近${periodDays}日${METRICS[metric].name}趋势图，未记录日期留空`}
    />
  );
}
