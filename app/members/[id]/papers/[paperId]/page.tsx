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
  const params = useParams<{ id: string; paperId: string }>();
  const memberId = params.id;
  const paperId = params.paperId;
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
        const [p, ms, o] = await Promise.all([
          fetchPaper(paperId),
          fetchMembers(),
          fetchMember(memberId),
        ]);
        setPaper(p);
        setMembers(ms);
        setOwner(o);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [paperId, memberId]);

  if (loading) {
    return <div className="px-6 py-8 text-muted">불러오는 중…</div>;
  }

  if (!paper) {
    return (
      <div className="px-6 py-8">
        <p className="text-muted">논문을 찾을 수 없습니다.</p>
        <Link href={`/members/${memberId}`} className="text-accent hover:underline">
          ← 멤버 페이지
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col md:h-screen">
      {/* 논문 헤더 */}
      <div className="flex items-center gap-3 border-b border-line bg-bg px-4 py-2.5 md:px-6">
        <Link
          href={`/members/${memberId}`}
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
            {owner ? ` · ${owner.name}` : ""}
          </div>
        </div>
        <StatusBadge status={paper.status} />
        {paper.pdf_url && (
          <a
            href={paper.pdf_url}
            target="_blank"
            rel="noreferrer"
            className="hidden shrink-0 rounded-md border border-line px-2 py-1 text-xs text-muted hover:bg-surface2 sm:inline-block"
          >
            원본 ↗
          </a>
        )}
      </div>

      {!currentMemberId && (
        <div className="border-b border-[#f0e2b8] bg-[#fff8e6] px-4 py-1.5 text-[12px] text-[#8a6d2f] md:px-6">
          💡 왼쪽 사이드바에서 <b>내 이름</b>을 선택하면 하이라이트에 작성자가
          기록됩니다.
        </div>
      )}

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
            이 논문에는 PDF 링크가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
