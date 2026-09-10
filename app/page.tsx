"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type {
  Attendance,
  AttendeeReadings,
  Member,
  Paper,
  Review,
  Session,
} from "@/lib/types";
import {
  fetchAttendance,
  fetchMembers,
  fetchPapersBySession,
  fetchRecentSession,
  fetchReviews,
  fetchSessionReadings,
  fetchUpcomingSession,
} from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useCurrentMemberId } from "@/lib/currentUser";
import { SectionTitle, formatDate, weekday } from "@/components/ui";
import { TabBar } from "@/components/help/HelpParts";
import HomeHelp from "@/components/help/HomeHelp";
import SessionReadingsCard from "@/components/SessionReadingsCard";
import SessionRecordForm from "@/components/SessionRecordForm";

type HomeTab = "home" | "help";
const TABS = [
  ["home", "홈"],
  ["help", "도움말"],
] as const;

export default function HomePage() {
  const [recent, setRecent] = useState<Session | null>(null);
  const [upcoming, setUpcoming] = useState<Session | null>(null);
  const [recentReadings, setRecentReadings] = useState<AttendeeReadings[]>([]);
  const [upcomingReadings, setUpcomingReadings] = useState<AttendeeReadings[]>([]);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [upcomingAttendance, setUpcomingAttendance] = useState<Attendance[]>([]);
  const [upcomingPapers, setUpcomingPapers] = useState<Paper[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  // 도움말은 URL 에 담지 않는다 — 링크로 공유할 성격이 아니고,
  // useSearchParams 를 쓰면 이 페이지에 Suspense 경계가 필요해진다.
  const [tab, setTab] = useState<HomeTab>("home");
  const [currentMemberId] = useCurrentMemberId();

  const load = async () => {
    const [ms, r, u]: [Member[], Session | null, Session | null] =
      await Promise.all([
        fetchMembers(),
        fetchRecentSession(),
        fetchUpcomingSession(),
      ]);
    setMembers(ms);
    setRecent(r);
    setUpcoming(u);
    if (r) {
      setRecentReadings(await fetchSessionReadings(r.id, ms));
      setRecentReviews(await fetchReviews(r.id));
    } else {
      setRecentReadings([]);
      setRecentReviews([]);
    }
    if (u) {
      setUpcomingReadings(await fetchSessionReadings(u.id, ms));
      setUpcomingAttendance(await fetchAttendance(u.id));
      setUpcomingPapers(await fetchPapersBySession(u.id));
    } else {
      setUpcomingReadings([]);
      setUpcomingAttendance([]);
      setUpcomingPapers([]);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    load()
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 예정 스터디에서 "나"의 출석·논문 — SessionRecordForm 에 넘긴다.
  const myAttendance = currentMemberId
    ? upcomingAttendance.find((a) => a.member_id === currentMemberId) ?? null
    : null;
  // 참석 분류(upcomingReadings)는 불참 선언자를 걸러 내므로 "내 논문" 의 출처가
  // 될 수 없다 — 불참으로 바꾸는 순간 논문이 사라져 확인 창이 뜨지 않는다.
  // 차시의 논문을 그대로 읽어 등록자로만 고른다(app/sessions/[id]/page.tsx 와 같다).
  const myPapers = currentMemberId
    ? upcomingPapers.filter((p) => p.added_by === currentMemberId)
    : [];

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-7 md:px-10">
      <h1>홈</h1>
      <p className="mt-1 text-muted">
        AI 없이 논문/글을 읽고, 좋은 표현과 문단 구조를 직접 파악합니다.
      </p>

      <TabBar tabs={TABS} value={tab} onChange={setTab} />

      {tab === "help" ? (
        <HomeHelp />
      ) : loading ? (
        <p className="mt-8 text-muted">불러오는 중…</p>
      ) : (
        <>
          <SectionTitle
            hint={
              recent ? (
                <span className="flex items-baseline gap-2.5">
                  <span>
                    {formatDate(recent.date)} {weekday(recent.date)}
                  </span>
                  <Link
                    href={`/sessions/${recent.id}`}
                    className="text-accent hover:underline"
                  >
                    보고서 보기 →
                  </Link>
                </span>
              ) : undefined
            }
          >
            최근 스터디
          </SectionTitle>
          <SessionReadingsCard
            session={recent}
            readings={recentReadings}
            reviews={recentReviews}
            members={members}
            mode="read"
            emptyText="아직 진행된 스터디가 없습니다."
          />

          <SectionTitle hint={upcoming ? `${formatDate(upcoming.date)} ${weekday(upcoming.date)}` : undefined}>
            예정 스터디
          </SectionTitle>
          <SessionReadingsCard
            session={upcoming}
            readings={upcomingReadings}
            members={members}
            mode="toread"
            emptyText="예정된 스터디가 없습니다. 캘린더에서 일정을 추가하세요."
          />
          {upcoming && (
            <div className="mt-3">
              <SessionRecordForm
                session={upcoming}
                myAttendance={myAttendance}
                myPapers={myPapers}
                onDone={load}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
