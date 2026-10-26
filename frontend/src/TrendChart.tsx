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
}: {
  history: Checkin[];
  metric: Metric;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    const config = METRICS[metric];
    chart.setOption({
      animationDuration: 450,
      grid: { left: 38, right: 18, top: 24, bottom: 34 },
      tooltip: {
        trigger: "axis",
        backgroundColor: "#fff",
        borderColor: "#e1e6e3",
        textStyle: { color: "#26332e" },
        valueFormatter: (value: unknown) => `${value} ${config.unit}`,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: history.map((item) => item.day.slice(5).replace("-", "/")),
        axisLine: { lineStyle: { color: "#cbd6d0" } },
        axisTick: { show: false },
        axisLabel: { color: "#66736d", fontSize: 12 },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: config.max,
        splitLine: { lineStyle: { color: "#e9eeeb" } },
        axisLabel: { color: "#66736d", fontSize: 12 },
      },
      series: [
        {
          name: config.name,
          type: "line",
          data: history.map((item) =>
            metric === "sleep"
              ? item.sleepHours
              : metric === "activity"
                ? item.activityMinutes
                : item.mood,
          ),
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
  }, [history, metric]);

  return (
    <div
      ref={ref}
      className="trend-chart"
      role="img"
      aria-label={`近七日${METRICS[metric].name}趋势图`}
    />
  );
}
