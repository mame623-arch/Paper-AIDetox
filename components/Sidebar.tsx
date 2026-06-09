"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Member, Session } from "@/lib/types";
import { fetchUpcomingSession, today } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useCurrentMemberId } from "@/lib/currentUser";

const NAV = [
  { href: "/", label: "홈", emoji: "🏠" },
  { href: "/members", label: "멤버", emoji: "👥" },
  { href: "/calendar", label: "캘린더", emoji: "🗓️" },
];

const DECISIONS = [
  "매주 목요일 10:00–12:00",
  "처음 2주는 전원 필참",
  "휴대폰 사용 자유",
  "AI 없이 읽고 표현·구조 파악",
];

function dday(dateStr: string): string {
  const a = new Date(today() + "T00:00:00");
  const b = new Date(dateStr + "T00:00:00");
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
  if (diff === 0) return "D-DAY";
  return diff > 0 ? `D-${diff}` : `D+${-diff}`;
}

export default function Sidebar({
  members,
  mobileOpen,
  onNavigate,
}: {
  members: Member[];
  mobileOpen: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const [currentId, setCurrentId] = useCurrentMemberId();
  const [upcoming, setUpcoming] = useState<Session | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    fetchUpcomingSession()
      .then(setUpcoming)
      .catch(() => {});
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside
      className={`${
        mobileOpen ? "fixed inset-y-0 left-0 z-50 flex w-[82%] max-w-[300px]" : "hidden"
      } flex-col gap-1 overflow-y-auto border-r border-line bg-surface px-3 pb-6 pt-4 md:sticky md:top-0 md:flex md:h-screen md:w-auto`}
    >
      {/* 브랜드 */}
      <Link href="/" onClick={onNavigate} className="flex items-baseline gap-1.5 px-1.5 pb-0.5 pt-1">
        <span className="text-[1.15rem] font-extrabold text-ink">
          논문 AI 디톡스 스터디
        </span>
      </Link>
      <div className="px-1.5 pb-2 text-[0.62rem] font-bold uppercase tracking-[0.06em] text-faint">
        AI 없이 읽기
      </div>

      {/* D-day */}
      {upcoming && (
        <div className="flex flex-wrap gap-1.5 px-1.5 pb-2.5">
          <span className="rounded-full bg-accent px-2 py-0.5 text-[0.66rem] font-bold text-white">
            다음 스터디 {dday(upcoming.date)}
          </span>
        </div>
      )}

      {/* 나 선택 */}
      <div className="flex flex-wrap items-center gap-1.5 px-1.5 pb-2.5">
        <span className="mr-0.5 text-[0.72rem] font-bold text-faint">나</span>
        {members.map((m) => (
          <button
            key={m.id}
            onClick={() => setCurrentId(m.id === currentId ? null : m.id)}
            className={`rounded-full border px-2.5 py-0.5 text-[0.78rem] transition ${
              m.id === currentId
                ? "border-accent bg-accent text-white"
                : "border-line bg-bg text-muted hover:border-accent hover:text-accent"
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>

      {/* 메뉴 */}
      <div className="mb-0.5 mt-2 px-1.5 text-[0.82rem] font-bold text-ink">
        메뉴
      </div>
      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-2 rounded-[7px] px-2.5 py-1.5 text-[0.84rem] transition ${
              isActive(item.href)
                ? "bg-accentsoft font-semibold text-accent"
                : "text-muted hover:bg-surface2 hover:text-body"
            }`}
          >
            <span>{item.emoji}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* 결정사항 */}
      <div className="mt-auto rounded-xl border border-line bg-bg p-3">
        <div className="mb-2 text-[0.66rem] font-bold uppercase tracking-wide text-faint">
          결정사항
        </div>
        <ul className="space-y-1.5">
          {DECISIONS.map((d) => (
            <li key={d} className="flex gap-1.5 text-[0.78rem] leading-snug text-muted">
              <span className="text-accent">·</span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
