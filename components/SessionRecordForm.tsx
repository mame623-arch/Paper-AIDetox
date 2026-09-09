"use client";

import { useEffect, useRef, useState } from "react";
import type { Attendance, Paper, PaperStatus, Session } from "@/lib/types";
import type { ArxivMeta } from "@/lib/arxiv";
import { createPaper, setAttendance } from "@/lib/db";
import { categoryLabel } from "@/lib/arxivCategories";
import { useCurrentMemberId } from "@/lib/currentUser";
import { Card } from "@/components/ui";

type Branch = "present" | "paper" | "absent";

/**
 * 이번 차시(session)에 붙는 "참석 / 논문 등록 / 불참" 3갈래 기록 폼.
 *
 * 차시가 이미 정해진 자리에 붙으므로 "스터디 일정" 드롭다운은 없다 —
 * 기존 AddPaperForm(app/members/[id]/page.tsx)과 달리 session_id 는 props 로 고정된다.
 *
 * 참석 판정은 classifyAttendance(lib/report.ts)가 "논문을 등록한 사람 = 참석"으로
 * 이미 셈하므로, 논문 등록 뒤에 출석까지 따로 쓰지 않는다. 단 이미 absent 를
 * 선언해 둔 경우만 absent 가 우선해 불참자로 남기 때문에 present 로 덮어쓴다.
 */
export default function SessionRecordForm({
  session,
  myAttendance,
  myPapers,
  onDone,
}: {
  session: Session;
  myAttendance: Attendance | null;
  myPapers: Paper[];
  onDone: () => Promise<void>;
}) {
  const [currentMemberId] = useCurrentMemberId();
  const [open, setOpen] = useState(false);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 논문 등록 칸
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [status, setStatus] = useState<PaperStatus>("toread");
  const [category, setCategory] = useState("");
  const [year, setYear] = useState<number | null>(null);

  // 불참 칸
  const [reason, setReason] = useState("");

  // arXiv 조회 요청 순번 — 늦게 도착한 응답이 그새 바뀐 링크를 덮어쓰지 않도록 막는다.
  const reqRef = useRef(0);

  const lookup = async (link: string) => {
    const seq = ++reqRef.current;
    try {
      const r = await fetch(`/api/arxiv?url=${encodeURIComponent(link)}`);
      if (seq !== reqRef.current) return; // 그새 링크가 바뀌었다
      if (!r.ok) return; // 422·502 는 조용히 넘어간다
      const meta = (await r.json()) as ArxivMeta;
      if (seq !== reqRef.current || !meta?.title) return;
      // 비어 있는 칸만 채운다 — 사용자가 고쳐 둔 값을 덮지 않는다
      setTitle((t) => t || meta.title);
      setAuthors((a) => a || meta.authors);
      setCategory(meta.category ?? "");
      setYear(meta.published_year ?? null);
    } catch {
      /* 조용히 넘어간다 — arXiv 가 아닌 논문도 정상이다 */
    }
  };

  useEffect(() => {
    const link = url.trim();
    if (!link) {
      // 링크를 비우면 이전 조회 결과(분야·연도)도 함께 비운다.
      // 이미 날아간 요청이 있었다면 순번을 앞질러 무효화해, 늦게 도착해도 반영되지 않게 한다.
      reqRef.current += 1;
      setCategory("");
      setYear(null);
      return;
    }
    const t = setTimeout(() => lookup(link), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const resetFields = () => {
    setUrl("");
    setTitle("");
    setAuthors("");
    setStatus("toread");
    setCategory("");
    setYear(null);
    setReason("");
    setError("");
  };

  // 갈래 선택 화면으로 돌아간다 (폼 자체는 열어 둔다)
  const cancelBranch = () => {
    setBranch(null);
    resetFields();
  };

  // 폼 전체를 닫는다
  const closeAll = () => {
    setBranch(null);
    resetFields();
    setOpen(false);
  };

  if (!currentMemberId) {
    return (
      <p className="rounded-lg border border-dashed border-line bg-surface px-4 py-2.5 text-sm text-muted">
        사이드바에서 내 이름을 고르면 기록할 수 있어요
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-dashed border-linestrong bg-bg px-4 py-2.5 text-sm font-medium text-muted hover:border-accent hover:text-accent"
      >
        ＋ 이번 차시 기록
      </button>
    );
  }

  const statusLine = !myAttendance
    ? "응답 없음"
    : myAttendance.status === "present"
    ? "참석"
    : `불참${myAttendance.reason ? ` · ${myAttendance.reason}` : ""}`;

  const savePresent = async () => {
    setSaving(true);
    setError("");
    try {
      await setAttendance(session.id, currentMemberId, "present");
      closeAll();
      await onDone();
    } catch (err) {
      console.error(err);
      setError("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const submitPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      // 참석 판정은 이미 "논문 등록 = 참석" 이라 따로 쓰지 않는다.
      // 예외: 이미 불참을 선언해 뒀다면 absent 가 우선해 그대로 불참자로 남으므로,
      // 이때만 present 로 덮어써 불참 표시를 지운다.
      //
      // 순서(컨트롤러 판단 — 브리핑의 순서를 뒤집었다): 멱등한 쓰기(setAttendance,
      // upsert)를 먼저, 멱등하지 않은 쓰기(createPaper, insert)를 나중에 한다.
      // createPaper 를 먼저 하면, 뒤이은 setAttendance 가 실패했을 때 논문은 이미
      // 저장돼 있는데 "저장 실패"로 보이고, 재시도하면 논문이 중복 생성된다.
      // 반대로 하면 setAttendance 가 실패해도 아직 아무것도 안 바뀐 상태이고,
      // setAttendance 가 성공한 뒤 createPaper 만 실패하면 "참석(논문 없이)"이라는
      // 이 도메인에서 정상적인 상태로 남아, 재시도해도 upsert 라 중복이 없다.
      if (myAttendance?.status === "absent") {
        try {
          await setAttendance(session.id, currentMemberId, "present");
        } catch (err) {
          console.error(err);
          setError("참석 처리에 실패했습니다.");
          return;
        }
      }
      try {
        await createPaper({
          title: title.trim(),
          authors: authors.trim(),
          pdf_url: url.trim(),
          added_by: currentMemberId,
          status,
          read_date: status === "read" ? session.date : null,
          session_id: session.id,
          category,
          published_year: year,
        });
      } catch (err) {
        console.error(err);
        setError("논문 저장에 실패했습니다.");
        return;
      }
      closeAll();
      await onDone();
    } finally {
      setSaving(false);
    }
  };

  const submitAbsent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      myPapers.length > 0 &&
      !window.confirm("이 차시에 등록한 논문이 있습니다. 불참으로 바꿀까요?")
    ) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      await setAttendance(session.id, currentMemberId, "absent", reason.trim());
      closeAll();
      await onDone();
    } catch (err) {
      console.error(err);
      setError("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted">
          내 현재 상태 · <span className="font-medium text-ink">{statusLine}</span>
        </p>
        <button
          type="button"
          onClick={closeAll}
          className="text-xs text-muted hover:text-ink"
        >
          닫기
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <BranchButton active={branch === "present"} onClick={() => setBranch("present")}>
          참석
        </BranchButton>
        <BranchButton active={branch === "paper"} onClick={() => setBranch("paper")}>
          논문 등록
        </BranchButton>
        <BranchButton active={branch === "absent"} onClick={() => setBranch("absent")}>
          불참
        </BranchButton>
      </div>

      {branch === "present" && (
        <div className="space-y-3">
          <p className="text-sm text-muted">논문 등록 없이 참석만 기록합니다.</p>
          {error && <p className="text-sm text-[#b4543f]">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={savePresent}
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "저장 중…" : "참석으로 저장"}
            </button>
            <button
              type="button"
              onClick={cancelBranch}
              className="rounded-lg border border-line px-4 py-2 text-sm text-muted hover:bg-surface"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {branch === "paper" && (
        <form onSubmit={submitPaper} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">
              PDF 링크 — arXiv 링크면 제목·저자·분야를 자동으로 채워요
            </span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="field"
              placeholder="https://arxiv.org/pdf/1706.03762"
              autoFocus
            />
            {(category || year !== null) && (
              <span className="mt-1 block text-xs text-faint">
                {[category && categoryLabel(category), year && `${year}년`]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">제목</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="field"
              placeholder="Attention Is All You Need"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">저자</span>
              <input
                value={authors}
                onChange={(e) => setAuthors(e.target.value)}
                className="field"
                placeholder="Ashish Vaswani 외"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">상태</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PaperStatus)}
                className="field"
              >
                <option value="toread">읽을 예정</option>
                <option value="read">읽음</option>
              </select>
            </label>
          </div>

          {error && <p className="text-sm text-[#b4543f]">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "저장 중…" : "논문 등록"}
            </button>
            <button
              type="button"
              onClick={cancelBranch}
              className="rounded-lg border border-line px-4 py-2 text-sm text-muted hover:bg-surface"
            >
              취소
            </button>
          </div>
        </form>
      )}

      {branch === "absent" && (
        <form onSubmit={submitAbsent} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">사유</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="field"
              placeholder="예: 출장"
              autoFocus
            />
          </label>

          {error && <p className="text-sm text-[#b4543f]">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "저장 중…" : "불참으로 저장"}
            </button>
            <button
              type="button"
              onClick={cancelBranch}
              className="rounded-lg border border-line px-4 py-2 text-sm text-muted hover:bg-surface"
            >
              취소
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}

function BranchButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-accent text-white"
          : "border border-line text-muted hover:border-accent hover:text-accent"
      }`}
    >
      {children}
    </button>
  );
}
