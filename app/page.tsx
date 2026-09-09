"use client";

import { useEffect, useState } from "react";
import type { Attendance, AttendeeReadings, Member, Review, Session } from "@/lib/types";
import {
  fetchAttendance,
  fetchMembers,
  fetchRecentSession,
  fetchReviews,
  fetchSessionReadings,
  fetchUpcomingSession,
} from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useCurrentMemberId } from "@/lib/currentUser";
import { SectionTitle, formatDate, weekday } from "@/components/ui";
import SessionReadingsCard from "@/components/SessionReadingsCard";
import SessionRecordForm from "@/components/SessionRecordForm";

export default function HomePage() {
  const [recent, setRecent] = useState<Session | null>(null);
  const [upcoming, setUpcoming] = useState<Session | null>(null);
  const [recentReadings, setRecentReadings] = useState<AttendeeReadings[]>([]);
  const [upcomingReadings, setUpcomingReadings] = useState<AttendeeReadings[]>([]);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [upcomingAttendance, setUpcomingAttendance] = useState<Attendance[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
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
    } else {
      setUpcomingReadings([]);
      setUpcomingAttendance([]);
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
  const myPapers = currentMemberId
    ? upcomingReadings.find((r) => r.member.id === currentMemberId)?.papers ?? []
    : [];

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
