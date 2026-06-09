"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "홈", emoji: "🏠" },
  { href: "/#members", label: "멤버", emoji: "👥" },
  { href: "/#papers", label: "논문", emoji: "📄" },
];

const DECISIONS = [
  "매주 목요일 10:00–12:00",
  "처음 2주는 전원 필참",
  "휴대폰 사용 자유",
  "AI 없이 읽고 표현·구조 파악",
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r border-line bg-[#fbfbfa] px-3 py-5 md:flex">
      <Link href="/" className="px-2">
        <div className="text-[13px] font-semibold leading-tight text-ink">
          4.8 인공지능 없이 읽기
        </div>
        <div className="text-[11px] text-muted">논문 AI 디톡스 스터디</div>
      </Link>

      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href.split("#")[0]) &&
                item.href !== "/";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition ${
                active
                  ? "bg-[#efeeec] font-medium text-ink"
                  : "text-[#5f5e5b] hover:bg-[#f0efed]"
              }`}
            >
              <span className="text-base">{item.emoji}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-lg border border-line bg-panel p-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
          결정사항
        </div>
        <ul className="space-y-1.5">
          {DECISIONS.map((d) => (
            <li key={d} className="flex gap-1.5 text-[12px] leading-snug text-[#5f5e5b]">
              <span className="text-accent">·</span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
