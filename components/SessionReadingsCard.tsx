"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { AttendeeReadings, Member, Paper, Review, Session } from "@/lib/types";
import { useCurrentMemberId } from "@/lib/currentUser";
import { useSessionReview } from "./SessionReview";
import { Avatar, Card, formatDate, weekday } from "./ui";

export default function SessionReadingsCard({
  session,
  readings,
  reviews,
  members,
  mode,
  emptyText,
}: {
  session: Session | null;
  readings: AttendeeReadings[];
  /** read 모드에서 세션의 기존 한줄평 */
  reviews?: Review[];
  /** 참석자 줄을 그리는 데 쓰는 전체 멤버 목록 */
  members: Member[];
  mode: "read" | "toread";
  emptyText: string;
}) {
  // 멤버별 한줄평 단일 소스. 서버 prop으로 초기화하고, 추가/수정/삭제를 반영.
  const [reviewMap, setReviewMap] = useState<Map<string, Review>>(new Map());
  // 출석 행이 있는 멤버 id. 이제 이 카드에서 출석을 쓰지 않으므로 읽기 전용이다 —
  // 참석은 논문 등록에서만 나오고, 여기 남는 것은 예전 방식으로 남은 기록뿐이다.
  const [attending, setAttending] = useState<Set<string>>(new Set());
  const [currentMemberId] = useCurrentMemberId();

  useEffect(() => {
    const next = new Map<string, Review>();
    for (const r of reviews ?? []) next.set(r.member_id, r);
    setReviewMap(next);
  }, [reviews]);

  useEffect(() => {
    setAttending(
      new Set(readings.filter((r) => r.attended).map((r) => r.member.id))
    );
  }, [readings]);

  // 세션에 논문을 등록한 사람 (= 자동 참석)
  const papersByMember = useMemo(() => {
    const map = new Map<string, Paper[]>();
    for (const r of readings) {
      if (r.papers.length > 0) map.set(r.member.id, r.papers);
    }
    return map;
  }, [readings]);

  const memberById = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members]
  );

  // 참석자 = 논문 등록자 ∪ 예전 방식으로 남은 출석 행
  const rows = useMemo(() => {
    const ids = new Set<string>([...papersByMember.keys(), ...attending]);
    return [...ids]
      .map((id) => memberById.get(id))
      .filter((m): m is Member => Boolean(m))
      .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))
      .map((member) => ({
        member,
        papers: papersByMember.get(member.id) ?? [],
        attended: attending.has(member.id),
      }));
  }, [papersByMember, attending, memberById]);

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

  const upsertReview = (review: Review) =>
    setReviewMap((prev) => new Map(prev).set(review.member_id, review));
  const removeReview = (review: Review) =>
    setReviewMap((prev) => {
      const next = new Map(prev);
      next.delete(review.member_id);
      return next;
    });

  const showAttendance = mode === "read";

  const paperCount = rows.reduce((n, r) => n + r.papers.length, 0);

  return (
    <Card>
      {/* 일정 메타 */}
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-base font-bold text-ink">
          {formatDate(session.date)} ({weekday(session.date)})
        </span>
        {session.time && <span className="text-sm text-muted">🕙 {session.time}</span>}
        {session.location && (
          <span className="text-sm text-muted">📍 {session.location}</span>
        )}
        {session.title && (
          <span className="rounded-full bg-surface2 px-2 py-0.5 text-[0.72rem] text-muted">
            {session.title}
          </span>
        )}
      </div>

      {/* 참석 요약 — 참석은 논문 등록에서 나온다. 여기서 체크하지 않는다. */}
      {showAttendance && (
        <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-line pb-3">
          <span className="text-sm font-semibold text-ink">
            참석 {rows.length}명
          </span>
          <span className="text-[0.72rem] text-faint">논문 {paperCount}편</span>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-muted">
          {mode === "read"
            ? "참석 기록이 없습니다."
            : "읽을 논문이 아직 등록되지 않았습니다."}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map(({ member, papers }) => (
            <MemberReadingRow
              key={member.id}
              memberId={member.id}
              memberName={member.name}
              papers={papers}
              sessionId={session.id}
              showReview={mode === "read"}
              review={reviewMap.get(member.id) ?? null}
              canEdit={currentMemberId === member.id}
              onUpsert={upsertReview}
              onRemove={removeReview}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

function MemberReadingRow({
  memberId,
  memberName,
  papers,
  sessionId,
  showReview,
  review,
  canEdit,
  onUpsert,
  onRemove,
}: {
  memberId: string;
  memberName: string;
  papers: Paper[];
  sessionId: string;
  showReview: boolean;
  review: Review | null;
  canEdit: boolean;
  onUpsert: (r: Review) => void;
  onRemove: (r: Review) => void;
}) {
  const { button, panel } = useSessionReview({
    sessionId,
    memberId,
    review,
    canEdit,
    enabled: showReview,
    // 멤버 칸 전체 폭을 쓰도록 아바타 너비만큼 들여쓴다.
    panelClassName: "sm:pl-12",
    onUpsert,
    onRemove,
  });

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <Link href={`/members/${memberId}`} aria-label={memberName}>
          <Avatar name={memberName} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/members/${memberId}`} className="font-medium text-ink hover:underline">
            {memberName}
          </Link>
          <div className="mt-1 space-y-1">
            {papers.length === 0 ? (
              <p className="text-sm text-faint">논문 없이 참석</p>
            ) : (
              papers.map((p) => (
                <Link
                  key={p.id}
                  href={`/members/${memberId}/papers/${p.id}`}
                  className="block text-sm text-body hover:text-accent hover:underline"
                >
                  📄 {p.title}
                </Link>
              ))
            )}
          </div>
        </div>
        {button}
      </div>

      {panel}
    </li>
  );
}
