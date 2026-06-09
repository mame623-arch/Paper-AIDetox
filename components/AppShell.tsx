"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Member } from "@/lib/types";
import { fetchMembers } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    fetchMembers()
      .then(setMembers)
      .catch((e) => console.error("멤버 로드 실패", e));
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar members={members} />
        {!isSupabaseConfigured && (
          <div className="border-b border-[#f0d9a8] bg-[#fdf6e7] px-6 py-2 text-[13px] text-[#8a6d2f]">
            ⚠️ Supabase가 설정되지 않았습니다. <code>.env.local</code>에 키를 넣고
            <code> supabase/schema.sql</code>을 실행하세요. (README 참고)
          </div>
        )}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
