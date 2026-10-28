import type { FormEvent } from "react";
import {
  Activity,
  ArrowLeft,
  Check,
  Clock3,
  Heart,
  Minus,
  Plus,
} from "lucide-react";
import type { CheckinInput, View } from "../types";
import { MOODS } from "./config";

interface Props {
  form: CheckinInput;
  selectedDay: string;
  availableDays: string[];
  busy: boolean;
  onChange: (next: CheckinInput) => void;
  onSelectDay: (day: string) => void;
  onSave: (event: FormEvent) => void;
  onNavigate: (view: View) => void;
}

export default function CheckinView({
  form,
  selectedDay,
  availableDays,
  busy,
  onChange,
  onSelectDay,
  onSave,
  onNavigate,
}: Props) {
  function step(
    field: "sleepHours" | "activityMinutes",
    delta: number,
    max: number,
  ) {
    onChange({
      ...form,
      [field]: Math.max(
        0,
        Math.min(max, Number((form[field] + delta).toFixed(1))),
      ),
    });
  }

  return (
    <div className="page-wrap checkin-view">
      <button
        className="back-link"
        type="button"
        onClick={() => onNavigate("today")}
      >
        <ArrowLeft size={18} />
        返回今天
      </button>
      <header className="page-header">
        <span className="kicker">DAILY CHECK-IN / 每日记录</span>
        <h1>
          留一点时间，
          <br />
          <em>给这一天做个注脚。</em>
        </h1>
      </header>
      <label className="day-picker">
        记录日期 · 可补记近 30 天
        <select
          aria-label="选择记录日期"
          value={selectedDay}
          onChange={(event) => onSelectDay(event.target.value)}
        >
          {availableDays.map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>
      </label>
      <form className="checkin-form" onSubmit={onSave}>
        <div className="checkin-row">
          <div className="checkin-label">
            <Clock3 size={26} />
            <div>
              <label htmlFor="sleep-hours">昨夜睡眠</label>
              <span>记录大约睡了多久</span>
            </div>
          </div>
          <div className="stepper">
            <button
              type="button"
              title="减少半小时"
              aria-label="睡眠减少半小时"
              onClick={() => step("sleepHours", -0.5, 24)}
            >
              <Minus size={19} />
            </button>
            <input
              id="sleep-hours"
              type="number"
              min="0"
              max="24"
              step="0.1"
              required
              value={form.sleepHours}
              onChange={(event) =>
                onChange({ ...form, sleepHours: Number(event.target.value) })
              }
            />
            <span>小时</span>
            <button
              type="button"
              title="增加半小时"
              aria-label="睡眠增加半小时"
              onClick={() => step("sleepHours", 0.5, 24)}
            >
              <Plus size={19} />
            </button>
          </div>
        </div>
        <div className="checkin-row">
          <div className="checkin-label">
            <Activity size={26} />
            <div>
              <label htmlFor="activity-minutes">当天活动</label>
              <span>日常走动、锻炼等时间</span>
            </div>
          </div>
          <div className="stepper">
            <button
              type="button"
              title="减少十分钟"
              aria-label="活动减少十分钟"
              onClick={() => step("activityMinutes", -10, 1440)}
            >
              <Minus size={19} />
            </button>
            <input
              id="activity-minutes"
              type="number"
              min="0"
              max="1440"
              step="1"
              required
              value={form.activityMinutes}
              onChange={(event) =>
                onChange({
                  ...form,
                  activityMinutes: Number(event.target.value),
                })
              }
            />
            <span>分钟</span>
            <button
              type="button"
              title="增加十分钟"
              aria-label="活动增加十分钟"
              onClick={() => step("activityMinutes", 10, 1440)}
            >
              <Plus size={19} />
            </button>
          </div>
        </div>
        <fieldset className="checkin-mood">
          <legend>
            <Heart size={26} />
            此刻心情
          </legend>
          <div className="mood-scale">
            {MOODS.map((mood, index) => (
              <label
                key={mood}
                className={form.mood === index + 1 ? "selected" : ""}
              >
                <input
                  type="radio"
                  name="mood"
                  value={index + 1}
                  checked={form.mood === index + 1}
                  onChange={() => onChange({ ...form, mood: index + 1 })}
                />
                <strong>{index + 1}</strong>
                <span>{mood}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="checkin-note" htmlFor="day-note">
          <span>
            这一天的一句话 <small>选填</small>
          </span>
          <textarea
            id="day-note"
            rows={3}
            maxLength={240}
            value={form.note}
            onChange={(event) =>
              onChange({ ...form, note: event.target.value })
            }
            placeholder="此刻想记住什么？"
          />
        </label>
        <footer className="checkin-footer">
          <p>
            请勿填写真实病历或身份信息。演示记录保存在本地后端，可从页脚清除。
          </p>
          <button className="button-dark" type="submit" disabled={busy}>
            <Check size={20} />
            {busy ? "保存中…" : "保存记录"}
          </button>
        </footer>
      </form>
    </div>
  );
}
