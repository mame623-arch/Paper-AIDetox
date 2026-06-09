"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AttendeeReadings, Member, Session } from "@/lib/types";
import {
  fetchMembers,
  fetchRecentSession,
  fetchSessionReadings,
  fetchUpcomingSession,
} from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Avatar, Card, SectionTitle, formatDate, weekday } from "@/components/ui";

export default function HomePage() {
  const [recent, setRecent] = useState<Session | null>(null);
  const [upcoming, setUpcoming] = useState<Session | null>(null);
  const [recentReadings, setRecentReadings] = useState<AttendeeReadings[]>([]);
  const [upcomingReadings, setUpcomingReadings] = useState<AttendeeReadings[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [members, r, u]: [Member[], Session | null, Session | null] =
          await Promise.all([
            fetchMembers(),
            fetchRecentSession(),
            fetchUpcomingSession(),
          ]);
        setRecent(r);
        setUpcoming(u);
        if (r) setRecentReadings(await fetchSessionReadings(r.id, members));
        if (u) setUpcomingReadings(await fetchSessionReadings(u.id, members));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-7 md:px-10">
      <h1>홈</h1>
      <p className="mt-1 text-muted">
        AI 없이 논문/글을 읽고, 좋은 표현과 문단 구조를 직접 파악합니다.
      </p>

      {loading ? (
        <p className="mt-8 text-muted">불러오는 중…</p>
      ) : (
        <>
          <SectionTitle hint={recent ? `${formatDate(recent.date)} ${weekday(recent.date)}` : undefined}>
            최근 스터디
          </SectionTitle>
          <SessionCard
            session={recent}
            readings={recentReadings}
            mode="read"
            emptyText="아직 진행된 스터디가 없습니다."
          />

          <SectionTitle hint={upcoming ? `${formatDate(upcoming.date)} ${weekday(upcoming.date)}` : undefined}>
            예정 스터디
          </SectionTitle>
          <SessionCard
            session={upcoming}
            readings={upcomingReadings}
            mode="toread"
            emptyText="예정된 스터디가 없습니다. 캘린더에서 일정을 추가하세요."
          />
        </>
      )}
    </div>
  );
}

function SessionCard({
  session,
  readings,
  mode,
  emptyText,
}: {
  session: Session | null;
  readings: AttendeeReadings[];
  mode: "read" | "toread";
  emptyText: string;
}) {
  if (!session) {
    return (
      <Card>
        <p className="text-muted">{emptyText}</p>
        {mode === "toread" && (
          <Link href="/calendar" className="mt-2 inline-block text-accent hover:underline">
            캘린더로 이동 →
          </Link>
        )}
      </Card>
    );
  }

  return (
    <Card>
      {/* 일정 메타 */}
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-base font-bold text-ink">
          {formatDate(session.date)} ({weekday(session.date)})
        </span>
        {session.time && (
          <span className="text-sm text-muted">🕙 {session.time}</span>
        )}
        {session.location && (
          <span className="text-sm text-muted">📍 {session.location}</span>
        )}
        {session.title && (
          <span className="rounded-full bg-surface2 px-2 py-0.5 text-[0.72rem] text-muted">
            {session.title}
          </span>
        )}
      </div>

      {readings.length === 0 ? (
        <p className="text-sm text-muted">
          {mode === "read"
            ? "읽은 논문 기록이 없습니다."
            : "읽을 논문이 아직 등록되지 않았습니다."}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {readings.map(({ member, papers }) => (
            <li key={member.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <Link href={`/members/${member.id}`} aria-label={member.name}>
                <Avatar name={member.name} />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/members/${member.id}`}
                  className="font-medium text-ink hover:underline"
                >
                  {member.name}
                </Link>
                <div className="mt-1 space-y-1">
                  {papers.map((p) => (
                    <Link
                      key={p.id}
                      href={`/members/${member.id}/papers/${p.id}`}
                      className="block text-sm text-body hover:text-accent hover:underline"
                    >
                      📄 {p.title}
                    </Link>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
