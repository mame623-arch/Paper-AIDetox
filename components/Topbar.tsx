"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Member } from "@/lib/types";
import { useCurrentMemberId } from "@/lib/currentUser";
import { EmojiAvatar } from "./ui";

export default function Topbar({ members }: { members: Member[] }) {
  const router = useRouter();
  const [currentId, setCurrentId] = useCurrentMemberId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const me = members.find((m) => m.id === currentId) ?? null;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;
    const hit = members.find((m) => m.name.toLowerCase().includes(q));
    if (hit) router.push(`/members/${hit.id}`);
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-bg/80 px-4 backdrop-blur md:px-6">
      <form onSubmit={onSearch} className="flex-1">
        <div className="flex max-w-sm items-center gap-2 rounded-lg border border-line bg-panel px-3 py-1.5">
          <span className="text-muted">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="멤버 검색…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </div>
      </form>

      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-sm hover:bg-[#faf9f8]"
        >
          <span className="text-muted">나</span>
          {me ? (
            <>
              <EmojiAvatar emoji={me.emoji} size={22} />
              <span className="font-medium">{me.name}</span>
            </>
          ) : (
            <span className="text-muted">이름 선택 ▾</span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 w-48 overflow-hidden rounded-lg border border-line bg-panel py-1 shadow-lg">
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
              나는 누구인가요?
            </div>
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setCurrentId(m.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-[#f0efed] ${
                  m.id === currentId ? "bg-[#f0efed] font-medium" : ""
                }`}
              >
                <EmojiAvatar emoji={m.emoji} size={20} />
                {m.name}
              </button>
            ))}
            {members.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted">멤버 없음</div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
