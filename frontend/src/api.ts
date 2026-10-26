import axios from "axios";
import type {
  ActionItem,
  AiResponse,
  Checkin,
  CheckinInput,
  Dashboard,
  Persona,
} from "./types";

const client = axios.create({ baseURL: "/api", timeout: 10000 });

export const api = {
  dashboard: async (persona: Persona) =>
    (await client.get<Dashboard>("/dashboard", { params: { persona } })).data,
  checkin: async (persona: Persona, input: CheckinInput) =>
    (
      await client.put<Checkin>("/checkins/today", input, {
        params: { persona },
      })
    ).data,
  ask: async (persona: Persona, question: string) =>
    (await client.post<AiResponse>("/assistant", { persona, question })).data,
  addAction: async (persona: Persona, title: string) =>
    (await client.post<ActionItem>("/actions", { persona, title })).data,
  updateAction: async (id: string, completed: boolean) =>
    (await client.patch<ActionItem>(`/actions/${id}`, { completed })).data,
};

export function apiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response)
      return "无法连接后端。请确认 Spring Boot 已在 8080 端口运行。";
    if (error.response.status >= 500) return "服务暂时不可用，请稍后重试。";
  }
  return "操作未完成，请检查输入后重试。";
}
