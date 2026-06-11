"use client";

import { useState } from "react";
import Link from "next/link";
import type { AttendeeReadings, Paper, Review, Session } from "@/lib/types";
import { createReview } from "@/lib/db";
import { Avatar, Card, formatDate, weekday } from "./ui";

export default function SessionReadingsCard({
  session,
  readings,
  reviews,
  mode,
  emptyText,
}: {
  session: Session | null;
  readings: AttendeeReadings[];
  /** read 모드에서 세션의 기존 한줄평 */
  reviews?: Review[];
  mode: "read" | "toread";
  emptyText: string;
}) {
  // 서버에서 받은 한줄평 + 이 화면에서 새로 작성한 한줄평을 합쳐 표시
  const [localReviews, setLocalReviews] = useState<Review[]>([]);
  const byMember = new Map<string, Review>();
  for (const r of [...(reviews ?? []), ...localReviews]) {
    byMember.set(r.member_id, r);
  }

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

  const onSaved = (review: Review) => setLocalReviews((prev) => [...prev, review]);

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

      {readings.length === 0 ? (
        <p className="text-sm text-muted">
          {mode === "read"
            ? "읽은 논문 기록이 없습니다."
            : "읽을 논문이 아직 등록되지 않았습니다."}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {readings.map(({ member, papers }) => (
            <MemberReadingRow
              key={member.id}
              memberId={member.id}
              memberName={member.name}
              papers={papers}
              sessionId={session.id}
              showReview={mode === "read"}
              review={byMember.get(member.id) ?? null}
              onSaved={onSaved}
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
  onSaved,
}: {
  memberId: string;
  memberName: string;
  papers: Paper[];
  sessionId: string;
  showReview: boolean;
  review: Review | null;
  onSaved: (r: Review) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false); // 작성 완료된 한줄평 펼치기
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!text.trim()) {
      setError("내용을 입력하세요.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = await createReview({
        session_id: sessionId,
        member_id: memberId,
        text: text.trim(),
      });
      onSaved(saved);
      setEditing(false);
      setText("");
    } catch (err) {
      console.error(err);
      setError("저장에 실패했습니다. (이미 작성했을 수 있어요)");
    } finally {
      setSaving(false);
    }
  };

  // 오른쪽 버튼: 작성 완료(파란 토글) / 미작성(+ 한줄평)
  const button = !showReview ? null : review ? (
    <button
      onClick={() => setOpen((v) => !v)}
      className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-[0.72rem] font-semibold text-white"
      title="한줄평 작성 완료"
    >
      ✓ 한줄평
    </button>
  ) : (
    <button
      onClick={() => setEditing((v) => !v)}
      className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[0.72rem] font-medium text-muted hover:border-accent hover:text-accent"
    >
      ＋ 한줄평
    </button>
  );

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
            {papers.map((p) => (
              <Link
                key={p.id}
                href={`/members/${memberId}/papers/${p.id}`}
                className="block text-sm text-body hover:text-accent hover:underline"
              >
                📄 {p.title}
              </Link>
            ))}
          </div>
        </div>
        {button}
      </div>

      {/* 한줄평 패널: 멤버 칸 전체 폭 사용(논문 밑) */}
      {showReview && review && open && (
        <div className="mt-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-body sm:pl-12">
          {review.text}
        </div>
      )}
      {showReview && !review && editing && (
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
              onClick={() => {
                setEditing(false);
                setText("");
                setError("");
              }}
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
