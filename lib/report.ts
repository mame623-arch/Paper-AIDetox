import type { Attendance, Member, Paper } from "./types";

export interface AbsentEntry {
  member: Member;
  reason: string;
}

export interface AttendanceGroups {
  present: Member[];
  absent: AbsentEntry[];
  /** 참석·불참 어느 쪽도 선언하지 않았고 논문도 올리지 않은 멤버 */
  noResponse: Member[];
}

/**
 * 보고서의 세 갈래를 가른다.
 *
 *   참석자    = (present 선언 ∪ 그 차시에 논문 등록) − absent 선언
 *   불참자    = absent 선언
 *   응답 없음 = 나머지 전원
 *
 * absent 가 우선한다. 논문을 올려둔 사람이 나중에 불참으로 바꾸면
 * 논문은 개인 기록으로 남되 보고서에서는 불참자로 나온다.
 */
export function classifyAttendance(
  members: Member[],
  papers: Paper[],
  attendance: Attendance[]
): AttendanceGroups {
  const byId = new Map(members.map((m) => [m.id, m]));

  const absentReason = new Map<string, string>();
  const declaredPresent = new Set<string>();
  for (const a of attendance) {
    if (a.status === "absent") absentReason.set(a.member_id, a.reason ?? "");
    else declaredPresent.add(a.member_id);
  }

  const presentIds = new Set<string>(declaredPresent);
  for (const p of papers) {
    if (p.added_by) presentIds.add(p.added_by);
  }
  for (const id of absentReason.keys()) presentIds.delete(id);

  const inOrder = (ids: Iterable<string>) =>
    [...ids]
      .map((id) => byId.get(id))
      .filter((m): m is Member => Boolean(m))
      .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));

  const present = inOrder(presentIds);
  const absent = inOrder(absentReason.keys()).map((member) => ({
    member,
    reason: absentReason.get(member.id) ?? "",
  }));

  const spoken = new Set([...present, ...absent.map((a) => a.member)].map((m) => m.id));
  const noResponse = members
    .filter((m) => !spoken.has(m.id))
    .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));

  return { present, absent, noResponse };
}
