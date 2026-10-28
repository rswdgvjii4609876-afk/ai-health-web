export type Persona = "STUDENT" | "LEARNER" | "WORKER" | "SENIOR";

export type View =
  "today" | "checkin" | "review" | "knowledge" | "assistant" | "account";

export type AgeBand = "AGE_18_24" | "AGE_25_44" | "AGE_45_59" | "AGE_60_PLUS";
export type HealthTag = "SLEEP" | "MOBILITY" | "CARDIOVASCULAR" | "METABOLIC";

export interface AccountInfo {
  email: string;
  ageBand: AgeBand | null;
  persona: Persona | null;
  healthTags: HealthTag[];
  profileComplete: boolean;
  demoVerification: boolean;
}

export interface ProfileInput {
  ageBand: AgeBand;
  persona: Persona;
  healthTags: HealthTag[];
  sensitiveConsent: boolean;
}

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
  sourceLocator?: string;
  sourceUrl: string;
  action: string | null;
}

export interface Dashboard {
  persona: Persona;
  currentDay: string;
  today: Checkin | null;
  history: Checkin[];
  monthHistory: Checkin[];
  actions: ActionItem[];
  knowledge: KnowledgeItem[];
  review: WeeklyReview;
  monthReview: MonthlyReview;
}

export interface MonthlyReview {
  daysRecorded: number;
  averageSleepHours: number;
  averageActivityMinutes: number;
  averageMood: number;
  observation: string;
  focusIds: string[];
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
  recordObservation: string | null;
  trace?: {
    status: "RELATED" | "NOT_FOUND" | "URGENT" | "CLINICAL";
    method: string;
    matchedTerms: string[];
    explanation: string;
  } | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  response?: AiResponse;
}

export interface SavedQuestion {
  id: string;
  askedAt: string;
  question: string;
  response: AiResponse;
}
