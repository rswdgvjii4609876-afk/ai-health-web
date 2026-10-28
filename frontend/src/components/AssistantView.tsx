import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Check,
  History,
  MessageCircle,
  Plus,
  RotateCcw,
  Send,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { ActionItem, ChatMessage, Persona, SavedQuestion } from "../types";
import { PEOPLE } from "./config";
import SourceLink from "./SourceLink";

interface Props {
  persona: Persona;
  messages: ChatMessage[];
  savedQuestions: SavedQuestion[];
  questionsLoading: boolean;
  questionsError: string;
  question: string;
  busy: boolean;
  actions: ActionItem[];
  aiMode: string;
  useRecords: boolean;
  onUseRecordsChange: (value: boolean) => void;
  onQuestionChange: (value: string) => void;
  onAsk: (question: string) => void;
  onAddAction: (title: string) => void;
  onClear: () => void;
  onOpenSavedQuestion: (item: SavedQuestion) => void;
  onDeleteSavedQuestion: (id: string) => void;
  onRetryQuestions: () => void;
}

export default function AssistantView({
  persona,
  messages,
  savedQuestions,
  questionsLoading,
  questionsError,
  question,
  busy,
  actions,
  aiMode,
  useRecords,
  onUseRecordsChange,
  onQuestionChange,
  onAsk,
  onAddAction,
  onClear,
  onOpenSavedQuestion,
  onDeleteSavedQuestion,
  onRetryQuestions,
}: Props) {
  const conversationRef = useRef<HTMLDivElement>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");
  const visibleQuestions = savedQuestions.filter((item) =>
    item.question
      .toLocaleLowerCase()
      .includes(historyQuery.trim().toLocaleLowerCase()),
  );
  const latest = [...messages]
    .reverse()
    .find((message) => message.response)?.response;
  const evidenceLabel = latest?.trace
    ? {
        RELATED: "找到相关资料",
        NOT_FOUND: "资料暂未覆盖",
        URGENT: "请优先线下求助",
        CLINICAL: "请咨询专业人员",
      }[latest.trace.status]
    : latest?.sources.length
      ? "找到相关资料"
      : "资料暂未覆盖";
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
          <span className="kicker">XIKE / EVIDENCE STUDIO</span>
          <h1>
            把健康疑问，<em>交给证据。</em>
          </h1>
          <p>提问、查看资料路径、选择一个小行动。每条回答都说明依据与边界。</p>
        </div>
        <div className="assistant-header-actions">
          <button
            type="button"
            className="assistant-history-toggle"
            aria-expanded={historyOpen}
            onClick={() => setHistoryOpen(!historyOpen)}
          >
            <History size={19} />
            历史提问 <span>{savedQuestions.length}</span>
          </button>
          <div className="assistant-badge">
            <span />
            {aiMode === "compatible" ? "模型实验模式" : "Mock 演示"}
          </div>
        </div>
      </header>
      <div className="assistant-method-strip" aria-label="求证流程">
        <div>
          <span>01</span>
          <strong>提出疑问</strong>
          <small>一句话就能开始</small>
        </div>
        <div>
          <span>02</span>
          <strong>核对依据</strong>
          <small>看来源与匹配范围</small>
        </div>
        <div>
          <span>03</span>
          <strong>转为行动</strong>
          <small>把可做的小事留下</small>
        </div>
      </div>
      {historyOpen && (
        <section className="question-history" aria-label="历史提问">
          <div className="question-history-heading">
            <div>
              <h2>往日的问题</h2>
              <p>保存在当前演示工作区，最多显示最近 100 条。</p>
            </div>
            <label className="question-history-search">
              <Search size={18} aria-hidden="true" />
              <input
                aria-label="搜索历史提问"
                value={historyQuery}
                onChange={(event) => setHistoryQuery(event.target.value)}
                placeholder="搜索提问"
              />
            </label>
          </div>
          {questionsError ? (
            <div className="question-history-empty" role="alert">
              {questionsError}{" "}
              <button type="button" onClick={onRetryQuestions}>
                重试
              </button>
            </div>
          ) : questionsLoading ? (
            <div className="question-history-empty">正在载入历史提问…</div>
          ) : visibleQuestions.length === 0 ? (
            <div className="question-history-empty">
              {historyQuery ? "没有匹配的提问" : "还没有保存的提问"}
            </div>
          ) : (
            <div className="question-history-list">
              {visibleQuestions.map((item) => (
                <div className="question-history-item" key={item.id}>
                  <button
                    type="button"
                    className="question-history-open"
                    onClick={() => {
                      onOpenSavedQuestion(item);
                      setHistoryOpen(false);
                    }}
                  >
                    <span>{item.question}</span>
                    <small>
                      {new Date(item.askedAt).toLocaleString("zh-CN", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {item.response.mock ? "Mock" : "AI"}
                    </small>
                  </button>
                  <button
                    type="button"
                    className="question-history-delete"
                    title="删除提问"
                    aria-label={`删除提问：${item.question}`}
                    onClick={() => {
                      if (window.confirm("删除这条历史提问和回答？"))
                        onDeleteSavedQuestion(item.id);
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      <div
        className={`assistant-workspace ${messages.length ? "has-messages" : "is-empty"}`}
      >
        <div className="assistant-main">
          <div
            className="conversation"
            ref={conversationRef}
            aria-live="polite"
          >
            {messages.length === 0 ? (
              <div className="conversation-empty">
                <div className="conversation-empty-top">
                  <div className="assistant-icon">
                    <Sparkles size={32} />
                  </div>
                  <div>
                    <span className="assistant-eyebrow">
                      START HERE / 先问一个问题
                    </span>
                    <h2>一个说法，值得认真核对。</h2>
                    <p>
                      从生活场景出发。息刻会展示相关资料，也会坦白告诉你哪些内容暂时没有依据。
                    </p>
                  </div>
                </div>
                <span className="starter-label">试试这些问题</span>
                <div className="starter-prompts">
                  {PEOPLE[persona].prompts.map((prompt, index) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => onAsk(prompt)}
                    >
                      <span className="prompt-number">0{index + 1}</span>
                      <span>{prompt}</span>
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
                      {message.role === "assistant"
                        ? `息刻 · ${message.response?.mock === false ? "AI" : "Mock"}`
                        : "你"}
                    </span>
                    {message.response?.trace && (
                      <div
                        className={`chat-evidence-tag status-${message.response.trace.status.toLowerCase()}`}
                      >
                        <ShieldCheck size={16} />
                        {message.response.trace.status === "RELATED"
                          ? "已找到相关资料 · 仍需核对具体说法"
                          : message.response.trace.status === "NOT_FOUND"
                            ? "当前资料不足"
                            : "安全提醒优先"}
                      </div>
                    )}
                    <p>{message.text}</p>
                    {message.response?.recordObservation && (
                      <div className="chat-record-note">
                        <Activity size={18} aria-hidden="true" />
                        <span>{message.response.recordObservation}</span>
                      </div>
                    )}
                    {message.response &&
                      message.response.sources.length > 0 && (
                        <details className="chat-sources">
                          <summary>
                            查看参考资料 · {message.response.sources.length} 条
                          </summary>
                          <div>
                            {message.response.sources.map((source) => (
                              <div key={source.id} className="chat-source-item">
                                <strong>{source.title}</strong>
                                {source.sourceLocator && (
                                  <small>{source.sourceLocator}</small>
                                )}
                                <SourceLink
                                  name={source.sourceName}
                                  date={source.sourceDate}
                                  url={source.sourceUrl}
                                />
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
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
              placeholder="输入想了解的问题或看到的健康说法…"
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
            <label className="record-context-toggle">
              <input
                type="checkbox"
                checked={useRecords}
                disabled={busy}
                onChange={(event) => onUseRecordsChange(event.target.checked)}
              />
              <span>
                {aiMode === "compatible"
                  ? "授权将近七天演示记录发送至模型"
                  : "结合近七天演示记录"}
              </span>
            </label>
            {messages.length > 0 && (
              <button type="button" onClick={onClear} disabled={busy}>
                <RotateCcw size={16} />
                新对话
              </button>
            )}
          </div>
          <p className="assistant-safety">
            仅供健康素养学习，勿输入真实病历。急症请拨打
            120；诊疗与用药请咨询专业人员。
          </p>
        </div>
        <aside className="evidence-rail">
          <div className="rail-heading">
            <BookOpen size={23} />
            <span>证据路径</span>
          </div>
          {latest ? (
            <>
              <div
                className={`evidence-verdict status-${latest.trace?.status?.toLowerCase() ?? "related"}`}
              >
                <span>本次结果</span>
                <strong>{evidenceLabel}</strong>
                <p>
                  {latest.trace?.explanation ??
                    "请打开原始来源自行核对适用范围。"}
                </p>
              </div>
              <div className="evidence-process">
                <span>检索过程</span>
                <strong>
                  {latest.trace?.method ?? "历史回答 · 无检索记录"}
                </strong>
                {Boolean(latest.trace?.matchedTerms.length) && (
                  <div className="evidence-terms">
                    {latest.trace?.matchedTerms.map((term) => (
                      <small key={term}>{term}</small>
                    ))}
                  </div>
                )}
              </div>
              <div className="evidence-status">
                <span>个人记录</span>
                <strong>
                  {latest.recordObservation ? "已授权使用" : "未使用"}
                </strong>
              </div>
              {latest.sources.map((source, index) => (
                <div className="evidence-source" key={source.id}>
                  <span>
                    S{index + 1} / {source.category}
                  </span>
                  <h3>{source.title}</h3>
                  <p>{source.summary}</p>
                  {source.sourceLocator && (
                    <p className="evidence-locator">
                      定位：{source.sourceLocator}
                    </p>
                  )}
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
              <strong>你能看到什么？</strong>
              <p>相关资料、命中的主题、原始出处，以及回答没有覆盖的部分。</p>
            </div>
          )}
          <div className="evidence-foot">
            {aiMode === "compatible"
              ? "实验模型仅能引用列出的摘要；编号会校验，事实仍需人工核对。"
              : "当前使用资料匹配演示，尚未连接真实模型。"}
          </div>
        </aside>
      </div>
    </div>
  );
}
