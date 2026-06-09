"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Member, Paper } from "@/lib/types";
import { fetchMember, fetchMembers, fetchPaper } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useCurrentMemberId } from "@/lib/currentUser";
import { StatusBadge } from "@/components/ui";

// react-pdf-highlighter는 브라우저 전용 → SSR 비활성화
const PdfHighlighterView = dynamic(
  () => import("@/components/PdfHighlighterView"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center text-sm text-muted">
        뷰어 준비 중…
      </div>
    ),
  }
);

export default function PaperPage() {
  const params = useParams<{ id: string }>();
  const paperId = params.id;
  const [currentMemberId] = useCurrentMemberId();

  const [paper, setPaper] = useState<Paper | null>(null);
  const [owner, setOwner] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [p, ms] = await Promise.all([fetchPaper(paperId), fetchMembers()]);
        setPaper(p);
        setMembers(ms);
        if (p?.added_by) setOwner(await fetchMember(p.added_by));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [paperId]);

  if (loading) {
    return <div className="px-6 py-8 text-sm text-muted">불러오는 중…</div>;
  }

  if (!paper) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm text-muted">논문을 찾을 수 없습니다.</p>
        <Link href="/" className="text-sm text-accent hover:underline">
          ← 홈으로
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* 논문 헤더 */}
      <div className="flex items-center gap-3 border-b border-line bg-panel px-4 py-2.5 md:px-6">
        <Link
          href={owner ? `/members/${owner.id}` : "/"}
          className="shrink-0 text-sm text-muted hover:text-ink"
        >
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink">
            {paper.title}
          </div>
          <div className="truncate text-xs text-muted">
            {paper.authors || "저자 미상"}
            {owner ? ` · ${owner.emoji} ${owner.name}` : ""}
          </div>
        </div>
        <StatusBadge status={paper.status} />
        {paper.pdf_url && (
          <a
            href={paper.pdf_url}
            target="_blank"
            rel="noreferrer"
            className="hidden shrink-0 rounded-md border border-line px-2 py-1 text-xs text-[#5f5e5b] hover:bg-[#f0efed] sm:inline-block"
          >
            원본 ↗
          </a>
        )}
      </div>

      {!currentMemberId && (
        <div className="border-b border-[#f0d9a8] bg-[#fdf6e7] px-4 py-1.5 text-[12px] text-[#8a6d2f] md:px-6">
          💡 오른쪽 위에서 <b>내 이름</b>을 선택하면 하이라이트에 작성자가
          기록됩니다.
        </div>
      )}

      {/* 본문 */}
      <div className="min-h-0 flex-1">
        {paper.pdf_url ? (
          <PdfHighlighterView
            paperId={paper.id}
            pdfUrl={paper.pdf_url}
            members={members}
            currentMemberId={currentMemberId}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted">
            <div>
              <p>이 논문에는 PDF 링크가 없습니다.</p>
              {owner && (
                <Link
                  href={`/members/${owner.id}`}
                  className="mt-2 inline-block text-accent hover:underline"
                >
                  {owner.name}님의 페이지에서 PDF 링크를 추가하세요 →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
