import axios from "axios";
import type {
  ActionItem,
  AccountInfo,
  AiResponse,
  Checkin,
  CheckinInput,
  Dashboard,
  Persona,
  ProfileInput,
  SavedQuestion,
} from "./types";

const client = axios.create({ baseURL: "/api", timeout: 10000 });

client.interceptors.response.use(undefined, (error: unknown) => {
  if (
    axios.isAxiosError(error) &&
    error.response?.status === 401 &&
    error.config?.url !== "/account/me"
  ) {
    window.dispatchEvent(new Event("xike-session-expired"));
  }
  return Promise.reject(error);
});

export const api = {
  account: async () => {
    try {
      return (await client.get<AccountInfo>("/account/me")).data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401)
        return null;
      throw error;
    }
  },
  requestEmailCode: async (email: string) =>
    (
      await client.post<{ demoCode: string | null; expiresInSeconds: number }>(
        "/account/code",
        { email },
        { timeout: 20000 },
      )
    ).data,
  verifyEmail: async (email: string, code: string) =>
    (await client.post<AccountInfo>("/account/verify", { email, code })).data,
  saveProfile: async (input: ProfileInput) =>
    (await client.put<AccountInfo>("/account/profile", input)).data,
  logout: async () => {
    await client.post("/account/logout");
  },
  deleteAccount: async () => {
    await client.delete("/account");
  },
  health: async () =>
    (
      await client.get<{
        status: string;
        aiMode: string;
        emailMode: "local" | "smtp";
      }>("/health")
    ).data,
  dashboard: async (persona: Persona) =>
    (await client.get<Dashboard>("/dashboard", { params: { persona } })).data,
  checkin: async (persona: Persona, input: CheckinInput) =>
    (
      await client.put<Checkin>("/checkins/today", input, {
        params: { persona },
      })
    ).data,
  checkinDay: async (persona: Persona, day: string, input: CheckinInput) =>
    (
      await client.put<Checkin>(`/checkins/${day}`, input, {
        params: { persona },
      })
    ).data,
  ask: async (
    persona: Persona,
    question: string,
    contextTopicId: string | null,
    useRecords: boolean,
  ) =>
    (
      await client.post<AiResponse>("/assistant", {
        persona,
        question,
        contextTopicId,
        useRecords,
      })
    ).data,
  questions: async (persona: Persona) =>
    (await client.get<SavedQuestion[]>("/questions", { params: { persona } }))
      .data,
  deleteQuestion: async (persona: Persona, id: string) => {
    await client.delete(`/questions/${id}`, { params: { persona } });
  },
  addAction: async (persona: Persona, title: string) =>
    (await client.post<ActionItem>("/actions", { persona, title })).data,
  updateAction: async (id: string, completed: boolean) =>
    (await client.patch<ActionItem>(`/actions/${id}`, { completed })).data,
  deleteAction: async (id: string) => {
    await client.delete(`/actions/${id}`);
  },
  clearWorkspace: async () => {
    await client.delete("/workspace");
  },
};

export function apiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response)
      return "无法连接后端。请确认 Spring Boot 已在 8080 端口运行。";
    if (error.response.status === 401) return "登录已过期，请重新验证邮箱。";
    if (error.response.status >= 500) return "服务暂时不可用，请稍后重试。";
  }
  return "操作未完成，请检查输入后重试。";
}
