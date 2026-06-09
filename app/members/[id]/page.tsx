"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Member, Paper, PaperStatus } from "@/lib/types";
import {
  createPaper,
  deletePaper,
  fetchMember,
  fetchPapersByMember,
  updatePaperStatus,
} from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  Card,
  EmojiAvatar,
  SectionTitle,
  StatusBadge,
  formatDate,
} from "@/components/ui";

export default function MemberPage() {
  const params = useParams<{ id: string }>();
  const memberId = params.id;

  const [member, setMember] = useState<Member | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const [m, ps] = await Promise.all([
      fetchMember(memberId),
      fetchPapersByMember(memberId),
    ]);
    setMember(m);
    setPapers(ps);
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    reload()
      .catch(console.error)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  const read = useMemo(() => papers.filter((p) => p.status === "read"), [papers]);
  const toread = useMemo(
    () => papers.filter((p) => p.status === "toread"),
    [papers]
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 text-sm text-muted md:px-8">
        불러오는 중…
      </div>
    );
  }

  if (!member) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
        <p className="text-sm text-muted">멤버를 찾을 수 없습니다.</p>
        <Link href="/" className="text-sm text-accent hover:underline">
          ← 홈으로
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      <Link href="/" className="text-sm text-muted hover:text-ink">
        ← 홈
      </Link>

      {/* 프로필 */}
      <div className="mb-6 mt-3 flex items-center gap-4">
        <EmojiAvatar emoji={member.emoji} size={56} />
        <div>
          <h1 className="text-2xl font-bold text-ink">{member.name}</h1>
          <p className="text-sm text-muted">
            {member.role || "스터디원"} · 읽음 {read.length} · 읽을 예정{" "}
            {toread.length}
          </p>
        </div>
      </div>

      <AddPaperForm memberId={memberId} onAdded={reload} />

      <div className="mt-8 space-y-8">
        <PaperList
          title="읽은 논문"
          papers={read}
          emptyText="아직 읽은 논문이 없습니다."
          onChanged={reload}
        />
        <PaperList
          title="읽을 논문"
          papers={toread}
          emptyText="읽을 논문을 추가해 보세요."
          onChanged={reload}
        />
      </div>
    </div>
  );
}

function AddPaperForm({
  memberId,
  onAdded,
}: {
  memberId: string;
  onAdded: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [status, setStatus] = useState<PaperStatus>("toread");
  const [readDate, setReadDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setTitle("");
    setAuthors("");
    setPdfUrl("");
    setStatus("toread");
    setReadDate("");
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
      await createPaper({
        title: title.trim(),
        authors: authors.trim(),
        pdf_url: pdfUrl.trim(),
        added_by: memberId,
        status,
        read_date: status === "read" ? readDate || null : null,
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
        className="rounded-lg border border-dashed border-line bg-panel px-4 py-2.5 text-sm font-medium text-[#5f5e5b] hover:border-[#cfcec9] hover:bg-[#faf9f8]"
      >
        ＋ 논문 기록 추가
      </button>
    );
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="제목 *">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="field"
              placeholder="논문 제목"
            />
          </Field>
          <Field label="저자 / 출처">
            <input
              value={authors}
              onChange={(e) => setAuthors(e.target.value)}
              className="field"
              placeholder="예: Vaswani et al., 2017"
            />
          </Field>
        </div>
        <Field label="PDF 링크">
          <input
            value={pdfUrl}
            onChange={(e) => setPdfUrl(e.target.value)}
            className="field"
            placeholder="https://arxiv.org/pdf/..."
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="상태">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PaperStatus)}
              className="field"
            >
              <option value="toread">읽을 예정</option>
              <option value="read">읽음</option>
            </select>
          </Field>
          {status === "read" && (
            <Field label="읽은 날짜">
              <input
                type="date"
                value={readDate}
                onChange={(e) => setReadDate(e.target.value)}
                className="field"
              />
            </Field>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "저장 중…" : "저장"}
          </button>
          <button
            type="button"
            onClick={() => {
              reset();
              setOpen(false);
            }}
            className="rounded-lg border border-line px-4 py-2 text-sm text-[#5f5e5b] hover:bg-[#faf9f8]"
          >
            취소
          </button>
        </div>
      </form>

      <style jsx>{`
        :global(.field) {
          width: 100%;
          border: 1px solid var(--border);
          background: #fff;
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 14px;
          outline: none;
        }
        :global(.field:focus) {
          border-color: var(--accent);
        }
      `}</style>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function PaperList({
  title,
  papers,
  emptyText,
  onChanged,
}: {
  title: string;
  papers: Paper[];
  emptyText: string;
  onChanged: () => Promise<void>;
}) {
  const toggle = async (p: Paper) => {
    const next: PaperStatus = p.status === "read" ? "toread" : "read";
    await updatePaperStatus(
      p.id,
      next,
      next === "read" ? p.read_date ?? new Date().toISOString().slice(0, 10) : null
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
    <section>
      <SectionTitle hint={`${papers.length}편`}>{title}</SectionTitle>
      <Card className="p-0">
        {papers.length === 0 ? (
          <p className="p-5 text-sm text-muted">{emptyText}</p>
        ) : (
          <ul className="divide-y divide-line">
            {papers.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-[#faf9f8]"
              >
                <Link
                  href={`/papers/${p.id}`}
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
                <button
                  onClick={() => toggle(p)}
                  title="상태 전환"
                  className="rounded-md border border-line px-2 py-1 text-xs text-[#5f5e5b] hover:bg-[#f0efed]"
                >
                  {p.status === "read" ? "↩︎ 읽을 예정으로" : "✓ 읽음으로"}
                </button>
                <button
                  onClick={() => remove(p)}
                  title="삭제"
                  className="rounded-md px-2 py-1 text-xs text-muted hover:text-red-600"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
