import type { ReactNode } from "react";
import type { Member, Paper } from "@/lib/types";
import { avatarColors, avatarLabel } from "@/lib/avatar";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-line bg-bg p-5 ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="mb-2 mt-7 flex items-baseline justify-between">
      <h2>{children}</h2>
      {hint ? <span className="text-[0.82rem] text-muted">{hint}</span> : null}
    </div>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const { bg, fg } = avatarColors(name);
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        fontSize: size * 0.4,
      }}
    >
      {avatarLabel(name)}
    </span>
  );
}

export function StatusBadge({ status }: { status: Paper["status"] }) {
  const read = status === "read";
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold"
      style={
        read
          ? { background: "#e7f3ec", color: "var(--ok)" }
          : { background: "#fbf6ec", color: "var(--warn)" }
      }
    >
      {read ? "읽음" : "읽을 예정"}
    </span>
  );
}

export function MemberAvatarName({
  member,
  size = 36,
}: {
  member: Member;
  size?: number;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <Avatar name={member.name} size={size} />
      <span className="font-medium text-ink">{member.name}</span>
    </span>
  );
}

export function formatDate(d?: string | null): string {
  if (!d) return "";
  return d.replaceAll("-", ".");
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
export function weekday(d?: string | null): string {
  if (!d) return "";
  return WEEKDAYS[new Date(d + "T00:00:00").getDay()] + "요일";
}
