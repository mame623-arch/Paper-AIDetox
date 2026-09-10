"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useParams, useRouter, useSearchParams } from "next/navigation";
import type {
  Highlight,
  Member,
  Paper,
  PaperStatus,
  Review,
  Session,
} from "@/lib/types";
import {
  deletePaper,
  fetchHighlightsByMember,
  fetchMember,
  fetchMemberSessionIds,
  fetchPapersByMember,
  fetchReviewsByMember,
  fetchSessions,
  today,
  updatePaper,
  updatePaperStatus,
} from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { normalizeCategory, parseYear } from "@/lib/paperMeta";
import CategorySelect from "@/components/CategorySelect";
import { useCurrentMemberId } from "@/lib/currentUser";
import {
  bucketPurpose,
  buildArchiveStats,
  groupHighlightsByPaper,
} from "@/lib/archive";
import { categoryLabel } from "@/lib/arxivCategories";
import { useSessionReview } from "@/components/SessionReview";
import ArchiveRail from "@/components/ArchiveRail";
import PurposeFilter from "@/components/PurposeFilter";
import MemberHelp from "@/components/help/MemberHelp";
import { Avatar, SectionTitle, StatusBadge, formatDate } from "@/components/ui";

type MemberTab = "record" | "trend" | "help";

const MEMBER_TABS = [
  ["record", "기록"],
  ["trend", "읽기 경향"],
  ["help", "도움말"],
] as const;

/** 한 쪽에 보이는 읽은 논문 수. */
const PAGE_SIZE = 10;

/** 읽은 날짜 내림차순, 같으면 등록 시각 내림차순. 날짜가 없는 것은 맨 뒤. */
function byRecency(a: Paper, b: Paper): number {
  if (a.read_date !== b.read_date) {
    if (!a.read_date) return 1;
    if (!b.read_date) return -1;
    return b.read_date.localeCompare(a.read_date);
  }
  return b.created_at.localeCompare(a.created_at);
}

/**
 * 용도 필터를 적용한 그 논문의 수집 문장.
 * 칩의 값은 버킷(기타 포함)이고 문장의 purpose 는 사용자가 친 원문이라,
 * 비교는 반드시 bucketPurpose 를 거친다 — 원문끼리 견주면 `기타` 가 늘 0건이 된다.
 */
function visibleHighlights(
  highlightsByPaper: Map<string, Highlight[]>,
  paperId: string,
  purposeFilter: string | null
): Highlight[] {
  const list = highlightsByPaper.get(paperId) ?? [];
  if (!purposeFilter) return list;
  return list.filter((h) => bucketPurpose(h.purpose) === purposeFilter);
}

function MemberPageInner() {
  const params = useParams<{ id: string }>();
  const memberId = params.id;

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawTab = searchParams.get("tab");
  const tab: MemberTab =
    rawTab === "trend" || rawTab === "help" ? rawTab : "record";

  /** 탭을 바꾸면 page 를 버린다 — 다른 탭의 쪽 번호를 들고 갈 이유가 없다. */
  const setTab = (next: MemberTab) => {
    const q = new URLSearchParams(searchParams.toString());
    if (next === "record") q.delete("tab");
    else q.set("tab", next);
    q.delete("page");
    router.replace(`${pathname}${q.toString() ? `?${q}` : ""}`, { scroll: false });
  };

  // 정수만 받는다 — ?page=2.5 는 두 쪽에 걸친 반쪽 창을 자르고,
  // n === page 인 버튼이 없어 아무 쪽도 강조되지 않는다.
  const page = Math.max(1, Math.floor(Number(searchParams.get("page"))) || 1);

  const setPage = (next: number) => {
    const q = new URLSearchParams(searchParams.toString());
    if (next <= 1) q.delete("page");
    else q.set("page", String(next));
    router.replace(`${pathname}${q.toString() ? `?${q}` : ""}`, { scroll: false });
  };

  /** 목록이 달라지면 1쪽으로 되돌린다 — 3쪽에 머무르면 빈 화면이 된다. */
  const resetPage = () => {
    if (page > 1) setPage(1);
  };

  const [member, setMember] = useState<Member | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  // 참석 차시는 직접 세지 않는다 — 논문 없이 참석한 차시를 놓치고 불참을 잘못 넣는다.
  const [attendedCount, setAttendedCount] = useState(0);
  // 한줄평은 차시별로 쓰므로 session_id 로 찾는다. 논문은 자기 차시의 한줄평을 보여준다.
  const [reviewBySession, setReviewBySession] = useState<Map<string, Review>>(
    new Map()
  );
  const [query, setQuery] = useState("");
  /** 칩이 고른 용도 버킷. null 이면 전체 */
  const [purposeFilter, setPurposeFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 이 페이지의 기록을 편집할 수 있는 사람 = 본인뿐 (사이드바에서 고른 "나")
  const [currentMemberId] = useCurrentMemberId();
  const canEdit = currentMemberId === memberId;

  const reload = async () => {
    const [m, ps, rs, hs, sessionIds] = await Promise.all([
      fetchMember(memberId),
      fetchPapersByMember(memberId),
      fetchReviewsByMember(memberId),
      fetchHighlightsByMember(memberId),
      fetchMemberSessionIds(memberId),
    ]);
    setMember(m);
    setPapers(ps);
    setReviewBySession(new Map(rs.map((r) => [r.session_id, r])));
    setHighlights(hs);
    setAttendedCount(sessionIds.size);
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    Promise.all([reload(), fetchSessions().then(setSessions)])
      .catch(console.error)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  const upsertReview = (r: Review) =>
    setReviewBySession((prev) => new Map(prev).set(r.session_id, r));
  const removeReview = (r: Review) =>
    setReviewBySession((prev) => {
      const next = new Map(prev);
      next.delete(r.session_id);
      return next;
    });

  const sessionById = useMemo(
    () => new Map(sessions.map((s) => [s.id, s])),
    [sessions]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return papers;
    return papers.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.authors.toLowerCase().includes(q)
    );
  }, [papers, query]);

  const read = useMemo(
    () => filtered.filter((p) => p.status === "read"),
    [filtered]
  );
  const toread = useMemo(
    () => filtered.filter((p) => p.status === "toread"),
    [filtered]
  );

  const highlightsByPaper = useMemo(
    () => groupHighlightsByPaper(highlights),
    [highlights]
  );

  /** 아카이브 전체를 읽은 논문만으로 집계한다 — 검색어·용도 필터에 흔들리지 않는다. */
  const readPapers = useMemo(
    () => papers.filter((p) => p.status === "read"),
    [papers]
  );
  const stats = useMemo(
    () => buildArchiveStats(readPapers, highlights),
    [readPapers, highlights]
  );
  // 읽은 논문에 달린 문장 수. `전체` 칩의 숫자이자 머리말의 `수집 문장` 이다 —
  // 나머지 칩의 합과 맞아야 읽는 사람이 셈을 검산할 수 있다.
  const purposeTotal = useMemo(
    () => stats.purposes.reduce((sum, p) => sum + p.count, 0),
    [stats]
  );

  // 칩 줄은 셀 문장이 있을 때만 세운다. 줄이 없으면 고를 수도 끌 수도 없으니
  // 그때는 필터가 걸려 있어도 없는 것으로 본다 — 지울 칩이 없어 갇혀 버린다.
  const showPurposeChips = purposeTotal > 0;
  const activePurpose = showPurposeChips ? purposeFilter : null;

  /**
   * 목록에 실제로 오르는 읽은 논문.
   * 용도 필터를 켜면 그 용도의 문장이 없는 논문은 뺀다 — 남기면
   * "이 용도로 수집한 문장이 없습니다"만 가득한 쪽이 나온다.
   */
  const archive = useMemo(() => {
    const kept = activePurpose
      ? read.filter(
          (p) =>
            visibleHighlights(highlightsByPaper, p.id, activePurpose).length > 0
        )
      : read;
    return [...kept].sort(byRecency);
  }, [read, highlightsByPaper, activePurpose]);

  const totalPages = Math.max(1, Math.ceil(archive.length / PAGE_SIZE));
  // URL 의 page 는 목록보다 클 수 있다(삭제·상태 전환·검색·필터).
  // 그릴 때는 늘 맞춘 쪽을 쓰고, URL 은 아래 effect 가 뒤따라 고친다.
  const currentPage = Math.min(page, totalPages);
  const pageItems = archive.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  /** 넘친 쪽 번호를 마지막 쪽으로 맞춘다. 자료가 다 오기 전에는 손대지 않는다 —
   *  ?page=3 으로 들어온 사람의 쪽 번호를 첫 렌더에 지워 버리게 된다. */
  useEffect(() => {
    if (loading) return;
    if (page > totalPages) setPage(totalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, page, totalPages]);

  // 목록이 빈 까닭을 네 가지로 가른다: 검색어 자체가 걸렀나 / 검색어를 통과한
  // 뒤 용도가 걸렀나 / 검색어 없이 용도만 걸렀나 / 애초에 읽은 논문이 없나.
  // 뭉뚱그리면 검색 중에도 "아직 읽은 논문이 없습니다" 가 떠서 검색어를 지울
  // 생각을 못 하게 되고, 검색+용도가 겹쳤을 때도 "이 용도로 수집한 문장이
  // 없습니다"만 보이면 칩 숫자(전체 기준)와 어긋나 보인다.
  const readEmptyText =
    query.trim() && read.length === 0
      ? "검색 결과가 없습니다."
      : query.trim() && activePurpose
        ? "검색 결과 중 이 용도로 수집한 문장이 없습니다."
        : activePurpose && read.length > 0
          ? "이 용도로 수집한 문장이 없습니다."
          : "아직 읽은 논문이 없습니다.";

  if (loading) {
    return <p className="mx-auto max-w-[1100px] px-5 py-7 text-muted md:px-10">불러오는 중…</p>;
  }

  if (!member) {
    return (
      <div className="mx-auto max-w-[1100px] px-5 py-7 md:px-10">
        <p className="text-muted">멤버를 찾을 수 없습니다.</p>
        <Link href="/members" className="text-accent hover:underline">
          ← 멤버 목록
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-7 md:px-10">
      <Link href="/members" className="text-sm text-muted hover:text-ink">
        ← 멤버
      </Link>

      <div className="mb-5 mt-3 flex items-center gap-4">
        <Avatar name={member.name} size={56} />
        <div>
          <h1>{member.name}</h1>
          <p className="text-sm text-muted">
            읽은 논문 {readPapers.length}편 · 수집 문장 {purposeTotal}개 ·
            한줄평 {reviewBySession.size}차시 · {attendedCount}차시 참석
          </p>
        </div>
      </div>

      {/* 탭: 기록 / 읽기 경향 / 도움말 */}
      <div className="mt-5 flex gap-1 border-b border-line">
        {MEMBER_TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
              tab === key
                ? "border-accent font-semibold text-accent"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "record" && (
        <>
          {!canEdit && (
            <p className="mt-6 rounded-lg border border-dashed border-line bg-surface px-4 py-2.5 text-sm text-muted">
              {currentMemberId
                ? `${member.name} 님의 기록입니다. 보기만 할 수 있어요.`
                : "사이드바에서 내 이름을 고르면 내 기록을 편집할 수 있어요."}
            </p>
          )}

          <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_286px] xl:items-start">
            <div className="min-w-0">
              {/* 용도 칩. 수집한 문장이 없으면 `전체 0` 하나만 남으니 줄을 접는다. */}
              {showPurposeChips && (
                <PurposeFilter
                  counts={stats.purposes}
                  total={purposeTotal}
                  value={activePurpose}
                  onChange={(v) => {
                    setPurposeFilter(v);
                    resetPage();
                  }}
                />
              )}

              {/* 검색 */}
              <div className="mt-3 flex max-w-sm items-center gap-2 rounded-lg border border-line bg-bg px-3 py-1.5">
                <span className="text-faint">🔍</span>
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    resetPage();
                  }}
                  placeholder={canEdit ? "내 논문 검색 (제목·저자)" : "논문 검색 (제목·저자)"}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-faint"
                />
              </div>

              <SectionTitle hint={`${archive.length}편`}>읽은 논문</SectionTitle>
              <PaperList
                memberId={memberId}
                papers={pageItems}
                highlightsByPaper={highlightsByPaper}
                purposeFilter={activePurpose}
                reviewBySession={reviewBySession}
                sessionById={sessionById}
                canEdit={canEdit}
                onReviewUpsert={upsertReview}
                onReviewRemove={removeReview}
                emptyText={readEmptyText}
                onChanged={reload}
              />
              {totalPages > 1 && (
                <Pagination
                  page={currentPage}
                  totalPages={totalPages}
                  onChange={setPage}
                />
              )}

              {/* 읽을 예정. 여기가 없으면 읽을 예정 → 읽음 을 바꿀 곳이 사라진다. */}
              <SectionTitle hint={`${toread.length}편`}>읽을 예정</SectionTitle>
              <PaperList
                memberId={memberId}
                papers={toread}
                highlightsByPaper={null}
                purposeFilter={null}
                reviewBySession={reviewBySession}
                sessionById={sessionById}
                canEdit={canEdit}
                onReviewUpsert={upsertReview}
                onReviewRemove={removeReview}
                emptyText={query.trim() ? "검색 결과가 없습니다." : "읽을 논문이 없습니다."}
                onChanged={reload}
              />
            </div>

            <ArchiveRail stats={stats} />
          </div>
        </>
      )}

      {tab === "trend" && (
        <div className="mt-6 rounded-xl border border-dashed border-linestrong bg-surface p-8 text-center">
          <p className="text-sm font-semibold text-ink">준비 중입니다</p>
          <p className="mx-auto mt-2 max-w-[52ch] text-sm text-muted">
            수집한 문장이 쌓이면, 여러 논문에 걸쳐 반복해서 꽂힌 주제를 묶어
            읽기 경향을 정리해 보여줄 자리입니다.
          </p>
        </div>
      )}

      {tab === "help" && <MemberHelp />}
    </div>
  );
}

export default function MemberPage() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-[1100px] px-5 py-7 text-muted md:px-10">불러오는 중…</p>}>
      <MemberPageInner />
    </Suspense>
  );
}

/** 쪽 번호 줄. 쪽이 하나뿐일 때는 부르는 쪽에서 아예 그리지 않는다. */
function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (next: number) => void;
}) {
  const base = "rounded-md border px-2.5 py-1 text-xs transition";
  const on = "border-accent bg-accent font-semibold text-white";
  const off = "border-line text-muted hover:border-accent hover:text-accent";
  const arrow = `${base} ${off} disabled:opacity-40 disabled:hover:border-line disabled:hover:text-muted`;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="이전 쪽"
        className={arrow}
      >
        ←
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          aria-current={n === page ? "page" : undefined}
          className={`${base} tabular-nums ${n === page ? on : off}`}
        >
          {n}
        </button>
      ))}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="다음 쪽"
        className={arrow}
      >
        →
      </button>
    </div>
  );
}

function PaperList({
  memberId,
  papers,
  highlightsByPaper,
  purposeFilter,
  reviewBySession,
  sessionById,
  canEdit,
  emptyText,
  onReviewUpsert,
  onReviewRemove,
  onChanged,
}: {
  memberId: string;
  papers: Paper[];
  /** 논문 id → 수집 문장. null 이면 문장 칸을 붙이지 않는다 (읽을 예정 목록) */
  highlightsByPaper: Map<string, Highlight[]> | null;
  purposeFilter: string | null;
  /** 차시 id → 그 차시에 이 멤버가 쓴 한줄평 */
  reviewBySession: Map<string, Review>;
  sessionById: Map<string, Session>;
  /** 본인 페이지일 때만 상태 전환·편집·삭제 버튼을 노출한다 (논문 추가는 차시 쪽에서 한다) */
  canEdit: boolean;
  emptyText: string;
  onReviewUpsert: (r: Review) => void;
  onReviewRemove: (r: Review) => void;
  onChanged: () => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const toggle = async (p: Paper) => {
    const next: PaperStatus = p.status === "read" ? "toread" : "read";
    await updatePaperStatus(
      p.id,
      next,
      next === "read" ? p.read_date ?? today() : null
    );
    await onChanged();
  };

  const remove = async (p: Paper) => {
    if (!confirm(`"${p.title}" 기록을 삭제할까요? (하이라이트/메모도 함께 삭제됩니다)`))
      return;
    await deletePaper(p.id);
    await onChanged();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-line">
      {papers.length === 0 ? (
        <p className="p-5 text-sm text-muted">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-line">
          {papers.map((p) =>
            editingId === p.id ? (
              <li key={p.id} className="px-4 py-3">
                <EditPaperForm
                  paper={p}
                  onCancel={() => setEditingId(null)}
                  onSaved={async () => {
                    setEditingId(null);
                    await onChanged();
                  }}
                />
              </li>
            ) : (
              <PaperRow
                key={p.id}
                memberId={memberId}
                paper={p}
                session={
                  p.session_id ? sessionById.get(p.session_id) ?? null : null
                }
                review={
                  p.session_id ? reviewBySession.get(p.session_id) ?? null : null
                }
                highlights={
                  highlightsByPaper
                    ? visibleHighlights(highlightsByPaper, p.id, purposeFilter)
                    : null
                }
                purposeFilter={purposeFilter}
                canEdit={canEdit}
                onEdit={() => setEditingId(p.id)}
                onToggle={() => toggle(p)}
                onRemove={() => remove(p)}
                onReviewUpsert={onReviewUpsert}
                onReviewRemove={onReviewRemove}
              />
            )
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * 논문 한 줄. 한줄평은 홈·차시 상세와 같은 UI(useSessionReview)를 쓴다.
 * 한줄평은 논문이 아니라 차시 단위라, 같은 차시의 논문 줄에는 같은 글이 붙고
 * 한 곳에서 고치면 페이지의 다른 줄에도 함께 반영된다.
 */
function PaperRow({
  memberId,
  paper,
  session,
  review,
  highlights,
  purposeFilter,
  canEdit,
  onEdit,
  onToggle,
  onRemove,
  onReviewUpsert,
  onReviewRemove,
}: {
  memberId: string;
  paper: Paper;
  session: Session | null;
  review: Review | null;
  /** 용도 필터를 지난 이 논문의 수집 문장. null 이면 문장 칸 자체를 그리지 않는다 */
  highlights: Highlight[] | null;
  purposeFilter: string | null;
  canEdit: boolean;
  onEdit: () => void;
  onToggle: () => Promise<void>;
  onRemove: () => Promise<void>;
  onReviewUpsert: (r: Review) => void;
  onReviewRemove: (r: Review) => void;
}) {
  const { button, panel } = useSessionReview({
    sessionId: paper.session_id,
    memberId,
    review,
    canEdit,
    onUpsert: onReviewUpsert,
    onRemove: onReviewRemove,
  });

  // 값이 없는 항목은 그 자리만 빠진다 — 가운뎃점이 홀로 남지 않게 join 으로 잇는다.
  const meta = [
    paper.authors || "저자 미상",
    paper.read_date ? formatDate(paper.read_date) : "",
    session?.title ?? "",
    categoryLabel(paper.category),
    paper.published_year ? `${paper.published_year}년` : "",
    paper.pdf_url ? "PDF" : "링크 없음",
    highlights && highlights.length > 0 ? `문장 ${highlights.length}개` : "",
  ].filter(Boolean);

  return (
    <li className="px-4 py-3 hover:bg-surface">
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href={`/members/${memberId}/papers/${paper.id}`}
          className="min-w-0 flex-1"
        >
          <div className="truncate font-medium text-ink">{paper.title}</div>
          <div className="truncate text-xs text-muted">{meta.join(" · ")}</div>
        </Link>
        <StatusBadge status={paper.status} />
        {button}
        {canEdit && (
          <>
            <button
              onClick={onToggle}
              title="상태 전환"
              className="rounded-md border border-line px-2 py-1 text-xs text-muted hover:bg-surface2"
            >
              {paper.status === "read" ? "↩︎ 예정" : "✓ 읽음"}
            </button>
            <button
              onClick={onEdit}
              title="제목·저자·링크 편집"
              className="rounded-md border border-line px-2 py-1 text-xs text-muted hover:bg-surface2"
            >
              편집
            </button>
            <button
              onClick={onRemove}
              title="삭제"
              className="rounded-md px-2 py-1 text-xs text-faint hover:text-[#b4543f]"
            >
              ✕
            </button>
          </>
        )}
      </div>

      {panel}

      {/* 문장에 붙는 라벨은 저장된 원문 그대로다 — `기타` 로 묶는 것은 칩과 차트뿐이다. */}
      {highlights &&
        (highlights.length === 0 ? (
          <p className="mt-2 text-sm text-faint">
            {purposeFilter
              ? "이 용도로 수집한 문장이 없습니다."
              : "수집한 문장이 없습니다."}
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {highlights.map((h) => (
              <li
                key={h.id}
                className="rounded-lg border border-line bg-surface px-3 py-2"
              >
                <p className="text-sm text-ink">{h.text}</p>
                {h.note && <p className="mt-1 text-[0.82rem] text-muted">{h.note}</p>}
                <span className="mt-1.5 inline-block rounded-full bg-accentsoft px-1.5 py-0.5 text-[0.66rem] font-semibold text-accent">
                  {h.purpose}
                </span>
              </li>
            ))}
          </ul>
        ))}
    </li>
  );
}

function EditPaperForm({
  paper,
  onCancel,
  onSaved,
}: {
  paper: Paper;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState(paper.title);
  const [authors, setAuthors] = useState(paper.authors);
  const [url, setUrl] = useState(paper.pdf_url);
  const [category, setCategory] = useState(paper.category ?? "");
  const [year, setYear] = useState(
    paper.published_year != null ? String(paper.published_year) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (e: React.FormEvent) => {
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
    try {
      await updatePaper(paper.id, {
        title: title.trim(),
        authors: authors.trim(),
        pdf_url: url.trim(),
        category: normalizeCategory(category),
        published_year: parsedYear.value,
      });
      await onSaved();
    } catch (err) {
      console.error(err);
      setError("수정에 실패했습니다.");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-2.5">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">제목 *</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="field"
          autoFocus
        />
      </label>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">저자</span>
          <input
            value={authors}
            onChange={(e) => setAuthors(e.target.value)}
            className="field"
            placeholder="저자 미상"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">PDF 링크</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="field"
            placeholder="https://…"
          />
        </label>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
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
      <p className="text-xs text-faint">
        arXiv 논문은 등록할 때 분야·발행연도가 자동으로 채워집니다. 자동으로 채워지지
        않았다면 여기서 직접 넣어 주세요.
      </p>
      {error && <p className="text-xs text-[#b4543f]">{error}</p>}
      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-line px-3 py-1.5 text-xs text-muted hover:bg-surface"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </form>
  );
}
