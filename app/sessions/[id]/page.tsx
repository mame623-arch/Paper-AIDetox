"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { AttendeeReadings, Member, Review, Session } from "@/lib/types";
import {
  fetchMembers,
  fetchReviews,
  fetchSession,
  fetchSessionReadings,
} from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { SectionTitle, formatDate, weekday } from "@/components/ui";
import SessionReadingsCard from "@/components/SessionReadingsCard";

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;

  const [session, setSession] = useState<Session | null>(null);
  const [readings, setReadings] = useState<AttendeeReadings[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [members, s]: [Member[], Session | null] = await Promise.all([
          fetchMembers(),
          fetchSession(sessionId),
        ]);
        setSession(s);
        if (s) {
          setReadings(await fetchSessionReadings(s.id, members));
          setReviews(await fetchReviews(s.id));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-7 md:px-10">
      <Link href="/calendar" className="text-sm text-muted hover:text-ink">
        ← 캘린더
      </Link>

      {loading ? (
        <p className="mt-8 text-muted">불러오는 중…</p>
      ) : !session ? (
        <p className="mt-6 text-muted">해당 차시를 찾을 수 없습니다.</p>
      ) : (
        <>
          <h1 className="mt-3">
            {formatDate(session.date)} 스터디 기록
          </h1>
          <p className="mt-1 text-muted">
            {weekday(session.date)}
            {session.title ? ` · ${session.title}` : ""}
          </p>

          <SectionTitle hint={`${readings.length}명`}>읽은 논문 · 한줄평</SectionTitle>
          <SessionReadingsCard
            session={session}
            readings={readings}
            reviews={reviews}
            mode="read"
            emptyText="이 차시의 기록이 없습니다."
          />
        </>
      )}
    </div>
  );
}
