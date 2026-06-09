"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Member } from "@/lib/types";
import { fetchMembers } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Avatar } from "@/components/ui";

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    fetchMembers()
      .then(setMembers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-7 md:px-10">
      <h1>멤버</h1>
      <p className="mt-1 text-muted">
        이름을 누르면 그 사람이 읽은/읽을 논문 페이지로 이동합니다.
      </p>

      {loading ? (
        <p className="mt-8 text-muted">불러오는 중…</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          {members.map((m) => (
            <Link
              key={m.id}
              href={`/members/${m.id}`}
              className="block rounded-2xl bg-surface p-4 text-center transition hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(28,31,38,0.09)]"
            >
              <div className="flex justify-center">
                <Avatar name={m.name} size={52} />
              </div>
              <div className="mt-2.5 font-bold text-ink">{m.name}</div>
              {m.role && <div className="text-[0.78rem] text-muted">{m.role}</div>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
