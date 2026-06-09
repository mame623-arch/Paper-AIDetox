import Link from "next/link";
import type { ReactNode } from "react";
import type { Member, Paper } from "@/lib/types";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-line bg-panel p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="text-[15px] font-semibold text-ink">{children}</h2>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </div>
  );
}

export function EmojiAvatar({
  emoji,
  size = 36,
}: {
  emoji: string;
  size?: number;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#f1f0ee]"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {emoji || "🙂"}
    </span>
  );
}

export function StatusBadge({ status }: { status: Paper["status"] }) {
  const read = status === "read";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        read
          ? "bg-[#e7f3ee] text-[#2e7d6b]"
          : "bg-[#fdf2e3] text-[#b8742a]"
      }`}
    >
      {read ? "✅ 읽음" : "🕓 읽을 예정"}
    </span>
  );
}

export function MemberChip({ member }: { member: Member }) {
  return (
    <Link
      href={`/members/${member.id}`}
      className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-2.5 py-1 text-sm text-ink transition hover:border-[#d6d5d2] hover:bg-[#faf9f8]"
    >
      <EmojiAvatar emoji={member.emoji} size={22} />
      <span className="font-medium">{member.name}</span>
    </Link>
  );
}

export function formatDate(d?: string | null): string {
  if (!d) return "";
  // d is "YYYY-MM-DD"; render as "YYYY.MM.DD"
  return d.replaceAll("-", ".");
}
