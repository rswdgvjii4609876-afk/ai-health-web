import type { Persona, View } from "../types";

export const PEOPLE: Record<
  Persona,
  { label: string; short: string; intro: string; prompts: string[] }
> = {
  STUDENT: {
    label: "大学生",
    short: "校园节律",
    intro: "课业、睡眠和情绪，都值得被认真看见。",
    prompts: [
      "最近总熬夜，怎样调整作息？",
      "复习压力大时可以做什么？",
      "久坐学习怎么增加活动？",
    ],
  },
  WORKER: {
    label: "职场人士",
    short: "工作节律",
    intro: "在密集的日程里，为自己留下一点空间。",
    prompts: [
      "工作时久坐，有什么小调整？",
      "下班后怎么安排休息？",
      "压力持续影响生活怎么办？",
    ],
  },
  SENIOR: {
    label: "年长者",
    short: "自在生活",
    intro: "把日常过得更安心，从熟悉的小事开始。",
    prompts: [
      "在家怎样留意跌倒风险？",
      "日常活动要注意什么？",
      "用药信息应该向谁确认？",
    ],
  },
};

export const NAV: { id: Exclude<View, "checkin">; label: string }[] = [
  { id: "today", label: "今天" },
  { id: "review", label: "七日回顾" },
  { id: "knowledge", label: "知识库" },
  { id: "assistant", label: "AI 助手" },
];

export const MOODS = ["很低落", "不太好", "一般", "还不错", "很好"];
