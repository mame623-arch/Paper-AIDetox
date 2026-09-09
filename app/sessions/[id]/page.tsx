"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type {
  Attendance,
  Highlight,
  Member,
  Paper,
  Review,
  Session,
} from "@/lib/types";
import {
  fetchAttendance,
  fetchMembers,
  fetchPapersBySession,
  fetchReviews,
  fetchSession,
  fetchSessionHighlights,
} from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useCurrentMemberId } from "@/lib/currentUser";
import { formatDate, weekday } from "@/components/ui";
import SessionReport from "@/components/SessionReport";
import SessionRecordForm from "@/components/SessionRecordForm";

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;

  const [session, setSession] = useState<Session | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMemberId] = useCurrentMemberId();

  const load = async () => {
    const [ms, s]: [Member[], Session | null] = await Promise.all([
      fetchMembers(),
      fetchSession(sessionId),
    ]);
    setMembers(ms);
    setSession(s);
    if (s) {
      const [ps, hs, rs, as] = await Promise.all([
        fetchPapersBySession(s.id),
        fetchSessionHighlights(s.id),
        fetchReviews(s.id),
        fetchAttendance(s.id),
      ]);
      setPapers(ps);
      setHighlights(hs);
      setReviews(rs);
      setAttendanceRows(as);
    } else {
      setPapers([]);
      setHighlights([]);
      setReviews([]);
      setAttendanceRows([]);
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
  }, [sessionId]);

  // 이번 차시에서 "나"의 출석·논문 — SessionRecordForm 에 넘긴다(지난 차시를
  // 나중에 채우는 자리라, 홈의 예정 스터디와 달리 이 차시로 범위를 좁힌다).
  const myAttendance = currentMemberId
    ? attendanceRows.find((a) => a.member_id === currentMemberId) ?? null
    : null;
  const myPapers = currentMemberId
    ? papers.filter((p) => p.added_by === currentMemberId)
    : [];

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
          <h1 className="mt-3">{formatDate(session.date)} 스터디 보고서</h1>
          <p className="mt-1 text-muted">
            {weekday(session.date)}
            {session.title ? ` · ${session.title}` : ""}
            {session.time ? ` · 🕙 ${session.time}` : ""}
            {session.location ? ` · 📍 ${session.location}` : ""}
          </p>

          <div className="mt-4">
            <SessionRecordForm
              session={session}
              myAttendance={myAttendance}
              myPapers={myPapers}
              onDone={load}
            />
          </div>

          <div className="mt-6">
            <SessionReport
              session={session}
              members={members}
              papers={papers}
              highlights={highlights}
              reviews={reviews}
              attendance={attendanceRows}
              onChanged={load}
            />
          </div>
        </>
      )}
    </div>
  );
}
