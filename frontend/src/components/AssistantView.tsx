import { useEffect, useRef } from "react";
import {
  ArrowRight,
  Check,
  MessageCircle,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ActionItem, ChatMessage, Persona } from "../types";
import { PEOPLE } from "./config";
import SourceLink from "./SourceLink";

interface Props {
  persona: Persona;
  messages: ChatMessage[];
  question: string;
  busy: boolean;
  actions: ActionItem[];
  onQuestionChange: (value: string) => void;
  onAsk: (question: string) => void;
  onAddAction: (title: string) => void;
  onClear: () => void;
}

export default function AssistantView({
  persona,
  messages,
  question,
  busy,
  actions,
  onQuestionChange,
  onAsk,
  onAddAction,
  onClear,
}: Props) {
  const conversationRef = useRef<HTMLDivElement>(null);
  const latest = [...messages]
    .reverse()
    .find((message) => message.response)?.response;
  useEffect(() => {
    if (messages.length || busy) {
      conversationRef.current?.scrollTo({
        top: conversationRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, busy]);

  return (
    <div className="assistant-view page-wrap">
      <header className="page-header assistant-page-header">
        <div>
          <span className="kicker">ASSISTANT / 独立对话</span>
          <h1>想弄清楚什么？</h1>
        </div>
        <div className="assistant-badge">
          <span />
          Mock 演示
        </div>
      </header>
      <div className="assistant-workspace">
        <div className="assistant-main">
          <div
            className="conversation"
            ref={conversationRef}
            aria-live="polite"
          >
            {messages.length === 0 ? (
              <div className="conversation-empty">
                <div className="assistant-icon">
                  <Sparkles size={34} />
                </div>
                <h2>从一个具体问题开始。</h2>
                <div className="starter-prompts">
                  {PEOPLE[persona].prompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => onAsk(prompt)}
                    >
                      {prompt}
                      <ArrowRight size={18} />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  className={`chat-message ${message.role}`}
                  key={`${index}-${message.role}`}
                >
                  <div className="chat-avatar">
                    {message.role === "assistant" ? (
                      <Sparkles size={20} />
                    ) : (
                      PEOPLE[persona].label.slice(0, 1)
                    )}
                  </div>
                  <div className="chat-text">
                    <span>
                      {message.role === "assistant" ? "息刻 · Mock" : "你"}
                    </span>
                    <p>{message.text}</p>
                    {message.response?.sources.map((source) => (
                      <SourceLink
                        key={source.id}
                        name={source.sourceName}
                        date={source.sourceDate}
                        url={source.sourceUrl}
                      />
                    ))}
                    {message.response?.suggestedAction && (
                      <button
                        type="button"
                        className="chat-action"
                        disabled={
                          busy ||
                          actions.some(
                            (action) =>
                              action.title ===
                              message.response?.suggestedAction,
                          )
                        }
                        onClick={() =>
                          onAddAction(message.response!.suggestedAction!)
                        }
                      >
                        {actions.some(
                          (action) =>
                            action.title === message.response?.suggestedAction,
                        ) ? (
                          <Check size={18} />
                        ) : (
                          <Plus size={18} />
                        )}
                        {actions.some(
                          (action) =>
                            action.title === message.response?.suggestedAction,
                        )
                          ? "已加入今日行动"
                          : `加入行动 · ${message.response.suggestedAction}`}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
            {busy && (
              <div className="assistant-thinking">
                <Sparkles size={18} />
                正在整理资料…
              </div>
            )}
            {latest?.followUps && latest.followUps.length > 0 && !busy && (
              <div className="follow-ups">
                {latest.followUps.map((followUp) => (
                  <button
                    key={followUp}
                    type="button"
                    onClick={() => onAsk(followUp)}
                  >
                    {followUp}
                    <ArrowRight size={16} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <form
            className="assistant-compose"
            onSubmit={(event) => {
              event.preventDefault();
              if (question.trim()) onAsk(question.trim());
            }}
          >
            <input
              aria-label="向助手提问"
              value={question}
              maxLength={400}
              onChange={(event) => onQuestionChange(event.target.value)}
              placeholder="输入问题…"
            />
            <button
              type="submit"
              title="发送"
              aria-label="发送"
              disabled={!question.trim() || busy}
            >
              <Send size={22} />
            </button>
          </form>
          <div className="assistant-bottom">
            <p>仅供健康素养学习。急症请拨打 120；诊疗与用药请咨询专业人员。</p>
            {messages.length > 0 && (
              <button type="button" onClick={onClear}>
                <RotateCcw size={16} />
                新对话
              </button>
            )}
          </div>
        </div>
        <aside className="evidence-rail">
          <div className="rail-heading">
            <ShieldCheck size={23} />
            <span>回答依据</span>
          </div>
          {latest ? (
            <>
              <div className="evidence-status">
                <span>资料匹配</span>
                <strong>
                  {latest.sources.length
                    ? `${latest.sources.length} 条来源`
                    : "暂无对应资料"}
                </strong>
              </div>
              <div className="evidence-status">
                <span>个人记录</span>
                <strong>
                  {latest.usedTodayRecord ? "使用今日记录" : "未使用"}
                </strong>
              </div>
              {latest.sources.map((source) => (
                <div className="evidence-source" key={source.id}>
                  <span>{source.category}</span>
                  <h3>{source.title}</h3>
                  <SourceLink
                    name={source.sourceName}
                    date={source.sourceDate}
                    url={source.sourceUrl}
                  />
                </div>
              ))}
            </>
          ) : (
            <div className="evidence-placeholder">
              <MessageCircle size={28} />
              <p>问答开始后，参考资料会出现在这里。</p>
            </div>
          )}
          <div className="evidence-foot">
            当前是资料匹配 Mock，不是大模型生成或医疗服务。
          </div>
        </aside>
      </div>
    </div>
  );
}
