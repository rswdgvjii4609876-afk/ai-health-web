export type Persona = "STUDENT" | "WORKER" | "SENIOR";

export type View = "today" | "checkin" | "review" | "knowledge" | "assistant";

export interface Checkin {
  day: string;
  sleepHours: number;
  activityMinutes: number;
  mood: number;
  note: string | null;
}

export interface CheckinInput {
  sleepHours: number;
  activityMinutes: number;
  mood: number;
  note: string;
}

export interface ActionItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  category: string;
  summary: string;
  sourceName: string;
  sourceDate: string;
  sourceUrl: string;
  action: string | null;
}

export interface Dashboard {
  persona: Persona;
  currentDay: string;
  today: Checkin | null;
  history: Checkin[];
  actions: ActionItem[];
  knowledge: KnowledgeItem[];
  review: WeeklyReview;
}

export interface WeeklyReview {
  daysRecorded: number;
  averageSleepHours: number;
  averageActivityMinutes: number;
  sleepChangeHours: number;
  activityChangeMinutes: number;
  focusId: string;
  observation: string;
}

export interface AiResponse {
  content: string;
  sources: KnowledgeItem[];
  suggestedAction: string | null;
  followUps: string[];
  usedTodayRecord: boolean;
  mock: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  response?: AiResponse;
}
