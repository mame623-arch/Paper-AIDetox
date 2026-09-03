"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { AttendeeReadings, Member, Paper, Review, Session } from "@/lib/types";
import {
  addAttendance,
  createReview,
  deleteReview,
  removeAttendance,
  updateReview,
} from "@/lib/db";
import { useCurrentMemberId } from "@/lib/currentUser";
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
  /** 출석 체크에 쓰는 전체 멤버 목록 */
  members: Member[];
  mode: "read" | "toread";
  emptyText: string;
}) {
  // 멤버별 한줄평 단일 소스. 서버 prop으로 초기화하고, 추가/수정/삭제를 반영.
  const [reviewMap, setReviewMap] = useState<Map<string, Review>>(new Map());
  // 출석 체크된 멤버 id — 낙관적 업데이트로 즉시 반영한다.
  const [attending, setAttending] = useState<Set<string>>(new Set());
  const [attendError, setAttendError] = useState("");
  const [attendBusy, setAttendBusy] = useState(false);
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

  // 참석자 = 논문 등록자 ∪ 출석 체크한 사람
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
  const removeReview = (memberId: string) =>
    setReviewMap((prev) => {
      const next = new Map(prev);
      next.delete(memberId);
      return next;
    });

  const showAttendance = mode === "read";
  const iAmAttending = Boolean(currentMemberId && attending.has(currentMemberId));

  const toggleMyAttendance = async () => {
    if (!currentMemberId) return;
    const next = !iAmAttending;
    setAttendBusy(true);
    setAttendError("");
    // 낙관적 반영 후 실패하면 되돌린다.
    setAttending((prev) => {
      const s = new Set(prev);
      if (next) s.add(currentMemberId);
      else s.delete(currentMemberId);
      return s;
    });
    try {
      if (next) await addAttendance(session.id, currentMemberId);
      else await removeAttendance(session.id, currentMemberId);
    } catch (err) {
      console.error(err);
      setAttending((prev) => {
        const s = new Set(prev);
        if (next) s.delete(currentMemberId);
        else s.add(currentMemberId);
        return s;
      });
      setAttendError(
        "출석 저장에 실패했습니다. supabase/add-attendance-2026-09-03.sql 을 실행했는지 확인하세요."
      );
    } finally {
      setAttendBusy(false);
    }
  };

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

      {/* 참석 요약 + 내 출석 체크 */}
      {showAttendance && (
        <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-line pb-3">
          <span className="text-sm font-semibold text-ink">
            참석 {rows.length}명
          </span>
          <span className="text-[0.72rem] text-faint">
            논문 {paperCount}편 · 논문을 올렸거나 출석 체크한 사람
          </span>
          <div className="ml-auto flex items-center gap-2">
            {currentMemberId ? (
              <button
                onClick={toggleMyAttendance}
                disabled={attendBusy}
                className={`rounded-full px-3 py-1 text-[0.74rem] font-semibold transition disabled:opacity-60 ${
                  iAmAttending
                    ? "bg-accent text-white"
                    : "border border-line text-muted hover:border-accent hover:text-accent"
                }`}
              >
                {iAmAttending ? "✓ 참석함" : "＋ 나도 참석"}
              </button>
            ) : (
              <span className="text-[0.72rem] text-faint">
                사이드바에서 내 이름을 고르면 참석 체크할 수 있어요
              </span>
            )}
          </div>
          {attendError && (
            <p className="w-full text-[0.72rem] text-[#b4543f]">{attendError}</p>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-muted">
          {mode === "read"
            ? "참석 기록이 없습니다. 논문을 등록하거나 참석 체크를 해보세요."
            : "읽을 논문이 아직 등록되지 않았습니다."}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map(({ member, papers, attended }) => (
            <MemberReadingRow
              key={member.id}
              memberId={member.id}
              memberName={member.name}
              papers={papers}
              attended={attended}
              showAttendance={showAttendance}
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
  attended,
  showAttendance,
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
  attended: boolean;
  showAttendance: boolean;
  sessionId: string;
  showReview: boolean;
  review: Review | null;
  canEdit: boolean;
  onUpsert: (r: Review) => void;
  onRemove: (memberId: string) => void;
}) {
  const [editing, setEditing] = useState(false); // 작성/수정 폼 표시
  const [open, setOpen] = useState(false); // 작성 완료된 한줄평 펼치기
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const startEdit = () => {
    setText(review?.text ?? "");
    setError("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setText("");
    setError("");
  };

  const save = async () => {
    if (!text.trim()) {
      setError("내용을 입력하세요.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = review
        ? await updateReview(review.id, text.trim())
        : await createReview({
            session_id: sessionId,
            member_id: memberId,
            text: text.trim(),
          });
      onUpsert(saved);
      setEditing(false);
      setText("");
      setOpen(true);
    } catch (err) {
      console.error(err);
      setError(
        review ? "수정에 실패했습니다." : "저장에 실패했습니다. (이미 작성했을 수 있어요)"
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!review) return;
    if (!window.confirm("한줄평을 삭제할까요?")) return;
    setDeleting(true);
    setError("");
    try {
      await deleteReview(review.id);
      onRemove(memberId);
      setOpen(false);
      setEditing(false);
      setText("");
    } catch (err) {
      console.error(err);
      setError("삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  // 오른쪽 버튼: 작성 완료(파란 토글) / 본인 미작성(+ 한줄평)
  const button = !showReview ? null : review ? (
    <button
      onClick={() => setOpen((v) => !v)}
      className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-[0.72rem] font-semibold text-white"
      title="한줄평 보기"
    >
      ✓ 한줄평
    </button>
  ) : canEdit ? (
    <button
      onClick={() => (editing ? cancelEdit() : startEdit())}
      className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[0.72rem] font-medium text-muted hover:border-accent hover:text-accent"
    >
      ＋ 한줄평
    </button>
  ) : null;

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <Link href={`/members/${memberId}`} aria-label={memberName}>
          <Avatar name={memberName} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href={`/members/${memberId}`} className="font-medium text-ink hover:underline">
              {memberName}
            </Link>
            {showAttendance && attended && (
              <span
                className="rounded-full bg-accentsoft px-1.5 py-0.5 text-[0.64rem] font-semibold text-accent"
                title="출석 체크함"
              >
                참석
              </span>
            )}
          </div>
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

      {/* 한줄평 보기 패널: 멤버 칸 전체 폭 사용(논문 밑) */}
      {showReview && review && open && !editing && (
        <div className="mt-2 sm:pl-12">
          <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-body">
            {review.text}
          </div>
          {canEdit && (
            <div className="mt-1 flex justify-end gap-1.5">
              <button
                onClick={startEdit}
                className="rounded-md px-2 py-1 text-[0.72rem] text-muted hover:bg-surface"
              >
                수정
              </button>
              <button
                onClick={remove}
                disabled={deleting}
                className="rounded-md px-2 py-1 text-[0.72rem] text-[#b4543f] hover:bg-surface disabled:opacity-60"
              >
                {deleting ? "삭제 중…" : "삭제"}
              </button>
            </div>
          )}
          {error && <p className="mt-1 text-[0.7rem] text-[#b4543f]">{error}</p>}
        </div>
      )}

      {/* 작성/수정 폼 (본인만) */}
      {showReview && canEdit && editing && (
        <div className="mt-2 sm:pl-12">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            autoFocus
            placeholder="이번 스터디 느낀 점·총평"
            className="w-full resize-y rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          {error && <p className="mt-1 text-[0.7rem] text-[#b4543f]">{error}</p>}
          <div className="mt-1 flex justify-end gap-1.5">
            <button
              onClick={cancelEdit}
              className="rounded-md px-2 py-1 text-[0.72rem] text-muted hover:bg-surface"
            >
              취소
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-md bg-accent px-2.5 py-1 text-[0.72rem] font-medium text-white disabled:opacity-60"
            >
              {saving ? "저장 중…" : "저장"}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
