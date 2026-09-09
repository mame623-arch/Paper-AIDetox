"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type {
  Attendance,
  Highlight,
  Member,
  Paper,
  Review,
  Session,
} from "@/lib/types";
import { classifyAttendance } from "@/lib/report";
import { useCurrentMemberId } from "@/lib/currentUser";
import { useSessionReview } from "./SessionReview";
import { Avatar, Card } from "./ui";

/** 수집 문장은 논문마다 3개까지 펼치고 나머지는 더보기로 접는다. */
const HIGHLIGHT_PAGE_SIZE = 3;

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-faint">
    {children}
  </p>
);

const Blank = () => <p className="text-sm text-faint">기록 전</p>;

/**
 * 차시 상세를 대신하는 주간 보고서 본문.
 *
 * 참석자 / 불참자 / 응답 없음 세 갈래로 나눈다(lib/report.ts 의 classifyAttendance).
 * 참석자는 사람마다 읽은 논문·한줄평·수집 문장을 항목별로 보여주며, 빈 항목은
 * 사람을 통째로 묶지 않고 항목별로 "기록 전" 이라고만 표시한다.
 *
 * SessionReadingsCard 가 하던 동선(멤버·논문 링크, 한줄평 작성)을 그대로 옮긴다 —
 * 이 페이지가 유일하게 지난 차시의 한줄평을 쓸 수 있는 자리이기 때문이다.
 */
export default function SessionReport({
  session,
  members,
  papers,
  highlights,
  reviews,
  attendance,
  onChanged,
}: {
  session: Session;
  members: Member[];
  papers: Paper[];
  highlights: Highlight[];
  reviews: Review[];
  attendance: Attendance[];
  onChanged: () => void | Promise<void>;
}) {
  const [currentMemberId] = useCurrentMemberId();

  // 한줄평 단일 소스. 서버 prop 으로 초기화하고 작성/수정/삭제를 로컬에도 반영한다.
  const [reviewMap, setReviewMap] = useState<Map<string, Review>>(new Map());
  useEffect(() => {
    setReviewMap(new Map(reviews.map((r) => [r.member_id, r])));
  }, [reviews]);

  const { present, absent, noResponse } = useMemo(
    () => classifyAttendance(members, papers, attendance),
    [members, papers, attendance]
  );

  const papersByMember = useMemo(() => {
    const map = new Map<string, Paper[]>();
    for (const p of papers) {
      if (!p.added_by) continue;
      const list = map.get(p.added_by) ?? [];
      list.push(p);
      map.set(p.added_by, list);
    }
    return map;
  }, [papers]);

  const highlightsByPaper = useMemo(() => {
    const map = new Map<string, Highlight[]>();
    for (const h of highlights) {
      const list = map.get(h.paper_id) ?? [];
      list.push(h);
      map.set(h.paper_id, list);
    }
    return map;
  }, [highlights]);

  const paperCount = present.reduce(
    (n, m) => n + (papersByMember.get(m.id)?.length ?? 0),
    0
  );

  // 저장은 useSessionReview 가 하고, 결과만 이 맵에 반영한다. 동시에 이 페이지가
  // 들고 있는 나머지 데이터(출석·논문 등)와 계속 맞춰 두도록 onChanged 도 부른다.
  const reload = () => {
    Promise.resolve(onChanged()).catch((err) => console.error(err));
  };
  const upsertReview = (review: Review) => {
    setReviewMap((prev) => new Map(prev).set(review.member_id, review));
    reload();
  };
  const removeReview = (review: Review) => {
    setReviewMap((prev) => {
      const next = new Map(prev);
      next.delete(review.member_id);
      return next;
    });
    reload();
  };

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader title="참석자">
          {present.length}명 · 논문 {paperCount}편
        </SectionHeader>
        {present.length === 0 ? (
          <p className="text-sm text-muted">참석자가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-line">
            {present.map((member) => (
              <PresentMemberRow
                key={member.id}
                member={member}
                papers={papersByMember.get(member.id) ?? []}
                highlightsByPaper={highlightsByPaper}
                sessionId={session.id}
                review={reviewMap.get(member.id) ?? null}
                canEdit={currentMemberId === member.id}
                onUpsertReview={upsertReview}
                onRemoveReview={removeReview}
              />
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <SectionHeader title="불참자">{absent.length}명</SectionHeader>
        {absent.length === 0 ? (
          <p className="text-sm text-muted">불참자가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-line">
            {absent.map(({ member, reason }) => (
              <li
                key={member.id}
                className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <Link href={`/members/${member.id}`} aria-label={member.name}>
                  <Avatar name={member.name} size={30} />
                </Link>
                <Link
                  href={`/members/${member.id}`}
                  className="font-medium text-ink hover:underline"
                >
                  {member.name}
                </Link>
                <span className="text-sm text-muted">
                  {reason || "기록 전"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <SectionHeader title="응답 없음">{noResponse.length}명</SectionHeader>
        {noResponse.length === 0 ? (
          <p className="text-sm text-muted">전원 응답했습니다.</p>
        ) : (
          <p className="text-sm text-body">
            {noResponse.map((m) => m.name).join(" · ")}
          </p>
        )}
      </Card>
    </div>
  );
}

function SectionHeader({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline gap-2 border-b border-line pb-3">
      <h3 className="text-sm font-bold text-ink">{title}</h3>
      <span className="text-[0.72rem] text-faint">{children}</span>
    </div>
  );
}

function PresentMemberRow({
  member,
  papers,
  highlightsByPaper,
  sessionId,
  review,
  canEdit,
  onUpsertReview,
  onRemoveReview,
}: {
  member: Member;
  papers: Paper[];
  highlightsByPaper: Map<string, Highlight[]>;
  sessionId: string;
  review: Review | null;
  canEdit: boolean;
  onUpsertReview: (r: Review) => void;
  onRemoveReview: (r: Review) => void;
}) {
  // 훅은 map 콜백 안에서 쓸 수 없어 이 하위 컴포넌트로 뺐다 — 사람마다 한줄평
  // 상태(작성/보기)를 따로 들고 있어야 하기 때문이다.
  const { button, panel } = useSessionReview({
    sessionId,
    memberId: member.id,
    review,
    canEdit,
    panelClassName: "sm:pl-12",
    onUpsert: onUpsertReview,
    onRemove: onRemoveReview,
  });

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <Link href={`/members/${member.id}`} aria-label={member.name}>
          <Avatar name={member.name} />
        </Link>
        <div className="min-w-0 flex-1 space-y-3">
          <Link
            href={`/members/${member.id}`}
            className="font-medium text-ink hover:underline"
          >
            {member.name}
          </Link>

          {/* 읽은 논문 — 논문마다 한 줄, 그 아래 그 논문의 수집 문장만 붙는다 */}
          <div className="space-y-2">
            <FieldLabel>읽은 논문</FieldLabel>
            {papers.length === 0 ? (
              <Blank />
            ) : (
              <ul className="space-y-3">
                {papers.map((paper) => (
                  <PaperItem
                    key={paper.id}
                    paper={paper}
                    memberId={member.id}
                    highlights={highlightsByPaper.get(paper.id) ?? []}
                  />
                ))}
              </ul>
            )}
          </div>

          {/* 논문이 아예 없으면 붙일 자리가 없으니 항목만 따로 "기록 전" */}
          {papers.length === 0 && (
            <div className="space-y-1">
              <FieldLabel>수집 문장</FieldLabel>
              <Blank />
            </div>
          )}

          {/* 한줄평 — 차시 단위라 사람당 한 번. 본인이면 쓰기/수정/삭제까지 된다.
              보고서는 읽는 자리라 내용을 그대로 펼쳐 둔다. 토글(button)은 본인이
              수정·삭제로 들어가는 입구일 뿐이라 canEdit 일 때만 붙인다 —
              남의 것에 붙으면 이미 보이는 글을 한 번 더 여는 버튼이 된다. */}
          <div className="space-y-1">
            <FieldLabel>한줄평</FieldLabel>
            <div className="flex items-start gap-2">
              {review ? (
                <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm text-body">
                  {review.text}
                </p>
              ) : (
                <Blank />
              )}
              {canEdit && button}
            </div>
            {panel}
          </div>
        </div>
      </div>
    </li>
  );
}

function PaperItem({
  paper,
  memberId,
  highlights,
}: {
  paper: Paper;
  memberId: string;
  highlights: Highlight[];
}) {
  // 더보기는 논문별 상태다 — 한 사람이 논문을 여러 편 올렸으면 논문마다 따로 센다.
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? highlights : highlights.slice(0, HIGHLIGHT_PAGE_SIZE);
  const remaining = highlights.length - shown.length;

  return (
    <li>
      <Link
        href={`/members/${memberId}/papers/${paper.id}`}
        className="block text-sm text-body hover:text-accent hover:underline"
      >
        📄 {paper.title}
      </Link>
      <div className="mt-1.5 space-y-1 pl-0.5">
        <FieldLabel>수집 문장</FieldLabel>
        {highlights.length === 0 ? (
          <Blank />
        ) : (
          <>
            <ul className="space-y-1.5">
              {shown.map((h) => (
                <li
                  key={h.id}
                  className="rounded-lg border border-line bg-surface px-2.5 py-1.5"
                >
                  <p className="text-sm text-body">
                    &ldquo;{h.text}&rdquo;
                    {h.note && <span className="text-muted"> — {h.note}</span>}
                  </p>
                  {h.purpose && (
                    <span className="mt-1 inline-block rounded-full bg-accentsoft px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                      {h.purpose}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {remaining > 0 && (
              <button
                onClick={() => setExpanded(true)}
                className="text-[0.72rem] font-medium text-accent hover:underline"
              >
                더보기 {remaining}개
              </button>
            )}
          </>
        )}
      </div>
    </li>
  );
}
