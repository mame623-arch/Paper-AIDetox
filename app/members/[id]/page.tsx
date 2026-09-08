"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Member, Paper, PaperStatus, Review, Session } from "@/lib/types";
import {
  createPaper,
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
import { Avatar, Card, SectionTitle, StatusBadge, formatDate } from "@/components/ui";

export default function MemberPage() {
  const params = useParams<{ id: string }>();
  const memberId = params.id;

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

      {canEdit && (
        <AddPaperForm memberId={memberId} sessions={sessions} onAdded={reload} />
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
        emptyText={
          query
            ? "검색 결과가 없습니다."
            : canEdit
            ? "읽을 논문을 추가해 보세요."
            : "읽을 논문이 없습니다."
        }
        onChanged={reload}
      />
    </div>
  );
}

function AddPaperForm({
  memberId,
  sessions,
  onAdded,
}: {
  memberId: string;
  sessions: Session[];
  onAdded: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<PaperStatus>("toread");
  const [sessionId, setSessionId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setTitle("");
    setAuthors("");
    setUrl("");
    setStatus("toread");
    setSessionId("");
    setError("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("제목을 입력하세요.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const session = sessions.find((s) => s.id === sessionId) ?? null;
      await createPaper({
        title: title.trim(),
        authors: authors.trim(),
        pdf_url: url.trim(),
        added_by: memberId,
        status,
        read_date: status === "read" ? session?.date ?? today() : null,
        session_id: sessionId || null,
      });
      reset();
      setOpen(false);
      await onAdded();
    } catch (err) {
      console.error(err);
      setError("저장에 실패했습니다. Supabase 설정을 확인하세요.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-dashed border-linestrong bg-bg px-4 py-2.5 text-sm font-medium text-muted hover:border-accent hover:text-accent"
      >
        ＋ 논문 기록 추가
      </button>
    );
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">제목 *</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="field"
            placeholder="Attention Is All You Need"
            autoFocus
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
            <span className="mb-1 block text-xs font-medium text-muted">
              PDF 링크 — 넣으면 하이라이트·메모를 남길 수 있어요
            </span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="field"
              placeholder="https://arxiv.org/pdf/1706.03762"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
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
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">
              스터디 일정 (선택) — 고르면 홈의 참석자에 표시돼요
            </span>
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="field"
            >
              <option value="">선택 안 함</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatDate(s.date)} {s.title ? `· ${s.title}` : ""}
                </option>
              ))}
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
            {saving ? "저장 중…" : "추가"}
          </button>
          <button
            type="button"
            onClick={() => {
              reset();
              setOpen(false);
            }}
            className="rounded-lg border border-line px-4 py-2 text-sm text-muted hover:bg-surface"
          >
            취소
          </button>
        </div>
      </form>
    </Card>
  );
}

function PaperList({
  memberId,
  papers,
  reviewBySession,
  sessionById,
  canEdit,
  emptyText,
  onChanged,
}: {
  memberId: string;
  papers: Paper[];
  /** 차시 id → 그 차시에 이 멤버가 쓴 한줄평 */
  reviewBySession: Map<string, Review>;
  sessionById: Map<string, Session>;
  /** 본인 페이지일 때만 추가·편집·삭제 버튼을 노출한다 */
  canEdit: boolean;
  emptyText: string;
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
          {papers.map((p) => {
            const review = p.session_id
              ? reviewBySession.get(p.session_id) ?? null
              : null;
            const session = p.session_id
              ? sessionById.get(p.session_id) ?? null
              : null;

            return editingId === p.id ? (
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
              <li key={p.id} className="px-4 py-3 hover:bg-surface">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Link
                    href={`/members/${memberId}/papers/${p.id}`}
                    className="min-w-0 flex-1"
                  >
                    <div className="truncate font-medium text-ink">{p.title}</div>
                    <div className="truncate text-xs text-muted">
                      {p.authors || "저자 미상"}
                      {p.read_date ? ` · ${formatDate(p.read_date)}` : ""}
                      {p.pdf_url ? " · PDF" : " · 링크 없음"}
                    </div>
                  </Link>
                  <StatusBadge status={p.status} />
                  {canEdit && (
                    <>
                      <button
                        onClick={() => toggle(p)}
                        title="상태 전환"
                        className="rounded-md border border-line px-2 py-1 text-xs text-muted hover:bg-surface2"
                      >
                        {p.status === "read" ? "↩︎ 예정" : "✓ 읽음"}
                      </button>
                      <button
                        onClick={() => setEditingId(p.id)}
                        title="제목·저자·링크 편집"
                        className="rounded-md border border-line px-2 py-1 text-xs text-muted hover:bg-surface2"
                      >
                        편집
                      </button>
                      <button
                        onClick={() => remove(p)}
                        title="삭제"
                        className="rounded-md px-2 py-1 text-xs text-faint hover:text-[#b4543f]"
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>

                {/* 그 차시에 남긴 한줄평 — 한줄평은 논문이 아니라 차시 단위라
                    같은 차시의 논문에는 같은 글이 붙는다. */}
                {review && (
                  <div className="mt-2 rounded-lg border border-line bg-surface px-3 py-2">
                    <div className="text-[0.68rem] font-semibold text-faint">
                      한줄평
                      {session
                        ? ` · ${formatDate(session.date)}${
                            session.title ? ` ${session.title}` : ""
                          }`
                        : ""}
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-body">
                      {review.text}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
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
