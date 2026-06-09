"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Member } from "@/lib/types";
import { fetchMembers } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    fetchMembers()
      .then(setMembers)
      .catch((e) => console.error("멤버 로드 실패", e));
  }, []);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[248px_minmax(0,1fr)]">
      {/* 모바일 상단 바 */}
      <div className="sticky top-0 z-30 flex h-[52px] items-center gap-3 border-b border-line bg-bg px-3 md:hidden">
        <button
          aria-label="메뉴"
          onClick={() => setMobileOpen(true)}
          className="rounded-md border border-line px-2.5 py-1 text-lg leading-none"
        >
          ☰
        </button>
        <span className="font-extrabold text-ink">논문 AI 디톡스 스터디</span>
      </div>

      {/* 모바일 드로어 배경 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        members={members}
        mobileOpen={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
      />

      <main className="min-w-0">
        {!isSupabaseConfigured && (
          <div className="border-b border-[#f0e2b8] bg-[#fff8e6] px-6 py-2 text-[13px] text-[#8a6d2f]">
            ⚠️ Supabase가 설정되지 않았습니다. <code>.env.local</code>에 키를 넣고
            <code> supabase/schema.sql</code> →<code> supabase/seed.sql</code>을
            실행하세요. (README 참고)
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
