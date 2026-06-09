"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@/lib/types";
import {
  createSession,
  deleteSession,
  fetchSessions,
  today,
} from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Card, formatDate, weekday } from "@/components/ui";

const WD = ["일", "월", "화", "수", "목", "금", "토"];

function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-based

  const reload = () => fetchSessions().then(setSessions);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    reload()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const byDate = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of sessions) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    return map;
  }, [sessions]);

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
  };

  const upcoming = sessions
    .filter((s) => s.date >= today())
    .sort((a, b) => a.date.localeCompare(b.date));
  const past = sessions
    .filter((s) => s.date < today())
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-7 md:px-10">
      <h1>캘린더</h1>
      <p className="mt-1 text-muted">스터디 일정을 추가하면 홈에 반영됩니다.</p>

      <AddSessionForm onAdded={reload} />

      {loading ? (
        <p className="mt-8 text-muted">불러오는 중…</p>
      ) : (
        <>
          {/* 월 네비 */}
          <div className="mb-3 mt-7 flex items-center gap-3">
            <button
              onClick={prevMonth}
              className="rounded-md border border-line px-2.5 py-1 text-sm hover:bg-surface"
            >
              ←
            </button>
            <h2 className="!mt-0">
              {year}년 {month + 1}월
            </h2>
            <button
              onClick={nextMonth}
              className="rounded-md border border-line px-2.5 py-1 text-sm hover:bg-surface"
            >
              →
            </button>
          </div>

          {/* 그리드 */}
          <div className="grid grid-cols-7 overflow-hidden rounded-[10px] border border-line">
            {WD.map((w) => (
              <div
                key={w}
                className="bg-surface2 py-1.5 text-center text-[0.72rem] font-bold text-muted"
              >
                {w}
              </div>
            ))}
            {cells.map((day, i) => {
              const dateStr = day ? ymd(year, month, day) : "";
              const evs = day ? byDate.get(dateStr) ?? [] : [];
              const isToday = dateStr === today();
              return (
                <div
                  key={i}
                  className={`min-h-[68px] border-[0.5px] border-line p-1 ${
                    day ? "" : "bg-surface"
                  }`}
                >
                  {day && (
                    <>
                      <div
                        className={`text-[0.72rem] ${
                          isToday
                            ? "font-bold text-accent"
                            : "text-faint"
                        }`}
                      >
                        {day}
                      </div>
                      {evs.map((e) => (
                        <div
                          key={e.id}
                          title={`${e.title} ${e.time} ${e.location}`}
                          className="mt-0.5 truncate rounded bg-accentsoft px-1 py-0.5 text-[0.66rem] font-bold text-accent"
                        >
                          {e.time ? e.time.split("–")[0] + " " : ""}
                          {e.title || "스터디"}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* 일정 목록 */}
          <div className="mt-7 grid gap-6 md:grid-cols-2">
            <SessionList
              title="예정 일정"
              sessions={upcoming}
              emptyText="예정된 일정이 없습니다."
              onChanged={reload}
            />
            <SessionList
              title="지난 일정"
              sessions={past}
              emptyText="지난 일정이 없습니다."
              onChanged={reload}
            />
          </div>
        </>
      )}
    </div>
  );
}

function AddSessionForm({ onAdded }: { onAdded: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00–12:00");
  const [location, setLocation] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setError("날짜를 선택하세요.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createSession({ date, time, location, title });
      setDate("");
      setTime("10:00–12:00");
      setLocation("");
      setTitle("");
      setOpen(false);
      await onAdded();
    } catch (err) {
      console.error(err);
      setError("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-5 rounded-lg border border-dashed border-linestrong bg-bg px-4 py-2.5 text-sm font-medium text-muted hover:border-accent hover:text-accent"
      >
        ＋ 일정 추가
      </button>
    );
  }

  return (
    <Card className="mt-5">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">날짜 *</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="cfield"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">시간</span>
            <input
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="cfield"
              placeholder="10:00–12:00"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">장소</span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="cfield"
              placeholder="세미나실 A"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">제목</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="cfield"
              placeholder="예: 2주차 — 전원 필참"
            />
          </label>
        </div>

        {error && <p className="text-sm text-[#b4543f]">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "저장 중…" : "추가"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-line px-4 py-2 text-sm text-muted hover:bg-surface"
          >
            취소
          </button>
        </div>
      </form>

      <style jsx>{`
        :global(.cfield) {
          width: 100%;
          border: 1px solid var(--border);
          background: #fff;
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 14px;
          outline: none;
        }
        :global(.cfield:focus) {
          border-color: var(--accent);
        }
      `}</style>
    </Card>
  );
}

function SessionList({
  title,
  sessions,
  emptyText,
  onChanged,
}: {
  title: string;
  sessions: Session[];
  emptyText: string;
  onChanged: () => Promise<void>;
}) {
  const remove = async (s: Session) => {
    if (!confirm(`${formatDate(s.date)} 일정을 삭제할까요?`)) return;
    await deleteSession(s.id);
    await onChanged();
  };

  return (
    <div>
      <h2 className="!mt-0 !text-[1rem]">{title}</h2>
      <div className="mt-2 overflow-hidden rounded-xl border border-line">
        {sessions.length === 0 ? (
          <p className="p-4 text-sm text-muted">{emptyText}</p>
        ) : (
          <ul className="divide-y divide-line">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-ink">
                    {formatDate(s.date)} ({weekday(s.date)})
                  </div>
                  <div className="text-xs text-muted">
                    {[s.time, s.location, s.title].filter(Boolean).join(" · ") ||
                      "세부 정보 없음"}
                  </div>
                </div>
                <button
                  onClick={() => remove(s)}
                  className="rounded-md px-2 py-1 text-xs text-faint hover:text-[#b4543f]"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
