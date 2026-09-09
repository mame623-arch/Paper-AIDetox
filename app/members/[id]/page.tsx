"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useParams, useRouter, useSearchParams } from "next/navigation";
import type { Member, Paper, PaperStatus, Review, Session } from "@/lib/types";
import {
  deletePaper,
  fetchMember,
  fetchPapersByMember,
  fetchReviewsByMember,
  fetchSessions,
  today,
  updatePaper,
  updatePaperStatus,
} from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useCurrentMemberId } from "@/lib/currentUser";
import { useSessionReview } from "@/components/SessionReview";
import { Avatar, SectionTitle, StatusBadge, formatDate } from "@/components/ui";

function MemberPageInner() {
  const params = useParams<{ id: string }>();
  const memberId = params.id;

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tab = searchParams.get("tab") === "trend" ? "trend" : "record";

  /** 탭을 바꾸면 page 를 버린다 — 다른 탭의 쪽 번호를 들고 갈 이유가 없다. */
  const setTab = (next: "record" | "trend") => {
    const q = new URLSearchParams(searchParams.toString());
    if (next === "record") q.delete("tab");
    else q.set("tab", next);
    q.delete("page");
    router.replace(`${pathname}${q.toString() ? `?${q}` : ""}`, { scroll: false });
  };

  const [member, setMember] = useState<Member | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  // 한줄평은 차시별로 쓰므로 session_id 로 찾는다. 논문은 자기 차시의 한줄평을 보여준다.
  const [reviewBySession, setReviewBySession] = useState<Map<string, Review>>(
    new Map()
  );
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // 이 페이지의 기록을 편집할 수 있는 사람 = 본인뿐 (사이드바에서 고른 "나")
  const [currentMemberId] = useCurrentMemberId();
  const canEdit = currentMemberId === memberId;

  const reload = async () => {
    const [m, ps, rs] = await Promise.all([
      fetchMember(memberId),
      fetchPapersByMember(memberId),
      fetchReviewsByMember(memberId),
    ]);
    setMember(m);
    setPapers(ps);
    setReviewBySession(new Map(rs.map((r) => [r.session_id, r])));
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

  const read = filtered.filter((p) => p.status === "read");
  const toread = filtered.filter((p) => p.status === "toread");

  if (loading) {
    return <p className="mx-auto max-w-[900px] px-5 py-7 text-muted md:px-10">불러오는 중…</p>;
  }

  if (!member) {
    return (
      <div className="mx-auto max-w-[900px] px-5 py-7 md:px-10">
        <p className="text-muted">멤버를 찾을 수 없습니다.</p>
        <Link href="/members" className="text-accent hover:underline">
          ← 멤버 목록
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] px-5 py-7 md:px-10">
      <Link href="/members" className="text-sm text-muted hover:text-ink">
        ← 멤버
      </Link>

      <div className="mb-5 mt-3 flex items-center gap-4">
        <Avatar name={member.name} size={56} />
        <div>
          <h1>{member.name}</h1>
          <p className="text-sm text-muted">
            읽음 {papers.filter((p) => p.status === "read").length} · 읽을 예정{" "}
            {papers.filter((p) => p.status === "toread").length}
          </p>
        </div>
      </div>

      {/* 탭: 기록 / 읽기 경향 */}
      <div className="mt-5 flex gap-1 border-b border-line">
        {([["record", "기록"], ["trend", "읽기 경향"]] as const).map(([key, label]) => (
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

          {/* 검색 */}
          <div className="mt-6 flex max-w-sm items-center gap-2 rounded-lg border border-line bg-bg px-3 py-1.5">
            <span className="text-faint">🔍</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={canEdit ? "내 논문 검색 (제목·저자)" : "논문 검색 (제목·저자)"}
              className="w-full bg-transparent text-sm outline-none placeholder:text-faint"
            />
          </div>

          <SectionTitle hint={`${read.length}편`}>읽은 논문</SectionTitle>
          <PaperList
            memberId={memberId}
            papers={read}
            reviewBySession={reviewBySession}
            sessionById={sessionById}
            canEdit={canEdit}
            onReviewUpsert={upsertReview}
            onReviewRemove={removeReview}
            emptyText={query ? "검색 결과가 없습니다." : "아직 읽은 논문이 없습니다."}
            onChanged={reload}
          />

          <SectionTitle hint={`${toread.length}편`}>읽을 논문</SectionTitle>
          <PaperList
            memberId={memberId}
            papers={toread}
            reviewBySession={reviewBySession}
            sessionById={sessionById}
            canEdit={canEdit}
            onReviewUpsert={upsertReview}
            onReviewRemove={removeReview}
            emptyText={query ? "검색 결과가 없습니다." : "읽을 논문이 없습니다."}
            onChanged={reload}
          />
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
    </div>
  );
}

export default function MemberPage() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-[900px] px-5 py-7 text-muted md:px-10">불러오는 중…</p>}>
      <MemberPageInner />
    </Suspense>
  );
}

function PaperList({
  memberId,
  papers,
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

  return (
    <li className="px-4 py-3 hover:bg-surface">
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href={`/members/${memberId}/papers/${paper.id}`}
          className="min-w-0 flex-1"
        >
          <div className="truncate font-medium text-ink">{paper.title}</div>
          <div className="truncate text-xs text-muted">
            {paper.authors || "저자 미상"}
            {paper.read_date ? ` · ${formatDate(paper.read_date)}` : ""}
            {session?.title ? ` · ${session.title}` : ""}
            {paper.pdf_url ? " · PDF" : " · 링크 없음"}
          </div>
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("제목을 입력하세요.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updatePaper(paper.id, {
        title: title.trim(),
        authors: authors.trim(),
        pdf_url: url.trim(),
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
