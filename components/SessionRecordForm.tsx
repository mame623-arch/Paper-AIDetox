"use client";

import { useEffect, useRef, useState } from "react";
import type { Attendance, Paper, PaperStatus, Session } from "@/lib/types";
import type { ArxivMeta } from "@/lib/arxiv";
import { createPaper, removeAttendance, setAttendance } from "@/lib/db";
import { normalizeCategory, parseYear } from "@/lib/paperMeta";
import { useCurrentMemberId } from "@/lib/currentUser";
import { Card, formatDate, weekday } from "@/components/ui";
import CategorySelect from "@/components/CategorySelect";

type Branch = "paper" | "absent";

/**
 * 이번 차시(session)에 붙는 "논문 등록 / 불참" 2갈래 기록 폼.
 *
 * 차시가 이미 정해진 자리에 붙으므로 "스터디 일정" 드롭다운은 없다 —
 * 기존 AddPaperForm(app/members/[id]/page.tsx)과 달리 session_id 는 props 로 고정된다.
 *
 * **참석은 갈래가 아니다.** 이 스터디에서는 논문을 올리지 않고 참석하는 경우가 없어
 * 참석 = 논문 등록이고, classifyAttendance(lib/report.ts)도 그렇게 센다. 그래서
 * 참석만 따로 기록하는 경로를 두지 않는다.
 *
 * 불참을 되돌리는 것은 present 를 쓰는 게 아니라 출석 행을 **지우는** 것이다.
 * 지우면 논문이 있으면 참석자로, 없으면 응답 없음으로 자연스럽게 돌아간다 —
 * 논문 없는 present 행을 인위적으로 만들지 않는다.
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
  // 연도는 문자열로 들고 있다 — 비운 상태와 0 을 구분해야 하고, 입력 중간
  // 상태("20")도 그대로 보여야 한다. 저장할 때만 숫자로 바꾼다.
  const [year, setYear] = useState("");
  /** arXiv 조회 결과. 실패를 조용히 넘기면 사용자는 왜 안 채워졌는지 알 수 없다. */
  const [lookup, setLookup] = useState<"idle" | "loading" | "ok" | "notArxiv" | "failed">(
    "idle"
  );

  // 불참 칸
  const [reason, setReason] = useState("");

  // arXiv 조회 요청 순번 — 늦게 도착한 응답이 그새 바뀐 링크를 덮어쓰지 않도록 막는다.
  const reqRef = useRef(0);

  const runLookup = async (link: string) => {
    const seq = ++reqRef.current;
    setLookup("loading");
    try {
      const r = await fetch(`/api/arxiv?url=${encodeURIComponent(link)}`);
      if (seq !== reqRef.current) return; // 그새 링크가 바뀌었다
      if (!r.ok) {
        // 422 = arXiv 링크가 아니거나 메타데이터가 없음, 502 = arXiv 쪽 장애.
        // 사용자가 할 일이 다르므로 구분해서 알린다.
        setLookup(r.status === 422 ? "notArxiv" : "failed");
        return;
      }
      const meta = (await r.json()) as ArxivMeta;
      if (seq !== reqRef.current) return;
      if (!meta?.title) {
        setLookup("notArxiv");
        return;
      }
      // 제목·저자는 비어 있는 칸만 채운다 — 사용자가 고쳐 둔 값을 덮지 않는다.
      setTitle((t) => t || meta.title);
      setAuthors((a) => a || meta.authors);
      // 분야·연도는 덮어쓴다. 링크가 바뀌면 아래 effect 가 먼저 비우므로, 여기
      // 도달했다는 건 이 링크에 대한 조회 결과라는 뜻이다. "비어 있을 때만"으로
      // 하면 링크를 A→B 로 바꿨을 때 A 의 분야가 B 에 그대로 붙는다.
      setCategory(meta.category ?? "");
      setYear(meta.published_year != null ? String(meta.published_year) : "");
      setLookup("ok");
    } catch {
      if (seq === reqRef.current) setLookup("failed");
    }
  };

  useEffect(() => {
    // 링크가 바뀔 때마다(비우는 경우뿐 아니라 다른 링크로 바꾸는 경우도) 순번을
    // 앞질러 무효화한다. 그러지 않으면 A 조회가 진행 중일 때 B로 바꿔도, B의
    // 디바운스가 뜨기 전에 A가 먼저 응답하면 그 순번이 여전히 최신으로 보여
    // A의 제목·저자가 그대로 반영되고, 그 값이 B의 pdf_url·분야와 잘못 짝지어진다.
    reqRef.current += 1;
    // 링크가 바뀌면 이전 링크의 조회 결과(분야·연도)와 안내를 함께 비운다.
    // 남겨 두면 A 의 분야가 B 의 논문에 붙은 채로 저장된다.
    setCategory("");
    setYear("");
    setLookup("idle");
    const link = url.trim();
    if (!link) return;
    const t = setTimeout(() => runLookup(link), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const resetFields = () => {
    setUrl("");
    setTitle("");
    setAuthors("");
    setStatus("toread");
    setCategory("");
    setYear("");
    setLookup("idle");
    setReason("");
    setError("");
  };

  // 갈래를 고른다 — 다른 갈래의 실패 메시지가 남아 있지 않도록 함께 지운다.
  const selectBranch = (b: Branch) => {
    setBranch(b);
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

  // 불참 취소 — 행을 지운다. 논문이 있으면 참석자로, 없으면 응답 없음으로 돌아간다.
  const cancelAbsent = async () => {
    setSaving(true);
    setError("");
    try {
      await removeAttendance(session.id, currentMemberId);
    } catch (err) {
      console.error(err);
      setError("불참 취소에 실패했습니다.");
      setSaving(false);
      return;
    }
    // 다시 읽기(onDone)는 저장과 별개다 — 실패해도 저장 실패로 보고하지 않는다.
    closeAll();
    try {
      await onDone();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const submitPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("제목을 입력하세요.");
      return;
    }
    const parsedYear = parseYear(year);
    if (!parsedYear.ok) {
      setError(parsedYear.message);
      return;
    }
    setSaving(true);
    setError("");

    // 참석 판정은 이미 "논문 등록 = 참석" 이라 출석을 따로 쓰지 않는다.
    // 예외: 이미 불참을 선언해 뒀다면 absent 가 우선해 그대로 불참자로 남으므로,
    // 이때만 출석 행을 지워 불참 표시를 없앤다(present 를 새로 쓰지 않는다).
    //
    // 순서: 멱등한 쓰기(removeAttendance, delete)를 먼저, 멱등하지 않은 쓰기
    // (createPaper, insert)를 나중에 한다. createPaper 를 먼저 하면 뒤이은 출석
    // 처리가 실패했을 때 논문은 저장돼 있는데 "저장 실패"로 보이고 재시도하면
    // 논문이 중복 생성된다. 반대로 하면 앞이 실패해도 아무것도 안 바뀐 상태이고,
    // 뒤만 실패하면 "응답 없음 + 논문 없음"으로 남아 재시도해도 중복이 없다.
    if (myAttendance?.status === "absent") {
      try {
        await removeAttendance(session.id, currentMemberId);
      } catch (err) {
        console.error(err);
        setError("불참 표시를 지우지 못했습니다.");
        setSaving(false);
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
        category: normalizeCategory(category),
        published_year: parsedYear.value,
      });
    } catch (err) {
      console.error(err);
      setError("논문 저장에 실패했습니다.");
      setSaving(false);
      return;
    }

    // 다시 읽기(onDone)는 저장과 별개다 — 실패해도 저장 실패로 보고하지 않는다.
    closeAll();
    try {
      await onDone();
    } catch (err) {
      console.error(err);
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
    } catch (err) {
      console.error(err);
      setError("저장에 실패했습니다.");
      setSaving(false);
      return;
    }
    // 다시 읽기(onDone)는 저장과 별개다 — 실패해도 저장 실패로 보고하지 않는다.
    closeAll();
    try {
      await onDone();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        {/* 어느 차시에 쓰는 기록인지 — 홈에서는 "이번 차시" 가 다음 주 차시다 */}
        <p className="text-sm text-muted">
          <span className="font-medium text-ink">
            {formatDate(session.date)} ({weekday(session.date)})
          </span>{" "}
          기록
        </p>
        <p className="text-sm text-muted">
          내 현재 상태 · <span className="font-medium text-ink">{statusLine}</span>
        </p>
        {myAttendance?.status === "absent" && (
          <button
            type="button"
            onClick={cancelAbsent}
            disabled={saving}
            title="불참 표시를 지웁니다. 논문이 있으면 참석자로 돌아갑니다."
            className="rounded-full border border-line px-2.5 py-0.5 text-[0.74rem] text-muted transition hover:border-accent hover:text-accent disabled:opacity-60"
          >
            불참 취소
          </button>
        )}
        <button
          type="button"
          onClick={closeAll}
          className="ml-auto text-xs text-muted hover:text-ink"
        >
          닫기
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <BranchButton active={branch === "paper"} onClick={() => selectBranch("paper")}>
          논문 등록
        </BranchButton>
        <BranchButton active={branch === "absent"} onClick={() => selectBranch("absent")}>
          불참
        </BranchButton>
      </div>

      {branch === "paper" && (
        <form onSubmit={submitPaper} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">
              PDF 링크 — arXiv 링크면 제목·저자·분야·발행연도를 자동으로 채워요
            </span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="field"
              placeholder="https://arxiv.org/pdf/1706.03762"
              autoFocus
            />
            {lookup === "loading" && (
              <span className="mt-1 block text-xs text-faint">arXiv 에서 찾는 중…</span>
            )}
            {lookup === "notArxiv" && (
              <span className="mt-1 block text-xs text-muted">
                arXiv 링크가 아니라 자동 채움이 안 돼요 — 아래 칸을 직접 채워 주세요.
              </span>
            )}
            {lookup === "failed" && (
              <span className="mt-1 block text-xs text-muted">
                arXiv 조회에 실패했어요. 직접 채우시거나 잠시 후 다시 시도해 주세요.
              </span>
            )}
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">제목 *</span>
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="block">
              <span className="mb-1 block text-xs font-medium text-muted">분야</span>
              <CategorySelect value={category} onChange={setCategory} />
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">발행연도</span>
              <input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="field"
                inputMode="numeric"
                placeholder="2017"
              />
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
