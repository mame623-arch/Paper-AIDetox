"use client";

import { useState, type ReactNode } from "react";
import type { Review } from "@/lib/types";
import { createReview, deleteReview, updateReview } from "@/lib/db";
import { ENTER_HINT, submitOnEnter } from "@/lib/keys";

/**
 * 한줄평 UI(버튼 + 보기/작성 패널)를 홈·차시 상세와 멤버 페이지가 함께 쓰기 위한 훅.
 *
 * 버튼과 패널이 서로 다른 위치에 놓이기 때문에(홈은 멤버 줄 오른쪽 끝에 버튼,
 * 논문 밑에 패널) 한 컴포넌트로 묶지 않고 두 조각을 따로 돌려준다.
 * 상태는 이 훅이 들고 있고, 저장 결과만 부모의 목록에 반영한다.
 */
export function useSessionReview({
  sessionId,
  memberId,
  review,
  canEdit,
  enabled = true,
  panelClassName = "",
  onUpsert,
  onRemove,
}: {
  /** 한줄평은 차시 단위다. 차시가 없으면 남길 곳이 없다. */
  sessionId: string | null;
  memberId: string;
  review: Review | null;
  /** 본인 것만 작성·수정·삭제 */
  canEdit: boolean;
  enabled?: boolean;
  panelClassName?: string;
  onUpsert: (r: Review) => void;
  onRemove: (r: Review) => void;
}): { button: ReactNode; panel: ReactNode } {
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
    if (!sessionId) return;
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
      onRemove(review);
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

  if (!enabled || !sessionId) return { button: null, panel: null };

  // 오른쪽 버튼: 작성 완료(파란 토글) / 본인 미작성(＋ 한줄평)
  const button = review ? (
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

  const panel = (
    <>
      {/* 보기 패널 */}
      {review && open && !editing && (
        <div className={`mt-2 ${panelClassName}`}>
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
      {canEdit && editing && (
        <div className={`mt-2 ${panelClassName}`}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={submitOnEnter(save)}
            rows={3}
            autoFocus
            placeholder="이번 스터디 느낀 점·총평"
            className="w-full resize-y rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          {error && <p className="mt-1 text-[0.7rem] text-[#b4543f]">{error}</p>}
          <div className="mt-1 flex items-center justify-end gap-1.5">
            <span className="mr-auto text-[0.66rem] text-faint">{ENTER_HINT}</span>
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
    </>
  );

  return { button, panel };
}
