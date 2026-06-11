"use client";

import { useEffect, useState } from "react";
import type { AttendeeReadings, Member, Review, Session } from "@/lib/types";
import {
  fetchMembers,
  fetchRecentSession,
  fetchReviews,
  fetchSessionReadings,
  fetchUpcomingSession,
} from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { SectionTitle, formatDate, weekday } from "@/components/ui";
import SessionReadingsCard from "@/components/SessionReadingsCard";

export default function HomePage() {
  const [recent, setRecent] = useState<Session | null>(null);
  const [upcoming, setUpcoming] = useState<Session | null>(null);
  const [recentReadings, setRecentReadings] = useState<AttendeeReadings[]>([]);
  const [upcomingReadings, setUpcomingReadings] = useState<AttendeeReadings[]>([]);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
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
        if (r) {
          setRecentReadings(await fetchSessionReadings(r.id, members));
          setRecentReviews(await fetchReviews(r.id));
        }
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
          <SessionReadingsCard
            session={recent}
            readings={recentReadings}
            reviews={recentReviews}
            mode="read"
            emptyText="아직 진행된 스터디가 없습니다."
          />

          <SectionTitle hint={upcoming ? `${formatDate(upcoming.date)} ${weekday(upcoming.date)}` : undefined}>
            예정 스터디
          </SectionTitle>
          <SessionReadingsCard
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
