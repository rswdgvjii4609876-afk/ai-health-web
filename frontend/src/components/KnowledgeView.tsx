import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, Check, Plus, Search } from "lucide-react";
import type { ActionItem, KnowledgeItem } from "../types";
import SourceLink from "./SourceLink";

interface Props {
  knowledge: KnowledgeItem[];
  actions: ActionItem[];
  busy: boolean;
  onAsk: (question: string) => void;
  onAddAction: (title: string) => void;
}

export default function KnowledgeView({
  knowledge,
  actions,
  busy,
  onAsk,
  onAddAction,
}: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const categories = [
    "全部",
    ...new Set(knowledge.map((item) => item.category)),
  ];
  const results = useMemo(
    () =>
      knowledge.filter(
        (item) =>
          (category === "全部" || item.category === category) &&
          `${item.title} ${item.summary} ${item.category}`.includes(
            query.trim(),
          ),
      ),
    [knowledge, category, query],
  );

  return (
    <div className="page-wrap knowledge-view">
      <header className="page-header">
        <span className="kicker">LIBRARY / 有出处的知识</span>
        <h1>
          先看来源，
          <br />
          <em>再做判断。</em>
        </h1>
        <p>每条内容都能回到原始资料。这里是学习入口，不是个人诊疗建议。</p>
      </header>
      <div className="knowledge-controls">
        <label className="search-field">
          <Search size={20} />
          <input
            aria-label="搜索健康知识"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索睡眠、活动、情绪…"
          />
        </label>
        <span>{results.length} 条资料</span>
      </div>
      <div className="filter-row" role="group" aria-label="知识类别">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            className={category === item ? "active" : ""}
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="knowledge-grid">
        {results.map((item, index) => {
          const added = actions.some((action) => action.title === item.action);
          return (
            <article className="knowledge-tile" key={item.id}>
              <div className="tile-top">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span>{item.category}</span>
              </div>
              <BookOpen size={26} strokeWidth={1.7} aria-hidden="true" />
              <h2>{item.title}</h2>
              <p>{item.summary}</p>
              {item.sourceLocator && (
                <span className="knowledge-locator">
                  原文位置：{item.sourceLocator}
                </span>
              )}
              <SourceLink
                name={item.sourceName}
                date={item.sourceDate}
                url={item.sourceUrl}
              />
              <div className="tile-actions">
                <button
                  type="button"
                  onClick={() => onAsk(`${item.title}，我可以从哪里开始？`)}
                >
                  继续问助手
                  <ArrowRight size={18} />
                </button>
                {item.action && (
                  <button
                    type="button"
                    disabled={busy || added}
                    onClick={() => onAddAction(item.action!)}
                  >
                    {added ? <Check size={18} /> : <Plus size={18} />}
                    {added ? "已加入" : "加入行动"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {results.length === 0 && (
        <div className="empty-knowledge">
          <h2>暂时没有匹配的资料</h2>
          <p>换一个关键词试试，或向助手提出具体问题。</p>
        </div>
      )}
    </div>
  );
}
